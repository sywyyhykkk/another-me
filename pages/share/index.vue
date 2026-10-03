<template>
	<view class="page">
		<text class="title">分享这一刻</text>
		<text class="subtitle">两个世界的时间和故事，会停留在这一刻</text>
		<view v-if="loading" class="empty">正在准备快照...</view>
		<view v-else-if="!snapshot" class="empty">
			<text>{{ error }}</text>
			<button @click="prepare">重试</button>
		</view>
		<template v-else>
			<WorldPair :origin="snapshot.originWorld" :target="snapshot.targetWorld" />
			<view class="card">
				<text class="eyebrow">{{ snapshot.avatar.name }} · 分享时刻的快照</text>
				<text class="activity">{{ characterName }}正在{{ snapshot.currentTitle }}</text>
				<LifeScene
					:scene="snapshot.scene"
					:state="snapshot.currentState"
					:emoji="snapshot.avatar.emoji"
				/>
				<text class="description">{{ snapshot.currentDescription }}</text>
				<text class="connection">{{ snapshot.connectionText }}</text>
				<text class="description">
					{{ snapshot.dailyStory.title }} · {{ snapshot.dailyStory.text }}
				</text>
			</view>
			<button class="btn primary" open-type="share">分享给朋友</button>
			<button class="btn secondary" :disabled="saving" @click="handleSave">
				{{ saving ? '正在制作海报...' : '保存双世界海报' }}
			</button>
			<button class="refresh" :disabled="loading" @click="prepare">更新为现在这一刻</button>
			<text v-if="posterError" class="error">{{ posterError }}</text>
		</template>
		<canvas canvas-id="worldCard" class="poster-canvas" style="width: 600px; height: 480px" />
		<canvas canvas-id="worldPoster" class="poster-canvas" style="width: 600px; height: 920px" />
	</view>
</template>
<script setup lang="ts">
	import { computed, ref, getCurrentInstance, nextTick } from 'vue'
	import { onLoad } from '@dcloudio/uni-app'
	import type { ShareSnapshot } from '../../types/virtualProfile'
	import { createShareSnapshot } from '../../api/share'
	import { renderPoster, savePoster } from '../../utils/poster'
	import { updateSharePagePayload } from '../../utils/sharePagePayload'
	import { displayCharacterName, normalizeSnapshot } from '../../utils/snapshotDisplay'
	import WorldPair from '../../components/WorldPair.vue'
	import LifeScene from '../../components/LifeScene.vue'
	const snapshot = ref<ShareSnapshot | null>(null)
	const loading = ref(true)
	const saving = ref(false)
	const error = ref('')
	const posterError = ref('')
	const characterName = computed(() => displayCharacterName(snapshot.value))
	const component = getCurrentInstance()?.proxy
	let posterPath = ''

	async function prepare() {
		loading.value = true
		snapshot.value = null
		posterPath = ''
		posterError.value = ''
		updateSharePagePayload({
			title: '对面的我',
			path: '/pages/index/index',
			imageUrl: undefined
		})

		try {
			snapshot.value = normalizeSnapshot(await createShareSnapshot())
			const preparedSnapshot = snapshot.value
			updateSharePagePayload({
				title: `${preparedSnapshot.originWorld.place} ${preparedSnapshot.originWorld.time} / ${preparedSnapshot.targetWorld.place} ${preparedSnapshot.targetWorld.time}：${displayCharacterName(preparedSnapshot)}正在${preparedSnapshot.currentTitle}`,
				path: `/pages/snapshot/index?id=${preparedSnapshot.id}`
			})
			await nextTick()

			try {
				const images = await Promise.all([
					renderPoster(preparedSnapshot, 'worldPoster', component),
					renderPoster(preparedSnapshot, 'worldCard', component, 'card')
				])
				posterPath = images[0]
				updateSharePagePayload({ imageUrl: images[1] })
			} catch {
				posterError.value = '海报暂未生成，点击保存可以重试'
			}
		} catch (e) {
			error.value = e instanceof Error ? e.message : '快照准备失败'
		} finally {
			loading.value = false
		}
	}

	onLoad(() => {
		void prepare()
	})

	async function handleSave() {
		if (!snapshot.value || saving.value) {
			return
		}

		saving.value = true

		try {
			if (!posterPath) {
				posterPath = await renderPoster(snapshot.value, 'worldPoster', component)
			}

			await savePoster(posterPath)
			posterError.value = ''
		} catch {
			posterError.value = '海报制作失败，请重试'
		} finally {
			saving.value = false
		}
	}
</script>
<script lang="ts">
	import { getSharePagePayload } from '../../utils/sharePagePayload'
	export default {
		onShareAppMessage() {
			return getSharePagePayload()
		}
	}
</script>
<style lang="scss" scoped>
	.page {
		min-height: 100vh;
		box-sizing: border-box;
		padding: calc(var(--status-bar-height) + 110rpx) 28rpx calc(50rpx + env(safe-area-inset-bottom));
		background: $am-bg;
		color: $am-text;
	}
	.title {
		display: block;
		font-size: 38rpx;
		font-weight: 600;
	}
	.subtitle {
		display: block;
		font-size: 24rpx;
		color: $am-text-muted;
		line-height: 1.6;
		margin: 14rpx 0 28rpx;
	}
	.card {
		background: $am-card;
		padding: 28rpx;
		margin: 24rpx 0;
		border-radius: 28rpx;
		border: 2rpx solid $am-border;
	}
	.eyebrow {
		font-size: 23rpx;
		color: $am-text-muted;
	}
	.activity {
		display: block;
		font-size: 34rpx;
		font-weight: 600;
		line-height: 1.5;
		margin-top: 14rpx;
	}
	.description {
		display: block;
		font-size: 26rpx;
		line-height: 1.7;
	}
	.connection {
		display: block;
		color: #937153;
		font-size: 27rpx;
		line-height: 1.7;
		margin: 24rpx 0;
	}
	.btn {
		font-size: 28rpx;
		border-radius: 48rpx;
		margin: 20rpx 0;
		line-height: 88rpx;
	}
	.primary {
		background: $am-primary;
		color: white;
	}
	.secondary {
		background: $am-card;
		border: 2rpx solid $am-border;
		color: $am-text;
	}
	.refresh {
		background: transparent;
		font-size: 24rpx;
		color: $am-text-muted;
	}
	.refresh::after {
		border: 0;
	}
	.poster-canvas {
		position: fixed;
		left: -2000px;
		top: 0;
		pointer-events: none;
	}
	.empty {
		padding: 80rpx 0;
		text-align: center;
	}
	.error {
		display: block;
		font-size: 23rpx;
		color: #a05e4c;
		text-align: center;
	}
</style>
