<template>
  <view class="world-pair">
    <view v-for="(world, index) in [origin, target]" :key="index" class="world" :class="world.isDay ? 'world--day' : 'world--night'">
      <view class="world-heading"><text>{{ index === 0 ? '你的世界' : '对面的世界' }}</text><text>{{ world.isDay ? '☀' : '☾' }}</text></view>
      <text class="world-place">{{ world.place }}</text>
      <text class="world-clock">{{ world.time }}</text>
      <text class="world-date">{{ world.relativeDay }} · {{ world.date }}</text>
      <text class="world-light">{{ world.dayNight }}{{ world.dayNightEstimated ? ' · 估算' : '' }}</text>
      <text class="world-zone">{{ world.timeLabel }}</text>
    </view>
  </view>
</template>
<script setup lang="ts">
import type { WorldClock } from '../types/virtualProfile'
defineProps<{ origin: WorldClock; target: WorldClock }>()
</script>
<style lang="scss" scoped>
.world-pair{display:flex;gap:16rpx}.world{flex:1;min-width:0;border-radius:28rpx;padding:24rpx 20rpx;overflow:hidden;box-sizing:border-box}.world--day{background:linear-gradient(145deg,#ffe7b9,#fff8e9);color:#684b31}.world--night{background:linear-gradient(145deg,#334c65,#59677d);color:#fff6e9}.world-heading{display:flex;justify-content:space-between;font-size:24rpx;opacity:.85}.world-place{display:block;font-size:29rpx;font-weight:600;line-height:1.4;margin-top:14rpx;min-height:80rpx;overflow-wrap:anywhere}.world-clock{display:block;font-size:58rpx;letter-spacing:1rpx;font-weight:600}.world-date{display:block;font-size:22rpx;margin-top:6rpx}.world-light{display:block;font-size:24rpx;margin-top:14rpx}.world-zone{display:block;font-size:19rpx;line-height:1.4;opacity:.75;margin-top:6rpx;overflow-wrap:anywhere}
</style>
