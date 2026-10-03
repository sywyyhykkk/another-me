<template>
	<view class="weather-icon" :class="'weather-icon--' + visual.motion">
		<image
			class="weather-image"
			:src="'/static/weather/' + visual.asset + '.png'"
			mode="aspectFit"
			:aria-label="description"
		/>
		<view v-if="visual.motion === 'rain' || visual.motion === 'storm'" class="rain-drops">
			<view v-for="n in 3" :key="n" class="rain-drop" :class="'rain-drop--' + n" />
		</view>
		<view v-if="visual.motion === 'snow'" class="snow-flakes">
			<view v-for="n in 3" :key="n" class="snow-flake" :class="'snow-flake--' + n" />
		</view>
	</view>
</template>
<script setup lang="ts">
	import { computed } from 'vue'
	import { weatherVisual } from '../utils/weather'
	const props = defineProps<{ code: string; isDay: boolean; description: string }>()
	const visual = computed(() => weatherVisual(props.code, props.isDay))
</script>
<style scoped>
	.weather-icon {
		position: relative;
		width: 86rpx;
		height: 86rpx;
		flex-shrink: 0;
	}
	.weather-image {
		width: 100%;
		height: 100%;
		display: block;
	}
	.weather-icon--sun .weather-image {
		animation: sun-turn 24s linear infinite;
	}
	.weather-icon--float .weather-image {
		animation: cloud-drift 4.5s ease-in-out infinite;
	}
	.weather-icon--storm .weather-image {
		animation: storm-glow 4s ease-in-out infinite;
	}
	.rain-drops,
	.snow-flakes {
		position: absolute;
		left: 28%;
		right: 23%;
		top: 64%;
		bottom: 1%;
		overflow: hidden;
		pointer-events: none;
	}
	.rain-drop {
		position: absolute;
		width: 3rpx;
		height: 13rpx;
		border-radius: 3rpx;
		background: #66b6e8;
		opacity: 0;
		animation: rain-fall 1.2s linear infinite;
	}
	.rain-drop--1,
	.snow-flake--1 {
		left: 15%;
	}
	.rain-drop--2,
	.snow-flake--2 {
		left: 48%;
		animation-delay: 0.4s;
	}
	.rain-drop--3,
	.snow-flake--3 {
		left: 80%;
		animation-delay: 0.8s;
	}
	.snow-flake {
		position: absolute;
		width: 5rpx;
		height: 5rpx;
		border-radius: 50%;
		background: #e5f7ff;
		opacity: 0;
		animation: snow-fall 2.4s ease-in-out infinite;
	}
	@keyframes sun-turn {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes cloud-drift {
		0%,
		100% {
			transform: translateX(-3rpx);
		}
		50% {
			transform: translateX(3rpx);
		}
	}
	@keyframes rain-fall {
		0% {
			transform: translate(3rpx, -12rpx);
			opacity: 0;
		}
		20% {
			opacity: 0.9;
		}
		100% {
			transform: translate(-4rpx, 24rpx);
			opacity: 0;
		}
	}
	@keyframes snow-fall {
		0% {
			transform: translate(0, -8rpx);
			opacity: 0;
		}
		25% {
			opacity: 1;
		}
		100% {
			transform: translate(7rpx, 24rpx);
			opacity: 0;
		}
	}
	@keyframes storm-glow {
		0%,
		60%,
		100% {
			opacity: 1;
		}
		64%,
		70% {
			opacity: 0.6;
		}
		67%,
		73% {
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.weather-image,
		.rain-drop,
		.snow-flake {
			animation: none;
		}
		.rain-drops,
		.snow-flakes {
			display: none;
		}
	}
</style>
