import type { GeoTimezoneData, ProfileTimelineItem, VirtualProfileResult } from '../types/virtualProfile'
import {
	estimateOffsetSecondsFromLongitude,
	normalizeTimezoneForUse,
	resolveTimezoneOffsetSeconds,
	wallClockFromUtcInstant
} from './timezoneNormalize'

function parseTimeToMinutes(timeStr: string) {
	const parts = String(timeStr).split(':')
	const hour = Number(parts[0]) || 0
	const minute = Number(parts[1]) || 0
	return hour * 60 + minute
}

function getLocalMinutes(
	timezone: GeoTimezoneData | null | undefined,
	date: Date,
	antipodeLongitude?: number
) {
	const tz = normalizeTimezoneForUse(timezone)

	if (tz?.timezoneId) {
		try {
			const parts = new Intl.DateTimeFormat('en-GB', {
				timeZone: tz.timezoneId,
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			}).formatToParts(date)
			const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0)
			const minute = Number(parts.find((p) => p.type === 'minute')?.value || 0)
			return hour * 60 + minute
		} catch {}
	}

	if (tz && typeof tz.rawOffset === 'number') {
		const offsetSec = resolveTimezoneOffsetSeconds(tz)
		if (offsetSec !== 0) {
			return wallClockFromUtcInstant(date, offsetSec).localMinutes
		}
	}

	if (typeof antipodeLongitude === 'number') {
		return wallClockFromUtcInstant(
			date,
			estimateOffsetSecondsFromLongitude(antipodeLongitude)
		).localMinutes
	}

	return null
}

function getCurrentTimelineIndex(timeline: ProfileTimelineItem[], localMinutes: number) {
	let index = -1
	for (let i = 0; i < timeline.length; i++) {
		if (parseTimeToMinutes(timeline[i].time) <= localMinutes) {
			index = i
		}
	}
	return index === -1 ? 0 : index
}

const TITLE_MAP: Record<string, string> = {
	正在睡觉: '另一个你正在睡觉',
	准备睡觉: '另一个你准备入睡',
	起床: '另一个你刚起床',
	吃早餐: '另一个你正在吃早餐',
	早餐: '另一个你正在吃早餐',
	午餐: '另一个你正在吃午餐',
	晚餐: '另一个你正在吃晚餐',
	工作: '另一个你正在工作',
	继续工作: '另一个你正在工作',
	上课: '另一个你正在上课',
	继续学习: '另一个你正在学习',
	发呆: '另一个你正在发呆',
	放松: '另一个你正在放松',
	自由时间: '另一个你正在享受自由时间',
	处理事务: '另一个你正在处理事务',
	街头漫步: '另一个你正在街头漫步',
	探索远方: '另一个你正在探索远方',
	看风景: '另一个你正在看风景'
}

export function resolveLiveActivityDisplay(
	timezone: GeoTimezoneData | null | undefined,
	result: VirtualProfileResult | null | undefined,
	now: Date = new Date(),
	antipodeLongitude?: number
) {
	if (!result?.timeline?.length) {
		return {
			currentTitle: result?.currentTitle || '',
			currentDescription: result?.currentDescription || '',
			todayMood: result?.todayMood || '平静'
		}
	}

	const localMinutes = getLocalMinutes(timezone, now, antipodeLongitude)
	const liveIndex =
		typeof localMinutes === 'number'
			? getCurrentTimelineIndex(result.timeline, localMinutes)
			: result.timeline.findIndex((item) => item.isCurrent)
	const item = result.timeline[liveIndex >= 0 ? liveIndex : 0]
	const storedIndex = result.timeline.findIndex((t) => t.isCurrent)
	const inSync = storedIndex === liveIndex

	return {
		currentTitle: TITLE_MAP[item.title] || result.currentTitle,
		currentDescription: result.currentDescription,
		todayMood: inSync
			? result.todayMood
			: item.title === '正在睡觉'
				? '睡意朦胧'
				: result.todayMood
	}
}
