import { getActiveVirtualProfile } from '../api/virtualProfile'
import type {
	StoredSelectedCity,
	StoredUserLocation,
	VirtualProfile,
	VirtualProfileResult
} from '../types/virtualProfile'

/** 仅用于创建流程的临时本地状态（定位、选城、选形象），不含虚拟形象档案 */
export const STORAGE_KEYS = {
	userLocation: 'otherMe:userLocation',
	locationMode: 'otherMe:locationMode',
	selectedCity: 'otherMe:selectedCity',
	selectedAvatar: 'otherMe:selectedAvatar'
} as const

/**
 * 从云数据库（virtualProfile.getActive）拉取当前激活的虚拟形象。
 * getActive 会在云端按需刷新档案：同一对端当地日程时段内复用缓存，不重复调用 geo/activity 云函数。
 * 传 forceRefresh: true 可强制重新拉取 geo/activity 并写回档案。
 * 档案数据只存云端，不写入本地缓存。
 */
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

/** 创建流程中的临时数据（重新选择时清理） */
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
