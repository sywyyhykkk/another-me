import { getActiveVirtualProfile } from '../api/virtualProfile'
import type {
	StoredSelectedCity,
	StoredUserLocation,
	VirtualProfile,
	VirtualProfileResult
} from '../types/virtualProfile'

export const STORAGE_KEYS = {
	userLocation: 'otherMe:userLocation',
	locationMode: 'otherMe:locationMode',
	selectedCity: 'otherMe:selectedCity',
	selectedAvatar: 'otherMe:selectedAvatar'
} as const

export async function fetchActiveProfileFromCloud(options?: {
	forceRefresh?: boolean
}): Promise<VirtualProfile | null> {
	try {
		const res = await getActiveVirtualProfile(
			options?.forceRefresh ? { forceRefresh: true } : undefined
		)
		if (res.success && res.exists && res.data) {
			return res.data
		}
	} catch (error) {
		console.warn('[profileStorage] fetchActiveProfileFromCloud failed', error)
	}

	return null
}

export function redirectToHome() {
	uni.reLaunch({
		url: '/pages/index/index'
	})
}

export function clearOnboardingFlowCache() {
	uni.removeStorageSync(STORAGE_KEYS.selectedAvatar)
	uni.removeStorageSync(STORAGE_KEYS.selectedCity)
	uni.removeStorageSync(STORAGE_KEYS.userLocation)
	uni.removeStorageSync(STORAGE_KEYS.locationMode)
	uni.removeStorageSync('another_me_session')
}

export function getCachedUserLocation(): StoredUserLocation | null {
	const location = uni.getStorageSync(STORAGE_KEYS.userLocation) as StoredUserLocation | ''
	if (location && typeof location === 'object') {
		return location
	}
	return null
}

export function getCachedLocationMode(): 'device' | 'manual' | '' {
	const mode = uni.getStorageSync(STORAGE_KEYS.locationMode) as 'device' | 'manual' | ''
	return mode || ''
}

export function getCachedSelectedCity(): StoredSelectedCity | null {
	const city = uni.getStorageSync(STORAGE_KEYS.selectedCity) as StoredSelectedCity | string | ''
	if (city && typeof city === 'object' && city.name) {
		return city
	}
	return null
}

export function getCachedSelectedAvatar() {
	const avatar = uni.getStorageSync(STORAGE_KEYS.selectedAvatar)
	if (avatar && typeof avatar === 'object') {
		return avatar
	}
	return null
}

export function formatCoordinates(latitude: number, longitude: number) {
	const latDir = latitude >= 0 ? '北纬' : '南纬'
	const lngDir = longitude >= 0 ? '东经' : '西经'
	return `${latDir} ${Math.abs(latitude).toFixed(2)}°，${lngDir} ${Math.abs(longitude).toFixed(2)}°`
}

export function formatDistanceKm(distanceKm: number) {
	return `约 ${Math.round(distanceKm).toLocaleString()} km`
}

export function getCurrentTimelineLabel(result: VirtualProfileResult | null) {
	if (!result) return ''
	const current = result.timeline.find((item) => item.isCurrent)
	return current?.title || result.currentTitle.replace('另一个你正在', '') || ''
}
