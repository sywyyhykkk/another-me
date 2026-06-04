<template>
	<view v-if="isLoading" class="page page--loading">
		<text class="loading-text">正在加载...</text>
	</view>
	<view v-else-if="activeProfile" class="page">
		<view class="header">
			<text class="title">另一个我的今天</text>
			<text class="subtitle">
				当地时间 {{ displayLocalTime }} · {{ displayLocationLabel }}
			</text>
		</view>

		<view class="current card">
			<text class="current-label">现在</text>
			<text class="current-text">{{ currentLabel }}</text>
		</view>

		<view class="timeline card">
			<view
				v-for="(item, index) in timeline"
				:key="`${item.time}-${item.title}`"
				class="timeline-item"
				:class="{ 'timeline-item--current': item.isCurrent }"
			>
				<view class="timeline-left">
					<view class="timeline-dot" />
					<view v-if="index < timeline.length - 1" class="timeline-line" />
				</view>
				<view class="timeline-content">
					<text class="timeline-time">{{ item.time }}</text>
					<text class="timeline-activity">{{ item.title }}</text>
				</view>
			</view>
		</view>

		<view class="footer">
			<button class="btn btn-primary" @click="goBack">返回结果页</button>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import type { VirtualProfile } from '../../types/virtualProfile'
import { formatAntipodeLocalTime } from '../../utils/antipodeTime'
import {
	fetchActiveProfileFromCloud,
	getCurrentTimelineLabel,
	redirectToHome
} from '../../utils/profileStorage'

const activeProfile = ref<VirtualProfile | null>(null)
const isLoading = ref(true)

onLoad(() => {
	loadProfile({ showFullPageLoading: true })
})

onShow(() => {
	if (activeProfile.value && !isLoading.value) {
		loadProfile({ silent: true })
	}
})

async function loadProfile(options: { showFullPageLoading?: boolean; silent?: boolean } = {}) {
	const { showFullPageLoading = false, silent = false } = options

	if (showFullPageLoading) {
		isLoading.value = true
	}

	let profile: VirtualProfile | null = null
	try {
		profile = await fetchActiveProfileFromCloud()
	} catch (error) {
		console.warn('[timeline] loadProfile failed', error)
		if (showFullPageLoading || !activeProfile.value) {
			if (showFullPageLoading) isLoading.value = false
			redirectToHome()
			return
		}
		if (!silent) {
			uni.showToast({ title: '更新失败', icon: 'none' })
		}
		return
	}

	if (showFullPageLoading) {
		isLoading.value = false
	}

	if (!profile || !profile.result) {
		if (showFullPageLoading || !activeProfile.value) {
			redirectToHome()
			return
		}
		if (!silent) {
			uni.showToast({ title: '更新失败', icon: 'none' })
		}
		return
	}

	activeProfile.value = profile
}

const displayResult = computed(() => activeProfile.value!.result)

const displayLocalTime = computed(() =>
	formatAntipodeLocalTime(
		activeProfile.value?.metadata?.timezoneData,
		new Date(),
		'--:--',
		activeProfile.value?.targetLocation?.longitude
	)
)

const displayLocationLabel = computed(() => activeProfile.value!.targetLocation.locationLabel)

const timeline = computed(() => displayResult.value.timeline)

const currentLabel = computed(() => getCurrentTimelineLabel(displayResult.value))

function goBack() {
	uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.page {
	min-height: 100vh;
	padding: 200rpx 40rpx 64rpx;
	background: $am-bg;
	box-sizing: border-box;
}

.page--loading {
	display: flex;
	align-items: center;
	justify-content: center;
}

.loading-text {
	font-size: 28rpx;
	color: $am-text-muted;
}

.header {
	margin-bottom: 24rpx;
}

.title {
	display: block;
	font-size: 40rpx;
	font-weight: 600;
	color: $am-text;
	margin-bottom: 12rpx;
}

.subtitle {
	display: block;
	font-size: 28rpx;
	color: $am-text-muted;
}

.card {
	background: $am-card;
	border-radius: $am-radius;
	border: 2rpx solid $am-border;
	box-shadow: $am-shadow-soft;
}

.current {
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 24rpx 32rpx;
	margin-bottom: 24rpx;
	background: rgba(143, 185, 150, 0.15);
	border-color: rgba(143, 185, 150, 0.4);
}

.current-label {
	font-size: 24rpx;
	color: $am-secondary;
	background: rgba(143, 185, 150, 0.2);
	padding: 6rpx 16rpx;
	border-radius: 20rpx;
}

.current-text {
	font-size: 30rpx;
	font-weight: 600;
	color: $am-text;
}

.timeline {
	padding: 32rpx;
}

.timeline-item {
	display: flex;
	gap: 20rpx;
}

.timeline-left {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 24rpx;
	padding-top: 8rpx;
}

.timeline-dot {
	width: 16rpx;
	height: 16rpx;
	border-radius: 50%;
	background: $am-border;
	flex-shrink: 0;
}

.timeline-line {
	flex: 1;
	width: 2rpx;
	min-height: 48rpx;
	background: $am-border;
	margin: 8rpx 0;
}

.timeline-content {
	flex: 1;
	padding-bottom: 32rpx;
}

.timeline-item:last-child .timeline-content {
	padding-bottom: 0;
}

.timeline-time {
	display: block;
	font-size: 26rpx;
	color: $am-text-muted;
	margin-bottom: 6rpx;
}

.timeline-activity {
	display: block;
	font-size: 30rpx;
	color: $am-text;
}

.timeline-item--current .timeline-dot {
	background: $am-primary;
	box-shadow: 0 0 0 6rpx rgba(230, 168, 92, 0.25);
}

.timeline-item--current .timeline-activity {
	color: $am-primary;
	font-weight: 600;
}

.footer {
	left: 0;
	right: 0;
	bottom: 0;
	padding: 24rpx 40rpx 48rpx;
	background: linear-gradient(180deg, rgba(255, 247, 234, 0) 0%, $am-bg 30%);
}

.btn {
	height: 96rpx;
	line-height: 96rpx;
	border-radius: 48rpx;
	font-size: 30rpx;
	border: none;
	margin: 0;
}

.btn-primary {
	background: $am-primary;
	color: #fff;
	box-shadow: 0 8rpx 20rpx rgba(230, 168, 92, 0.35);
}
</style>
