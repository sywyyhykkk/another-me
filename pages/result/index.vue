<template>
	<view class="page">
		<view class="top-info card">
			<text class="top-label">地球另一端的你</text>
			<view class="meta-row">
				<text class="meta-item">当地时间：{{ result.localTime }}</text>
			</view>
			<view class="meta-row">
				<text class="meta-item">地点：{{ result.antipodeLocation }}</text>
			</view>
			<view class="meta-row">
				<text class="meta-item">今日状态：{{ result.dayStatus }}</text>
			</view>
			<text v-if="selectedAvatar" class="avatar-tag">{{ selectedAvatar.name }}</text>
		</view>

		<view class="video-placeholder card">
			<text class="placeholder-icon">🎬</text>
			<text class="placeholder-text">虚拟形象视频占位</text>
		</view>

		<view class="activity card">
			<text class="activity-text">{{ result.currentActivity }}</text>
		</view>

		<view class="info-card card">
			<view class="info-row">
				<text class="info-label">你的位置</text>
				<text class="info-value">{{ selectedCity }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">对蹠点</text>
				<text class="info-value">{{ result.antipodeCoords }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">最近生活区域</text>
				<text class="info-value">{{ result.nearestArea }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">与你相隔</text>
				<text class="info-value">{{ result.distance }}</text>
			</view>
		</view>

		<view class="actions">
			<button class="btn btn-primary" @click="goTimeline">查看它今天的一天</button>
			<button class="btn btn-secondary" @click="goShare">生成分享卡片</button>
			<button class="btn btn-text" @click="goAvatarSelect">换一个形象</button>
		</view>
	</view>
</template>

<script setup lang="ts">
import { MOCK_RESULT } from '../../utils/mock'
import { getSession } from '../../utils/session'

const session = getSession()
const selectedCity = session.selectedCity
const selectedAvatar = session.selectedAvatar
const result = MOCK_RESULT

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

function goAvatarSelect() {
	uni.navigateTo({
		url: '/pages/avatar-select/index'
	})
}
</script>

<style lang="scss" scoped>
.page {
	min-height: 100vh;
	padding: 32rpx 40rpx 64rpx;
	background: $am-bg;
	box-sizing: border-box;
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

.top-label {
	display: block;
	font-size: 36rpx;
	font-weight: 600;
	color: $am-text;
	margin-bottom: 20rpx;
}

.meta-row {
	margin-bottom: 8rpx;
}

.meta-item {
	font-size: 28rpx;
	color: $am-text-muted;
}

.avatar-tag {
	display: inline-block;
	margin-top: 16rpx;
	padding: 8rpx 20rpx;
	background: rgba(143, 185, 150, 0.2);
	border-radius: 24rpx;
	font-size: 24rpx;
	color: $am-secondary;
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
	font-size: 32rpx;
	line-height: 1.6;
	color: $am-text;
	font-weight: 500;
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

.btn-text {
	background: transparent;
	color: $am-text-muted;
	height: 72rpx;
	line-height: 72rpx;
	font-size: 28rpx;
}
</style>
