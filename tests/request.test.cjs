const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { stripTypeScriptTypes } = require('node:module')
const { runInNewContext } = require('node:vm')

function client(handler, saved) {
	const storage = new Map(saved ? [['otherMe:authSession', saved]] : [])
	const requests = []
	let logins = 0
	const uni = {
		getStorageSync: (key) => storage.get(key) || '',
		setStorageSync: (key, value) => storage.set(key, value),
		removeStorageSync: (key) => storage.delete(key),
		login: (options) => {
			logins++
			setImmediate(() => options.success({ code: `code-${logins}` }))
		},
		request: (options) => {
			requests.push(options)
			Promise.resolve()
				.then(() => handler(options))
				.then(
					(response) => options.success(response),
					(error) => options.fail({ errMsg: error.message })
				)
		}
	}
	const config = readFileSync(join(__dirname, '../config/api.ts'), 'utf8').replace(/export /g, '')
	const source = readFileSync(join(__dirname, '../utils/request.ts'), 'utf8')
		.replace(/^import[\s\S]*?from ['"][^'"]+['"]\r?\n/gm, '')
		.replace(/export /g, '')
	const api = runInNewContext(
		`${stripTypeScriptTypes(config + '\n' + source)}\n({requestApi, ensureWechatSession, requestPublicApi})`,
		{ uni }
	)
	return { ...api, requests, storage, logins: () => logins }
}

const session = (token) => ({ token, expiresAt: Date.now() + 3600000 })
const response = (data) => ({ statusCode: 200, data })

test('首次并发请求共用一次微信登录，持久化会话并携带身份', async () => {
	const api = client((options) =>
		options.url.endsWith('/auth/login')
			? response({ success: true, data: session('new-token') })
			: response({ success: true })
	)
	await Promise.all([
		api.requestApi('/profiles/active'),
		api.requestApi('/geo/origin', 'POST', { latitude: 31, longitude: 121 })
	])
	assert.equal(api.logins(), 1)
	assert.equal(api.requests.filter((r) => r.url.endsWith('/auth/login')).length, 1)
	assert.ok(
		api.requests
			.filter((r) => !r.url.endsWith('/auth/login'))
			.every((r) => r.header.Authorization === 'Bearer new-token')
	)
	assert.equal(api.storage.get('otherMe:authSession').token, 'new-token')
})

test('有效会话直接复用，并保留 DELETE 请求参数', async () => {
	const api = client(() => response({ success: true }), session('cached-token'))
	await api.requestApi('/profiles', 'DELETE', { deleteActive: true })
	assert.equal(api.logins(), 0)
	assert.equal(api.requests[0].method, 'DELETE')
	assert.equal(api.requests[0].data.deleteActive, true)
	assert.equal(api.requests[0].header.Authorization, 'Bearer cached-token')
})

test('本地会话过期后自动重新登录', async () => {
	const api = client(
		(options) =>
			options.url.endsWith('/auth/login')
				? response({ success: true, data: session('renewed') })
				: response({ success: true }),
		{ token: 'expired', expiresAt: Date.now() - 1 }
	)
	await api.requestApi('/profiles/active')
	assert.equal(api.logins(), 1)
	assert.equal(api.requests.at(-1).header.Authorization, 'Bearer renewed')
})

test('迟到的 401 不会清除新会话或触发重复登录', async () => {
	const api = client(async (options) => {
		if (options.url.endsWith('/auth/login'))
			return response({ success: true, data: session('renewed') })
		if (options.header.Authorization === 'Bearer old') {
			if (options.url.endsWith('/slow')) await new Promise((resolve) => setTimeout(resolve, 30))
			return { statusCode: 401, data: { message: '会话过期' } }
		}
		return response({ success: true })
	}, session('old'))
	await Promise.all([api.requestApi('/fast'), api.requestApi('/slow')])
	assert.equal(api.logins(), 1)
	assert.equal(api.storage.get('otherMe:authSession').token, 'renewed')
})

test('重新登录后仍返回 401 时停止重试', async () => {
	const api = client(
		(options) =>
			options.url.endsWith('/auth/login')
				? response({ success: true, data: session('renewed') })
				: { statusCode: 401, data: { message: '登录已过期' } },
		session('old')
	)
	await assert.rejects(api.requestApi('/profiles/active'), /登录已过期/)
	assert.equal(api.logins(), 1)
	assert.equal(api.requests.filter((r) => !r.url.endsWith('/auth/login')).length, 2)
})

test('登录失败可再次尝试，服务与网络错误不会被当作成功', async () => {
	let attempts = 0
	const api = client((options) => {
		if (options.url.endsWith('/auth/login')) {
			attempts++
			return attempts === 1
				? { statusCode: 503, data: { message: '微信登录尚未配置' } }
				: response({ success: true, data: session('valid') })
		}
		if (options.url.endsWith('/offline')) throw new Error('request:fail network')
		return { statusCode: 503, data: { message: '地理服务暂时不可用' } }
	})
	await assert.rejects(api.requestApi('/profiles/active'), /微信登录尚未配置/)
	await assert.rejects(api.requestApi('/geo/origin', 'POST'), /地理服务暂时不可用/)
	await assert.rejects(api.requestApi('/offline'), /network/)
	assert.equal(api.logins(), 2)
})

test('访客快照只调用公开接口，不登录、不读取私人档案', async () => {
	const api = client(() => response({ success: true, data: { id: 'public-snapshot' } }))
	const result = await api.requestPublicApi('/shares/public-snapshot')
	assert.equal(result.data.id, 'public-snapshot')
	assert.equal(api.logins(), 0)
	assert.equal(api.requests.length, 1)
	assert.ok(!api.requests[0].header.Authorization)
})
