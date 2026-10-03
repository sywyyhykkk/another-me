export const HOME_SHARE_PAYLOAD = {
	title: '对面的我 — 看看地球另一端的你正在做什么',
	path: '/pages/index/index'
}
let cachedPayload: {
	title: string
	path: string
	imageUrl?: string
} = { ...HOME_SHARE_PAYLOAD }

export function updateSharePagePayload(payload: Partial<typeof cachedPayload>) {
	cachedPayload = { ...cachedPayload, ...payload }
}

export function getSharePagePayload() {
	return { ...cachedPayload }
}
