import type { GeoTimezoneData } from '../types/virtualProfile'

export function normalizeTimezoneForUse(
	timezone: GeoTimezoneData | null | undefined
): GeoTimezoneData | null {
	if (!timezone || typeof timezone !== 'object') {
		return null
	}

	const rawOffset =
		typeof timezone.rawOffset === 'number' && Math.abs(timezone.rawOffset) <= 18
			? Math.round(timezone.rawOffset * 3600)
			: timezone.rawOffset
	const dstOffset =
		typeof timezone.dstOffset === 'number' && Math.abs(timezone.dstOffset) <= 18
			? Math.round(timezone.dstOffset * 3600)
			: timezone.dstOffset

	return {
		timezoneId: timezone.timezoneId,
		time: timezone.time,
		countryCode: timezone.countryCode,
		countryName: timezone.countryName,
		rawOffset,
		dstOffset
	}
}

export function resolveTimezoneOffsetSeconds(timezone: GeoTimezoneData) {
	const pick =
		typeof timezone.dstOffset === 'number' ? timezone.dstOffset : timezone.rawOffset
	if (typeof pick !== 'number' || Number.isNaN(pick)) {
		return 0
	}
	if (Math.abs(pick) <= 18) {
		return Math.round(pick * 3600)
	}
	return Math.round(pick)
}

export function wallClockFromUtcInstant(at: Date, offsetSec: number) {
	const shifted = new Date(at.getTime() + offsetSec * 1000)
	const hour = shifted.getUTCHours()
	const minute = shifted.getUTCMinutes()
	return { hour, minute, localMinutes: hour * 60 + minute }
}

export function estimateOffsetSecondsFromLongitude(longitude: number) {
	if (typeof longitude !== 'number' || Number.isNaN(longitude)) {
		return 0
	}
	return Math.round(longitude / 15) * 3600
}
