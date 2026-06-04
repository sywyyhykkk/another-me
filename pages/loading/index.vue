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
				:class="{
					'step-item--done': index < activeStep || allDone,
					'step-item--active': index === activeStep && !allDone
				}"
			>
				<view class="step-dot">
					<uni-icons
						v-if="index < activeStep || allDone"
						type="checkmarkempty"
						:size="18"
						color="#fff"
					/>
					<uni-icons
						v-else-if="index === activeStep"
						class="step-dot__spin"
						type="spinner-cycle"
						:size="18"
						:color="APP_COLORS.secondary"
					/>
					<text v-else>{{ index + 1 }}</text>
				</view>
				<text class="step-text">{{ step }}</text>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { createVirtualProfile } from '../../api/virtualProfile'
import { LOADING_STEPS } from '../../utils/loadingSteps'
import { getCreateProfileErrorMessage } from '../../utils/createProfileError'
import { buildCreateProfilePayload } from '../../utils/profileBuilder'
import { APP_COLORS } from '../../config/theme'

const STEP_MIN_MS = 650
const DONE_HOLD_MS = 450

const steps = LOADING_STEPS
const activeStep = ref(-1)
const allDone = ref(false)
const isCreating = ref(false)

let cancelled = false
const pendingTimers = new Set<ReturnType<typeof setTimeout>>()

function sleep(ms: number) {
	return new Promise<void>((resolve) => {
		const timer = setTimeout(() => {
			pendingTimers.delete(timer)
			resolve()
		}, ms)
		pendingTimers.add(timer)
	})
}

function clearTimers() {
	pendingTimers.forEach((timer) => clearTimeout(timer))
	pendingTimers.clear()
}

onMounted(async () => {
	if (isCreating.value) return
	isCreating.value = true

	const createPromise = (async () => {
		const payload = await buildCreateProfilePayload()
		const res = await createVirtualProfile(payload)
		if (!res.success || !res.data) {
			throw new Error(res.message || 'create profile failed')
		}
		return res
	})()
	createPromise.catch(() => {})

	try {
		for (let i = 0; i < steps.length; i += 1) {
			if (cancelled) return
			activeStep.value = i

			if (i < steps.length - 1) {
				await sleep(STEP_MIN_MS)
			} else {
				await Promise.all([sleep(STEP_MIN_MS), createPromise])
			}
		}

		if (cancelled) return
		allDone.value = true
		await sleep(DONE_HOLD_MS)
		if (cancelled) return

		uni.redirectTo({
			url: '/pages/result/index'
		})
	} catch (error) {
		if (cancelled) return
		console.error('[loading] createVirtualProfile failed', error)
		clearTimers()
		isCreating.value = false

		const serverMessage = error instanceof Error ? error.message : undefined

		uni.showModal({
			title: '生成失败',
			content: getCreateProfileErrorMessage(error, serverMessage),
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
	cancelled = true
	clearTimers()
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

.step-item--active .step-dot {
	background: rgba(143, 185, 150, 0.16);
}

.step-dot__spin {
	animation: spin 0.9s linear infinite;
}

.step-item--done .step-dot {
	background: $am-secondary;
	color: #fff;
}

.step-text {
	font-size: 28rpx;
	color: $am-text-muted;
}

.step-item--active .step-text {
	color: $am-text;
	font-weight: 600;
}

.step-item--done .step-text {
	color: $am-text;
}
</style>
