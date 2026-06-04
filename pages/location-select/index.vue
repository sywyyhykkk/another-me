<template>
	<view class="page">
		<view class="header">
			<text class="title">你现在在哪里？</text>
			<text class="desc">如果暂时不想授权定位，可以手动选择一个城市。</text>
		</view>

		<view class="main">
			<view class="city-list">
				<view
					v-for="city in cities"
					:key="city"
					class="city-item card"
					:class="{ 'city-item--active': selectedCityName === city }"
					@click="selectCity(city)"
				>
					<text class="city-name">{{ city }}</text>
					<text v-if="selectedCityName === city" class="city-check">已选</text>
				</view>
			</view>
		</view>

		<view class="footer">
			<button class="btn btn-primary" @click="goNext">选择另一个我</button>
		</view>
	</view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MANUAL_CITY_NAMES, getCityPreset } from '../../utils/cityPresets'
import { STORAGE_KEYS } from '../../utils/profileStorage'
import { getSession, setSelectedCity } from '../../utils/session'

const cities = MANUAL_CITY_NAMES
const session = getSession()
const selectedCityName = ref(session.selectedCity)

function selectCity(cityName: string) {
	selectedCityName.value = cityName
	const preset = getCityPreset(cityName)
	uni.setStorageSync(STORAGE_KEYS.selectedCity, {
		name: preset.name,
		country: preset.country,
		latitude: preset.latitude,
		longitude: preset.longitude
	})
	uni.setStorageSync(STORAGE_KEYS.locationMode, 'manual')
	setSelectedCity(cityName)
}

function goNext() {
	if (!selectedCityName.value) {
		uni.showToast({ title: '请先选择一个城市', icon: 'none' })
		return
	}
	selectCity(selectedCityName.value)
	uni.navigateTo({
		url: '/pages/avatar-select/index'
	})
}
</script>

<style lang="scss" scoped>
.page {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
	padding: 32rpx 0 calc(32rpx + env(safe-area-inset-bottom));
	background: $am-bg;
	box-sizing: border-box;
}

.header {
	flex-shrink: 0;
	padding: 0 40rpx;
	margin-bottom: 32rpx;
}

.main {
	flex: 1;
	padding: 0 40rpx;
}

.title {
	display: block;
	font-size: 40rpx;
	font-weight: 600;
	color: $am-text;
	margin-bottom: 12rpx;
}

.desc {
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

.city-list {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.city-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 28rpx 32rpx;
	transition: all 0.2s;
}

.city-item--active {
	border-color: $am-primary;
	background: rgba(230, 168, 92, 0.08);
}

.city-name {
	font-size: 30rpx;
	color: $am-text;
}

.city-check {
	font-size: 24rpx;
	color: $am-primary;
}

.footer {
	flex-shrink: 0;
	padding: 32rpx 40rpx 0;
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
