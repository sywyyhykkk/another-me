<template>
	<view class="page">
		<view class="header">
			<text class="title">选择你的另一个我</text>
			<text class="subtitle">它会在地球另一端，按照当地时间生活。</text>
		</view>

		<view class="avatar-list">
			<view
				v-for="avatar in avatars"
				:key="avatar.id"
				class="avatar-card card"
				:class="{ 'avatar-card--active': selectedAvatarId === avatar.id }"
				@click="selectAvatar(avatar)"
			>
				<view class="avatar-face" :style="{ background: avatar.avatarColor }">
					<text class="avatar-emoji">{{ getEmoji(avatar.id) }}</text>
				</view>
				<view class="avatar-info">
					<text class="avatar-name">{{ avatar.name }}</text>
					<text class="avatar-desc">{{ avatar.description }}</text>
				</view>
			</view>
		</view>

		<view class="footer">
			<button
				class="btn"
				:class="selectedAvatarId ? 'btn-primary' : 'btn-disabled'"
				@click="goGenerate"
			>
				生成我的另一个我
			</button>
		</view>
	</view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Avatar } from '../../types/index'
import { MOCK_AVATARS } from '../../utils/mock'
import { getSession, setSelectedAvatar } from '../../utils/session'

const avatars = MOCK_AVATARS
const session = getSession()
const selectedAvatarId = ref(session.selectedAvatar?.id || '')

function getEmoji(id: string) {
	const map: Record<string, string> = {
		office: '💼',
		student: '📚',
		free: '☕',
		traveler: '🎒'
	}
	return map[id] || '🙂'
}

function selectAvatar(avatar: Avatar) {
	selectedAvatarId.value = avatar.id
	setSelectedAvatar(avatar)
}

function goGenerate() {
	if (!selectedAvatarId.value) {
		uni.showToast({ title: '请先选择一个形象', icon: 'none' })
		return
	}
	uni.navigateTo({
		url: '/pages/loading/index'
	})
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
	margin-bottom: 32rpx;
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
	line-height: 1.6;
	color: $am-text-muted;
}

.card {
	background: $am-card;
	border-radius: $am-radius;
	border: 2rpx solid $am-border;
	box-shadow: $am-shadow-soft;
}

.avatar-list {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.avatar-card {
	display: flex;
	align-items: center;
	padding: 28rpx;
	gap: 24rpx;
}

.avatar-card--active {
	border-color: $am-primary;
	background: rgba(230, 168, 92, 0.08);
	box-shadow: $am-shadow;
}

.avatar-face {
	flex-shrink: 0;
	width: 96rpx;
	height: 96rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 3rpx solid rgba(255, 255, 255, 0.8);
}

.avatar-emoji {
	font-size: 40rpx;
}

.avatar-info {
	flex: 1;
}

.avatar-name {
	display: block;
	font-size: 30rpx;
	font-weight: 600;
	color: $am-text;
	margin-bottom: 8rpx;
}

.avatar-desc {
	display: block;
	font-size: 26rpx;
	line-height: 1.5;
	color: $am-text-muted;
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

.btn-disabled {
	background: #e8dfd3;
	color: $am-text-muted;
}
</style>
