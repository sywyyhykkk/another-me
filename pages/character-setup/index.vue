<template>
	<view
		class="page"
		:style="keyboardHeight ? { paddingBottom: `${keyboardHeight + 24}px` } : undefined"
	>
		<view class="content">
			<button v-if="showBack" class="back" @click="goBack">‹ 返回</button>
			<view class="header">
				<text class="step">第一步 · 认识远方的自己</text>
				<text class="title">为远方的你取个名字</text>
				<text class="subtitle">一个名字，让地球另一端的生活更亲近。</text>
			</view>

			<view class="identity-card card">
				<view class="name-mark">
					<text>{{ nameInitial }}</text>
				</view>
				<text class="field-label">名字</text>
				<view class="name-field" :class="{ 'name-field--invalid': visibleNameError }">
					<input
						:value="name"
						:maxlength="-1"
						:placeholder="suggesting && !name ? '正在寻找名字灵感...' : '输入喜欢的名字'"
						placeholder-class="name-placeholder"
						confirm-type="done"
						:cursor-spacing="32"
						:adjust-position="true"
						@input="onNameInput"
						@blur="onNameBlur"
						@keyboardheightchange="onKeyboardHeightChange"
					/>
					<text class="name-count">{{ nameLength }}/12</text>
				</view>
				<text v-if="visibleNameError" class="validation">{{ visibleNameError }}</text>
				<text v-else class="field-hint">可以使用推荐名字，也可以写下喜欢的名字。</text>
				<button
					class="new-name"
					:disabled="loadingOrigin || suggesting || !origin"
					@click="requestSuggestion(true)"
				>
					{{ suggesting ? '正在寻找名字...' : '换个名字' }}
				</button>

				<text class="field-label gender-label">性别</text>
				<view class="gender-options">
					<button
						v-for="option in genderOptions"
						:key="option.value"
						class="gender-option"
						:class="{ 'gender-option--active': gender === option.value }"
						:disabled="loadingOrigin"
						@click="selectGender(option.value)"
					>
						{{ option.label }}
					</button>
				</view>
			</view>

			<view class="suggestion-status">
				<view v-if="error" class="error-card">
					<scroll-view scroll-y class="error-message">
						<text class="error-text">{{ error }}</text>
					</scroll-view>
					<button class="retry" :disabled="loadingOrigin || suggesting" @click="retry">
						重新获取建议
					</button>
				</view>
				<view v-else-if="loadingOrigin || suggesting" class="place-note">
					<view class="status-dot status-dot--loading" />
					<text>
						{{ loadingOrigin ? '正在确认你的起点...' : '正在寻找地球另一端的名字灵感...' }}
					</text>
				</view>
				<view v-else-if="continentLabel" class="place-note">
					<view class="status-dot" />
					<view class="place-copy">
						<text class="place-title">名字灵感来自{{ continentLabel }}</text>
						<text v-if="locationLabel" class="place-detail">地球另一端 · {{ locationLabel }}</text>
					</view>
				</view>
			</view>

			<view class="footer">
				<button class="next" :disabled="!canContinue || navigating" @click="goNext">
					选择生活方式
				</button>
				<text class="footer-note">名字和性别用于远方角色的展示。</text>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
	import { computed, ref } from 'vue'
	import { onLoad, onUnload } from '@dcloudio/uni-app'
	import type {
		CharacterGender,
		ContinentCode,
		OriginLocation,
		TargetKind
	} from '../../types/virtualProfile'
	import { suggestCharacter } from '../../api/character'
	import { buildOriginLocation } from '../../utils/profileBuilder'
	import {
		getCachedCharacterDraft,
		getCachedLocationMode,
		getCachedSelectedCity,
		getCachedUserLocation,
		getCharacterNameError,
		getCharacterOriginKey,
		invalidateCharacterDraftForOrigin,
		saveCharacterDraft
	} from '../../utils/profileStorage'

	const genderOptions: { value: CharacterGender; label: string }[] = [
		{ value: 'male', label: '男' },
		{ value: 'female', label: '女' },
		{ value: 'unspecified', label: '不设定' }
	]
	const origin = ref<OriginLocation | null>(null)
	const showBack = ref(true)
	const name = ref(''),
		gender = ref<CharacterGender>('unspecified')
	const continent = ref<ContinentCode>(),
		continentLabel = ref(''),
		locationLabel = ref(''),
		targetKind = ref<TargetKind>()
	const loadingOrigin = ref(true),
		suggesting = ref(false),
		navigating = ref(false),
		nameTouched = ref(false)
	const error = ref(''),
		keyboardHeight = ref(0)
	let requestVersion = 0,
		nameEditVersion = 0,
		disposed = false,
		retryReplacesName = false

	const nameLength = computed(() => Array.from(name.value.trim()).length)
	const nameInitial = computed(() => Array.from(name.value.trim())[0] || '我')
	const visibleNameError = computed(() =>
		nameTouched.value ? getCharacterNameError(name.value) : ''
	)
	const canContinue = computed(() =>
		Boolean(
			origin.value &&
			continent.value &&
			!getCharacterNameError(name.value) &&
			!loadingOrigin.value &&
			!suggesting.value &&
			!error.value
		)
	)

	function persistDraft() {
		if (!origin.value || disposed) return
		saveCharacterDraft({
			originKey: getCharacterOriginKey(origin.value),
			name: name.value,
			gender: gender.value,
			continent: continent.value,
			continentLabel: continentLabel.value || undefined,
			locationLabel: locationLabel.value || undefined,
			targetKind: targetKind.value
		})
	}

	async function initialize() {
		loadingOrigin.value = true
		error.value = ''
		try {
			const mode = getCachedLocationMode()
			if (
				(mode !== 'manual' || !getCachedSelectedCity()) &&
				(mode !== 'device' || !getCachedUserLocation())
			)
				throw new Error('请返回首页，先选择你的起点位置')
			const currentOrigin = await buildOriginLocation()
			if (disposed) return
			origin.value = currentOrigin
			invalidateCharacterDraftForOrigin(currentOrigin)
			const draft = getCachedCharacterDraft(currentOrigin)
			if (draft) {
				name.value = draft.name
				nameTouched.value = Boolean(draft.name)
				gender.value = draft.gender
				continent.value = draft.continent
				continentLabel.value = draft.continentLabel || ''
				locationLabel.value = draft.locationLabel || ''
				targetKind.value = draft.targetKind
			}
			loadingOrigin.value = false
			if (!draft?.continent) await requestSuggestion(!draft)
		} catch (value) {
			if (!disposed)
				error.value = value instanceof Error ? value.message : '暂时无法确认起点，请重试'
		} finally {
			if (!disposed) loadingOrigin.value = false
		}
	}

	async function requestSuggestion(replaceName: boolean) {
		if (!origin.value || disposed) return
		const version = ++requestVersion
		const editVersion = nameEditVersion
		const requestedGender = gender.value
		const previousName = name.value.trim()
		retryReplacesName = replaceName
		suggesting.value = true
		error.value = ''
		continent.value = undefined
		continentLabel.value = ''
		locationLabel.value = ''
		targetKind.value = undefined
		persistDraft()
		try {
			const response = await suggestCharacter({
				originLocation: origin.value,
				gender: requestedGender,
				...(replaceName && previousName ? { excludeName: previousName } : {})
			})
			if (disposed || version !== requestVersion) return
			if (!response.success || !response.data)
				throw new Error(response.message || '名字建议暂时不可用，请重试')
			const suggestion = response.data
			if (
				!['AS', 'EU', 'AF', 'NA', 'SA', 'OC', 'AN'].includes(suggestion.continent) ||
				suggestion.gender !== requestedGender ||
				getCharacterNameError(suggestion.name)
			)
				throw new Error('名字建议暂时不可用，请重试')
			continent.value = suggestion.continent
			continentLabel.value = suggestion.continentLabel
			locationLabel.value = suggestion.locationLabel
			targetKind.value = suggestion.targetKind
			if (nameEditVersion === editVersion && (replaceName || !name.value.trim()))
				name.value = suggestion.name.trim()
			persistDraft()
		} catch (value) {
			if (!disposed && version === requestVersion)
				error.value = value instanceof Error ? value.message : '名字建议暂时不可用，请重试'
		} finally {
			if (!disposed && version === requestVersion) suggesting.value = false
		}
	}

	function selectGender(value: CharacterGender) {
		if (gender.value === value || loadingOrigin.value) return
		gender.value = value
		persistDraft()
		void requestSuggestion(true)
	}

	function onNameInput(event: { detail: { value: string } }) {
		name.value = event.detail.value
		nameTouched.value = true
		nameEditVersion += 1
		retryReplacesName = false
		persistDraft()
	}

	function onNameBlur() {
		if (!getCharacterNameError(name.value)) name.value = name.value.trim()
		nameTouched.value = true
		keyboardHeight.value = 0
		persistDraft()
	}

	function onKeyboardHeightChange(event: { detail: { height: number } }) {
		keyboardHeight.value = Math.max(0, Number(event.detail.height) || 0)
	}

	function retry() {
		if (loadingOrigin.value || suggesting.value) return
		if (origin.value) void requestSuggestion(retryReplacesName)
		else void initialize()
	}

	function goNext() {
		nameTouched.value = true
		if (!canContinue.value || navigating.value) return
		name.value = name.value.trim()
		persistDraft()
		uni.hideKeyboard()
		navigating.value = true
		uni.navigateTo({
			url: '/pages/avatar-select/index',
			complete: () => {
				navigating.value = false
			}
		})
	}

	function goBack() {
		persistDraft()
		uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/index/index?create=1' }) })
	}

	onLoad((options) => {
		showBack.value = options?.from !== 'result'
		void initialize()
	})
	onUnload(() => {
		disposed = true
		requestVersion += 1
	})
</script>

<style lang="scss" scoped>
	.page {
		min-height: 100vh;
		box-sizing: border-box;
		padding: calc(var(--status-bar-height) + 98rpx) 32rpx calc(40rpx + env(safe-area-inset-bottom));
		background: $am-bg;
		color: $am-text;
	}
	.content {
		width: 100%;
		max-width: 680px;
		margin: 0 auto;
	}
	.back {
		display: inline-block;
		margin: 0 0 30rpx;
		padding: 0 10rpx;
		background: transparent;
		color: $am-text-muted;
		font-size: $am-font-size-base;
		line-height: 50rpx;
	}
	.back::after,
	.new-name::after,
	.retry::after {
		border: 0;
	}
	.step {
		display: block;
		font-size: $am-font-size-hint;
		color: #78947b;
		margin-bottom: 12rpx;
	}
	.title {
		display: block;
		font-size: $am-font-size-title;
		font-weight: 600;
		line-height: 1.4;
	}
	.subtitle {
		display: block;
		font-size: $am-font-size-base;
		line-height: 1.7;
		color: $am-text-muted;
		margin-top: 16rpx;
	}
	.header {
		margin: 0 8rpx 32rpx;
	}
	.card {
		background: $am-card;
		border: 2rpx solid $am-border;
		border-radius: 32rpx;
		box-shadow: $am-shadow-soft;
	}
	.identity-card {
		padding: 32rpx;
	}
	.name-mark {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 104rpx;
		height: 104rpx;
		border-radius: 50%;
		background: #f8e7cf;
		color: #9c7142;
		font-size: $am-font-size-display;
		margin: 0 auto 30rpx;
	}
	.field-label {
		display: block;
		font-size: $am-font-size-base;
		font-weight: 600;
		margin-bottom: 14rpx;
	}
	.name-field {
		display: flex;
		align-items: center;
		gap: 12rpx;
		padding: 18rpx 20rpx;
		background: $am-bg-alt;
		border: 2rpx solid $am-border;
		border-radius: 18rpx;
	}
	.name-field--invalid {
		border-color: #c9866a;
	}
	.name-field input {
		flex: 1;
		min-width: 0;
		height: 56rpx;
		font-size: $am-font-size-base;
		color: $am-text;
	}
	.name-placeholder {
		color: #b3a391;
		font-size: $am-font-size-base;
	}
	.name-count {
		flex-shrink: 0;
		font-size: $am-font-size-hint;
		color: $am-text-muted;
	}
	.field-hint,
	.validation {
		display: block;
		font-size: $am-font-size-hint;
		line-height: 1.6;
		margin-top: 12rpx;
	}
	.field-hint {
		color: $am-text-muted;
	}
	.validation {
		font-size: $am-font-size-base;
		color: #a65e46;
	}
	.new-name {
		display: block;
		padding: 0;
		margin: 12rpx 0 0 auto;
		background: transparent;
		color: #9b7446;
		font-size: $am-font-size-base;
		line-height: 50rpx;
	}
	.new-name[disabled] {
		color: #baaa98;
		background: transparent;
	}
	.gender-label {
		margin-top: 28rpx;
	}
	.gender-options {
		display: flex;
		gap: 14rpx;
	}
	.gender-option {
		flex: 1;
		min-width: 0;
		margin: 0;
		padding: 0 4rpx;
		background: $am-bg-alt;
		border: 2rpx solid $am-border;
		border-radius: 16rpx;
		font-size: $am-font-size-base;
		line-height: 74rpx;
		color: $am-text-muted;
	}
	.gender-option::after {
		border: 0;
	}
	.gender-option--active {
		background: #eef5ee;
		border-color: $am-secondary;
		color: #587e60;
	}
	.suggestion-status {
		height: 88px;
		display: flex;
		align-items: center;
	}
	.place-note {
		width: 100%;
		box-sizing: border-box;
		display: flex;
		align-items: flex-start;
		gap: 8px;
		padding: 12px 8px;
		color: $am-text-muted;
		font-size: $am-font-size-base;
		line-height: 1.5;
	}
	.place-copy {
		flex: 1;
		min-width: 0;
	}
	.status-dot {
		flex-shrink: 0;
		width: 12rpx;
		height: 12rpx;
		background: $am-secondary;
		border-radius: 50%;
		margin-top: 7px;
	}
	.status-dot--loading {
		background: $am-primary;
	}
	.place-title,
	.place-detail {
		display: block;
	}
	.place-detail {
		font-size: $am-font-size-hint;
		margin-top: 4px;
		opacity: 0.85;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.error-card {
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		padding: 8px 12px;
		border-radius: 20rpx;
		background: #faeee6;
	}
	.error-message {
		height: 42px;
	}
	.error-text {
		display: block;
		font-size: $am-font-size-base;
		line-height: 1.5;
		color: #a25f45;
		overflow-wrap: anywhere;
	}
	.retry {
		margin: 4px 0 0 auto;
		padding: 0 8rpx;
		background: transparent;
		color: #956545;
		line-height: 24px;
		font-size: $am-font-size-base;
	}
	.footer {
		padding-top: 32rpx;
	}
	.next {
		margin: 0;
		background: $am-primary;
		color: #fff;
		border-radius: 48rpx;
		line-height: 94rpx;
		font-size: $am-font-size-base;
		box-shadow: 0 8rpx 20rpx rgba(230, 168, 92, 0.25);
	}
	.next::after {
		border: 0;
	}
	.next[disabled] {
		background: #e9d1b0;
		color: #fff9f1;
		box-shadow: none;
	}
	.footer-note {
		display: block;
		font-size: $am-font-size-hint;
		text-align: center;
		line-height: 1.7;
		color: $am-text-muted;
		margin-top: 20rpx;
	}
	@media (max-width: 340px) {
		.page {
			padding-left: 24rpx;
			padding-right: 24rpx;
		}
		.identity-card {
			padding: 24rpx;
		}
		.gender-options {
			gap: 10rpx;
		}
		.name-field {
			padding: 16rpx;
		}
	}
</style>
