/** 将创建档案失败原因转为用户可读文案 */
export function getCreateProfileErrorMessage(
	error: unknown,
	serverMessage?: string
): string {
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
		return '地理服务暂未就绪，请稍后重试，或改用手动选择城市。'
	}
	if (msg.includes('云开发') || msg.includes('callFunction')) {
		return '无法连接云服务，请检查网络后重试。'
	}
	if (
		lower.includes('timeout') ||
		lower.includes('network') ||
		msg.includes('请求超时') ||
		msg.includes('fail')
	) {
		return '网络不太稳定，请稍后重试。'
	}
	if (msg.includes('Invalid') || msg.includes('invalid')) {
		return '信息不完整，请返回上一步重新选择位置和形象。'
	}

	return '暂时无法生成你的另一个我，请稍后再试。'
}
