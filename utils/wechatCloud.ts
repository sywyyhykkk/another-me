import { WECHAT_CLOUD_ENV_ID } from '../config/cloud'
import type { WechatWxWithCloud } from '../types/wx-cloud'

let hasCloudInited = false

function getWx(): WechatWxWithCloud | undefined {
	// #ifdef MP-WEIXIN
	const wxGlobal = (globalThis as Record<string, unknown>).wx as WechatWxWithCloud | undefined
	return wxGlobal
	// #endif

	// #ifndef MP-WEIXIN
	return undefined
	// #endif
}

function isWechatCloudAvailable(): boolean {
	// #ifdef MP-WEIXIN
	const wxGlobal = getWx()
	return typeof wxGlobal !== 'undefined' && !!wxGlobal?.cloud
	// #endif

	// #ifndef MP-WEIXIN
	return false
	// #endif
}

export function initWechatCloud(): boolean {
	// #ifdef MP-WEIXIN
	if (hasCloudInited) {
		return true
	}

	if (!isWechatCloudAvailable()) {
		console.warn('[cloud] wx.cloud is not available')
		return false
	}

	const wxGlobal = getWx()
	wxGlobal!.cloud!.init({
		env: WECHAT_CLOUD_ENV_ID,
		traceUser: true
	})

	hasCloudInited = true
	return true
	// #endif

	// #ifndef MP-WEIXIN
	return false
	// #endif
}

export async function callCloudFunction<T = unknown>(
	name: string,
	data: Record<string, unknown> = {}
): Promise<T> {
	// #ifdef MP-WEIXIN
	const ok = initWechatCloud()
	const wxGlobal = getWx()

	if (!ok || !wxGlobal?.cloud) {
		throw new Error('微信云开发仅在微信小程序环境可用')
	}

	try {
		const res = await wxGlobal.cloud.callFunction<T>({
			name,
			data
		})

		return res.result as T
	} catch (error) {
		console.error(`[cloud] callFunction failed: ${name}`, error)
		throw error
	}
	// #endif

	// #ifndef MP-WEIXIN
	throw new Error('微信云开发仅在微信小程序环境可用')
	// #endif
}
