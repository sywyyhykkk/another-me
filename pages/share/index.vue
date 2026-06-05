<template>
	<view v-if="isLoading" class="page page--loading">
		<text class="loading-text">正在加载...</text>
	</view>
	<view v-else-if="activeProfile" class="page">
		<view class="header">
			<text class="title">分享给好友</text>
			<text class="subtitle">把地球另一端的「另一个你」告诉朋友</text>
		</view>

		<view class="preview card">
			<view class="preview-inner">
				<text class="preview-app">对面的我</text>
				<view class="preview-row">
					<text class="preview-label">我在</text>
					<text class="preview-value">{{ displayOriginCity }}</text>
				</view>
				<view class="preview-row">
					<text class="preview-label">另一个我在</text>
					<text class="preview-value">{{ displayLocationLabel }}</text>
				</view>
				<view class="preview-row">
					<text class="preview-label">当地时间</text>
					<text class="preview-value">{{ displayLocalTime }}</text>
				</view>
				<view class="preview-row">
					<text class="preview-label">此刻它正在</text>
					<text class="preview-value">{{ displayCurrentTitle }}</text>
				</view>
				<view class="preview-divider" />
				<text class="preview-quote">{{ displayShareText }}</text>
			</view>
		</view>

		<view class="share-guide card">
			<view class="share-guide-corner" aria-hidden="true">
				<text class="corner-dots">···</text>
			</view>
			<text class="share-guide-title">如何分享</text>
			<text class="share-guide-step">1. 点击屏幕右上角「 ··· 」菜单</text>
			<text class="share-guide-step">2. 选择「发送给朋友」或「分享到朋友圈」完成分享</text>
			<text class="share-guide-hint">好友打开后将进入小程序首页，可体验「对面的我」</text>
		</view>

		<view class="actions">
			<!-- #ifdef MP-WEIXIN -->
			<button class="btn btn-primary btn-share" open-type="share">分享</button>
			<!-- #endif -->
			<button class="btn btn-secondary" @click="goBack">返回结果页</button>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import type { VirtualProfile } from '../../types/virtualProfile'
import { formatAntipodeLocalTime } from '../../utils/antipodeTime'
import { fetchActiveProfileFromCloud, redirectToHome } from '../../utils/profileStorage'
import { updateSharePagePayload } from '../../utils/sharePagePayload'

const activeProfile = ref<VirtualProfile | null>(null)
const isLoading = ref(true)

onLoad(() => {
	loadProfile({ showFullPageLoading: true, setupShareMenu: true })
})

onShow(() => {
	if (activeProfile.value && !isLoading.value) {
		loadProfile({ silent: true })
	}
})

async function loadProfile(options: {
	showFullPageLoading?: boolean
	silent?: boolean
	setupShareMenu?: boolean
} = {}) {
	const { showFullPageLoading = false, silent = false, setupShareMenu = false } = options

	if (showFullPageLoading) {
		isLoading.value = true
	}

	let profile: VirtualProfile | null = null
	try {
		profile = await fetchActiveProfileFromCloud()
	} catch (error) {
		console.warn('[share] loadProfile failed', error)
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
	updateSharePagePayload(buildSharePayloadFromProfile(profile))

	if (setupShareMenu) {
		// #ifdef MP-WEIXIN
		uni.showShareMenu({
			withShareTicket: true,
			menus: ['shareAppMessage', 'shareTimeline']
		})
		// #endif
	}
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

const displayOriginCity = computed(() => activeProfile.value!.originLocation.cityName)

const displayLocationLabel = computed(() => activeProfile.value!.targetLocation.locationLabel)

const displayCurrentTitle = computed(() => displayResult.value.currentTitle)

const displayShareText = computed(() => displayResult.value.shareText)

function buildSharePayloadFromProfile(profile: VirtualProfile) {
	const defaultTitle = '对面的我 — 看看地球另一端的你正在做什么'

	if (!profile.result) {
		return {
			title: defaultTitle,
			path: '/pages/index/index'
		}
	}

	const originCity = profile.originLocation.cityName
	const otherPlace = profile.targetLocation.locationLabel
	const localTime = formatAntipodeLocalTime(
		profile.metadata?.timezoneData,
		new Date(),
		'--:--',
		profile.targetLocation?.longitude
	)
	const activity = profile.result.currentTitle.replace(/^另一个你正在/, '')

	return {
		title: `我在${originCity}，另一个我在${otherPlace}（正在${activity}`,
		path: '/pages/index/index'
	}
}

function goBack() {
	uni.navigateBack()
}
</script>

<script lang="ts">
import { getSharePagePayload } from '../../utils/sharePagePayload'

export default {
	onShareAppMessage() {
		return getSharePagePayload()
	},
	onShareTimeline() {
		const { title } = getSharePagePayload()
		return { title }
	}
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
	margin-bottom: 32rpx;
}

.title {
	display: block;
	font-size: 40rpx;
	font-weight: 600;
	color: $am-text;
}

.subtitle {
	display: block;
	margin-top: 12rpx;
	font-size: 26rpx;
	color: $am-text-muted;
	line-height: 1.5;
}

.share-guide {
	position: relative;
	padding: 36rpx 32rpx 32rpx;
	margin-bottom: 40rpx;
	overflow: hidden;
}

.share-guide-corner {
	position: absolute;
	top: 20rpx;
	right: 24rpx;
	width: 72rpx;
	height: 48rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 12rpx;
	background: rgba(230, 168, 92, 0.15);
	border: 2rpx dashed $am-primary;
}

.corner-dots {
	font-size: 36rpx;
	font-weight: 700;
	color: $am-primary;
	letter-spacing: 2rpx;
	line-height: 1;
}

.share-guide-title {
	display: block;
	font-size: 30rpx;
	font-weight: 600;
	color: $am-text;
	margin-bottom: 20rpx;
	padding-right: 80rpx;
}

.share-guide-step {
	display: block;
	font-size: 28rpx;
	color: $am-text;
	line-height: 1.65;
	margin-bottom: 12rpx;
}

.share-guide-hint {
	display: block;
	margin-top: 16rpx;
	font-size: 24rpx;
	color: $am-text-muted;
	line-height: 1.55;
}

.card {
	background: $am-card;
	border-radius: $am-radius-lg;
	border: 2rpx solid $am-border;
	box-shadow: $am-shadow;
}

.preview {
	padding: 16rpx;
	margin-bottom: 48rpx;
}

.preview-inner {
	padding: 40rpx 32rpx;
	border-radius: $am-radius;
	background: linear-gradient(160deg, #fff9f0 0%, #fff 50%, rgba(143, 185, 150, 0.12) 100%);
	border: 2rpx dashed $am-border;
}

.preview-app {
	display: block;
	font-size: 32rpx;
	font-weight: 600;
	color: $am-primary;
	margin-bottom: 32rpx;
	text-align: center;
}

.preview-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 16rpx 0;
}

.preview-label {
	font-size: 26rpx;
	color: $am-text-muted;
}

.preview-value {
	font-size: 28rpx;
	color: $am-text;
	font-weight: 500;
}

.preview-divider {
	height: 2rpx;
	background: $am-border;
	margin: 24rpx 0;
}

.preview-quote {
	display: block;
	font-size: 30rpx;
	line-height: 1.7;
	color: $am-text;
	text-align: center;
	font-style: italic;
}

.actions {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
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

.btn-share {
	margin-bottom: 0;
}

.btn-secondary {
	background: $am-card;
	color: $am-text;
	border: 2rpx solid $am-border;
}
</style>
