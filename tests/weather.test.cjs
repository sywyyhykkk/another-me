const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { runInNewContext } = require('node:vm')
const { stripTypeScriptTypes } = require('node:module')
const source = readFileSync('utils/weather.ts', 'utf8')
	.replace(/^import[\s\S]*?from ['"][^'"]+['"]\r?\n/gm, '')
	.replace(/export /g, '')
const helpers = runInNewContext(
	stripTypeScriptTypes(source) + '\n({weatherVisual,weatherTemperature})'
)
const snapshotSource = readFileSync('utils/snapshotDisplay.ts', 'utf8')
	.replace(/^import[\s\S]*?from ['"][^'"]+['"]\r?\n/gm, '')
	.replace(/export /g, '')
const snapshotHelpers = runInNewContext(
	stripTypeScriptTypes(snapshotSource) + '\n;({displayCharacterName,normalizeSnapshot})'
)
test('天气图标覆盖昼夜、雨雪雾与未知状态，预报不伪装实况温度', () => {
	assert.equal(helpers.weatherVisual('100', true).asset, 'clear-day')
	assert.equal(helpers.weatherVisual('100', false).asset, 'clear-night')
	assert.equal(helpers.weatherVisual('151', false).asset, 'partly-cloudy-night')
	assert.equal(helpers.weatherVisual('305', true).motion, 'rain')
	assert.equal(helpers.weatherVisual('302', false).motion, 'storm')
	assert.equal(helpers.weatherVisual('400', true).asset, 'snow')
	assert.equal(helpers.weatherVisual('404', false).asset, 'sleet')
	assert.equal(helpers.weatherVisual('501', true).asset, 'fog')
	assert.equal(helpers.weatherVisual('503', true).asset, 'dust')
	assert.equal(helpers.weatherVisual('999', true).asset, 'not-available')
	assert.equal(helpers.weatherTemperature({ period: 'hourly', temperature: 17.9 }), '18°')
	assert.equal(
		helpers.weatherTemperature({ period: 'daily', temperatureMin: 15.1, temperatureMax: 21.4 }),
		'15° / 21°'
	)
})
test('分享海报固定天气素材、天气和温度，微信相对素材路径能从子页面加载', async () => {
	const source = readFileSync('utils/poster.ts', 'utf8')
		.replace(/^import[\s\S]*?from ['"][^'"]+['"]\r?\n/gm, '')
		.replace(/export /g, '')
	const text = [],
		images = []
	const ctx = new Proxy(
		{
			fillText: (value) => text.push(value),
			drawImage: (path) => images.push(path),
			measureText: (value) => ({ width: [...value].length * 12 }),
			draw: (_, done) => done()
		},
		{ get: (target, key) => target[key] || (() => {}) }
	)
	const uni = {
		getImageInfo: ({ src, success }) => success({ path: src.slice(1) }),
		createCanvasContext: () => ctx,
		canvasToTempFilePath: ({ success }) => success({ tempFilePath: 'poster.png' })
	}
	const { drawPoster, drawShareCard, renderPoster } = runInNewContext(
		stripTypeScriptTypes(source) + '\n({drawPoster,drawShareCard,renderPoster})',
		{ ...helpers, ...snapshotHelpers, uni }
	)
	const snapshot = {
		avatar: { name: '旅行者' },
		character: { name: '洛安', gender: 'male' },
		scene: { isDay: false, habitat: 'boat_cabin', title: '船上小屋' },
		currentTitle: '睡觉',
		currentState: 'sleeping',
		currentDescription: '安静休息',
		connectionText: '连接两边',
		dailyStory: { title: '小事', text: '今天的小事' },
		originWorld: {
			place: '昆明',
			time: '12:49',
			date: '2026-10-02',
			relativeDay: '今天',
			isDay: true,
			dayNight: '白昼',
			timeLabel: 'Asia/Shanghai',
			weather: { period: 'hourly', code: '100', text: '晴', temperature: 22 }
		},
		targetWorld: {
			place: 'South Pacific Ocean',
			time: '23:49',
			date: '2026-10-01',
			relativeDay: '昨天',
			isDay: false,
			dayNight: '夜晚',
			timeLabel: 'UTC-5',
			weather: {
				period: 'daily',
				code: '101',
				text: '多云',
				temperatureMin: 15,
				temperatureMax: 21
			}
		}
	}
	const paths = { 'clear-day': 'sun.png', 'partly-cloudy-night': 'night-cloud.png' }
	drawPoster(ctx, snapshot, paths)
	drawShareCard(ctx, snapshot, paths)
	assert.deepEqual(images, ['sun.png', 'night-cloud.png', 'sun.png', 'night-cloud.png'])
	for (const value of ['晴', '多云', '22°', '15° / 21°', '天气服务由和风天气提供'])
		assert.ok(text.includes(value))
	assert.equal(await renderPoster(snapshot, 'worldPoster', {}), 'poster.png')
	assert.deepEqual(images.slice(-2), [
		'/static/weather/clear-day.png',
		'/static/weather/partly-cloudy-night.png'
	])
})
