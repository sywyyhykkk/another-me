export interface Avatar {
	id: string
	name: string
	description: string
	avatarColor: string
}

export interface SessionData {
	selectedCity: string
	selectedAvatar: Avatar | null
	locationAuth?: boolean
	latitude?: number
	longitude?: number
}
