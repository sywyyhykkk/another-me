import type {
	CloudResponse,
	CreateVirtualProfilePayload,
	DeleteVirtualProfilePayload,
	VirtualProfile
} from '../types/virtualProfile'
import { callCloudFunction } from '../utils/wechatCloud'

export function getActiveVirtualProfile(options?: { forceRefresh?: boolean }) {
	return callCloudFunction<CloudResponse<VirtualProfile | null>>('virtualProfile', {
		action: 'getActive',
		...(options?.forceRefresh ? { payload: { forceRefresh: true } } : {})
	})
}

export function createVirtualProfile(payload: CreateVirtualProfilePayload) {
	return callCloudFunction<CloudResponse<VirtualProfile>>('virtualProfile', {
		action: 'create',
		payload
	})
}

export function deleteVirtualProfile(payload: DeleteVirtualProfilePayload) {
	return callCloudFunction<CloudResponse<null>>('virtualProfile', {
		action: 'delete',
		payload
	})
}
