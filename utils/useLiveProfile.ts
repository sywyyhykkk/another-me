import { computed, ref } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { profileMoment } from './world'
import { fetchActiveProfile } from './profileStorage'
import type { VirtualProfile, VirtualProfileResult } from '../types/virtualProfile'

export function useLiveProfile() {
	const profile = ref<VirtualProfile | null>(null)
	const now = ref(new Date())
	const loading = ref(true)
	const refreshing = ref(false)
	const error = ref('')
	let timer: ReturnType<typeof setInterval> | undefined
	let visible = false
	let generation = 0
	let lastSyncedAt = 0
	const moment = computed<VirtualProfileResult | null>(() => {
		if (!profile.value) {
			return null
		}

		return profileMoment(profile.value, now.value)
	})

	async function load(forceRefresh = false) {
		if (refreshing.value) {
			return
		}

		refreshing.value = true
		const requestGeneration = generation

		try {
			const value = await fetchActiveProfile({ forceRefresh })
			if (!visible || generation !== requestGeneration) {
				return
			}

			profile.value = value
			error.value = value ? '' : '还没有你的另一个我'
			now.value = new Date()
			lastSyncedAt = now.value.getTime()
		} catch (e) {
			if (visible) {
				error.value = e instanceof Error ? e.message : '暂时无法连接，请重试'
			}
		} finally {
			refreshing.value = false
			if (visible) {
				loading.value = false

				if (generation !== requestGeneration) {
					void load()
				}
			}
		}
	}

	onShow(() => {
		visible = true
		now.value = new Date()
		void load()
		if (timer) {
			clearInterval(timer)
		}

		timer = setInterval(() => {
			const oldDate = moment.value?.targetWorld.date
			now.value = new Date()

			if (
				oldDate !== moment.value?.targetWorld.date ||
				now.value.getTime() - lastSyncedAt >= 60000
			) {
				void load()
			}
		}, 1000)
	})

	function stop() {
		visible = false
		generation++

		if (timer) {
			clearInterval(timer)
		}

		timer = undefined
	}

	onHide(stop)
	onUnload(stop)
	return { profile, moment, loading, refreshing, error, load }
}
