import { setLocation, setLocationDenied } from './session'

export interface LocationAuthResult {
	success: boolean
	denied: boolean
	latitude?: number
	longitude?: number
}

function fetchLocation(): Promise<LocationAuthResult> {
	return new Promise((resolve) => {
		uni.getLocation({
			type: 'gcj02',
			success: (res) => {
				setLocation(res.latitude, res.longitude)
				resolve({
					success: true,
					denied: false,
					latitude: res.latitude,
					longitude: res.longitude
				})
			},
			fail: (err) => {
				const errMsg = err.errMsg || ''
				const denied =
					errMsg.includes('auth deny') ||
					errMsg.includes('authorize') ||
					errMsg.includes('permission')

				if (denied) {
					setLocationDenied()
				}

				resolve({
					success: false,
					denied
				})
			}
		})
	})
}

/**
 * 进入首页时请求微信小程序定位权限。
 * 已授权则直接获取坐标；未授权则触发系统授权弹窗。
 */
export async function requestLocationPermission(): Promise<LocationAuthResult> {
	return new Promise((resolve) => {
		uni.getSetting({
			success: async (settingRes) => {
				const locationAuth = settingRes.authSetting['scope.userLocation']

				if (locationAuth === false) {
					setLocationDenied()
					resolve({ success: false, denied: true })
					return
				}

				if (locationAuth === true) {
					resolve(await fetchLocation())
					return
				}

				// 尚未询问过，先 authorize 再 getLocation
				uni.authorize({
					scope: 'scope.userLocation',
					success: async () => {
						resolve(await fetchLocation())
					},
					fail: async () => {
						// authorize 失败时仍尝试 getLocation，由系统弹出授权框
						resolve(await fetchLocation())
					}
				})
			},
			fail: async () => {
				resolve(await fetchLocation())
			}
		})
	})
}

export function openLocationSettings() {
	uni.openSetting({
		success: async (res) => {
			if (res.authSetting['scope.userLocation']) {
				await fetchLocation()
			}
		}
	})
}

export function showLocationDeniedModal() {
	uni.showModal({
		title: '需要位置权限',
		content: '开启定位后，才能根据你的位置找到地球另一端。你也可以手动选择城市。',
		confirmText: '去设置',
		cancelText: '手动选择',
		success: (res) => {
			if (res.confirm) {
				openLocationSettings()
			} else if (res.cancel) {
				uni.navigateTo({
					url: '/pages/location-select/index'
				})
			}
		}
	})
}
