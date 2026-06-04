import type { AvatarRole, SelectedAvatar } from '../types/virtualProfile'

export interface CityPreset {
	name: string
	country: string
	latitude: number
	longitude: number
}

export const CITY_PRESETS: Record<string, CityPreset> = {
	北京: { name: '北京', country: '中国', latitude: 39.9042, longitude: 116.4074 },
	上海: { name: '上海', country: '中国', latitude: 31.2304, longitude: 121.4737 },
	广州: { name: '广州', country: '中国', latitude: 23.1291, longitude: 113.2644 },
	昆明: { name: '昆明', country: '中国', latitude: 25.0389, longitude: 102.7183 },
	成都: { name: '成都', country: '中国', latitude: 30.5728, longitude: 104.0668 },
	杭州: { name: '杭州', country: '中国', latitude: 30.2741, longitude: 120.1551 },
	深圳: { name: '深圳', country: '中国', latitude: 22.5431, longitude: 114.0579 },
	西安: { name: '西安', country: '中国', latitude: 34.3416, longitude: 108.9398 },
}

export const DEFAULT_CITY_PRESET = CITY_PRESETS['昆明']

/** 手动选城列表（与 CITY_PRESETS 一致，不含「当前位置」） */
export const MANUAL_CITY_NAMES = Object.keys(CITY_PRESETS).filter((name) => name !== '当前位置')

const AVATAR_ROLE_MAP: Record<string, AvatarRole> = {
	office: 'office_worker',
	office_worker: 'office_worker',
	student: 'student',
	free: 'freelancer',
	freelancer: 'freelancer',
	traveler: 'traveler'
}

const AVATAR_EMOJI_MAP: Record<string, string> = {
	office: '💼',
	office_worker: '💼',
	student: '📚',
	free: '☕',
	freelancer: '☕',
	traveler: '🎒'
}

export function getCityPreset(cityName: string): CityPreset {
	return CITY_PRESETS[cityName] || DEFAULT_CITY_PRESET
}

export function toSelectedAvatar(input: {
	id: string
	name: string
	description?: string
	role?: AvatarRole | string
	emoji?: string
}): SelectedAvatar {
	const role = (input.role && AVATAR_ROLE_MAP[input.role]) || AVATAR_ROLE_MAP[input.id] || 'office_worker'
	return {
		id: input.id,
		role,
		name: input.name,
		description: input.description,
		emoji: input.emoji || AVATAR_EMOJI_MAP[input.id] || '🙂'
	}
}

export const DEFAULT_SELECTED_AVATAR: SelectedAvatar = {
	id: 'office_worker',
	role: 'office_worker',
	name: '都市上班族',
	description: '认真工作，也可能正在摸鱼。',
	emoji: '💼'
}
