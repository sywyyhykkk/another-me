<template>
	<view class="page">
		<view class="header">
			<text class="app-name">对面的我</text>
			<text class="main-title">看看地球另一端的你，此刻正在做什么</text>
		</view>

		<view v-if="isCheckingProfile" class="checking card">
			<text class="checking-text">正在寻找你的另一个我...</text>
		</view>

		<template v-else>
			<view class="intro card">
				<text class="intro-text">
					「对面的我」会根据你的位置，找到地球另一端的对应地点，并生成一个生活在那里的虚拟形象。它会按照当地时间和生活节奏，睡觉、学习、工作、吃饭或游玩。
				</text>
			</view>

			<view class="earth-wrap">
				<view class="earth">
					<view class="earth-land earth-land--1" />
					<view class="earth-land earth-land--2" />
					<view class="earth-dot" />
				</view>
			</view>

			<view class="actions">
				<button
					class="btn btn-primary"
					:disabled="isLocating"
					:loading="isLocating"
					@click="handleStart"
				>
					{{ isLocating ? '正在获取位置...' : '开启我的另一个我' }}
				</button>
				<button class="btn btn-secondary" :disabled="isLocating" @click="handleManualSelect">
					手动选择位置
				</button>
			</view>

			<text class="privacy">
				我们只会使用你的模糊位置来计算地球另一端的位置，不会展示你的精确地址。
			</text>
		</template>
	</view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getActiveVirtualProfile } from '../../api/virtualProfile'
import { showCloudUnavailableHint } from '../../utils/cloudUnavailableHint'
import type { StoredUserLocation } from '../../types/virtualProfile'
import { STORAGE_KEYS } from '../../utils/profileStorage'

const isLocating = ref(false)
const isCheckingProfile = ref(true)

onLoad(async () => {
	// #ifdef MP-WEIXIN
	uni.showShareMenu({
		withShareTicket: true,
		menus: ['shareAppMessage', 'shareTimeline']
	})
	// #endif

	try {
		const res = await getActiveVirtualProfile()
		if (res.success && res.exists && res.data) {
			uni.reLaunch({
				url: '/pages/result/index'
			})
			return
		}
	} catch (error) {
		console.warn('[index] getActiveVirtualProfile failed', error)
		showCloudUnavailableHint()
	} finally {
		isCheckingProfile.value = false
	}
})

function saveUserLocation(location: StoredUserLocation) {
	uni.setStorageSync(STORAGE_KEYS.userLocation, location)
	uni.setStorageSync(STORAGE_KEYS.locationMode, 'device')
}

function goAvatarSelect() {
	uni.navigateTo({
		url: '/pages/avatar-select/index'
	})
}

function goLocationSelect() {
	uni.navigateTo({
		url: '/pages/location-select/index'
	})
}

function handleStart() {
	if (isLocating.value || isCheckingProfile.value) return

	isLocating.value = true

	uni.getFuzzyLocation({
		type: 'wgs84',
		success: (res) => {
			saveUserLocation({
				source: 'device',
				latitude: res.latitude,
				longitude: res.longitude,
				createdAt: Date.now()
			})
			goAvatarSelect()
		},
		fail: (err) => {
			console.warn('getFuzzyLocation failed', err.errMsg || err)

			uni.showModal({
				title: '无法获取位置',
				content:
					'你可以手动选择一个城市，我们仍然可以为你生成地球另一端的“另一个我”。',
				confirmText: '手动选择',
				cancelText: '留在首页',
				success: (modalRes) => {
					if (modalRes.confirm) {
						goLocationSelect()
					}
				}
			})
		},
		complete: () => {
			isLocating.value = false
		}
	})
}

function handleManualSelect() {
	uni.setStorageSync(STORAGE_KEYS.locationMode, 'manual')
	goLocationSelect()
}
</script>

<script lang="ts">
import { HOME_SHARE_PAYLOAD } from '../../utils/sharePagePayload'

export default {
	onShareAppMessage() {
		return { ...HOME_SHARE_PAYLOAD }
	},
	onShareTimeline() {
		return { title: HOME_SHARE_PAYLOAD.title }
	}
}
</script>

<style lang="scss" scoped>
.page {
	min-height: 100vh;
	padding: 248rpx 40rpx 64rpx;
	background: $am-bg;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
}

.header {
	text-align: center;
	margin-bottom: 32rpx;
}

.app-name {
	display: block;
	font-size: 44rpx;
	font-weight: 600;
	color: $am-text;
	margin-bottom: 16rpx;
	letter-spacing: 2rpx;
}

.main-title {
	display: block;
	font-size: 30rpx;
	line-height: 1.6;
	color: $am-text-muted;
	padding: 0 16rpx;
}

.checking {
	padding: 32rpx;
	margin-top: 24rpx;
}

.checking-text {
	display: block;
	font-size: 28rpx;
	color: $am-text-muted;
	text-align: center;
}

.card {
	background: $am-card;
	border-radius: $am-radius-lg;
	border: 2rpx solid $am-border;
	box-shadow: $am-shadow-soft;
}

.intro {
	padding: 32rpx;
	margin-bottom: 40rpx;
}

.intro-text {
	font-size: 28rpx;
	line-height: 1.8;
	color: $am-text;
}

.earth-wrap {
	display: flex;
	justify-content: center;
	margin-bottom: 48rpx;
}

.earth {
	position: relative;
	width: 240rpx;
	height: 240rpx;
	border-radius: 50%;
	background: linear-gradient(145deg, #a8d8ea 0%, #7ec8c8 45%, #5ba8a0 100%);
	border: 6rpx solid $am-border;
	box-shadow: $am-shadow;
	overflow: hidden;
}

.earth-land {
	position: absolute;
	border-radius: 50%;
	background: rgba(143, 185, 150, 0.85);
}

.earth-land--1 {
	width: 80rpx;
	height: 60rpx;
	top: 60rpx;
	left: 40rpx;
	transform: rotate(-15deg);
}

.earth-land--2 {
	width: 56rpx;
	height: 44rpx;
	bottom: 50rpx;
	right: 36rpx;
	transform: rotate(20deg);
}

.earth-dot {
	position: absolute;
	width: 16rpx;
	height: 16rpx;
	top: 50%;
	left: 50%;
	margin: -8rpx 0 0 -8rpx;
	border-radius: 50%;
	background: $am-primary;
	border: 3rpx solid #fff;
	box-shadow: 0 0 0 4rpx rgba(230, 168, 92, 0.3);
}

.actions {
	display: flex;
	flex-direction: column;
	gap: 24rpx;
	margin-bottom: 32rpx;
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

.btn-primary[disabled] {
	background: #e8c99a;
	color: rgba(255, 255, 255, 0.9);
	box-shadow: none;
}

.btn-secondary {
	background: $am-card;
	color: $am-text;
	border: 2rpx solid $am-border;
	box-shadow: $am-shadow-soft;
}

.btn-secondary[disabled] {
	color: $am-text-muted;
	opacity: 0.7;
}

.privacy {
	display: block;
	margin-top: auto;
	padding: 0 16rpx;
	font-size: 22rpx;
	line-height: 1.7;
	color: $am-text-muted;
	text-align: center;
}
</style>
