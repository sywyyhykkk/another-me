<template>
	<view class="page">
		<button class="back" @click="goBack">‹ 返回</button>
		<view class="header">
			<text class="title">为{{ characterName || '远方的自己' }}选择生活方式</text>
			<text class="subtitle">{{ characterName || '远方的你' }}会在地球另一端，按照当地时间生活。</text>
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
					<text class="avatar-emoji">{{ getAvatarEmoji(avatar.id) }}</text>
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
				:disabled="isSubmitting || !selectedAvatarId || !characterName"
				@click="goGenerate"
			>
				开启远方的生活
			</button>
		</view>
	</view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import type { Avatar } from '../../types/index'
import { toSelectedAvatar } from '../../utils/cityPresets'
import { AVATARS, getAvatarEmoji } from '../../utils/avatars'
import { STORAGE_KEYS, getCachedSelectedAvatar, getCachedCharacter, getCachedLocationMode, getCachedSelectedCity, getCachedUserLocation } from '../../utils/profileStorage'

const avatars = AVATARS
const cachedAvatar = getCachedSelectedAvatar() as { id?: string } | null
const selectedAvatarId = ref(cachedAvatar?.id || '')
const isSubmitting = ref(false)
const characterName = ref('')

onShow(() => {
	const mode = getCachedLocationMode()
	const location = mode === 'manual' ? getCachedSelectedCity() : mode === 'device' ? getCachedUserLocation() : null
	const character = location && mode ? getCachedCharacter({ mode, latitude: location.latitude, longitude: location.longitude }) : null
	if (!character) {
		characterName.value = ''
		uni.redirectTo({ url: '/pages/character-setup/index' })
		return
	}
	characterName.value = character.name
})

function goBack() {
	uni.navigateBack({ fail: () => uni.redirectTo({ url: '/pages/character-setup/index' }) })
}

function selectAvatar(avatar: Avatar) {
	selectedAvatarId.value = avatar.id
	uni.setStorageSync(
		STORAGE_KEYS.selectedAvatar,
		toSelectedAvatar({
			id: avatar.id,
			name: avatar.name,
			description: avatar.description,
			emoji: getAvatarEmoji(avatar.id)
		})
	)
}

function goGenerate() {
	if (isSubmitting.value) return
	if (!characterName.value) {
		uni.redirectTo({ url: '/pages/character-setup/index' })
		return
	}

	if (!selectedAvatarId.value) {
		uni.showToast({ title: '请先选择一种生活方式', icon: 'none' })
		return
	}

	isSubmitting.value = true
	uni.navigateTo({
		url: '/pages/loading/index',
		complete: () => {
			isSubmitting.value = false
		}
	})
}
</script>

<style lang="scss" scoped>
.page {
	min-height: 100vh;
	padding: calc(var(--status-bar-height) + 98rpx) 32rpx calc(210rpx + env(safe-area-inset-bottom));
	background: $am-bg;
	box-sizing: border-box;
}

.header {
	margin-bottom: 32rpx;
}

.back{display:inline-block;margin:0 0 26rpx;padding:0 8rpx;background:transparent;color:$am-text-muted;font-size:26rpx;line-height:50rpx}.back::after{border:0}

.title {
	display: block;
	font-size: 40rpx;
	font-weight: 600;
	color: $am-text;
	margin-bottom: 12rpx;
	overflow-wrap: anywhere;
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
	padding: 24rpx 32rpx calc(28rpx + env(safe-area-inset-bottom));
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

@media(max-width:340px){.page{padding-left:24rpx;padding-right:24rpx}.title{font-size:35rpx}.avatar-card{padding:24rpx}.avatar-face{width:82rpx;height:82rpx}.avatar-name{font-size:28rpx}.avatar-desc{font-size:24rpx}}
</style>
