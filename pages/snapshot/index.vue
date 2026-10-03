<template>
	<view class="page">
		<text class="title">分享时刻的快照</text>
		<text class="subtitle">这是朋友在当时看到的两个世界</text>
		<view v-if="loading" class="empty">正在打开这一刻...</view>
		<view v-else-if="!snapshot" class="empty">
			<text>{{ error }}</text>
			<button @click="loadSnapshot">重新打开</button>
		</view>
		<template v-else>
			<WorldPair :origin="snapshot.originWorld" :target="snapshot.targetWorld" />
			<view class="card">
				<text class="eyebrow">{{ snapshot.avatar.name }} · 分享时刻</text>
				<text class="activity">{{ characterName }}正在{{ snapshot.currentTitle }}</text>
				<LifeScene
					:scene="snapshot.scene"
					:state="snapshot.currentState"
					:emoji="snapshot.avatar.emoji"
				/>
				<text class="description">{{ snapshot.currentDescription }}</text>
				<text class="connection">{{ snapshot.connectionText }}</text>
				<text class="story-title">{{ snapshot.dailyStory.title }}</text>
				<text class="description">{{ snapshot.dailyStory.text }}</text>
				<text class="subtitle">{{ snapshot.todayMood }} · 虚拟生活</text>
			</view>
			<text class="frozen">
				时间停留在分享时刻，{{ snapshot.originWorld.date }} {{ snapshot.originWorld.time }}（{{
					snapshot.originWorld.place
				}}）
			</text>
		</template>
		<button class="btn" @click="createMine">看看我的地球另一端</button>
	</view>
</template>
<script setup lang="ts">
	import { computed, ref } from 'vue'
	import { onLoad } from '@dcloudio/uni-app'
	import type { ShareSnapshot } from '../../types/virtualProfile'
	import { getShareSnapshot } from '../../api/share'
	import { displayCharacterName, normalizeSnapshot } from '../../utils/snapshotDisplay'
	import WorldPair from '../../components/WorldPair.vue'
	import LifeScene from '../../components/LifeScene.vue'
	const snapshot = ref<ShareSnapshot | null>(null)
	const loading = ref(true)
	const error = ref('')
	const characterName = computed(() => displayCharacterName(snapshot.value))
	let snapshotId = ''

	onLoad((options) => {
		snapshotId = options?.id || ''
		void loadSnapshot()
	})

	async function loadSnapshot() {
		loading.value = true

		try {
			snapshot.value = normalizeSnapshot(await getShareSnapshot(snapshotId))
		} catch {
			error.value = '这份分享快照暂时无法打开'
		} finally {
			loading.value = false
		}
	}

	function createMine() {
		uni.reLaunch({ url: '/pages/index/index?create=1' })
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
		margin: 14rpx 0 28rpx;
		line-height: 1.6;
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
		font-size: 27rpx;
		line-height: 1.7;
		color: #937153;
		margin: 24rpx 0;
	}
	.story-title {
		display: block;
		font-size: 28rpx;
		font-weight: 600;
		margin: 12rpx 0;
	}
	.frozen {
		display: block;
		font-size: 22rpx;
		line-height: 1.6;
		color: $am-text-muted;
		margin: 22rpx 8rpx;
	}
	.btn {
		background: $am-primary;
		color: white;
		border-radius: 48rpx;
		font-size: 28rpx;
		line-height: 88rpx;
		margin-top: 24rpx;
	}
	.empty {
		padding: 80rpx 0;
		text-align: center;
	}
</style>
