import type { GeoTimezoneData } from '../types/virtualProfile'

function pad2(n: number) {
	return String(n).padStart(2, '0')
}

function formatFromOffsetSeconds(offsetSec: number, date: Date) {
	const utcMs = date.getTime() + date.getTimezoneOffset() * 60000
	const local = new Date(utcMs + offsetSec * 1000)
	return `${pad2(local.getUTCHours())}:${pad2(local.getUTCMinutes())}`
}

/**
 * 根据 geoResolver 写入的 timezoneData，用当前时刻计算对蹠点当地 HH:mm。
 */
export function formatAntipodeLocalTime(
	timezone: GeoTimezoneData | null | undefined,
	date: Date = new Date(),
	fallback = '--:--'
): string {
	if (!timezone) return fallback

	if (timezone.timezoneId) {
		try {
			return new Intl.DateTimeFormat('zh-CN', {
				timeZone: timezone.timezoneId,
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			}).format(date)
		} catch {
			// 无效 timezoneId，走 offset 回退
		}
	}

	if (typeof timezone.rawOffset === 'number') {
		const offsetSec =
			typeof timezone.dstOffset === 'number' ? timezone.dstOffset : timezone.rawOffset
		return formatFromOffsetSeconds(offsetSec, date)
	}

	return fallback
}

export function formatAntipodeWeekdayLabel(
	timezone: GeoTimezoneData | null | undefined,
	date: Date = new Date()
): string {
	if (!timezone?.timezoneId) return '当地时间'

	try {
		const weekday = new Intl.DateTimeFormat('zh-CN', {
			timeZone: timezone.timezoneId,
			weekday: 'long'
		}).format(date)
		return `当地时间 · ${weekday}`
	} catch {
		return timezone.timezoneId ? `当地时间 · ${timezone.timezoneId}` : '当地时间'
	}
}
