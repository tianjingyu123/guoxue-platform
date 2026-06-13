<template>
  <view class="page">
    <view class="nav-header">
      <view class="nav-left" @click="goBack"><text>←</text><text class="nav-title">{{course.title}}</text></view>
      <text class="nav-refresh" :class="{spin:refreshing}" @click="refresh">🔄</text>
    </view>
    <view class="progress-section">
      <view class="ps-info"><text>学习进度</text><text class="ps-num">{{course.completedLessons}}/{{course.totalLessons}}课时</text></view>
      <view class="ps-bar"><view class="ps-fill" :style="{width:course.progressPercent+'%'}"/></view>
      <text class="ps-pct">{{course.progressPercent}}%</text>
    </view>

    <view v-if="isLoading" class="skel"><view v-for="i in 4" :key="i" class="skel-item"/></view>
    <scroll-view v-else scroll-y class="content" :style="{height:'calc(100vh - 56px - 56px)'}">
      <view v-for="c in chapters" :key="c.id" class="chapter-card">
        <view class="ch-head" @click="toggleChapter(c.id)">
          <text class="ch-title">{{c.title}}</text>
          <text class="ch-count" :class="{done:isChapterDone(c)}">{{completedIn(c)}}/{{c.lessons.length}}</text>
          <text class="ch-arrow" :class="{exp:expanded.has(c.id)}">▼</text>
        </view>
        <view v-if="expanded.has(c.id)" class="ch-lessons">
          <view v-for="l in c.lessons" :key="l.id" class="lesson-item" :class="{locked:l.status==='locked'}" @click="handleLesson(l)">
            <text class="li-status">{{statusIcon(l.status)}}</text>
            <view class="li-info"><text class="li-title" :class="l.status==='completed'?'done':l.status==='in-progress'?'active':''">{{l.title}}</text><text class="li-dur">🕐{{fmtDur(l.duration)}}</text></view>
          </view>
        </view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
const isLoading=ref(true),refreshing=ref(false),expanded=ref(new Set(['ch1','ch2']))

const course={title:'八字命理入门到精通',totalLessons:32,completedLessons:12,progressPercent:38}
const chapters=ref([{id:'ch1',title:'第一章 八字基础概念',lessons:[{id:'l1',title:'1.1 什么是八字命理',duration:1520,status:'completed'},{id:'l2',title:'1.2 天干地支详解',duration:1830,status:'completed'},{id:'l3',title:'1.3 阴阳五行基础',duration:2100,status:'completed'},{id:'l4',title:'1.4 干支配合规律',duration:1650,status:'completed'}]},{id:'ch2',title:'第二章 排盘方法',lessons:[{id:'l5',title:'2.1 年柱的排法',duration:1420,status:'completed'},{id:'l6',title:'2.2 月柱的排法',duration:1680,status:'completed'},{id:'l7',title:'2.3 日柱的排法',duration:1550,status:'completed'},{id:'l8',title:'2.4 时柱的排法',duration:1720,status:'completed'}]},{id:'ch3',title:'第三章 十神详解',lessons:[{id:'l9',title:'3.1 比劫的含义与作用',duration:1850,status:'completed'},{id:'l10',title:'3.2 食伤的含义与作用',duration:1920,status:'completed'},{id:'l11',title:'3.3 财星的含义与作用',duration:1780,status:'completed'},{id:'l12',title:'3.4 官杀的含义与作用',duration:1650,status:'in-progress'},{id:'l13',title:'3.5 印星的含义与作用',duration:1880,status:'available'}]},{id:'ch4',title:'第四章 格局分析',lessons:[{id:'l14',title:'4.1 八格的判定方法',duration:2100,status:'available'},{id:'l15',title:'4.2 正格与变格',duration:1950,status:'available'},{id:'l16',title:'4.3 用神的取法',duration:2250,status:'available'},{id:'l17',title:'4.4 格局高低判断',duration:1820,status:'available'}]}])

function fmtDur(s:number){return Math.floor(s/60)+':'+(''+(s%60)).padStart(2,'0')}
function statusIcon(s:string){const m:any={completed:'✓',in_progress:'●',available:'▶',locked:'🔒'};return m[s]||'○'}
function completedIn(c:any){return c.lessons.filter((l:any)=>l.status==='completed').length}
function isChapterDone(c:any){return completedIn(c)===c.lessons.length}
function toggleChapter(id:string){const s=new Set(expanded.value);s.has(id)?s.delete(id):s.add(id);expanded.value=s}
function handleLesson(l:any){if(l.status==='locked'){uni.showToast({title:'请先完成前面的课程',icon:'none'});return}}
async function refresh(){refreshing.value=true;await new Promise(r=>setTimeout(r,500));refreshing.value=false}

function goBack(){uni.navigateBack()}
onMounted(async()=>{await new Promise(r=>setTimeout(r,600));isLoading.value=false})
onPullDownRefresh(()=>{refresh().finally(()=>uni.stopPullDownRefresh())})
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx;font-size:36rpx;color:#2C2C2C}.nav-title{font-size:28rpx;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:400rpx}
.nav-refresh{font-size:32rpx;padding:8rpx}.spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.progress-section{padding:20rpx 24rpx;background:#fff;border-bottom:1px solid #E8E0D5}
.ps-info{display:flex;justify-content:space-between;font-size:24rpx;color:#999;margin-bottom:8rpx}.ps-num{color:#C41E3A;font-weight:500}
.ps-bar{height:8rpx;background:#F5F1EB;border-radius:4rpx;overflow:hidden;margin-bottom:4rpx}.ps-fill{height:100%;background:linear-gradient(90deg,#C41E3A,#E85A71);border-radius:4rpx}.ps-pct{text-align:right;font-size:24rpx;font-weight:700;color:#C41E3A}
.skel{padding:24rpx}.skel-item{height:200rpx;background:#e8e8e8;border-radius:20rpx;margin-bottom:16rpx}
.content{padding:24rpx}
.chapter-card{background:#fff;border-radius:20rpx;margin-bottom:16rpx;overflow:hidden;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}
.ch-head{display:flex;align-items:center;gap:12rpx;padding:20rpx 24rpx;border-bottom:1px solid #F5F1EB}.ch-title{font-size:28rpx;font-weight:500;color:#2C2C2C;flex:1}.ch-count{font-size:22rpx;padding:4rpx 14rpx;border-radius:8rpx;background:#F5F1EB;color:#999}.ch-count.done{background:rgba(34,197,94,.1);color:#22c55e}.ch-arrow{font-size:22rpx;color:#999;transition:transform .2s}.ch-arrow.exp{transform:rotate(180deg)}
.ch-lessons{padding:0 24rpx}
.lesson-item{display:flex;align-items:center;gap:16rpx;padding:20rpx 0;border-bottom:1px solid #F5F1EB}.lesson-item.locked{opacity:.5}.lesson-item:last-child{border-bottom:none}
.li-status{font-size:28rpx;width:44rpx;text-align:center;color:#22c55e}.li-info{flex:1}.li-title{font-size:26rpx;color:#2C2C2C;display:block}.li-title.done{color:#999}.li-title.active{color:#C41E3A;font-weight:500}.li-dur{font-size:20rpx;color:#999;margin-top:2rpx}
</style>
