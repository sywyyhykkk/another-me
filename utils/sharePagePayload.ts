/** 首页与默认分享文案 */
export const HOME_SHARE_PAYLOAD = {
	title: '对面的我 — 看看地球另一端的你正在做什么',
	path: '/pages/index/index'
} as const

/** 供分享页 Options API 生命周期读取（微信要求编译期声明 onShareAppMessage） */
let cachedPayload = { ...HOME_SHARE_PAYLOAD }

export function updateSharePagePayload(payload: { title: string; path: string }) {
	cachedPayload = payload
}

export function getSharePagePayload() {
	return { ...cachedPayload }
}
