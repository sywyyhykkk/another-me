import type { Avatar, MockResult, TimelineItem } from '../types/index'

export const MOCK_CITIES = ['北京', '上海', '广州', '昆明', '成都', '杭州']

export const MOCK_AVATARS: Avatar[] = [
	{
		id: 'office',
		name: '都市上班族',
		description: '认真工作，也可能正在摸鱼。',
		avatarColor: '#E6A85C'
	},
	{
		id: 'student',
		name: '学生',
		description: '学习、上课、发呆，循环播放人生。',
		avatarColor: '#8FB996'
	},
	{
		id: 'free',
		name: '自由生活者',
		description: '时间比较松，但不代表真的自由。',
		avatarColor: '#D4A574'
	},
	{
		id: 'traveler',
		name: '旅行者',
		description: '更容易出现在街头、海边和远方。',
		avatarColor: '#C9A882'
	}
]

export const MOCK_RESULT: MockResult = {
	localTime: '22:41',
	antipodeLocation: '智利附近',
	dayStatus: '工作日',
	currentActivity: '此刻，另一个你正在准备睡觉。',
	antipodeCoords: '南纬 25.04°，西经 77.29°',
	nearestArea: '智利附近',
	distance: '约 12,742 km',
	currentStatusLabel: '准备睡觉'
}

export const MOCK_TIMELINE: TimelineItem[] = [
	{ time: '07:30', activity: '起床' },
	{ time: '08:15', activity: '吃早餐' },
	{ time: '09:00', activity: '工作 / 上课' },
	{ time: '12:30', activity: '午餐' },
	{ time: '15:00', activity: '继续工作 / 学习' },
	{ time: '18:30', activity: '晚餐' },
	{ time: '20:00', activity: '放松' },
	{ time: '23:00', activity: '睡觉', isCurrent: true }
]

export const LOADING_STEPS = [
	'计算地球对面的坐标',
	'确认当地时间',
	'寻找最近的人类生活区域',
	'生成另一个我的当前状态'
]
