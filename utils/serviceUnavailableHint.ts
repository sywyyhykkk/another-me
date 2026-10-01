export function showServiceUnavailableHint() {
	uni.showToast({
		title: '服务连接失败，请稍后重试',
		icon: 'none',
		duration: 2500
	})
}
