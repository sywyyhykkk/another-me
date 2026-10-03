import type { GeoTimezoneData } from '../types/virtualProfile'
import { clockAt } from './world'
export function formatAntipodeLocalTime(
	timezone: GeoTimezoneData | null | undefined,
	date = new Date(),
	fallback = '--:--',
	longitude?: number
): string {
	return timezone || typeof longitude === 'number'
		? clockAt(timezone, date, longitude || 0).time
		: fallback
}
