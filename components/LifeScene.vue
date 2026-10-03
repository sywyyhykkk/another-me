<template>
	<view
		class="scene"
		:class="[
			scene.isDay ? 'scene--day' : 'scene--night',
			scene.habitat === 'boat_cabin' ? 'scene--ocean' : ''
		]"
	>
		<view class="window">
			<text class="sky">{{ scene.isDay ? '☀' : '☾' }}</text>
			<view v-if="scene.habitat === 'boat_cabin'" class="waves" />
		</view>
		<view class="shelf"><text>▥　▥　▤</text></view>
		<view class="desk" />
		<text class="character">{{ state === 'sleeping' ? '😴' : emoji || '🌏' }}</text>
		<text class="prop">
			{{
				state === 'working'
					? '💻'
					: state === 'studying'
						? '📖'
						: state === 'eating'
							? '🍲'
							: state === 'traveling'
								? '📓'
								: '☕'
			}}
		</text>
		<view class="scene-caption">
			<text>{{ scene.title }}</text>
			<text>
				{{
					state === 'sleeping'
						? '灯熄了，慢慢做一个梦'
						: scene.isDay
							? '日光陪着今天的生活'
							: '留一盏暖灯给自己'
				}}
			</text>
		</view>
	</view>
</template>
<script setup lang="ts">
	import type { Scene } from '../types/virtualProfile'
	defineProps<{ scene: Scene; state: string; emoji?: string }>()
</script>
<style scoped>
	.scene {
		height: 285rpx;
		border-radius: 26rpx;
		position: relative;
		overflow: hidden;
		background: #ead8bd;
		margin: 24rpx 0;
	}
	.scene--night {
		background: #5a5963;
	}
	.window {
		position: absolute;
		top: 26rpx;
		left: 38rpx;
		width: 160rpx;
		height: 135rpx;
		border: 9rpx solid #cba984;
		border-radius: 50rpx;
		background: #d5e5df;
		overflow: hidden;
	}
	.scene--night .window {
		background: #27374e;
	}
	.sky {
		position: absolute;
		left: 90rpx;
		top: 8rpx;
		font-size: 40rpx;
		color: #edbd66;
	}
	.waves {
		position: absolute;
		bottom: 0;
		width: 100%;
		height: 45rpx;
		background: repeating-linear-gradient(
			170deg,
			#789da5 0,
			#789da5 6rpx,
			#a6c9cc 8rpx,
			#a6c9cc 16rpx
		);
	}
	.shelf {
		position: absolute;
		right: 24rpx;
		top: 38rpx;
		border-bottom: 8rpx solid #a8886e;
		color: #907858;
		font-size: 26rpx;
	}
	.desk {
		position: absolute;
		right: 42rpx;
		top: 169rpx;
		width: 210rpx;
		height: 14rpx;
		background: #ac8263;
		border-radius: 4rpx;
	}
	.character {
		position: absolute;
		right: 147rpx;
		top: 92rpx;
		font-size: 72rpx;
	}
	.prop {
		position: absolute;
		right: 55rpx;
		top: 123rpx;
		font-size: 43rpx;
	}
	.scene-caption {
		position: absolute;
		bottom: 18rpx;
		left: 26rpx;
		right: 26rpx;
		display: flex;
		justify-content: space-between;
		color: #684f38;
		font-size: 21rpx;
		gap: 12rpx;
	}
	.scene--night .scene-caption {
		color: #fff2dc;
	}
</style>
