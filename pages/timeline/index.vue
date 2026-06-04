<template>
	<view class="page">
		<view class="header">
			<text class="title">另一个我的今天</text>
			<text class="subtitle">当地时间 {{ result.localTime }} · {{ result.antipodeLocation }}</text>
		</view>

		<view class="current card">
			<text class="current-label">现在</text>
			<text class="current-text">{{ result.currentStatusLabel }}</text>
		</view>

		<view class="timeline card">
			<view
				v-for="(item, index) in timeline"
				:key="item.time"
				class="timeline-item"
				:class="{ 'timeline-item--current': item.isCurrent }"
			>
				<view class="timeline-left">
					<view class="timeline-dot" />
					<view v-if="index < timeline.length - 1" class="timeline-line" />
				</view>
				<view class="timeline-content">
					<text class="timeline-time">{{ item.time }}</text>
					<text class="timeline-activity">{{ item.activity }}</text>
				</view>
			</view>
		</view>

		<view class="footer">
			<button class="btn btn-primary" @click="goBack">返回结果页</button>
		</view>
	</view>
</template>

<script setup lang="ts">
import { MOCK_RESULT, MOCK_TIMELINE } from '../../utils/mock'

const result = MOCK_RESULT
const timeline = MOCK_TIMELINE

function goBack() {
	uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.page {
	min-height: 100vh;
	padding: 32rpx 40rpx 180rpx;
	background: $am-bg;
	box-sizing: border-box;
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
	position: fixed;
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
