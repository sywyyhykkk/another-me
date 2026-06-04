import type { Avatar, SessionData } from '../types/index'

const STORAGE_KEY = 'another_me_session'

const DEFAULT_SESSION: SessionData = {
	selectedCity: '昆明',
	selectedAvatar: null
}

export function getSession(): SessionData {
	const data = uni.getStorageSync(STORAGE_KEY) as SessionData | ''
	if (data && typeof data === 'object') {
		return {
			selectedCity: data.selectedCity || DEFAULT_SESSION.selectedCity,
			selectedAvatar: data.selectedAvatar || null,
			locationAuth: data.locationAuth,
			latitude: data.latitude,
			longitude: data.longitude
		}
	}
	return { ...DEFAULT_SESSION }
}

function saveSession(session: SessionData) {
	uni.setStorageSync(STORAGE_KEY, session)
}

export function setSelectedCity(city: string) {
	const session = getSession()
	session.selectedCity = city
	saveSession(session)
}

export function setSelectedAvatar(avatar: Avatar) {
	const session = getSession()
	session.selectedAvatar = avatar
	saveSession(session)
}

export function setLocation(latitude: number, longitude: number) {
	const session = getSession()
	session.locationAuth = true
	session.latitude = latitude
	session.longitude = longitude
	session.selectedCity = '当前位置'
	saveSession(session)
}

export function setLocationDenied() {
	const session = getSession()
	session.locationAuth = false
	saveSession(session)
}
