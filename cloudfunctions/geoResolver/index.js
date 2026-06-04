const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

const GEO_CACHE = 'geo_cache'
const APP_CONFIG = 'app_config'
const ERR_COLLECTION_NOT_EXISTS = -502005
const GEONAMES_BASE = 'https://secure.geonames.org'
const HTTPS_TIMEOUT_MS = 8000

let geoCacheCollectionReady = false

exports.main = async (event, context) => {
  try {
    const { action, payload } = event || {}

    switch (action) {
      case 'resolveTarget':
        return await resolveTarget(payload)
      case 'resolveOrigin':
        return await resolveOrigin(payload)
      default:
        return {
          success: false,
          message: 'Unknown action'
        }
    }
  } catch (error) {
    console.error('[geoResolver] error:', error)
    return {
      success: false,
      message: error && error.message ? error.message : 'Internal error'
    }
  }
}

async function resolveOrigin(payload) {
  if (!validateCoordinates(payload)) {
    return { success: false, message: 'Invalid payload' }
  }

  const geonamesUsername = await getGeonamesUsername()
  if (!geonamesUsername) {
    return { success: false, message: 'Missing GEONAMES_USERNAME' }
  }

  const { latitude, longitude } = payload
  const point = { latitude, longitude }

  const nearestPlace = await fetchNearestPlace(latitude, longitude, geonamesUsername)
  const timezone = await fetchTimezone(point, nearestPlace, geonamesUsername)

  const cityName =
    (nearestPlace && nearestPlace.name) || formatCoordCityLabel(latitude, longitude)
  const countryName =
    (timezone && timezone.countryName) ||
    (nearestPlace && nearestPlace.countryName) ||
    '未知国家'

  console.log('[geoResolver] resolveOrigin:', { cityName, countryName, latitude, longitude })

  return {
    success: true,
    data: {
      cityName,
      countryName,
      nearestPlace: nearestPlace || null,
      timezone: timezone || null
    }
  }
}

function validateCoordinates(coords) {
  if (!coords) return false
  return (
    typeof coords.latitude === 'number' &&
    typeof coords.longitude === 'number' &&
    !Number.isNaN(coords.latitude) &&
    !Number.isNaN(coords.longitude)
  )
}

function formatCoordCityLabel(latitude, longitude) {
  const latDir = latitude >= 0 ? '北纬' : '南纬'
  const lngDir = longitude >= 0 ? '东经' : '西经'
  return `${latDir}${Math.abs(latitude).toFixed(1)}°${lngDir}${Math.abs(longitude).toFixed(1)}°`
}

async function resolveTarget(payload) {
  if (!validateOriginLocation(payload && payload.originLocation)) {
    return { success: false, message: 'Invalid payload' }
  }

  const originLocation = payload.originLocation
  const targetMode = (payload && payload.targetMode) || 'antipode'

  if (targetMode === 'custom_location') {
    return { success: false, message: 'custom_location is not supported in V1' }
  }

  const geonamesUsername = await getGeonamesUsername()
  if (!geonamesUsername) {
    return { success: false, message: 'Missing GEONAMES_USERNAME' }
  }

  const antipode = getAntipode(originLocation.latitude, originLocation.longitude)
  const roundedAntipode = {
    latitude: roundCoord(antipode.latitude),
    longitude: roundCoord(antipode.longitude)
  }
  const cacheId = buildGeoCacheId(roundedAntipode.latitude, roundedAntipode.longitude)

  await ensureGeoCacheCollection()

  const cached = await getGeoCache(cacheId)
  if (cached && isGeoCacheComplete(cached)) {
    console.log('[geoResolver] cache hit:', cacheId, {
      hasNearestPlace: Boolean(cached.nearestPlace),
      hasOcean: Boolean(cached.ocean),
      timezoneId: cached.timezone && cached.timezone.timezoneId
    })
    return {
      success: true,
      data: buildResponseData({
        antipode: cached.antipode,
        targetLocation: cached.targetLocation,
        distanceKm: computeDistanceKm(
          originLocation,
          cached.antipode,
          cached.nearestPlace || null
        ),
        nearestPlace: cached.nearestPlace || null,
        ocean: cached.ocean || null,
        timezone: cached.timezone || null,
        geoMeta: {
          resolverVersion: 1,
          source: 'geonames_cache',
          timezone: cached.timezone && cached.timezone.timezoneId,
          countryCode:
            (cached.timezone && cached.timezone.countryCode) ||
            (cached.nearestPlace && cached.nearestPlace.countryCode),
          cached: true
        }
      })
    }
  }

  if (cached) {
    console.warn('[geoResolver] incomplete cache, re-resolving:', cacheId, {
      hasNearestPlace: Boolean(cached.nearestPlace),
      hasOcean: Boolean(cached.ocean),
      timezoneId: cached.timezone && cached.timezone.timezoneId
    })
  }

  try {
    const geoData = await resolveWithGeoNames(
      originLocation,
      antipode,
      roundedAntipode,
      geonamesUsername
    )
    await saveGeoCache(cacheId, antipode, roundedAntipode, geoData)

    return {
      success: true,
      data: buildResponseData({
        antipode,
        targetLocation: geoData.targetLocation,
        distanceKm: geoData.distanceKm,
        nearestPlace: geoData.nearestPlace,
        ocean: geoData.ocean,
        timezone: geoData.timezone,
        geoMeta: {
          resolverVersion: 1,
          source: 'geonames',
          timezone: geoData.timezone && geoData.timezone.timezoneId,
          countryCode:
            (geoData.timezone && geoData.timezone.countryCode) ||
            (geoData.nearestPlace && geoData.nearestPlace.countryCode),
          cached: false
        }
      })
    }
  } catch (error) {
    console.warn('[geoResolver] GeoNames resolve failed, using fallback:', error)
    return {
      success: true,
      data: buildFallbackGeoData(
        originLocation,
        antipode,
        roundedAntipode,
        error.message || 'GeoNames failed'
      )
    }
  }
}

function buildResponseData({
  antipode,
  targetLocation,
  distanceKm,
  nearestPlace,
  ocean,
  timezone,
  geoMeta
}) {
  return {
    targetMode: 'antipode',
    antipode,
    targetLocation,
    geoMeta,
    distanceKm: typeof distanceKm === 'number' ? distanceKm : 0,
    nearestPlace: nearestPlace || null,
    ocean: ocean || null,
    timezone: timezone || null
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

/** 20km 内有城市：对蹠点到该城距离；否则：用户位置到对蹠点的大圆距离 */
function computeDistanceKm(originLocation, antipode, nearestPlace) {
  if (nearestPlace) {
    return nearestPlace.distanceKm
  }
  return haversineDistanceKm(
    originLocation.latitude,
    originLocation.longitude,
    antipode.latitude,
    antipode.longitude
  )
}

function buildFallbackGeoData(originLocation, antipode, roundedAntipode, reason) {
  const targetLocation = {
    latitude: antipode.latitude,
    longitude: antipode.longitude,
    locationLabel: `${Math.abs(antipode.latitude).toFixed(1)}°${antipode.latitude >= 0 ? 'N' : 'S'}, ${Math.abs(antipode.longitude).toFixed(1)}°${antipode.longitude >= 0 ? 'E' : 'W'} 附近`,
    countryName: '未知区域',
    regionName: antipode.latitude >= 0 ? '北半球' : '南半球',
    nearestLivingArea: '最近的人类生活区域附近',
    landingMode: 'near_land',
    usesProxyLivingArea: true,
    proxyReason: '暂时无法连接地理服务，已使用坐标结果作为展示参考。'
  }

  return buildResponseData({
    antipode,
    targetLocation,
    distanceKm: computeDistanceKm(originLocation, antipode, null),
    nearestPlace: null,
    ocean: null,
    timezone: null,
    geoMeta: {
      resolverVersion: 1,
      source: 'fallback',
      cached: false,
      errorReason: reason
    }
  })
}

function isGeoCacheComplete(cached) {
  return Boolean(cached && cached.timezone && cached.timezone.timezoneId)
}

async function resolveWithGeoNames(originLocation, antipode, roundedAntipode, username) {
  console.log('[geoResolver] resolveWithGeoNames start:', {
    lat: antipode.latitude,
    lng: antipode.longitude
  })

  const nearestPlace = await fetchNearestPlace(antipode.latitude, antipode.longitude, username)
  console.log('[geoResolver] fetchNearestPlace result:', nearestPlace
    ? {
        name: nearestPlace.name,
        distanceKm: nearestPlace.distanceKm,
        countryCode: nearestPlace.countryCode
      }
    : null)

  let ocean = null
  if (!nearestPlace || nearestPlace.distanceKm > 80) {
    ocean = await fetchOcean(antipode.latitude, antipode.longitude, username)
    console.log('[geoResolver] fetchOcean result:', ocean)
  } else {
    console.log('[geoResolver] fetchOcean skipped (near land within 80km)')
  }

  const timezone = await fetchTimezone(antipode, nearestPlace, username)
  console.log('[geoResolver] fetchTimezone result:', timezone
    ? {
        timezoneId: timezone.timezoneId,
        countryCode: timezone.countryCode,
        time: timezone.time
      }
    : null)

  const targetLocation = buildTargetLocation({
    antipode,
    nearestPlace,
    ocean,
    timezone
  })
  const distanceKm = computeDistanceKm(originLocation, antipode, nearestPlace)

  console.log('[geoResolver] distanceKm:', distanceKm, {
    usedOriginToAntipode: !nearestPlace
  })

  return {
    targetLocation,
    distanceKm,
    nearestPlace,
    ocean,
    timezone
  }
}

async function getGeonamesUsername() {
  try {
    const res = await db.collection(APP_CONFIG).doc('geonames').get()
    if (res.data && res.data.username) {
      return res.data.username
    }
  } catch (error) {
    console.warn('[geoResolver] read app_config geonames failed:', error)
  }

  return ''
}

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

async function ensureGeoCacheCollection() {
  if (geoCacheCollectionReady) {
    return
  }

  if (await collectionExists(GEO_CACHE)) {
    geoCacheCollectionReady = true
    return
  }

  try {
    await db.createCollection(GEO_CACHE)
    console.log('[geoResolver] collection created:', GEO_CACHE)
  } catch (error) {
    if (!(await collectionExists(GEO_CACHE))) {
      console.warn('[geoResolver] ensure geo_cache collection failed:', error)
    }
  }

  geoCacheCollectionReady = true
}

async function getGeoCache(cacheId) {
  try {
    const res = await db.collection(GEO_CACHE).doc(cacheId).get()
    if (res.data && res.data.cacheKey) {
      return res.data
    }
    return null
  } catch (error) {
    return null
  }
}

async function saveGeoCache(cacheId, antipode, roundedAntipode, geoData) {
  const data = {
    cacheKey: cacheId,
    antipode,
    roundedAntipode,
    targetLocation: geoData.targetLocation,
    nearestPlace: geoData.nearestPlace || null,
    ocean: geoData.ocean || null,
    timezone: geoData.timezone || null,
    distanceKm: geoData.distanceKm || 0,
    source: 'geonames',
    resolverVersion: 1,
    updatedAt: db.serverDate()
  }

  try {
    const existing = await getGeoCache(cacheId)
    if (existing) {
      await db.collection(GEO_CACHE).doc(cacheId).update({ data })
    } else {
      await db.collection(GEO_CACHE).doc(cacheId).set({
        data: {
          ...data,
          createdAt: db.serverDate()
        }
      })
    }
  } catch (error) {
    console.warn('[geoResolver] save cache failed:', error)
  }
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

function getAntipode(latitude, longitude) {
  const antipodeLatitude = -latitude
  const antipodeLongitude = longitude >= 0 ? longitude - 180 : longitude + 180

  return {
    latitude: Number(antipodeLatitude.toFixed(6)),
    longitude: Number(antipodeLongitude.toFixed(6))
  }
}

function roundCoord(value) {
  return Number(value.toFixed(2))
}

function buildGeoCacheId(lat, lng) {
  const safeLat = String(lat).replace('-', 'm').replace('.', 'p')
  const safeLng = String(lng).replace('-', 'm').replace('.', 'p')
  return `anti_${safeLat}_${safeLng}_v1`
}

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let raw = ''

      res.on('data', (chunk) => {
        raw += chunk
      })

      res.on('end', () => {
        clearTimeout(timer)
        try {
          resolve(JSON.parse(raw))
        } catch (error) {
          reject(error)
        }
      })
    })

    const timer = setTimeout(() => {
      req.destroy()
      reject(new Error('GeoNames request timeout'))
    }, HTTPS_TIMEOUT_MS)

    req.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
  })
}

async function fetchNearestPlace(lat, lng, username) {
  const url =
    `${GEONAMES_BASE}/findNearbyPlaceNameJSON` +
    `?lat=${encodeURIComponent(lat)}` +
    `&lng=${encodeURIComponent(lng)}` +
    `&radius=20` +
    `&maxRows=10` +
    `&cities=cities1000` +
    `&lang=en` +
    `&username=${encodeURIComponent(username)}`

  try {
    console.log('[geoResolver] fetchNearestPlace url:', url)
    const data = await httpsGetJson(url)
    if (data.status) {
      console.warn('[geoResolver] findNearbyPlaceName status:', data.status)
      return null
    }

    const item = data.geonames && data.geonames[0]
    if (!item) {
      return null
    }

    return {
      geonameId: item.geonameId,
      name: item.name,
      countryName: item.countryName,
      countryCode: item.countryCode,
      adminName1: item.adminName1,
      lat: Number(item.lat),
      lng: Number(item.lng),
      distanceKm: Number(item.distance || 0)
    }
  } catch (error) {
    console.warn('[geoResolver] fetchNearestPlace failed:', error)
    return null
  }
}

async function fetchOcean(lat, lng, username) {
  const url =
    `${GEONAMES_BASE}/oceanJSON` +
    `?lat=${encodeURIComponent(lat)}` +
    `&lng=${encodeURIComponent(lng)}` +
    `&username=${encodeURIComponent(username)}`

  try {
    console.log('[geoResolver] fetchOcean url:', url)
    const data = await httpsGetJson(url)
    if (data.status) {
      console.warn('[geoResolver] oceanJSON status:', data.status)
      return null
    }

    if (!data.ocean) {
      return null
    }

    return {
      name: data.ocean.name
    }
  } catch (error) {
    console.warn('[geoResolver] fetchOcean failed:', error)
    return null
  }
}

async function fetchTimezone(antipode, nearestPlace, username) {
  const lat = nearestPlace ? nearestPlace.lat : antipode.latitude
  const lng = nearestPlace ? nearestPlace.lng : antipode.longitude

  const url =
    `${GEONAMES_BASE}/timezoneJSON` +
    `?lat=${encodeURIComponent(lat)}` +
    `&lng=${encodeURIComponent(lng)}` +
    `&username=${encodeURIComponent(username)}`

  try {
    console.log('[geoResolver] fetchTimezone url:', url)
    const data = await httpsGetJson(url)
    if (data.status) {
      console.warn('[geoResolver] timezoneJSON status:', data.status)
      return null
    }

    return {
      timezoneId: data.timezoneId,
      time: data.time,
      countryCode: data.countryCode,
      countryName: data.countryName,
      rawOffset: data.rawOffset,
      dstOffset: data.dstOffset
    }
  } catch (error) {
    console.warn('[geoResolver] fetchTimezone failed:', error)
    return null
  }
}

function buildTargetLocation({ antipode, nearestPlace, ocean, timezone }) {
  if (nearestPlace && nearestPlace.distanceKm <= 80) {
    return {
      latitude: antipode.latitude,
      longitude: antipode.longitude,
      locationLabel: `${nearestPlace.name} 附近`,
      countryName: nearestPlace.countryName || (timezone && timezone.countryName) || '未知国家',
      regionName: nearestPlace.adminName1 || '未知区域',
      nearestLivingArea: `${nearestPlace.name}, ${nearestPlace.countryName}`,
      landingMode: 'near_land',
      usesProxyLivingArea: true,
      proxyReason: '已使用最近生活区域作为展示参考。'
    }
  }

  if (ocean) {
    return {
      latitude: antipode.latitude,
      longitude: antipode.longitude,
      locationLabel: `${ocean.name} 附近`,
      countryName: ocean.name,
      regionName: antipode.latitude >= 0 ? '北半球' : '南半球',
      nearestLivingArea: nearestPlace
        ? `${nearestPlace.name}, ${nearestPlace.countryName}`
        : '最近的人类生活区域附近',
      landingMode: 'deep_ocean',
      usesProxyLivingArea: true,
      proxyReason: '精确对蹠点位于海上，已使用最近生活区域作为展示参考。'
    }
  }

  if (nearestPlace) {
    return {
      latitude: antipode.latitude,
      longitude: antipode.longitude,
      locationLabel: `${nearestPlace.countryName || '地球另一端'}附近`,
      countryName: nearestPlace.countryName || '未知区域',
      regionName: nearestPlace.adminName1 || '未知区域',
      nearestLivingArea: `${nearestPlace.name}, ${nearestPlace.countryName}`,
      landingMode: 'near_land',
      usesProxyLivingArea: true,
      proxyReason: '精确对蹠点附近缺少大型城市，已使用最近生活区域作为展示参考。'
    }
  }

  return {
    latitude: antipode.latitude,
    longitude: antipode.longitude,
    locationLabel: `${Math.abs(antipode.latitude).toFixed(1)}°${antipode.latitude >= 0 ? 'N' : 'S'}, ${Math.abs(antipode.longitude).toFixed(1)}°${antipode.longitude >= 0 ? 'E' : 'W'} 附近`,
    countryName: '未知区域',
    regionName: antipode.latitude >= 0 ? '北半球' : '南半球',
    nearestLivingArea: '最近的人类生活区域附近',
    landingMode: 'near_land',
    usesProxyLivingArea: true,
    proxyReason: '已使用最近生活区域作为展示参考。'
  }
}
