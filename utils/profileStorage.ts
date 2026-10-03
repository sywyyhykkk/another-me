import { getActiveVirtualProfile } from '../api/virtualProfile'
import type {
	CharacterGender,
	CharacterIdentity,
	ContinentCode,
	OriginLocation,
	TargetKind,
	StoredSelectedCity,
	StoredUserLocation,
	VirtualProfile,
	VirtualProfileResult
} from '../types/virtualProfile'

export const STORAGE_KEYS = {
	userLocation: 'otherMe:userLocation',
	locationMode: 'otherMe:locationMode',
	selectedCity: 'otherMe:selectedCity',
	selectedAvatar: 'otherMe:selectedAvatar',
	characterDraft: 'otherMe:characterDraft'
} as const

export interface CharacterDraft {
	originKey: string
	name: string
	gender: CharacterGender
	continent?: ContinentCode
	continentLabel?: string
	locationLabel?: string
	targetKind?: TargetKind
}

const CHARACTER_GENDERS: CharacterGender[] = ['male', 'female', 'unspecified']
const CONTINENT_CODES: ContinentCode[] = ['AS', 'EU', 'AF', 'NA', 'SA', 'OC', 'AN']

export function getCharacterOriginKey(
	origin: Pick<OriginLocation, 'mode' | 'latitude' | 'longitude'>
) {
	return `${origin.mode}:${origin.latitude}:${origin.longitude}`
}

export function getCharacterNameError(value: string) {
	if (/[\u0000-\u001f\u007f-\u009f]/u.test(value)) return '请使用正常文字填写名字'
	const name = value.trim()
	if (!name) return '请填写一个名字'
	if (Array.from(name).length > 12) return '名字最多 12 个字'
	if (name.includes('它')) return '请使用其他名字'
	return ''
}

export function getCachedCharacterDraft(
	origin?: Pick<OriginLocation, 'mode' | 'latitude' | 'longitude'>
): CharacterDraft | null {
	const draft = uni.getStorageSync(STORAGE_KEYS.characterDraft) as CharacterDraft | ''
	if (
		!draft ||
		typeof draft !== 'object' ||
		typeof draft.originKey !== 'string' ||
		typeof draft.name !== 'string' ||
		!CHARACTER_GENDERS.includes(draft.gender)
	)
		return null
	if (origin && draft.originKey !== getCharacterOriginKey(origin)) return null
	return {
		...draft,
		continent: CONTINENT_CODES.includes(draft.continent as ContinentCode)
			? draft.continent
			: undefined
	}
}

export function saveCharacterDraft(draft: CharacterDraft) {
	uni.setStorageSync(STORAGE_KEYS.characterDraft, draft)
}

export function getCachedCharacter(
	origin: Pick<OriginLocation, 'mode' | 'latitude' | 'longitude'>
): CharacterIdentity | null {
	const draft = getCachedCharacterDraft(origin)
	if (!draft?.continent || getCharacterNameError(draft.name)) return null
	return { name: draft.name.trim(), gender: draft.gender, continent: draft.continent }
}

export function invalidateCharacterDraftForOrigin(
	origin: Pick<OriginLocation, 'mode' | 'latitude' | 'longitude'>
) {
	const draft = getCachedCharacterDraft()
	if (draft && draft.originKey !== getCharacterOriginKey(origin))
		uni.removeStorageSync(STORAGE_KEYS.characterDraft)
}

export async function fetchActiveProfile(options?: {
	forceRefresh?: boolean
}): Promise<VirtualProfile | null> {
	const res = await getActiveVirtualProfile(
		options?.forceRefresh ? { forceRefresh: true } : undefined
	)
	if (!res.success) throw new Error(res.message || '获取档案失败')
	return res.exists && res.data ? res.data : null
}

export function redirectToHome() {
	uni.reLaunch({
		url: '/pages/index/index?create=1'
	})
}

export function clearOnboardingFlowCache() {
	uni.removeStorageSync(STORAGE_KEYS.characterDraft)
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
