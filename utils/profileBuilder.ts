import type { CreateVirtualProfilePayload, OriginLocation, SelectedAvatar } from '../types/virtualProfile'
import { resolveOriginLocation } from '../api/geoResolver'
import {
	CITY_PRESETS,
	DEFAULT_CITY_PRESET,
	DEFAULT_SELECTED_AVATAR,
	getCityPreset,
	toSelectedAvatar
} from './cityPresets'
import {
	getCachedLocationMode,
	getCachedSelectedAvatar,
	getCachedSelectedCity,
	getCachedUserLocation
} from './profileStorage'
import { getSession } from './session'

export async function buildCreateProfilePayload(): Promise<CreateVirtualProfilePayload> {
	const originLocation = await buildOriginLocation()
	const selectedAvatar = buildSelectedAvatar()

	return {
		originLocation,
		selectedAvatar,
		targetMode: 'antipode',
		profileName: `${selectedAvatar.name} · ${originLocation.cityName}的另一端`
	}
}

export async function buildOriginLocation(): Promise<OriginLocation> {
	const locationMode = getCachedLocationMode()
	const selectedCity = getCachedSelectedCity()
	const userLocation = getCachedUserLocation()
	const session = getSession()

	if (locationMode === 'manual' && selectedCity) {
		return {
			mode: 'manual',
			cityName: selectedCity.name,
			countryName: selectedCity.country || '中国',
			latitude: selectedCity.latitude,
			longitude: selectedCity.longitude
		}
	}

	if (locationMode === 'manual' && session.selectedCity) {
		const preset = getCityPreset(session.selectedCity)
		return {
			mode: 'manual',
			cityName: preset.name,
			countryName: preset.country,
			latitude: preset.latitude,
			longitude: preset.longitude
		}
	}

	if (locationMode === 'device' && userLocation) {
		return enrichDeviceOriginLocation({
			mode: 'device',
			cityName: '当前位置',
			countryName: '中国',
			latitude: userLocation.latitude,
			longitude: userLocation.longitude,
			accuracy: userLocation.accuracy
		})
	}

	return {
		mode: 'manual',
		cityName: DEFAULT_CITY_PRESET.name,
		countryName: DEFAULT_CITY_PRESET.country,
		latitude: DEFAULT_CITY_PRESET.latitude,
		longitude: DEFAULT_CITY_PRESET.longitude
	}
}

export async function enrichDeviceOriginLocation(
	originLocation: OriginLocation
): Promise<OriginLocation> {
	if (originLocation.mode !== 'device' && originLocation.cityName !== '当前位置') {
		return originLocation
	}

	try {
		const res = await resolveOriginLocation(
			originLocation.latitude,
			originLocation.longitude
		)
		if (res.success && res.data) {
			return {
				...originLocation,
				mode: 'device',
				cityName: res.data.cityName,
				countryName: res.data.countryName
			}
		}
		console.warn('[profileBuilder] resolveOrigin failed:', res.message)
	} catch (error) {
		console.warn('[profileBuilder] resolveOrigin error:', error)
	}

	return originLocation
}

export function buildSelectedAvatar(): SelectedAvatar {
	const cachedAvatar = getCachedSelectedAvatar() as SelectedAvatar | null
	if (cachedAvatar && cachedAvatar.id && cachedAvatar.name) {
		return toSelectedAvatar(cachedAvatar)
	}

	const session = getSession()
	if (session.selectedAvatar) {
		return toSelectedAvatar({
			id: session.selectedAvatar.id,
			name: session.selectedAvatar.name,
			description: session.selectedAvatar.description
		})
	}

	return DEFAULT_SELECTED_AVATAR
}

export { CITY_PRESETS }
