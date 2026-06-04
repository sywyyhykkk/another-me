#!/usr/bin/env node
/**
 * 同步云开发资源：
 * - cloudfunctions/env.config.js → 各云函数目录
 * - cloudfunctions/_shared → virtualProfile/shared、activityEngine/shared
 * - ENV_ID → config/cloud.ts
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const ENV_SRC = path.join(ROOT, 'cloudfunctions/env.config.js')
const SHARED_SRC = path.join(ROOT, 'cloudfunctions/_shared')
const CLOUD_FN_NAMES = ['virtualProfile', 'geoResolver', 'activityEngine', 'assetResolver']
const SHARED_FN_NAMES = ['virtualProfile', 'activityEngine']

function copyFile(src, dest) {
	fs.mkdirSync(path.dirname(dest), { recursive: true })
	fs.copyFileSync(src, dest)
}

function copyDir(src, dest) {
	fs.rmSync(dest, { recursive: true, force: true })
	fs.mkdirSync(dest, { recursive: true })
	for (const name of fs.readdirSync(src)) {
		const from = path.join(src, name)
		const to = path.join(dest, name)
		if (fs.statSync(from).isDirectory()) {
			copyDir(from, to)
		} else {
			fs.copyFileSync(from, to)
		}
	}
}

function syncEnvConfig() {
	if (!fs.existsSync(ENV_SRC)) {
		console.error('[error] 缺少', ENV_SRC)
		process.exit(1)
	}

	const content = fs.readFileSync(ENV_SRC, 'utf8')
	const match = content.match(/ENV_ID:\s*['"]([^'"]+)['"]/)
	if (!match) {
		console.error('[error] env.config.js 中未找到 ENV_ID')
		process.exit(1)
	}

	for (const name of CLOUD_FN_NAMES) {
		const dest = path.join(ROOT, 'cloudfunctions', name, 'env.config.js')
		const fnContent = `/** 由 scripts/sync-cloud-assets.js 生成，勿手改 */\nmodule.exports = require('../env.config')\n`
		// 各函数部署包内不能 require 上级目录，写入完整内容
		copyFile(ENV_SRC, dest)
		console.log('[ok] env →', path.relative(ROOT, dest))
	}

	const tsPath = path.join(ROOT, 'config/cloud.ts')
	fs.writeFileSync(
		tsPath,
		`/** 由 scripts/sync-cloud-assets.js 根据 cloudfunctions/env.config.js 生成 */\nexport const WECHAT_CLOUD_ENV_ID = '${match[1]}'\n`
	)
	console.log('[ok] config/cloud.ts')
}

function syncShared() {
	if (!fs.existsSync(SHARED_SRC)) {
		console.error('[error] 缺少', SHARED_SRC)
		process.exit(1)
	}

	for (const name of SHARED_FN_NAMES) {
		const dest = path.join(ROOT, 'cloudfunctions', name, 'shared')
		copyDir(SHARED_SRC, dest)
		console.log('[ok] shared →', path.relative(ROOT, dest))
	}
}

syncEnvConfig()
syncShared()
console.log('云资源同步完成。')
