import type { ShareSnapshot } from '../types/virtualProfile'

export function displayCharacterName(
	value: { character?: { name: string } } | null | undefined
): string {
	return value?.character?.name?.trim() || '另一个我'
}

// 旧分享只调整展示文字，仍沿用原快照的时间、环境与天气。
export function normalizeSnapshot(snapshot: ShareSnapshot): ShareSnapshot {
	if (snapshot.character) return snapshot
	const text = (value: string) =>
		value.replace(/给它留出新的一页/g, '为这个想法留出新的一页').replace(/它/g, '另一个我')
	return {
		...snapshot,
		currentDescription: text(snapshot.currentDescription),
		connectionText: text(snapshot.connectionText),
		shareText: text(snapshot.shareText),
		dailyStory: { ...snapshot.dailyStory, text: text(snapshot.dailyStory.text) },
		scene: { ...snapshot.scene, description: text(snapshot.scene.description) }
	}
}
