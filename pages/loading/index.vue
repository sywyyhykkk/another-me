<template>
	<view class="page">
		<view class="earth-loading">
			<view class="earth-spinner" />
		</view>

		<text class="title">正在寻找地球另一端的你...</text>

		<view class="steps card">
			<view
				v-for="(step, index) in steps"
				:key="step"
				class="step-item"
				:class="{ 'step-item--done': index <= activeStep }"
			>
				<view class="step-dot">{{ index <= activeStep ? '✓' : index + 1 }}</view>
				<text class="step-text">{{ step }}</text>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { createVirtualProfile } from '../../api/virtualProfile'
import { LOADING_STEPS } from '../../utils/loadingSteps'
import { buildCreateProfilePayload } from '../../utils/profileBuilder'

const steps = LOADING_STEPS
const activeStep = ref(-1)
const isCreating = ref(false)

let stepTimer: ReturnType<typeof setInterval> | null = null
let startedAt = 0

onMounted(async () => {
	if (isCreating.value) return
	isCreating.value = true
	startedAt = Date.now()

	let step = 0
	activeStep.value = 0

	stepTimer = setInterval(() => {
		step += 1
		if (step < steps.length) {
			activeStep.value = step
		}
	}, 400)

	try {
		const payload = await buildCreateProfilePayload()
		const res = await createVirtualProfile(payload)

		if (!res.success || !res.data) {
			throw new Error(res.message || 'create profile failed')
		}

		const elapsed = Date.now() - startedAt
		const remain = Math.max(0, 1500 - elapsed)

		setTimeout(() => {
			uni.redirectTo({
				url: '/pages/result/index'
			})
		}, remain)
	} catch (error) {
		console.error('[loading] createVirtualProfile failed', error)
		isCreating.value = false

		uni.showModal({
			title: '生成失败',
			content: '暂时无法生成你的另一个我，请稍后再试。',
			showCancel: false,
			success: () => {
				uni.navigateBack({
					fail: () => {
						uni.reLaunch({
							url: '/pages/index/index'
						})
					}
				})
			}
		})
	}
})

onUnmounted(() => {
	if (stepTimer) clearInterval(stepTimer)
})
</script>

<style lang="scss" scoped>
.page {
	min-height: 100vh;
	padding: 248rpx 40rpx 64rpx;
	background: $am-bg;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.earth-loading {
	margin-bottom: 48rpx;
}

.earth-spinner {
	width: 160rpx;
	height: 160rpx;
	border-radius: 50%;
	background: linear-gradient(145deg, #a8d8ea 0%, #7ec8c8 45%, #5ba8a0 100%);
	border: 6rpx solid $am-border;
	box-shadow: $am-shadow;
	animation: spin 2s linear infinite;
	position: relative;
}

.earth-spinner::after {
	content: '';
	position: absolute;
	width: 40rpx;
	height: 28rpx;
	top: 40rpx;
	left: 30rpx;
	border-radius: 50%;
	background: rgba(143, 185, 150, 0.85);
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

.title {
	font-size: 34rpx;
	font-weight: 600;
	color: $am-text;
	text-align: center;
	margin-bottom: 48rpx;
	line-height: 1.5;
}

.card {
	width: 100%;
	background: $am-card;
	border-radius: $am-radius-lg;
	border: 2rpx solid $am-border;
	box-shadow: $am-shadow-soft;
	padding: 32rpx;
	box-sizing: border-box;
}

.step-item {
	display: flex;
	align-items: center;
	gap: 20rpx;
	padding: 20rpx 0;
}

.step-item + .step-item {
	border-top: 2rpx dashed $am-border;
}

.step-dot {
	width: 44rpx;
	height: 44rpx;
	border-radius: 50%;
	background: #f0e6d8;
	color: $am-text-muted;
	font-size: 22rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.step-item--done .step-dot {
	background: $am-secondary;
	color: #fff;
}

.step-text {
	font-size: 28rpx;
	color: $am-text-muted;
}

.step-item--done .step-text {
	color: $am-text;
}
</style>
