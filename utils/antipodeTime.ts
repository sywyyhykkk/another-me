import type { GeoTimezoneData } from '../types/virtualProfile'
import {
	estimateOffsetSecondsFromLongitude,
	normalizeTimezoneForUse,
	resolveTimezoneOffsetSeconds,
	wallClockFromUtcInstant
} from './timezoneNormalize'

function pad2(n: number) {
	return String(n).padStart(2, '0')
}

export function formatAntipodeLocalTime(
	timezone: GeoTimezoneData | null | undefined,
	date: Date = new Date(),
	fallback = '--:--',
	antipodeLongitude?: number
): string {
	const tz = normalizeTimezoneForUse(timezone)

	if (tz?.timezoneId) {
		try {
			return new Intl.DateTimeFormat('zh-CN', {
				timeZone: tz.timezoneId,
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			}).format(date)
		} catch {}
	}

	if (tz && typeof tz.rawOffset === 'number') {
		const offsetSec = resolveTimezoneOffsetSeconds(tz)
		if (offsetSec !== 0) {
			const { hour, minute } = wallClockFromUtcInstant(date, offsetSec)
			return `${pad2(hour)}:${pad2(minute)}`
		}
	}

	if (typeof antipodeLongitude === 'number') {
		const { hour, minute } = wallClockFromUtcInstant(
			date,
			estimateOffsetSecondsFromLongitude(antipodeLongitude)
		)
		return `${pad2(hour)}:${pad2(minute)}`
	}

	return fallback
}
