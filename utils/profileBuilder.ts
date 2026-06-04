import type { CreateVirtualProfilePayload, OriginLocation, SelectedAvatar } from '../types/virtualProfile'
import { resolveOriginLocation } from '../api/geoResolver'
import {
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

	if (locationMode === 'manual' && selectedCity) {
		return {
			mode: 'manual',
			cityName: selectedCity.name,
			countryName: selectedCity.country || '中国',
			latitude: selectedCity.latitude,
			longitude: selectedCity.longitude
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

async function enrichDeviceOriginLocation(originLocation: OriginLocation): Promise<OriginLocation> {
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

	return DEFAULT_SELECTED_AVATAR
}
