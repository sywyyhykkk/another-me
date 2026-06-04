const {
  getTimelineTemplate,
  getCurrentTimelineIndex,
  getLocalTimePartsFromTimezone,
  normalizeTimezoneForUse,
  resolveDayType
} = require('./activityScheduleCore')

function buildActivityResult({ selectedAvatar, distanceKm, geoMeta, timezone, antipode }) {
  if (!validateSelectedAvatar(selectedAvatar)) {
    return null
  }

  const avatar = normalizeSelectedAvatar(selectedAvatar)
  const km = typeof distanceKm === 'number' ? distanceKm : 0
  const antipodeLongitude =
    antipode && typeof antipode.longitude === 'number' ? antipode.longitude : undefined

  return buildResult(avatar, km, geoMeta, timezone, antipodeLongitude)
}

function validateSelectedAvatar(selectedAvatar) {
  if (!selectedAvatar) return false
  return (
    typeof selectedAvatar.id === 'string' &&
    typeof selectedAvatar.role === 'string' &&
    typeof selectedAvatar.name === 'string'
  )
}

function normalizeSelectedAvatar(selectedAvatar) {
  const roleMap = {
    office: 'office_worker',
    office_worker: 'office_worker',
    student: 'student',
    free: 'freelancer',
    freelancer: 'freelancer',
    traveler: 'traveler'
  }

  return {
    id: selectedAvatar.id,
    role: roleMap[selectedAvatar.role] || roleMap[selectedAvatar.id] || 'office_worker',
    name: selectedAvatar.name,
    description: selectedAvatar.description || '',
    emoji: selectedAvatar.emoji || '💼'
  }
}

const MOODS_BY_ROLE_AND_STATE = {
  office_worker: {
    sleeping: ['困倦', '睡意朦胧', '慢吞吞醒来', '还没进入状态'],
    eating: ['惬意', '满足', '边吃边放空', '补充体力中'],
    working: ['专注', '有点忙', '投入工作', '头脑在线', '稳步搬砖'],
    relaxing: ['轻松', '摸鱼中', '缓解疲劳', '下班的松弛感']
  },
  student: {
    sleeping: ['困意未消', '还想再睡会儿', '梦见逃课了', '慢吞吞醒来'],
    eating: ['饱足', '和同学闲聊', '补充能量', '食堂开饭了'],
    studying: ['认真听讲', '走神了', '笔记满满', '脑子里想晚饭', '课前预习中'],
    relaxing: ['发呆', '放空', '刷会儿手机', '难得的松弛']
  },
  freelancer: {
    sleeping: ['睡眠充足', '自然醒', '赖床五分钟', '慢节奏醒来'],
    eating: ['自在', '边想项目边吃', '口味随缘', '胃口不错'],
    working: ['干练', '进入状态', '处理琐事', '思路清晰'],
    relaxing: ['闲散', '悠闲', '今天不赶工', '随性放松', '漫步神游']
  },
  traveler: {
    sleeping: ['期待今天', '梦里也在旅行', '早睡早起', '养足精神'],
    eating: ['味蕾兴奋', '尝试当地味', '边吃边玩手机', '满足'],
    traveling: ['兴奋', '大开眼界', '脚步轻快', '探索欲拉满', '风景上头'],
    relaxing: ['回味今天', '放慢脚步', '看风景发呆', '旅途里的小憩']
  }
}

const DEEP_SLEEP_MOODS_BY_ROLE = {
  office_worker: ['熟睡中', '安静', '睡得正香', '别吵醒我', '酣睡'],
  student: ['熟睡中', '梦见逃课了', '安静', '睡得正香', '再睡一会'],
  freelancer: ['熟睡中', '自然深睡', '安静', '睡得正香', '别吵醒我'],
  traveler: ['熟睡中', '梦里也在旅行', '安静', '睡得正香', '养足精神']
}

function getTodayMood(role, state, localMinutes, activityTitle) {
  if (activityTitle === '正在睡觉') {
    const pool = DEEP_SLEEP_MOODS_BY_ROLE[role] || DEEP_SLEEP_MOODS_BY_ROLE.office_worker
    if (typeof localMinutes !== 'number') {
      return pool[0]
    }
    return pool[localMinutes % pool.length]
  }

  const rolePool = MOODS_BY_ROLE_AND_STATE[role] || MOODS_BY_ROLE_AND_STATE.office_worker
  const pool = rolePool[state] || rolePool.relaxing || ['平静']
  if (typeof localMinutes !== 'number') {
    return pool[0]
  }
  return pool[localMinutes % pool.length]
}

function getCurrentTitleByState(state) {
  const map = {
    working: '另一个你正在工作',
    studying: '另一个你正在学习',
    relaxing: '另一个你正在放松',
    traveling: '另一个你正在远方游玩',
    sleeping: '另一个你正在睡觉',
    eating: '另一个你正在用餐'
  }
  return map[state] || '另一个你正在生活'
}

function getCurrentTitle(currentItem) {
  const activityTitle = currentItem && currentItem.title
  const byActivityTitle = {
    正在睡觉: '另一个你正在睡觉',
    准备睡觉: '另一个你准备入睡',
    起床: '另一个你刚起床',
    吃早餐: '另一个你正在吃早餐',
    早餐: '另一个你正在吃早餐',
    午餐: '另一个你正在吃午餐',
    晚餐: '另一个你正在吃晚餐',
    工作: '另一个你正在工作',
    继续工作: '另一个你正在工作',
    上课: '另一个你正在上课',
    继续学习: '另一个你正在学习',
    发呆: '另一个你正在发呆',
    放松: '另一个你正在放松',
    自由时间: '另一个你正在享受自由时间',
    处理事务: '另一个你正在处理事务',
    街头漫步: '另一个你正在街头漫步',
    探索远方: '另一个你正在探索远方',
    看风景: '另一个你正在看风景'
  }

  if (activityTitle && byActivityTitle[activityTitle]) {
    return byActivityTitle[activityTitle]
  }

  return getCurrentTitleByState(currentItem && currentItem.state)
}

const DESCRIPTION_BY_ROLE_AND_TITLE = {
  office_worker: {
    正在睡觉: '地球另一端夜深人静，另一个你正在熟睡，偶尔翻身继续沉入梦乡。',
    起床: '当地天刚亮，另一个你刚起床，正在地球另一端迎接新的一天。',
    吃早餐: '另一个你坐在窗边吃早餐，准备投入地球另一端的工作日。',
    工作: '地球另一端正值办公时段，另一个你正在处理邮件、准备开会。',
    午餐: '另一个你趁午休离开工位，在当地餐馆吃一顿简餐。',
    继续工作: '午后精力回升，另一个你回到电脑前，继续地球另一端未完成的工作。',
    晚餐: '下班后的另一个你正在享用晚餐，把白天的忙碌暂时放下。',
    放松: '另一个你结束了一天的工作，瘫在沙发上里放松自己。',
    准备睡觉: '当地夜色已深，另一个你洗漱完毕，准备入睡结束这一天。'
  },
  student: {
    正在睡觉: '地球另一端夜色里，另一个你睡得正香，明天还有课要上。',
    起床: '另一个你在地球另一端被闹钟叫醒，睡眼惺忪地开始学生的一天。',
    吃早餐: '另一个你赶着吃完早餐，背包里装着课本赶往教室。',
    上课: '地球另一端的教室里，另一个你正在听课、记笔记。',
    午餐: '课间休息的另一个你和同学一起午餐，聊聊课程与琐事。',
    继续学习: '下午的学习继续，另一个你埋头完成作业和实验。',
    晚餐: '另一个你结束下午的学习，在食堂填饱肚子。',
    发呆: '学习告一段落，另一个你放空发呆，让大脑从公式和论文里抽离。',
    准备睡觉: '当地已到深夜，另一个你放下书本，准备睡觉迎接明天。'
  },
  freelancer: {
    正在睡觉: '没有闹钟的深夜，另一个你在地球另一端睡得安稳，明天再慢慢安排。',
    起床: '没有通勤钟点的另一个你睡到自然醒，在地球另一端缓慢启动一天。',
    早餐: '另一个你一边早餐一边浏览消息，盘算今天接哪些活、去哪张桌子工作。',
    处理事务: '另一个你对着电脑回复客户、整理发票，自由职业的一天正式运转。',
    午餐: '另一个你暂停手头项目，简单吃午餐，顺便刷刷地球另一端的新闻。',
    自由时间: '地球另一端阳光正好，另一个你散步、喝咖啡。',
    晚餐: '另一个你在小馆用餐，把白天零散的工作收成一段回忆。',
    放松: '另一个你关掉工作通知，听歌、阅读和朋友线上闲聊。',
    准备睡觉: '当地已近午夜，另一个你结束弹性作息，准备进入休息。'
  },
  traveler: {
    正在睡觉: '旅途中的另一个你在地球另一端沉沉睡去，为明天的探索积蓄体力。',
    起床: '另一个你在陌生的时区醒来，窗外是地球另一端还未熟悉的天空。',
    早餐: '另一个你在街边小店吃早餐，翻看今天要去的路径。',
    街头漫步: '另一个你走在地球另一端的街头，拍照、看橱窗、感受路过的风。',
    午餐: '走累了的另一个你坐下来，用当地风味午餐补充体力。',
    探索远方: '另一个你搭车前往景点，把地图上的标点变成亲眼所见。',
    晚餐: '另一个你在夜市体验地球另一端的晚餐，味蕾和眼睛都在旅行。',
    看风景: '暮色里的另一个你停下脚步，看日落、海景和城市灯火亮起。',
    准备睡觉: '旅途中的另一个你回到住处，整理照片与记忆，准备入睡。'
  }
}

function getCurrentDescription(role, currentItem) {
  const roleMap = DESCRIPTION_BY_ROLE_AND_TITLE[role] || DESCRIPTION_BY_ROLE_AND_TITLE.office_worker
  const title = currentItem && currentItem.title
  if (title && roleMap[title]) {
    return roleMap[title]
  }

  const state = currentItem && currentItem.state
  const stateFallback = {
    working: '另一个你正忙于地球另一端的工作事务。',
    studying: '另一个你正沉浸在地球另一端的学习里。',
    relaxing: '另一个你正享受地球另一端难得的悠闲时刻。',
    traveling: '另一个你正行走在地球另一端的路上。',
    sleeping: '另一个你正休息，地球另一端此刻安静而缓慢。',
    eating: '另一个你正在地球另一端用餐，补充这一天的能量。'
  }
  return stateFallback[state] || '根据当地时间和生活节奏，另一个你正在地球另一端过着属于它的此刻。'
}

function buildTimelineWithCurrent(timeline, currentIndex) {
  return timeline.map((item, index) => ({
    ...item,
    isCurrent: index === currentIndex
  }))
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function formatLocalTimeFromTimezone(timezone, date, antipodeLongitude) {
  const tz = normalizeTimezoneForUse(timezone)
  const parts = getLocalTimePartsFromTimezone(tz, date, antipodeLongitude)
  if (!parts) {
    return { localTime: '--:--', localDateLabel: '当地时间', localMinutes: null }
  }
  const localTime = `${pad2(parts.hour)}:${pad2(parts.minute)}`
  let localDateLabel = '当地时间'

  if (tz && tz.timezoneId) {
    try {
      const weekday = new Intl.DateTimeFormat('zh-CN', {
        timeZone: tz.timezoneId,
        weekday: 'long'
      }).format(date || new Date())
      localDateLabel = `当地时间 · ${weekday}`
    } catch (error) {
      localDateLabel = tz.timezoneId ? `当地时间 · ${tz.timezoneId}` : '当地时间'
    }
  }

  return {
    localTime,
    localDateLabel,
    localMinutes: parts.localMinutes
  }
}

function buildResult(selectedAvatar, distanceKm, geoMeta, timezone, antipodeLongitude) {
  const tz = normalizeTimezoneForUse(timezone)
  const at = new Date()
  const { localTime, localDateLabel, localMinutes } = formatLocalTimeFromTimezone(
    tz,
    at,
    antipodeLongitude
  )

  const timelineTemplate = getTimelineTemplate(selectedAvatar.role)
  const currentIndex =
    typeof localMinutes === 'number'
      ? getCurrentTimelineIndex(timelineTemplate, localMinutes)
      : timelineTemplate.length - 1
  const currentItem = timelineTemplate[currentIndex]
  const currentState = currentItem.state
  const currentTitle = getCurrentTitle(currentItem)
  const currentDescription = getCurrentDescription(selectedAvatar.role, currentItem)
  const todayMood = getTodayMood(
    selectedAvatar.role,
    currentState,
    localMinutes,
    currentItem.title
  )

  return {
    localTime,
    localDateLabel,
    dayType: resolveDayType(tz, at, antipodeLongitude),
    currentState,
    currentTitle,
    currentDescription,
    todayMood,
    distanceKm,
    timeline: buildTimelineWithCurrent(timelineTemplate, currentIndex),
    shareText: '地球另一端的我，正在过另一种此刻。',
    activityMeta: {
      engineVersion: 3,
      source: geoMeta && geoMeta.source ? `activity_from_${geoMeta.source}` : 'default'
    }
  }
}

module.exports = {
  buildActivityResult
}
