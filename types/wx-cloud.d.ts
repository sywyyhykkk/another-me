export interface WechatCloudInitOptions {
	env: string
	traceUser?: boolean
}

export interface WechatCloudCallFunctionResult<T = unknown> {
	result: T
	errMsg?: string
}

export interface WechatCloudService {
	init: (options: WechatCloudInitOptions) => void
	callFunction: <T = unknown>(options: {
		name: string
		data?: Record<string, unknown>
	}) => Promise<WechatCloudCallFunctionResult<T>>
}

export interface WechatWxWithCloud {
	cloud?: WechatCloudService
}
