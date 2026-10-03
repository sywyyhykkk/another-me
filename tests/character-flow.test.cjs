const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { runInNewContext } = require('node:vm')
const { stripTypeScriptTypes } = require('node:module')

function source(path) {
	return stripTypeScriptTypes(
		readFileSync(path, 'utf8')
			.replace(/^import[\s\S]*?from ['"][^'"]+['"]\r?\n/gm, '')
			.replace(/export /g, '')
	)
}

function flow() {
	const saved = new Map()
	const uni = {
		getStorageSync: (key) => saved.get(key) || '',
		setStorageSync: (key, value) => saved.set(key, value),
		removeStorageSync: (key) => saved.delete(key)
	}
	const storage = runInNewContext(
		source('utils/profileStorage.ts') +
			'\n;({STORAGE_KEYS,getCharacterOriginKey,getCharacterNameError,getCachedCharacterDraft,saveCharacterDraft,getCachedCharacter,invalidateCharacterDraftForOrigin,clearOnboardingFlowCache,getCachedLocationMode,getCachedSelectedCity,getCachedSelectedAvatar,getCachedUserLocation})',
		{ uni }
	)
	const presets = runInNewContext(
		source('utils/cityPresets.ts') +
			'\n;({DEFAULT_CITY_PRESET,DEFAULT_SELECTED_AVATAR,getCityPreset,toSelectedAvatar})'
	)
	const builder = runInNewContext(
		source('utils/profileBuilder.ts') + '\n;({buildCreateProfilePayload})',
		{
			...storage,
			...presets,
			resolveOriginLocation: async () => ({
				success: true,
				data: { cityName: '上海', countryName: '中国' }
			})
		}
	)
	return { saved, uni, ...storage, ...builder }
}

const origin = { mode: 'manual', latitude: 31.2304, longitude: 121.4737 }
const identity = { name: '卢西亚', gender: 'female', continent: 'SA' }
const plain = (value) => JSON.parse(JSON.stringify(value))

test('名字按Unicode字符计数，允许文化姓名空格并拒绝空名、超长或控制字符', () => {
	const api = flow()
	for (const name of ['卢西亚', '  Anna Maria  ', '😀'.repeat(12)])
		assert.equal(api.getCharacterNameError(name), '')
	for (const name of ['', '  ', '😀'.repeat(13), '它', '名字\n换行', '\n名字', '名字\u0000'])
		assert.ok(api.getCharacterNameError(name), name)
})

test('同位置返回保留姓名性别草稿，变更完整坐标后不复用旧身份', () => {
	const api = flow()
	api.saveCharacterDraft({ originKey: api.getCharacterOriginKey(origin), ...identity })
	assert.deepEqual(plain(api.getCachedCharacter(origin)), identity)
	assert.equal(api.getCachedCharacter({ ...origin, latitude: origin.latitude + 0.000001 }), null)
	api.invalidateCharacterDraftForOrigin(origin)
	assert.equal(api.getCachedCharacter(origin).name, identity.name)
	api.invalidateCharacterDraftForOrigin({ ...origin, longitude: 120 })
	assert.equal(api.getCachedCharacterDraft(), null)
})

test('创建请求分别携带个人身份和职业，缺资料或起点改变时停止创建', async () => {
	const api = flow()
	api.uni.setStorageSync(api.STORAGE_KEYS.locationMode, 'manual')
	api.uni.setStorageSync(api.STORAGE_KEYS.selectedCity, {
		name: '上海',
		country: '中国',
		latitude: origin.latitude,
		longitude: origin.longitude
	})
	api.uni.setStorageSync(api.STORAGE_KEYS.selectedAvatar, {
		id: 'student',
		name: '学生',
		role: 'student'
	})
	await assert.rejects(api.buildCreateProfilePayload(), /完成名字和性别设置/)
	api.saveCharacterDraft({
		originKey: api.getCharacterOriginKey(origin),
		...identity,
		name: '  卢西亚  '
	})
	const payload = await api.buildCreateProfilePayload()
	assert.deepEqual(plain(payload.character), identity)
	assert.equal(payload.selectedAvatar.name, '学生')
	assert.equal(payload.profileName, '卢西亚 · 上海的另一端')
	api.uni.setStorageSync(api.STORAGE_KEYS.selectedCity, {
		name: '杭州',
		latitude: 30.2741,
		longitude: 120.1551
	})
	await assert.rejects(api.buildCreateProfilePayload(), /完成名字和性别设置/)
	api.clearOnboardingFlowCache()
	assert.equal(api.saved.size, 0)
})
