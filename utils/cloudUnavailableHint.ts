export function showCloudUnavailableHint() {
	uni.showToast({
		title: '网络异常，可继续创建新的另一个我',
		icon: 'none',
		duration: 2500
	})
}
