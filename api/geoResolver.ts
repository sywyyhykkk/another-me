import { callCloudFunction } from '../utils/wechatCloud'

export interface ResolveOriginNearestPlace {
	geonameId?: number
	name?: string
	countryName?: string
	countryCode?: string
	adminName1?: string
	lat?: number
	lng?: number
	distanceKm?: number
}

export interface ResolveOriginData {
	cityName: string
	countryName: string
	nearestPlace?: ResolveOriginNearestPlace | null
	timezone?: {
		timezoneId?: string
		countryCode?: string
		countryName?: string
	} | null
}

export interface ResolveOriginResponse {
	success: boolean
	data?: ResolveOriginData
	message?: string
}

export function resolveOriginLocation(latitude: number, longitude: number) {
	return callCloudFunction<ResolveOriginResponse>('geoResolver', {
		action: 'resolveOrigin',
		payload: { latitude, longitude }
	})
}
