import type { ApiResponse, ShareSnapshot } from '../types/virtualProfile'
import { requestApi, requestPublicApi } from '../utils/request'
export async function createShareSnapshot(): Promise<ShareSnapshot> {
	const response = await requestApi<ApiResponse<ShareSnapshot>>('/shares', 'POST')
	if (!response.success || !response.data) throw new Error(response.message || '分享准备失败')
	return response.data
}
export async function getShareSnapshot(id: string): Promise<ShareSnapshot> {
	const response = await requestPublicApi<ApiResponse<ShareSnapshot>>(
		`/shares/${encodeURIComponent(id)}`
	)
	if (!response.success || !response.data) throw new Error(response.message || '分享快照不存在')
	return response.data
}
