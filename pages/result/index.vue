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
					<view
						class="btn-refresh__icon-wrap"
						:class="{ 'btn-refresh__icon-wrap--spin': isRefreshing }"
					>
						<uni-icons type="refreshempty" :size="20" />
					</view>
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
				<uni-icons type="undo" :size="22" :color="APP_COLORS.textMuted" />
			</button>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { deleteVirtualProfile } from '../../api/virtualProfile'
import type { VirtualProfile } from '../../types/virtualProfile'
import { APP_COLORS } from '../../config/theme'
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
	loadProfile({ showFullPageLoading: true })
})

onShow(() => {
	if (activeProfile.value && !isLoading.value && !isRefreshing.value) {
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
		console.warn('[result] loadProfile failed', error)
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

	if (!profile || !profile.result || !profile.targetLocation) {
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

function goTimeline() {
	uni.navigateTo({
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

.meta-row {
	margin-bottom: 12rpx;
}

.meta-item {
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

.btn-refresh__icon-wrap {
	display: flex;
	align-items: center;
	justify-content: center;
	line-height: 1;
}

.btn-refresh__icon-wrap--spin {
	animation: refresh-spin 0.8s linear infinite;
}

@keyframes refresh-spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}
</style>
