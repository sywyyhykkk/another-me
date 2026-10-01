import type {
	ApiResponse,
	CreateVirtualProfilePayload,
	DeleteVirtualProfilePayload,
	VirtualProfile
} from '../types/virtualProfile'
import { requestApi } from '../utils/request'

export function getActiveVirtualProfile(options?: { forceRefresh?: boolean }) {
	return requestApi<ApiResponse<VirtualProfile | null>>(
		`/profiles/active${options?.forceRefresh ? '?forceRefresh=true' : ''}`
	)
}

export function createVirtualProfile(payload: CreateVirtualProfilePayload) {
	return requestApi<ApiResponse<VirtualProfile>>('/profiles', 'POST', payload)
}

export function deleteVirtualProfile(payload: DeleteVirtualProfilePayload) {
	return requestApi<ApiResponse<null>>('/profiles', 'DELETE', payload)
}
