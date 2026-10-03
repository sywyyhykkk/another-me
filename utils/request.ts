import { API_BASE_URL } from '../config/api'
import type { ApiResponse } from '../types/virtualProfile'

type Method = 'GET' | 'POST' | 'DELETE'
interface Session {
	token: string
	expiresAt: number
}
interface HttpResult<T> {
	statusCode: number
	data: T
}
const SESSION_KEY = 'otherMe:authSession'
let loginPromise: Promise<Session> | null = null

function send<T>(
	path: string,
	method: Method,
	data?: object,
	token?: string
): Promise<HttpResult<T>> {
	return new Promise((resolve, reject) => {
		uni.request({
			url: `${API_BASE_URL}${path}`,
			method,
			data,
			timeout: 60000,
			header: {
				'Content-Type': 'application/json',
				...(token ? { Authorization: `Bearer ${token}` } : {})
			},
			success: (res) => resolve({ statusCode: res.statusCode, data: res.data as T }),
			fail: (error) => reject(new Error(error.errMsg || '网络请求失败'))
		})
	})
}

function getLoginCode(): Promise<string> {
	return new Promise((resolve, reject) => {
		uni.login({
			provider: 'weixin',
			success: (res) => (res.code ? resolve(res.code) : reject(new Error('未获取到微信登录凭证'))),
			fail: (error) => reject(new Error(error.errMsg || '微信登录失败'))
		})
	})
}

export function ensureWechatSession(): Promise<Session> {
	if (loginPromise) return loginPromise
	const saved = uni.getStorageSync(SESSION_KEY) as Session | ''
	if (saved && saved.token && saved.expiresAt > Date.now() + 30000) return Promise.resolve(saved)
	loginPromise = (async () => {
		const code = await getLoginCode()
		const res = await send<ApiResponse<Session>>('/auth/login', 'POST', { code })
		if (
			res.statusCode < 200 ||
			res.statusCode >= 300 ||
			!res.data.success ||
			!res.data.data?.token
		) {
			throw new Error(res.data.message || '微信登录失败')
		}
		uni.setStorageSync(SESSION_KEY, res.data.data)
		return res.data.data
	})().finally(() => {
		loginPromise = null
	})
	return loginPromise
}

export async function requestApi<T>(
	path: string,
	method: Method = 'GET',
	data?: object
): Promise<T> {
	let session = await ensureWechatSession()
	let res = await send<T & { message?: string }>(path, method, data, session.token)
	if (res.statusCode === 401) {
		// 同时过期的多个请求共用一次登录；迟到的 401 不清除刚取得的新会话。
		const current = uni.getStorageSync(SESSION_KEY) as Session | ''
		if (current && current.token === session.token) uni.removeStorageSync(SESSION_KEY)
		session = await ensureWechatSession()
		res = await send<T & { message?: string }>(path, method, data, session.token)
	}
	if (res.statusCode < 200 || res.statusCode >= 300) {
		throw new Error(res.data?.message || `请求失败（${res.statusCode}）`)
	}
	return res.data
}

// 访客快照读取不登录，也不会调用任何私人档案接口。
export async function requestPublicApi<T>(path: string): Promise<T> {
	const res = await send<T & { message?: string }>(path, 'GET')
	if (res.statusCode < 200 || res.statusCode >= 300)
		throw new Error(res.data?.message || '分享快照暂时无法打开')
	return res.data
}
