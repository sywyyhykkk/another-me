const cloud = require('wx-server-sdk')
const { ENV_ID } = require('./env.config')
const {
  getCurrentActivitySlot,
  buildActivitySlotKey,
  normalizeTimezoneForUse
} = require('./activitySchedule')
const { buildActivityResult } = require('./shared/activityCore')
const { resolveVideoAsset } = require('./shared/assetCore')

cloud.init({
  env: ENV_ID
})

const db = cloud.database()

const PROFILES = 'virtual_profiles'
const SETTINGS = 'user_settings'
const PROFILE_SYNC_VERSION = 8

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
  const targetMode = payload.targetMode || 'antipode'

  const built = await buildProfileContent({
    originLocation: payload.originLocation,
    selectedAvatar,
    targetMode,
    enrichOrigin: needsOriginEnrich(payload.originLocation)
  })

  if (!built.ok) {
    return { success: false, message: built.message }
  }

  const { originLocation, antipode, targetLocation, result, videoAsset, metadata } = built.data
  const profileName =
    payload.profileName || `${selectedAvatar.name} · ${originLocation.cityName}的另一端`

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

function formatCloudInvokeError(name, error) {
  const msg = (error && error.message) || String(error)
  if (/time/i.test(msg) && /(limit|timed out|exceeded)/i.test(msg)) {
    return `${name} 调用超时，请确认该云函数已在控制台配置足够超时并重新部署`
  }
  return `${name} 调用失败：${msg}`
}

async function invokeGeoResolver(action, payload) {
  try {
    const res = await cloud.callFunction({
      name: 'geoResolver',
      data: { action, payload }
    })
    return res.result
  } catch (error) {
    console.warn('[virtualProfile] geoResolver invoke failed:', error)
    return { success: false, message: formatCloudInvokeError('geoResolver', error) }
  }
}

function mergeEnrichedOrigin(originLocation, originData) {
  if (!originData) {
    return originLocation
  }
  return {
    ...originLocation,
    mode: 'device',
    cityName: originData.cityName || originLocation.cityName,
    countryName: originData.countryName || originLocation.countryName,
    geoResolved: buildOriginGeoResolved(originData)
  }
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

function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const earthRadiusKm = 6371
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(earthRadiusKm * c)
}

function resolveDistanceKm(originLocation, geo) {
  if (!originLocation || typeof originLocation.latitude !== 'number') {
    return typeof geo.distanceKm === 'number' ? geo.distanceKm : 0
  }

  const np = geo.nearestPlace
  const targetLat =
    np && typeof np.lat === 'number'
      ? np.lat
      : geo.antipode && typeof geo.antipode.latitude === 'number'
        ? geo.antipode.latitude
        : null
  const targetLng =
    np && typeof np.lng === 'number'
      ? np.lng
      : geo.antipode && typeof geo.antipode.longitude === 'number'
        ? geo.antipode.longitude
        : null

  if (targetLat === null || targetLng === null) {
    return typeof geo.distanceKm === 'number' ? geo.distanceKm : 0
  }

  return haversineDistanceKm(originLocation.latitude, originLocation.longitude, targetLat, targetLng)
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

function normalizeGeoData(data, originLocation) {
  if (!data) {
    return null
  }
  return {
    antipode: normalizeAntipode(data.antipode, originLocation),
    targetLocation: data.targetLocation,
    distanceKm: typeof data.distanceKm === 'number' ? data.distanceKm : 0,
    geoMeta: data.geoMeta || null,
    nearestPlace: data.nearestPlace || null,
    ocean: data.ocean || null,
    timezone: normalizeTimezoneForUse(data.timezone)
  }
}

async function resolveGeoData(originLocation, targetMode) {
  const geoResult = await invokeGeoResolver('resolveTarget', { originLocation, targetMode })
  if (!geoResult || !geoResult.success || !geoResult.data) {
    return {
      ok: false,
      message: geoResult && geoResult.message ? geoResult.message : 'Geo resolve failed'
    }
  }
  return { ok: true, data: normalizeGeoData(geoResult.data, originLocation) }
}

async function resolveCombinedGeo(originLocation, targetMode, enrichOrigin) {
  const res = await invokeGeoResolver('resolveCombined', {
    originLocation,
    targetMode,
    enrichOrigin: Boolean(enrichOrigin)
  })
  if (!res || !res.success || !res.data || !res.data.target) {
    return { ok: false, message: (res && res.message) || 'Geo resolve failed' }
  }
  return {
    ok: true,
    origin: res.data.origin || null,
    data: normalizeGeoData(res.data.target, originLocation)
  }
}

function geoUsable(geo) {
  return Boolean(
    geo &&
      geo.targetLocation &&
      typeof geo.targetLocation.landingMode === 'string' &&
      geo.timezone &&
      geo.timezone.timezoneId &&
      geo.geoMeta &&
      geo.geoMeta.source &&
      geo.geoMeta.source !== 'fallback'
  )
}

function readStoredGeo(profile) {
  const meta = profile.metadata || {}
  return {
    antipode: normalizeAntipode(profile.antipode, profile.originLocation),
    targetLocation: profile.targetLocation || null,
    distanceKm:
      profile.result && typeof profile.result.distanceKm === 'number'
        ? profile.result.distanceKm
        : 0,
    geoMeta: meta.geo || null,
    nearestPlace: meta.nearestPlace || null,
    ocean: meta.ocean || null,
    timezone: normalizeTimezoneForUse(meta.timezoneData || null)
  }
}

function buildResultFromGeo(originLocation, selectedAvatar, geo, existingVideoAsset) {
  const antipode = geo.antipode
  const timezone = geo.timezone
  const distanceKm = resolveDistanceKm(originLocation, geo)

  const result = buildActivityResult({
    selectedAvatar,
    distanceKm,
    geoMeta: geo.geoMeta,
    timezone,
    antipode
  })

  if (!result) {
    return { ok: false, message: 'Activity build failed' }
  }

  const videoAsset =
    resolveVideoAsset({ avatarRole: selectedAvatar.role, currentState: result.currentState }) ||
    existingVideoAsset ||
    null

  const antipodeLng =
    antipode && typeof antipode.longitude === 'number' ? antipode.longitude : undefined
  const activitySlotKey = computeActivitySlotKey(selectedAvatar.role, timezone, antipodeLng)

  return {
    ok: true,
    data: {
      antipode,
      targetLocation: geo.targetLocation,
      result,
      videoAsset,
      metadata: buildProfileMetadata({
        geoMeta: geo.geoMeta,
        nearestPlace: geo.nearestPlace,
        ocean: geo.ocean,
        timezone,
        result,
        videoAsset,
        activitySlotKey
      })
    }
  }
}

function needsOriginEnrich(originLocation) {
  if (!originLocation) {
    return false
  }
  return originLocation.mode === 'device' || originLocation.cityName === '当前位置'
}

function computeActivitySlotKey(role, timezone, antipodeLongitude) {
  const slot = getCurrentActivitySlot(role, timezone, new Date(), antipodeLongitude)
  if (!slot || !slot.localDateKey) {
    return null
  }
  return buildActivitySlotKey(role, slot.index, slot.localDateKey)
}

function getStoredTimelineCurrentIndex(result) {
  if (!result || !Array.isArray(result.timeline)) {
    return -1
  }
  const index = result.timeline.findIndex((item) => item && item.isCurrent)
  return index >= 0 ? index : -1
}

function needsActivityRefresh(profile, timezone, antipodeLongitude) {
  if (!profile || !profile.result) {
    return true
  }

  const selectedAvatar = normalizeSelectedAvatar(profile.selectedAvatar)
  const slot = getCurrentActivitySlot(selectedAvatar.role, timezone, new Date(), antipodeLongitude)
  if (!slot) {
    return true
  }

  const storedIndex = getStoredTimelineCurrentIndex(profile.result)
  return storedIndex !== slot.index
}

function profileIsUpToDate(profile, activitySlotKey, timezone, antipodeLongitude) {
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

  if (needsActivityRefresh(profile, timezone, antipodeLongitude)) {
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
    timezoneData: normalizeTimezoneForUse(timezone) || null,
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

async function buildProfileContent({
  originLocation,
  selectedAvatar,
  targetMode,
  enrichOrigin,
  existingVideoAsset
}) {
  const combined = await resolveCombinedGeo(originLocation, targetMode, enrichOrigin)
  if (!combined.ok) {
    return { ok: false, message: combined.message }
  }

  const resolvedOrigin = enrichOrigin
    ? mergeEnrichedOrigin(originLocation, combined.origin)
    : originLocation

  const built = buildResultFromGeo(resolvedOrigin, selectedAvatar, combined.data, existingVideoAsset)
  if (!built.ok) {
    return { ok: false, message: built.message }
  }

  return {
    ok: true,
    data: {
      originLocation: resolvedOrigin,
      ...built.data
    }
  }
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
  const forceRefresh = Boolean(options.forceRefresh)
  const targetMode = profile.targetMode || 'antipode'

  let originLocation = profile.originLocation
  let geo = readStoredGeo(profile)
  let geoChanged = false

  if (needsOriginEnrich(originLocation)) {
    const combined = await resolveCombinedGeo(originLocation, targetMode, true)
    if (combined.ok) {
      originLocation = mergeEnrichedOrigin(originLocation, combined.origin)
      geo = combined.data
      geoChanged = true
    } else {
      console.warn('[virtualProfile] refresh combined geo failed, keep stored geo:', combined.message)
    }
  } else if (!geoUsable(geo)) {
    const resolved = await resolveGeoData(originLocation, targetMode)
    if (resolved.ok) {
      geo = resolved.data
      geoChanged = true
    } else {
      console.warn('[virtualProfile] refresh geo failed, keep stored geo:', resolved.message)
    }
  }

  const antipodeLng =
    geo.antipode && typeof geo.antipode.longitude === 'number' ? geo.antipode.longitude : undefined
  const activitySlotKey = computeActivitySlotKey(selectedAvatar.role, geo.timezone, antipodeLng)

  if (!forceRefresh && !geoChanged && profileIsUpToDate(profile, activitySlotKey, geo.timezone, antipodeLng)) {
    return profile
  }

  const built = buildResultFromGeo(originLocation, selectedAvatar, geo, profile.videoAsset || null)
  if (!built.ok) {
    console.warn('[virtualProfile] refresh activity failed, keep stored result:', built.message)
    return profile
  }

  const updateData = {
    originLocation,
    antipode: built.data.antipode,
    profileName: `${selectedAvatar.name} · ${originLocation.cityName}的另一端`,
    targetLocation: built.data.targetLocation,
    result: built.data.result,
    videoAsset: built.data.videoAsset,
    metadata: built.data.metadata,
    updatedAt: db.serverDate()
  }

  try {
    await db.collection(PROFILES).doc(profile._id).update({ data: updateData })
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
