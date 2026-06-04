export interface Avatar {
	id: string
	name: string
	description: string
	avatarColor: string
}

export interface TimelineItem {
	time: string
	activity: string
	isCurrent?: boolean
}

export interface MockResult {
	localTime: string
	antipodeLocation: string
	dayStatus: string
	currentActivity: string
	antipodeCoords: string
	nearestArea: string
	distance: string
	currentStatusLabel: string
}

export interface SessionData {
	selectedCity: string
	selectedAvatar: Avatar | null
	locationAuth?: boolean
	latitude?: number
	longitude?: number
}
