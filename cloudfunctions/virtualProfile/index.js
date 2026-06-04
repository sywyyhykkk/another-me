const cloud = require('wx-server-sdk')
const {
  getCurrentActivitySlot,
  buildActivitySlotKey
} = require('./activitySchedule')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

const PROFILES = 'virtual_profiles'
const SETTINGS = 'user_settings'
/** 递增后 getActive 会强制用最新 geo/activity 逻辑回写档案 */
const PROFILE_SYNC_VERSION = 4

let collectionsReady = false

const ERR_COLLECTION_NOT_EXISTS = -502005

function isCollectionNotExistsError(error) {
  return Boolean(error && error.errCode === ERR_COLLECTION_NOT_EXISTS)
}

async function collectionExists(name) {
  try {
    await db.collection(name).limit(1).get()
    return true
  } catch (error) {
    if (isCollectionNotExistsError(error)) {
      return false
    }
    throw error
  }
}

async function ensureCollection(name) {
  if (await collectionExists(name)) {
    return
  }

  try {
    await db.createCollection(name)
    console.log('[virtualProfile] collection created:', name)
  } catch (error) {
    if (await collectionExists(name)) {
      return
    }
    throw error
  }
}

async function ensureCollections() {
  if (collectionsReady) {
    return
  }

  await ensureCollection(PROFILES)
  await ensureCollection(SETTINGS)

  collectionsReady = true
}

exports.main = async (event, context) => {
  try {
    await ensureCollections()

    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    const { action, payload } = event || {}

    switch (action) {
      case 'getActive':
        return await getActiveProfile(openid, payload)
      case 'create':
        return await createProfile(openid, payload)
      case 'list':
        return await listProfiles(openid)
      case 'setActive':
        return await setActiveProfile(openid, payload)
      case 'delete':
        return await deleteProfile(openid, payload)
      default:
        return {
          success: false,
          message: 'Unknown action'
        }
    }
  } catch (error) {
    console.error('[virtualProfile] error:', error)
    return {
      success: false,
      message: error && error.message ? error.message : 'Internal error'
    }
  }
}

async function getActiveProfile(openid, payload) {
  const forceRefresh = Boolean(payload && payload.forceRefresh)

  try {
    const settingsRes = await db.collection(SETTINGS).where({ openid }).limit(1).get()
    const settings = settingsRes.data[0]

    if (settings && settings.activeProfileId) {
      const profile = await getProfileById(settings.activeProfileId, openid)
      if (profile) {
        const refreshed = await refreshProfileInPlace(profile, { forceRefresh })
        return {
          success: true,
          exists: true,
          data: refreshed
        }
      }
    }

    const fallbackProfile = await getLatestProfile(openid)
    if (fallbackProfile) {
      await archiveActiveProfiles(openid)
      await markProfileActive(fallbackProfile._id)
      await upsertUserSettings(openid, fallbackProfile._id, true)
      const profile = await getProfileById(fallbackProfile._id, openid)
      const refreshed = profile ? await refreshProfileInPlace(profile, { forceRefresh }) : null
      return {
        success: true,
        exists: true,
        data: refreshed
      }
    }
  } catch (error) {
    if (isCollectionNotExistsError(error)) {
      return {
        success: true,
        exists: false,
        data: null
      }
    }
    throw error
  }

  return {
    success: true,
    exists: false,
    data: null
  }
}

async function createProfile(openid, payload) {
  if (!validateOriginLocation(payload && payload.originLocation)) {
    return { success: false, message: 'Invalid payload' }
  }
  if (!validateSelectedAvatar(payload && payload.selectedAvatar)) {
    return { success: false, message: 'Invalid payload' }
  }

  await ensureCollections()

  const selectedAvatar = normalizeSelectedAvatar(payload.selectedAvatar)
  const originLocation = await enrichOriginLocation(payload.originLocation)
  const targetMode = payload.targetMode || 'antipode'
  const profileName =
    payload.profileName || `${selectedAvatar.name} · ${originLocation.cityName}的另一端`

  const built = await buildProfileContent({
    originLocation,
    selectedAvatar,
    targetMode
  })

  if (!built.ok) {
    return { success: false, message: built.message }
  }

  const { antipode, targetLocation, result, videoAsset, metadata } = built.data

  await archiveActiveProfiles(openid)

  const now = db.serverDate()
  const doc = {
    openid,
    profileName,
    profileStatus: 'active',
    selectedAvatar,
    creationSource: 'onboarding',
    originLocation,
    antipode,
    targetMode,
    targetLocation,
    result,
    videoAsset,
    metadata,
    createdAt: now,
    updatedAt: now
  }

  const addRes = await db.collection(PROFILES).add({ data: doc })
  await upsertUserSettings(openid, addRes._id, true)

  const profile = {
    _id: addRes._id,
    ...doc,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  return {
    success: true,
    exists: true,
    data: profile
  }
}

async function listProfiles(openid) {
  const res = await db
    .collection(PROFILES)
    .where({ openid })
    .orderBy('updatedAt', 'desc')
    .limit(50)
    .get()

  return {
    success: true,
    data: res.data
  }
}

async function setActiveProfile(openid, payload) {
  const profileId = payload && payload.profileId
  if (!profileId) {
    return { success: false, message: 'Invalid payload' }
  }

  const profile = await getProfileById(profileId, openid)
  if (!profile) {
    return { success: false, message: 'Profile not found' }
  }

  await archiveActiveProfiles(openid)
  await markProfileActive(profileId)
  await upsertUserSettings(openid, profileId, true)

  const updatedProfile = await getProfileById(profileId, openid)
  const refreshed = updatedProfile ? await refreshProfileInPlace(updatedProfile) : null

  return {
    success: true,
    data: refreshed
  }
}

async function deleteProfile(openid, payload) {
  let profileId = payload && payload.profileId

  if (payload && payload.deleteActive) {
    const settingsRes = await db.collection(SETTINGS).where({ openid }).limit(1).get()
    const settings = settingsRes.data[0]
    profileId = settings && settings.activeProfileId
  }

  if (!profileId) {
    return { success: false, message: 'Invalid payload' }
  }

  const profile = await getProfileById(profileId, openid)
  if (!profile) {
    return { success: false, message: 'Profile not found' }
  }

  const settingsRes = await db.collection(SETTINGS).where({ openid }).limit(1).get()
  const settings = settingsRes.data[0]
  const wasActive = settings && settings.activeProfileId === profileId

  await db.collection(PROFILES).doc(profileId).remove()

  if (wasActive) {
    const nextProfile = await getLatestProfile(openid)
    if (nextProfile) {
      await archiveActiveProfiles(openid)
      await markProfileActive(nextProfile._id)
      await upsertUserSettings(openid, nextProfile._id, true)
    } else if (settings) {
      await db.collection(SETTINGS).doc(settings._id).update({
        data: {
          activeProfileId: '',
          onboardingCompleted: false,
          updatedAt: db.serverDate()
        }
      })
    }
  }

  return { success: true }
}

async function archiveActiveProfiles(openid) {
  const activeRes = await db
    .collection(PROFILES)
    .where({
      openid,
      profileStatus: 'active'
    })
    .get()

  const tasks = (activeRes.data || []).map((profile) =>
    db.collection(PROFILES).doc(profile._id).update({
      data: {
        profileStatus: 'archived',
        updatedAt: db.serverDate()
      }
    })
  )

  await Promise.all(tasks)
}

async function markProfileActive(profileId) {
  await db.collection(PROFILES).doc(profileId).update({
    data: {
      profileStatus: 'active',
      updatedAt: db.serverDate()
    }
  })
}

async function getLatestProfile(openid) {
  const res = await db
    .collection(PROFILES)
    .where({ openid })
    .orderBy('updatedAt', 'desc')
    .limit(1)
    .get()

  return res.data[0] || null
}

async function getProfileById(profileId, openid) {
  try {
    const res = await db.collection(PROFILES).doc(profileId).get()
    const profile = res.data
    if (!profile || profile.openid !== openid) {
      return null
    }
    return profile
  } catch (error) {
    return null
  }
}

async function upsertUserSettings(openid, activeProfileId, onboardingCompleted = true) {
  const settingsRes = await db.collection(SETTINGS).where({ openid }).limit(1).get()
  const settings = settingsRes.data[0]
  const data = {
    openid,
    activeProfileId,
    onboardingCompleted,
    updatedAt: db.serverDate()
  }

  if (settings) {
    await db.collection(SETTINGS).doc(settings._id).update({ data })
    return settings._id
  }

  const addRes = await db.collection(SETTINGS).add({
    data: {
      ...data,
      createdAt: db.serverDate()
    }
  })
  return addRes._id
}

function validateOriginLocation(originLocation) {
  if (!originLocation) return false
  return (
    typeof originLocation.cityName === 'string' &&
    typeof originLocation.countryName === 'string' &&
    typeof originLocation.latitude === 'number' &&
    typeof originLocation.longitude === 'number' &&
    (originLocation.mode === 'device' || originLocation.mode === 'manual')
  )
}

function validateSelectedAvatar(selectedAvatar) {
  if (!selectedAvatar) return false
  return (
    typeof selectedAvatar.id === 'string' &&
    typeof selectedAvatar.role === 'string' &&
    typeof selectedAvatar.name === 'string'
  )
}

function normalizeSelectedAvatar(selectedAvatar) {
  const roleMap = {
    office: 'office_worker',
    office_worker: 'office_worker',
    student: 'student',
    free: 'freelancer',
    freelancer: 'freelancer',
    traveler: 'traveler'
  }

  return {
    id: selectedAvatar.id,
    role: roleMap[selectedAvatar.role] || roleMap[selectedAvatar.id] || 'office_worker',
    name: selectedAvatar.name,
    description: selectedAvatar.description || '',
    emoji: selectedAvatar.emoji || '💼'
  }
}

async function enrichOriginLocation(originLocation) {
  if (!originLocation || typeof originLocation.latitude !== 'number') {
    return originLocation
  }

  const needsEnrich =
    originLocation.mode === 'device' || originLocation.cityName === '当前位置'

  if (!needsEnrich) {
    return originLocation
  }

  try {
    const geoRes = await cloud.callFunction({
      name: 'geoResolver',
      data: {
        action: 'resolveOrigin',
        payload: {
          latitude: originLocation.latitude,
          longitude: originLocation.longitude
        }
      }
    })

    const result = geoRes.result
    if (result && result.success && result.data) {
      const geoResolved = buildOriginGeoResolved(result.data)
      console.log('[virtualProfile] origin enriched:', result.data.cityName, result.data.countryName)
      return {
        ...originLocation,
        mode: 'device',
        cityName: result.data.cityName,
        countryName: result.data.countryName,
        geoResolved
      }
    }

    console.warn('[virtualProfile] enrichOrigin failed:', result && result.message)
  } catch (error) {
    console.warn('[virtualProfile] enrichOrigin error:', error)
  }

  return originLocation
}

function buildOriginGeoResolved(resolveOriginData) {
  if (!resolveOriginData) {
    return null
  }

  const place = resolveOriginData.nearestPlace
  const timezone = resolveOriginData.timezone

  return {
    source: 'device_reverse',
    cityName: resolveOriginData.cityName,
    countryName: resolveOriginData.countryName,
    countryCode: (place && place.countryCode) || (timezone && timezone.countryCode) || undefined,
    timezoneId: timezone && timezone.timezoneId,
    geonameId: place && place.geonameId,
    adminName1: place && place.adminName1,
    lat: place && typeof place.lat === 'number' ? place.lat : undefined,
    lng: place && typeof place.lng === 'number' ? place.lng : undefined,
    distanceKm: place && typeof place.distanceKm === 'number' ? place.distanceKm : undefined
  }
}

function computeAntipodeFromOrigin(originLocation) {
  const latitude = originLocation.latitude
  const longitude = originLocation.longitude
  return {
    latitude: Number((-latitude).toFixed(6)),
    longitude: Number((longitude >= 0 ? longitude - 180 : longitude + 180).toFixed(6))
  }
}

function normalizeAntipode(antipode, originLocation) {
  if (antipode && typeof antipode.latitude === 'number' && typeof antipode.longitude === 'number') {
    return {
      latitude: antipode.latitude,
      longitude: antipode.longitude
    }
  }
  if (originLocation) {
    return computeAntipodeFromOrigin(originLocation)
  }
  return null
}

async function resolveGeoData(originLocation, targetMode) {
  const geoRes = await cloud.callFunction({
    name: 'geoResolver',
    data: {
      action: 'resolveTarget',
      payload: {
        originLocation,
        targetMode
      }
    }
  })

  const geoResult = geoRes.result
  if (!geoResult || !geoResult.success || !geoResult.data) {
    return {
      ok: false,
      message: geoResult && geoResult.message ? geoResult.message : 'Geo resolve failed'
    }
  }

  const { antipode, targetLocation, distanceKm, geoMeta, nearestPlace, ocean, timezone } =
    geoResult.data

  console.log('[virtualProfile] geoResolver data:', {
    geoSource: geoMeta && geoMeta.source,
    cached: geoMeta && geoMeta.cached,
    geoMetaTimezone: geoMeta && geoMeta.timezone,
    distanceKm,
    hasNearestPlace: Boolean(nearestPlace),
    hasOcean: Boolean(ocean),
    timezoneData: timezone
      ? {
          timezoneId: timezone.timezoneId,
          countryCode: timezone.countryCode
        }
      : null
  })

  return {
    ok: true,
    data: {
      antipode: normalizeAntipode(antipode, originLocation),
      targetLocation,
      distanceKm,
      geoMeta,
      nearestPlace,
      ocean,
      timezone
    }
  }
}

async function buildActivityResult({
  originLocation,
  selectedAvatar,
  targetLocation,
  distanceKm,
  geoMeta,
  timezone
}) {
  const activityRes = await cloud.callFunction({
    name: 'activityEngine',
    data: {
      action: 'buildResult',
      payload: {
        originLocation,
        selectedAvatar,
        targetLocation,
        distanceKm,
        geoMeta,
        timezone
      }
    }
  })

  const activityResult = activityRes.result
  if (!activityResult || !activityResult.success || !activityResult.data) {
    return {
      ok: false,
      message:
        activityResult && activityResult.message ? activityResult.message : 'Activity build failed'
    }
  }

  return { ok: true, data: activityResult.data }
}

async function resolveVideoAsset(selectedAvatar, result, targetLocation) {
  try {
    const assetRes = await cloud.callFunction({
      name: 'assetResolver',
      data: {
        action: 'resolveVideo',
        payload: {
          avatarId: selectedAvatar.id,
          avatarRole: selectedAvatar.role,
          currentState: result.currentState,
          landingMode: targetLocation.landingMode
        }
      }
    })

    const assetResult = assetRes.result
    if (assetResult && assetResult.success && assetResult.data) {
      return assetResult.data
    }
  } catch (error) {
    console.warn('[virtualProfile] assetResolver failed, continue without videoAsset', error)
  }

  return null
}

function needsOriginEnrich(originLocation) {
  if (!originLocation) {
    return false
  }
  return originLocation.mode === 'device' || originLocation.cityName === '当前位置'
}

function computeActivitySlotKey(role, timezone) {
  const slot = getCurrentActivitySlot(role, timezone, new Date())
  if (!slot || !slot.localDateKey) {
    return null
  }
  return buildActivitySlotKey(role, slot.activityTitle, slot.localDateKey)
}

function canSkipProfileRefresh(profile, activitySlotKey) {
  if (!activitySlotKey || !profile || !profile.result) {
    return false
  }

  const meta = profile.metadata || {}
  if (!meta.timezoneData) {
    return false
  }

  if (typeof meta.syncVersion !== 'number' || meta.syncVersion < PROFILE_SYNC_VERSION) {
    return false
  }

  if (!meta.activitySlotKey || meta.activitySlotKey !== activitySlotKey) {
    return false
  }

  return true
}

function buildProfileMetadata({
  geoMeta,
  nearestPlace,
  ocean,
  timezone,
  result,
  videoAsset,
  activitySlotKey
}) {
  return {
    version: 2,
    syncVersion: PROFILE_SYNC_VERSION,
    generator: 'cloud_split_v1',
    geo: geoMeta || null,
    nearestPlace: nearestPlace || null,
    ocean: ocean || null,
    timezoneId: (timezone && timezone.timezoneId) || (geoMeta && geoMeta.timezone) || undefined,
    countryCode:
      (timezone && timezone.countryCode) || (geoMeta && geoMeta.countryCode) || undefined,
    timezoneData: timezone || null,
    activity: (result && result.activityMeta) || null,
    asset: videoAsset
      ? {
          assetKey: videoAsset.assetKey,
          assetSource: videoAsset.assetSource
        }
      : null,
    activitySlotKey: activitySlotKey || null,
    lastRefreshedAt: db.serverDate()
  }
}

async function buildProfileContent({ originLocation, selectedAvatar, targetMode, existingVideoAsset }) {
  const geo = await resolveGeoData(originLocation, targetMode)
  if (!geo.ok) {
    return { ok: false, message: geo.message }
  }

  let { antipode, targetLocation, distanceKm, geoMeta, nearestPlace, ocean, timezone } = geo.data
  antipode = normalizeAntipode(antipode, originLocation)

  const activity = await buildActivityResult({
    originLocation,
    selectedAvatar,
    targetLocation,
    distanceKm,
    geoMeta,
    timezone
  })

  if (!activity.ok) {
    return { ok: false, message: activity.message }
  }

  const result = activity.data
  const videoAsset =
    (await resolveVideoAsset(selectedAvatar, result, targetLocation)) || existingVideoAsset || null

  const activitySlotKey = computeActivitySlotKey(selectedAvatar.role, timezone)

  return {
    ok: true,
    data: {
      antipode,
      targetLocation,
      result,
      videoAsset,
      metadata: buildProfileMetadata({
        geoMeta,
        nearestPlace,
        ocean,
        timezone,
        result,
        videoAsset,
        activitySlotKey
      })
    }
  }
}

function shouldReResolveVideoAsset(profile, result, targetLocation) {
  const prevResult = profile.result || {}
  const prevTarget = profile.targetLocation || {}
  return (
    result.currentState !== prevResult.currentState ||
    targetLocation.landingMode !== prevTarget.landingMode
  )
}

async function refreshProfileInPlace(profile, options = {}) {
  if (!profile || !profile._id) {
    return profile
  }

  if (!validateOriginLocation(profile.originLocation) || !validateSelectedAvatar(profile.selectedAvatar)) {
    console.warn('[virtualProfile] refresh skipped: invalid stored profile')
    return profile
  }

  const selectedAvatar = normalizeSelectedAvatar(profile.selectedAvatar)
  let originLocation = profile.originLocation

  if (needsOriginEnrich(originLocation)) {
    originLocation = await enrichOriginLocation(originLocation)
  }

  const timezoneForSlot = (profile.metadata && profile.metadata.timezoneData) || null
  const activitySlotKey = computeActivitySlotKey(selectedAvatar.role, timezoneForSlot)
  const forceRefresh = Boolean(options.forceRefresh)

  if (!forceRefresh && canSkipProfileRefresh(profile, activitySlotKey)) {
    console.log('[virtualProfile] refresh skipped, same activity slot:', activitySlotKey)
    if (needsOriginEnrich(profile.originLocation) && originLocation !== profile.originLocation) {
      const patch = {
        originLocation,
        updatedAt: db.serverDate()
      }
      try {
        await db.collection(PROFILES).doc(profile._id).update({ data: patch })
        return { ...profile, ...patch, updatedAt: new Date() }
      } catch (error) {
        console.warn('[virtualProfile] origin-only patch failed:', error)
      }
    }
    return profile
  }

  const targetMode = profile.targetMode || 'antipode'
  const profileName = `${selectedAvatar.name} · ${originLocation.cityName}的另一端`

  let antipode = normalizeAntipode(profile.antipode, originLocation)
  let targetLocation = profile.targetLocation
  let distanceKm = profile.result && typeof profile.result.distanceKm === 'number' ? profile.result.distanceKm : 0
  let geoMeta = (profile.metadata && profile.metadata.geo) || null
  let nearestPlace = (profile.metadata && profile.metadata.nearestPlace) || null
  let ocean = (profile.metadata && profile.metadata.ocean) || null
  let timezone = (profile.metadata && profile.metadata.timezoneData) || null

  const geo = await resolveGeoData(originLocation, targetMode)
  if (geo.ok) {
    antipode = normalizeAntipode(geo.data.antipode, originLocation) || antipode
    targetLocation = geo.data.targetLocation
    distanceKm = geo.data.distanceKm
    geoMeta = geo.data.geoMeta
    nearestPlace = geo.data.nearestPlace
    ocean = geo.data.ocean
    timezone = geo.data.timezone
  } else {
    console.warn('[virtualProfile] refresh geo failed, keep stored geo:', geo.message)
  }

  const activity = await buildActivityResult({
    originLocation,
    selectedAvatar,
    targetLocation,
    distanceKm,
    geoMeta,
    timezone
  })

  if (!activity.ok) {
    console.warn('[virtualProfile] refresh activity failed, keep stored result:', activity.message)
    return profile
  }

  const result = activity.data
  let videoAsset = profile.videoAsset || null

  if (shouldReResolveVideoAsset(profile, result, targetLocation)) {
    const resolved = await resolveVideoAsset(selectedAvatar, result, targetLocation)
    if (resolved) {
      videoAsset = resolved
    }
  }

  const refreshedSlotKey = computeActivitySlotKey(selectedAvatar.role, timezone)

  const metadata = buildProfileMetadata({
    geoMeta,
    nearestPlace,
    ocean,
    timezone,
    result,
    videoAsset,
    activitySlotKey: refreshedSlotKey
  })

  const updateData = {
    originLocation,
    antipode,
    profileName,
    targetLocation,
    result,
    videoAsset,
    metadata,
    updatedAt: db.serverDate()
  }

  try {
    await db.collection(PROFILES).doc(profile._id).update({ data: updateData })
    console.log('[virtualProfile] profile refreshed:', profile._id, {
      cityName: originLocation.cityName,
      activitySlotKey: refreshedSlotKey,
      hasOriginGeoResolved: Boolean(originLocation.geoResolved),
      antipode,
      distanceKm: result.distanceKm,
      localTime: result.localTime
    })
  } catch (error) {
    console.warn('[virtualProfile] profile refresh persist failed:', error)
    return profile
  }

  return {
    ...profile,
    ...updateData,
    updatedAt: new Date()
  }
}
