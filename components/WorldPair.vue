<template>
  <view class="world-pair-wrap">
  <view class="world-pair">
    <view v-for="(world, index) in [origin, target]" :key="index" class="world" :class="world.isDay ? 'world--day' : 'world--night'">
      <view class="world-heading"><text>{{ index === 0 ? '你的世界' : '对面的世界' }}</text></view>
      <text class="world-place">{{ world.place }}</text>
      <text class="world-clock">{{ world.time }}</text>
      <text class="world-date">{{ world.relativeDay }} · {{ world.date }}</text>
      <view v-if="world.weather" class="world-weather">
        <WeatherIcon :code="world.weather.code" :is-day="world.isDay" :description="world.weather.text" />
        <view class="weather-copy">
          <text class="weather-temperature">{{ weatherTemperature(world.weather) }}</text>
          <text class="weather-description">{{ world.weather.text }}</text>
          <text class="weather-period">{{ world.weather.stale ? '最近天气' : index === 0 ? weatherHour(world) + '时天气' : '当日预报' }}</text>
        </view>
      </view>
      <text v-else class="weather-unavailable">天气暂不可用</text>
      <text class="world-light">{{ world.dayNight }}{{ world.dayNightEstimated ? ' · 估算' : '' }}</text>
      <text class="world-zone">{{ world.timeLabel }}</text>
    </view>
  </view>
  <view v-if="origin.weather || target.weather" class="weather-source">
    <text @click="openWeatherSource">天气服务由和风天气提供</text>
  </view>
  </view>
</template>
<script setup lang="ts">
import type { WorldClock } from '../types/virtualProfile'
import WeatherIcon from './WeatherIcon.vue'
import { weatherTemperature } from '../utils/weather'
defineProps<{ origin: WorldClock; target: WorldClock }>()
function weatherHour(world: WorldClock) {
  const fetched = Date.parse(world.weather?.fetchedAt || '') + world.utcOffsetSeconds * 1000
  return Number.isFinite(fetched) ? String(new Date(fetched).getUTCHours()).padStart(2, '0') : String(world.hour).padStart(2, '0')
}
function openWeatherSource() {
  // #ifdef H5
  window.open('https://www.qweather.com', '_blank', 'noopener')
  // #endif
  // #ifndef H5
  uni.setClipboardData({ data: 'https://www.qweather.com', success: () => uni.showToast({ title: '已复制和风天气网址', icon: 'none' }) })
  // #endif
}
</script>
<style lang="scss" scoped>
.world-pair{display:flex;gap:16rpx}.world{flex:1;min-width:0;border-radius:28rpx;padding:24rpx 20rpx;overflow:hidden;box-sizing:border-box}.world--day{background:linear-gradient(145deg,#ffe7b9,#fff8e9);color:#684b31}.world--night{background:linear-gradient(145deg,#334c65,#59677d);color:#fff6e9}.world-heading{display:flex;justify-content:space-between;font-size:24rpx;opacity:.85}.world-place{display:block;font-size:29rpx;font-weight:600;line-height:1.4;margin-top:14rpx;min-height:80rpx;overflow-wrap:anywhere}.world-clock{display:block;font-size:58rpx;letter-spacing:1rpx;font-weight:600}.world-date{display:block;font-size:22rpx;margin-top:6rpx}.world-light{display:block;font-size:24rpx;margin-top:14rpx}.world-zone{display:block;font-size:19rpx;line-height:1.4;opacity:.75;margin-top:6rpx;overflow-wrap:anywhere}
</style>
<style scoped>
.world-weather{display:flex;align-items:center;gap:4rpx;margin:12rpx -8rpx 0}.weather-copy{min-width:0;flex:1}.weather-temperature{display:block;font-size:30rpx;font-weight:600;line-height:1.3;white-space:nowrap}.weather-description{display:block;font-size:22rpx;line-height:1.5;overflow-wrap:anywhere}.weather-period{display:block;font-size:18rpx;line-height:1.5;opacity:.7}.weather-unavailable{display:block;font-size:22rpx;opacity:.65;margin-top:18rpx}.weather-source{font-size:20rpx;color:#92745a;text-align:right;line-height:1.5;margin:10rpx 6rpx 0}
@media(max-width:340px){.world-weather{gap:0}.weather-temperature{font-size:25rpx}.weather-description{font-size:20rpx}}
</style>
