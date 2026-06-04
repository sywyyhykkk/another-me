<template>
	<view class="page">
		<view class="header">
			<text class="title">生成分享卡片</text>
		</view>

		<view class="preview card">
			<view class="preview-inner">
				<text class="preview-app">对面的我</text>
				<view class="preview-row">
					<text class="preview-label">我在</text>
					<text class="preview-value">{{ selectedCity }}</text>
				</view>
				<view class="preview-row">
					<text class="preview-label">另一个我在</text>
					<text class="preview-value">{{ result.antipodeLocation }}</text>
				</view>
				<view class="preview-row">
					<text class="preview-label">当地时间</text>
					<text class="preview-value">{{ result.localTime }}</text>
				</view>
				<view class="preview-row">
					<text class="preview-label">此刻它正在</text>
					<text class="preview-value">{{ result.currentStatusLabel }}</text>
				</view>
				<view class="preview-divider" />
				<text class="preview-quote">地球另一端的我，正在过另一种此刻。</text>
			</view>
		</view>

		<view class="actions">
			<button class="btn btn-primary" @click="saveImage">保存图片</button>
			<button class="btn btn-secondary" @click="goBack">返回结果页</button>
		</view>
	</view>
</template>

<script setup lang="ts">
import { MOCK_RESULT } from '../../utils/mock'
import { getSession } from '../../utils/session'

const session = getSession()
const selectedCity = session.selectedCity
const result = MOCK_RESULT

function saveImage() {
	uni.showToast({
		title: 'V1 暂未生成真实图片',
		icon: 'none'
	})
}

function goBack() {
	uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.page {
	min-height: 100vh;
	padding: 32rpx 40rpx 64rpx;
	background: $am-bg;
	box-sizing: border-box;
}

.header {
	margin-bottom: 32rpx;
}

.title {
	font-size: 40rpx;
	font-weight: 600;
	color: $am-text;
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

.btn-secondary {
	background: $am-card;
	color: $am-text;
	border: 2rpx solid $am-border;
}
</style>
