export function getCreateProfileErrorMessage(error: unknown, serverMessage?: string): string {
	const parts: string[] = []
	if (serverMessage) parts.push(serverMessage)
	if (error instanceof Error && error.message) parts.push(error.message)
	else if (error && typeof error === 'object' && 'errMsg' in error) {
		parts.push(String((error as { errMsg: unknown }).errMsg))
	} else if (typeof error === 'string') {
		parts.push(error)
	}

	const msg = parts.join(' ')
	const lower = msg.toLowerCase()

	if (msg.includes('GEONAMES') || msg.includes('Missing GEONAMES')) {
		return '地理服务暂时不可用，请稍后重试。'
	}
	if (msg.includes('登录')) {
		return msg
	}
	if (lower.includes('timeout') || msg.includes('请求超时') || msg.includes('timed out')) {
		return '生成时间较长，请稍后重试；若反复失败，请改用手动选择城市。'
	}
	if (lower.includes('network') || msg.includes('fail')) {
		return '网络不太稳定，请稍后重试。'
	}
	if (msg.includes('Invalid') || msg.includes('invalid')) {
		return '信息不完整，请返回上一步重新选择位置和形象。'
	}

	return '暂时无法生成你的另一个我，请稍后再试。'
}
