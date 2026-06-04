<template>
	<view v-if="isLoading" class="page page--loading">
		<text class="loading-text">正在加载你的另一个我...</text>
	</view>
	<view v-else-if="activeProfile" class="page">
		<view class="top-info card">
			<view class="top-info-row">
				<view class="top-info-main">
					<text class="top-info-label">地球另一端的你</text>
					<text v-if="displayAvatarName" class="avatar-tag">{{ displayAvatarName }}</text>
				</view>
				<button
					class="btn-refresh"
					plain
					:disabled="isRefreshing"
					aria-label="刷新"
					@click="handleRefresh"
				>
					<view class="btn-refresh__glyph" :class="{ 'btn-refresh__glyph--spin': isRefreshing }" />
				</button>
			</view>
			<view class="meta-row">
				<text class="meta-item">当地时间：{{ displayLocalTime }}</text>
			</view>
			<view class="meta-row">
				<text class="meta-item">地点：{{ displayTarget.locationLabel }}</text>
			</view>
			<view class="meta-row">
				<text class="meta-item">此时此刻：{{ displayTodayMood }}</text>
			</view>
		
		</view>

		<!-- <view class="video-placeholder card">
			<text class="placeholder-icon">🎬</text>
			<text class="placeholder-text">{{ videoPlaceholderText }}</text>
		</view> -->

		<view class="activity card">
			<text class="activity-text">{{ displayResult.currentTitle }}</text>
			<text v-if="displayResult.currentDescription" class="activity-desc">
				{{ displayResult.currentDescription }}
			</text>
		</view>

		<view class="info-card card">
			<view class="info-row">
				<text class="info-label">你的位置</text>
				<text class="info-value">{{ displayOriginCity }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">地球另一端的位置</text>
				<text class="info-value">{{ displayTargetCoords }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">最近生活区域</text>
				<text class="info-value">{{ displayTarget.nearestLivingArea }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">与你相隔</text>
				<text class="info-value">{{ displayDistance }}</text>
			</view>
		</view>

		<view class="actions">
			<button class="btn btn-primary" @click="goTimeline">另一个我的一天</button>
			<button class="btn btn-secondary" @click="goShare">分享给好友</button>
			<button
				class="btn-icon"
				plain
				:disabled="isResetting"
				aria-label="换一个形象"
				@click="handleReset"
			>
				<view class="btn-icon__swap" aria-hidden="true">
					<view class="btn-icon__swap-track btn-icon__swap-track--left" />
					<view class="btn-icon__swap-track btn-icon__swap-track--right" />
				</view>
			</button>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { deleteVirtualProfile } from '../../api/virtualProfile'
import type { VirtualProfile } from '../../types/virtualProfile'
import { formatAntipodeLocalTime } from '../../utils/antipodeTime'
import {
	clearOnboardingFlowCache,
	fetchActiveProfileFromCloud,
	formatCoordinates,
	formatDistanceKm,
	redirectToHome
} from '../../utils/profileStorage'

const activeProfile = ref<VirtualProfile | null>(null)
const isLoading = ref(true)
const isResetting = ref(false)
const isRefreshing = ref(false)

onLoad(() => {
	loadProfile(true)
})

async function loadProfile(showFullPageLoading: boolean) {
	if (showFullPageLoading) {
		isLoading.value = true
	}

	const profile = await fetchActiveProfileFromCloud()

	if (showFullPageLoading) {
		isLoading.value = false
	}

	if (!profile || !profile.result || !profile.targetLocation) {
		redirectToHome()
		return
	}

	activeProfile.value = profile
}

async function handleRefresh() {
	if (isRefreshing.value) return
	isRefreshing.value = true

	try {
		const profile = await fetchActiveProfileFromCloud({ forceRefresh: true })
		if (!profile || !profile.result || !profile.targetLocation) {
			redirectToHome()
			return
		}
		activeProfile.value = profile
	} catch (error) {
		console.warn('[result] handleRefresh failed', error)
		uni.showToast({ title: '刷新失败', icon: 'none' })
	} finally {
		isRefreshing.value = false
	}
}

const displayResult = computed(() => activeProfile.value!.result)

const displayLocalTime = computed(() =>
	formatAntipodeLocalTime(
		activeProfile.value?.metadata?.timezoneData,
		new Date(),
		activeProfile.value?.result?.localTime
	)
)

const displayTarget = computed(() => activeProfile.value!.targetLocation)

const displayOriginCity = computed(() => activeProfile.value!.originLocation.cityName)

const displayAvatarName = computed(() => activeProfile.value!.selectedAvatar.name)

const displayTodayMood = computed(() => displayResult.value.todayMood || '平静')

const displayTargetCoords = computed(() => {
	return formatCoordinates(displayTarget.value.latitude, displayTarget.value.longitude)
})

const displayDistance = computed(() => {
	return formatDistanceKm(displayResult.value.distanceKm)
})

const videoPlaceholderText = computed(() => {
	const videoFileId = activeProfile.value?.videoAsset?.videoFileId
	if (!videoFileId) {
		return '虚拟形象视频占位'
	}
	if (videoFileId.startsWith('cloud://')) {
		return '虚拟形象视频已就绪'
	}
	if (videoFileId.startsWith('placeholder://')) {
		return `虚拟形象视频占位（${activeProfile.value?.videoAsset?.assetKey || '占位'}）`
	}
	return '虚拟形象视频占位'
})

function goTimeline() {
	uni.redirectTo({
		url: '/pages/timeline/index'
	})
}

function goShare() {
	uni.navigateTo({
		url: '/pages/share/index'
	})
}

async function handleReset() {
	if (isResetting.value) return
	isResetting.value = true

	try {
		await deleteVirtualProfile({ deleteActive: true })
	} catch (error) {
		console.warn('[result] deleteVirtualProfile failed', error)
	} finally {
		clearOnboardingFlowCache()
		isResetting.value = false
		redirectToHome()
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

.card {
	background: $am-card;
	border-radius: $am-radius;
	border: 2rpx solid $am-border;
	box-shadow: $am-shadow-soft;
}

.top-info {
	padding: 32rpx;
	margin-bottom: 24rpx;
}

.top-info-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
	margin-bottom: 12rpx;
}

.top-info-main {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 16rpx;
	flex: 1;
	min-width: 0;
}

.top-info-label {
	font-size: 36rpx;
	font-weight: 600;
	color: $am-text;
}

.avatar-tag {
	display: inline-block;
	padding: 8rpx 20rpx;
	background: rgba(143, 185, 150, 0.2);
	border-radius: 24rpx;
	font-size: 24rpx;
	color: $am-secondary;
}

.top-label {
	display: block;
	font-size: 36rpx;
	font-weight: 600;
	color: $am-text;
	margin-bottom: 20rpx;
}

.meta-row {
	margin-bottom: 12rpx;
}

.meta-item {
	font-size: 28rpx;
	color: $am-text-muted;
}

.video-placeholder {
	height: 360rpx;
	margin-bottom: 24rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	background: linear-gradient(180deg, #fff 0%, #fff9f0 100%);
}

.placeholder-icon {
	font-size: 64rpx;
	margin-bottom: 16rpx;
}

.placeholder-text {
	font-size: 28rpx;
	color: $am-text-muted;
}

.activity {
	padding: 32rpx;
	margin-bottom: 24rpx;
	background: rgba(230, 168, 92, 0.1);
	border-color: rgba(230, 168, 92, 0.3);
}

.activity-text {
	display: block;
	font-size: 32rpx;
	line-height: 1.6;
	color: $am-text;
	font-weight: 500;
}

.activity-desc {
	display: block;
	margin-top: 12rpx;
	font-size: 26rpx;
	line-height: 1.6;
	color: $am-text-muted;
}

.info-card {
	padding: 8rpx 32rpx;
	margin-bottom: 40rpx;
}

.info-row {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	padding: 24rpx 0;
	gap: 24rpx;
}

.info-row + .info-row {
	border-top: 2rpx dashed $am-border;
}

.info-label {
	font-size: 26rpx;
	color: $am-text-muted;
	flex-shrink: 0;
}

.info-value {
	font-size: 26rpx;
	color: $am-text;
	text-align: right;
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

.btn-secondary {
	background: $am-card;
	color: $am-text;
	border: 2rpx solid $am-border;
}

.btn-icon {
	align-self: center;
	width: 80rpx;
	height: 80rpx;
	padding: 0;
	margin: 8rpx 0 0;
	border: 2rpx solid $am-border !important;
	border-radius: 50%;
	background: $am-card !important;
	display: flex;
	align-items: center;
	justify-content: center;
}

.btn-icon::after {
	border: none;
}

.btn-icon[disabled] {
	opacity: 0.5;
}

.btn-icon__swap {
	width: 36rpx;
	height: 32rpx;
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: 10rpx;
}

.btn-icon__swap-track {
	height: 4rpx;
	background: $am-text-muted;
	border-radius: 2rpx;
	position: relative;
}

.btn-icon__swap-track--left {
	width: 26rpx;
	align-self: flex-start;
}

.btn-icon__swap-track--left::before {
	content: '';
	position: absolute;
	left: -10rpx;
	top: 50%;
	transform: translateY(-50%);
	border: 6rpx solid transparent;
	border-right: 8rpx solid $am-text-muted;
}

.btn-icon__swap-track--right {
	width: 26rpx;
	align-self: flex-end;
}

.btn-icon__swap-track--right::after {
	content: '';
	position: absolute;
	right: -10rpx;
	top: 50%;
	transform: translateY(-50%);
	border: 6rpx solid transparent;
	border-left: 8rpx solid $am-text-muted;
}

.btn-refresh {
	flex-shrink: 0;
	width: 64rpx;
	height: 64rpx;
	padding: 0;
	margin: 0;
	border: 2rpx solid $am-border !important;
	border-radius: 50%;
	background: $am-bg !important;
	display: flex;
	align-items: center;
	justify-content: center;
}

.btn-refresh::after {
	border: none;
}

.btn-refresh[disabled] {
	opacity: 0.5;
}

.btn-refresh__glyph {
	width: 28rpx;
	height: 28rpx;
	border: 4rpx solid $am-text-muted;
	border-right-color: transparent;
	border-radius: 50%;
	box-sizing: border-box;
	transform: rotate(-45deg);
	position: relative;
}

.btn-refresh__glyph::before {
	content: '';
	position: absolute;
	right: -4rpx;
	top: -10rpx;
	border: 8rpx solid transparent;
	border-left: 12rpx solid $am-text-muted;
}

.btn-refresh__glyph--spin {
	animation: refresh-spin 0.8s linear infinite;
}

@keyframes refresh-spin {
	from {
		transform: rotate(-45deg);
	}
	to {
		transform: rotate(315deg);
	}
}
</style>
