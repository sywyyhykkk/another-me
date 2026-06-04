<template>
	<view class="page">
		<view class="header">
			<text class="title">你现在在哪里？</text>
			<text class="desc">如果暂时不想授权定位，可以手动选择一个城市。</text>
		</view>

		<view class="search card">
			<text class="search-placeholder">输入城市名称</text>
		</view>

		<view class="city-list">
			<view
				v-for="city in cities"
				:key="city"
				class="city-item card"
				:class="{ 'city-item--active': selectedCity === city }"
				@click="selectCity(city)"
			>
				<text class="city-name">{{ city }}</text>
				<text v-if="selectedCity === city" class="city-check">已选</text>
			</view>
		</view>

		<view class="footer">
			<button class="btn btn-primary" @click="goNext">下一步：选择另一个我</button>
		</view>
	</view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MOCK_CITIES } from '../../utils/mock'
import { getSession, setSelectedCity } from '../../utils/session'

const cities = MOCK_CITIES
const selectedCity = ref(getSession().selectedCity)

function selectCity(city: string) {
	selectedCity.value = city
	setSelectedCity(city)
}

function goNext() {
	if (!selectedCity.value) {
		uni.showToast({ title: '请先选择一个城市', icon: 'none' })
		return
	}
	setSelectedCity(selectedCity.value)
	uni.navigateTo({
		url: '/pages/avatar-select/index'
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

.search {
	padding: 28rpx 32rpx;
	margin-bottom: 24rpx;
}

.search-placeholder {
	font-size: 28rpx;
	color: $am-text-muted;
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
