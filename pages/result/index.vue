<template>
  <view class="page">
    <view class="heading"><text class="brand">对面的我</text><button class="refresh" :disabled="refreshing" @click="load(true)">{{ refreshing ? '更新中' : '刷新' }}</button></view>
    <view v-if="loading" class="empty">正在寻找你的另一个我...</view>
    <view v-else-if="!profile || !moment" class="empty"><text>{{ error }}</text><button @click="load()">重试</button><button @click="redirectToHome">开启我的另一个我</button></view>
    <template v-else>
      <WorldPair :origin="moment.originWorld" :target="moment.targetWorld" />
      <view class="activity card">
        <text class="eyebrow">{{ profile.selectedAvatar.name }} · 现在</text>
        <text class="activity-title">它正在{{ moment.currentTitle }}</text>
        <text class="mood">{{ moment.todayMood }}</text>
        <LifeScene :scene="moment.scene" :state="moment.currentState" :emoji="profile.selectedAvatar.emoji" />
        <text class="description">{{ moment.currentDescription }}</text>
        <text v-if="profile.targetLocation.kind === 'ocean'" class="scene-note">{{ moment.scene.description }}</text>
      </view>
      <text class="connection">{{ moment.connectionText }}</text>
      <view class="card story"><text class="eyebrow">今天的小事 · 虚拟生活</text><text class="story-title">{{ moment.dailyStory.title }}</text><text class="description">{{ moment.dailyStory.text }}</text><view class="next"><text class="eyebrow">接下来 · {{ moment.nextActivity.time }}</text><text class="next-title">{{ moment.nextActivity.title }}</text></view></view>
      <view class="actions"><button class="btn primary" @click="goShare">分享这一刻</button><button class="btn secondary" @click="goTimeline">查看今天的日程</button></view>
      <button class="detail-toggle" @click="details = !details">{{ details ? '收起地点详情' : '展开地点详情' }}</button>
      <view v-if="details" class="card details">
        <view class="detail-row"><text>真实对跖点</text><text>{{ coords }}</text></view>
        <view class="detail-row"><text>{{ profile.targetLocation.kind === 'ocean' ? '海域' : '国家 / 区域' }}</text><text>{{ profile.targetLocation.oceanName || [profile.targetLocation.countryName,profile.targetLocation.regionName].filter(Boolean).join(' · ') || '地球另一端' }}</text></view>
        <view class="detail-row"><text>当地时差</text><text>{{ timeDifference }}</text></view>
        <view class="detail-row"><text>与你相隔</text><text>{{ distance }}</text></view>
        <view v-if="sunrise" class="detail-row"><text>今天日出</text><text>{{ sunrise }}</text></view>
        <view v-if="sunset" class="detail-row"><text>今天日落</text><text>{{ sunset }}</text></view>
      </view>
      <button class="reset" :disabled="resetting" @click="handleReset">换一个形象</button>
      <text v-if="error" class="error">{{ error }}</text>
    </template>
  </view>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import WorldPair from '../../components/WorldPair.vue'
import LifeScene from '../../components/LifeScene.vue'
import { useLiveProfile } from '../../utils/useLiveProfile'
import { redirectToHome, formatCoordinates, formatDistanceKm } from '../../utils/profileStorage'
const { profile, moment, loading, refreshing, error, load } = useLiveProfile()
const details=ref(false), resetting=ref(false)
const coords=computed(()=>profile.value ? formatCoordinates(profile.value.targetLocation.latitude,profile.value.targetLocation.longitude) : '')
const distance=computed(()=>formatDistanceKm(moment.value?.distanceKm || 0))
const timeDifference=computed(()=>{if(!moment.value)return '';const hours=(moment.value.targetWorld.utcOffsetSeconds-moment.value.originWorld.utcOffsetSeconds)/3600;return hours===0 ? '两边时间相同' : `对面${hours>0?'快':'慢'} ${Math.abs(hours)} 小时`})
function sunClock(value?:string){ return value?.startsWith(moment.value?.targetWorld.date+' ') ? value.slice(11,16) : '' }
const sunrise=computed(()=>sunClock(profile.value?.metadata.timezoneData?.sunrise)), sunset=computed(()=>sunClock(profile.value?.metadata.timezoneData?.sunset))
function goTimeline(){uni.navigateTo({url:'/pages/timeline/index'})}
function goShare(){uni.navigateTo({url:'/pages/share/index'})}
async function handleReset(){
  if(resetting.value)return
  // 保留定位，让换形象进入原有选择与创建流程；创建新档案会归档旧档案。
  if(profile.value){
    const origin=profile.value.originLocation
    uni.setStorageSync('otherMe:locationMode',origin.mode)
    if(origin.mode==='manual')uni.setStorageSync('otherMe:selectedCity',{name:origin.cityName,country:origin.countryName,latitude:origin.latitude,longitude:origin.longitude})
    else uni.setStorageSync('otherMe:userLocation',{source:'device',latitude:origin.latitude,longitude:origin.longitude,createdAt:Date.now()})
  }
  uni.navigateTo({url:'/pages/avatar-select/index'})
}
</script>
<style lang="scss" scoped>
.page{min-height:100vh;box-sizing:border-box;padding:calc(var(--status-bar-height) + 110rpx) 28rpx calc(40rpx + env(safe-area-inset-bottom));background:$am-bg;color:$am-text}.heading{display:flex;align-items:center;justify-content:space-between;margin:0 8rpx 24rpx}.brand{font-size:32rpx;font-weight:600}.refresh{font-size:23rpx;color:$am-text-muted;background:transparent;margin:0;padding:0 16rpx}.refresh::after{border:0}.empty{padding:100rpx 20rpx;text-align:center}.card{background:$am-card;border:2rpx solid $am-border;border-radius:28rpx;padding:28rpx;margin-top:24rpx;box-shadow:$am-shadow-soft}.eyebrow{display:block;color:$am-text-muted;font-size:23rpx}.activity-title{display:block;font-size:38rpx;font-weight:600;line-height:1.4;margin:14rpx 0}.mood{font-size:23rpx;color:#78977b}.description{display:block;font-size:27rpx;line-height:1.65}.scene-note{display:block;font-size:21rpx;line-height:1.5;color:$am-text-muted;margin-top:12rpx}.connection{display:block;font-size:28rpx;line-height:1.8;margin:30rpx 18rpx;color:#927052}.story-title{display:block;font-size:31rpx;font-weight:600;margin:14rpx 0}.next{margin-top:24rpx;padding-top:22rpx;border-top:2rpx dashed $am-border}.next-title{display:block;font-size:27rpx;margin-top:8rpx}.actions{display:flex;gap:16rpx;margin-top:30rpx}.btn{flex:1;min-width:0;border-radius:48rpx;font-size:26rpx;padding:0 10rpx;line-height:88rpx;margin:0}.primary{background:$am-primary;color:white}.secondary{background:$am-card;color:$am-text;border:2rpx solid $am-border}.detail-toggle,.reset{background:transparent;color:$am-text-muted;font-size:24rpx;margin-top:22rpx}.detail-toggle::after,.reset::after{border:0}.detail-row{display:flex;justify-content:space-between;gap:22rpx;font-size:24rpx;line-height:1.6;padding:15rpx 0}.detail-row text:first-child{flex-shrink:0;color:$am-text-muted}.detail-row text:last-child{text-align:right}.error{display:block;font-size:22rpx;text-align:center;color:#a05e4c;margin:20rpx}
@media(max-width:340px){.actions{flex-direction:column}.activity-title{font-size:34rpx}}
</style>
