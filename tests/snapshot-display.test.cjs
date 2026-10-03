const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { runInNewContext } = require('node:vm')
const { stripTypeScriptTypes } = require('node:module')
const source = readFileSync('utils/snapshotDisplay.ts', 'utf8')
	.replace(/^import[\s\S]*?from ['"][^'"]+['"]\r?\n/gm, '')
	.replace(/export /g, '')
const { displayCharacterName, normalizeSnapshot } = runInNewContext(
	stripTypeScriptTypes(source) + '\n({displayCharacterName,normalizeSnapshot})'
)

function freeze(value) {
	if (value && typeof value === 'object') {
		for (const item of Object.values(value)) freeze(item)
		Object.freeze(value)
	}
	return value
}

test('旧快照只转换角色称呼和物品句，保留分享时刻、天气与原故事', () => {
	const snapshot = freeze({
		id: 'old-snapshot',
		capturedAt: '2025-02-01T03:04:05Z',
		avatar: { name: '自由生活者', role: 'freelancer' },
		originWorld: {
			place: '上海',
			date: '2025-02-01',
			time: '11:04',
			weather: { text: '晴', temperature: 8, date: '2025-02-01' }
		},
		targetWorld: {
			place: '地球另一端',
			date: '2025-01-31',
			time: '23:04',
			weather: { text: '多云', temperatureMin: 12, temperatureMax: 16, date: '2025-01-31' }
		},
		currentTitle: '阅读与休息',
		currentState: 'relaxing',
		todayMood: '自在松弛',
		currentDescription: '它留在小屋，阅读与休息。给它留出新的一页。',
		connectionText: '你这边是上午，对面还是昨天的深夜，它正在阅读与休息。',
		shareText: '分享时刻：它在阅读与休息。给它留出新的一页。',
		dailyStory: { date: '2025-01-31', title: '灵感本', text: '它给它留出新的一页。' },
		scene: {
			habitat: 'unknown_home',
			title: '远方的小屋',
			isDay: false,
			description: '灯光陪着它过今天的生活。'
		}
	})
	const original = JSON.stringify(snapshot)
	const normalized = normalizeSnapshot(snapshot)
	assert.notEqual(normalized, snapshot)
	assert.equal(JSON.stringify(snapshot), original)
	assert.equal(normalized.capturedAt, snapshot.capturedAt)
	assert.equal(normalized.originWorld, snapshot.originWorld)
	assert.equal(normalized.targetWorld, snapshot.targetWorld)
	assert.equal(normalized.originWorld.weather, snapshot.originWorld.weather)
	assert.equal(normalized.targetWorld.weather, snapshot.targetWorld.weather)
	assert.equal(normalized.dailyStory.date, '2025-01-31')
	assert.equal(normalized.dailyStory.title, '灵感本')
	assert.equal(normalized.dailyStory.text, '另一个我为这个想法留出新的一页。')
	assert.equal(
		normalized.currentDescription,
		'另一个我留在小屋，阅读与休息。为这个想法留出新的一页。'
	)
	assert.equal(normalized.scene.habitat, snapshot.scene.habitat)
	assert.equal(normalized.scene.isDay, snapshot.scene.isDay)
	assert.doesNotMatch(JSON.stringify(normalized), /它/)
	assert.equal(displayCharacterName(normalized), '另一个我')
})

test('有身份的新快照保持原对象与姓名，缺少身份显示另一个我', () => {
	const snapshot = freeze({
		character: { name: '洛安', gender: 'male' },
		currentDescription: '洛安正在看书。'
	})
	assert.equal(normalizeSnapshot(snapshot), snapshot)
	assert.equal(displayCharacterName(snapshot), '洛安')
	assert.equal(displayCharacterName(null), '另一个我')
	assert.equal(displayCharacterName({}), '另一个我')
})
