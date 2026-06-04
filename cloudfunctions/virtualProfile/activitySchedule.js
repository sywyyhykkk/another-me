/**
 * 与 activityEngine 日程表保持一致，用于判断当前是否仍处于同一活动时段。
 * 修改 TIMELINE_TEMPLATES 时请同步 activityEngine/index.js
 */
const TIMELINE_TEMPLATES = {
  office_worker: [
    { time: '00:00', title: '正在睡觉', state: 'sleeping' },
    { time: '07:30', title: '起床', state: 'sleeping' },
    { time: '08:15', title: '吃早餐', state: 'eating' },
    { time: '09:00', title: '工作', state: 'working' },
    { time: '12:30', title: '午餐', state: 'eating' },
    { time: '15:00', title: '继续工作', state: 'working' },
    { time: '18:30', title: '晚餐', state: 'eating' },
    { time: '20:00', title: '放松', state: 'relaxing' },
    { time: '23:00', title: '准备睡觉', state: 'sleeping' }
  ],
  student: [
    { time: '00:00', title: '正在睡觉', state: 'sleeping' },
    { time: '07:30', title: '起床', state: 'sleeping' },
    { time: '08:15', title: '吃早餐', state: 'eating' },
    { time: '09:00', title: '上课', state: 'studying' },
    { time: '12:30', title: '午餐', state: 'eating' },
    { time: '15:00', title: '继续学习', state: 'studying' },
    { time: '18:30', title: '晚餐', state: 'eating' },
    { time: '20:00', title: '发呆', state: 'relaxing' },
    { time: '23:00', title: '准备睡觉', state: 'sleeping' }
  ],
  freelancer: [
    { time: '00:00', title: '正在睡觉', state: 'sleeping' },
    { time: '08:30', title: '起床', state: 'sleeping' },
    { time: '09:30', title: '早餐', state: 'eating' },
    { time: '11:00', title: '处理事务', state: 'working' },
    { time: '13:00', title: '午餐', state: 'eating' },
    { time: '16:00', title: '自由时间', state: 'relaxing' },
    { time: '19:00', title: '晚餐', state: 'eating' },
    { time: '21:00', title: '放松', state: 'relaxing' },
    { time: '23:30', title: '准备睡觉', state: 'sleeping' }
  ],
  traveler: [
    { time: '00:00', title: '正在睡觉', state: 'sleeping' },
    { time: '07:00', title: '起床', state: 'sleeping' },
    { time: '08:00', title: '早餐', state: 'eating' },
    { time: '10:00', title: '街头漫步', state: 'traveling' },
    { time: '13:00', title: '午餐', state: 'eating' },
    { time: '16:00', title: '探索远方', state: 'traveling' },
    { time: '19:00', title: '晚餐', state: 'eating' },
    { time: '21:00', title: '看风景', state: 'traveling' },
    { time: '23:00', title: '准备睡觉', state: 'sleeping' }
  ]
}

function parseTimeToMinutes(timeStr) {
  const parts = String(timeStr).split(':')
  const hour = Number(parts[0]) || 0
  const minute = Number(parts[1]) || 0
  return hour * 60 + minute
}

function getTimelineTemplate(role) {
  return TIMELINE_TEMPLATES[role] || TIMELINE_TEMPLATES.office_worker
}

function getCurrentTimelineIndex(timeline, localMinutes) {
  let index = -1
  for (let i = 0; i < timeline.length; i++) {
    if (parseTimeToMinutes(timeline[i].time) <= localMinutes) {
      index = i
    }
  }
  if (index === -1) {
    return 0
  }
  return index
}

function getLocalTimePartsFromTimezone(timezone, date) {
  const at = date || new Date()

  if (timezone && timezone.timezoneId) {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone.timezoneId,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).formatToParts(at)
      const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0)
      const minute = Number(parts.find((p) => p.type === 'minute')?.value || 0)
      return {
        hour,
        minute,
        localMinutes: hour * 60 + minute
      }
    } catch (error) {
      return null
    }
  }

  if (timezone && typeof timezone.rawOffset === 'number') {
    const offsetSec =
      typeof timezone.dstOffset === 'number' ? timezone.dstOffset : timezone.rawOffset
    const utcMs = at.getTime() + at.getTimezoneOffset() * 60000
    const local = new Date(utcMs + offsetSec * 1000)
    const hour = local.getUTCHours()
    const minute = local.getUTCMinutes()
    return {
      hour,
      minute,
      localMinutes: hour * 60 + minute
    }
  }

  return null
}

function getLocalDateKeyInTimezone(timezone, date) {
  const at = date || new Date()

  if (timezone && timezone.timezoneId) {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone.timezoneId,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(at)
    } catch (error) {
      return null
    }
  }

  if (timezone && typeof timezone.rawOffset === 'number') {
    const offsetSec =
      typeof timezone.dstOffset === 'number' ? timezone.dstOffset : timezone.rawOffset
    const utcMs = at.getTime() + at.getTimezoneOffset() * 60000
    const local = new Date(utcMs + offsetSec * 1000)
    const y = local.getUTCFullYear()
    const m = String(local.getUTCMonth() + 1).padStart(2, '0')
    const d = String(local.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  return null
}

function getCurrentActivitySlot(role, timezone, date) {
  const timeline = getTimelineTemplate(role)
  const parts = getLocalTimePartsFromTimezone(timezone, date)
  if (!parts) {
    return null
  }

  const index = getCurrentTimelineIndex(timeline, parts.localMinutes)
  const item = timeline[index]
  const localDateKey = getLocalDateKeyInTimezone(timezone, date)

  return {
    index,
    activityTitle: item.title,
    state: item.state,
    localDateKey: localDateKey || ''
  }
}

function buildActivitySlotKey(role, activityTitle, localDateKey) {
  return `${role}|${activityTitle}|${localDateKey}`
}

module.exports = {
  getCurrentActivitySlot,
  buildActivitySlotKey
}
