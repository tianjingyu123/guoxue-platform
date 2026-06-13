<template>
  <view class="page">
    <view class="video-area" @click="toggleControls">
      <view class="video-placeholder"><text class="vp-icon">▶</text></view>
      <view class="controls-overlay" :class="{hide:!showControls}">
        <view class="co-top" @click.stop><text class="co-back" @click="goBack">←</text><text class="co-title">{{content.title}}</text></view>
        <view class="co-center"><view class="co-btn" @click.stop="goPrev">⏮</view><view class="co-btn large" @click.stop="togglePlay">⏯</view><view class="co-btn" @click.stop="goNext">⏭</view></view>
        <view class="co-bottom" @click.stop><view class="cob-progress"><view class="cob-bar"><view class="cob-fill" :style="{width:(currentTime/duration*100)+'%'}"/></view><text class="cob-time">{{fmtTime(currentTime)}}/{{fmtTime(duration)}}</text></view>
          <view class="cob-actions"><text @click="toggleMute">🔊</text><text class="cob-speed" @click="cycleSpeed">{{playbackRate}}x</text><text @click="showChapters=true">📋</text><text @click="showNotes=true">📝</text></view>
        </view>
      </view>
    </view>

    <view class="info"><text class="info-title">{{content.title}}</text><text class="info-course">{{content.courseTitle}}</text></view>

    <view class="bottom-bar"><view class="bb-btn" @click="goNextLesson">▶ 下一课：{{content.nextLesson?.title||'无'}}</view></view>

    <view v-if="showChapters" class="drawer-mask" @click="showChapters=false"/>
    <view v-if="showChapters" class="drawer"><view class="dr-head"><text>课程目录</text><text class="dr-close" @click="showChapters=false">✕</text></view>
      <view v-for="c in chapters" :key="c.id" class="dr-ch"><text class="drc-title">{{c.title}}</text>
        <view v-for="l in c.lessons" :key="l.id" class="dr-lesson" :class="{act:l.id===content.id}"><text class="drl-icon">{{l.isCompleted?'✓':'○'}}</text><text class="drl-title">{{l.title}}</text><text class="drl-dur">{{l.duration}}分</text></view>
      </view>
    </view>

    <view v-if="showNotes" class="drawer-mask" @click="showNotes=false"/>
    <view v-if="showNotes" class="drawer"><view class="dr-head"><text>笔记</text><text class="dr-close" @click="showNotes=false">✕</text></view>
      <view class="note-input-area"><textarea v-model="noteContent" class="note-input" placeholder="记录你的学习笔记..."/><view class="note-send" @click="saveNote">发送</view></view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { onUnmounted } from 'vue'

const showControls=ref(true),isPlaying=ref(false),isMuted=ref(false),currentTime=ref(300),duration=ref(1800),playbackRate=ref(1),showChapters=ref(false),showNotes=ref(false),noteContent=ref('')

const content=ref({id:'1',title:'第一课：八字基础概念',courseTitle:'八字命理入门精讲',videoUrl:'',duration:1800,currentProgress:300,nextLesson:{id:'2',title:'第二课：天干地支'},prevLesson:null})
const chapters=[{id:'ch1',title:'第一章：基础入门',lessons:[{id:'1',title:'八字基础概念',duration:30,isCompleted:true},{id:'2',title:'天干地支详解',duration:25,isCompleted:false},{id:'3',title:'五行生克关系',duration:20,isCompleted:false}]}]

function fmtTime(s:number){const m=Math.floor(s/60),sec=Math.floor(s%60);return m+':'+(''+sec).padStart(2,'0')}
function toggleControls(){showControls.value=!showControls.value}
function togglePlay(){isPlaying.value=!isPlaying.value}
function toggleMute(){isMuted.value=!isMuted.value}
function cycleSpeed(){const speeds=[0.5,0.75,1,1.25,1.5,2];const i=speeds.indexOf(playbackRate.value);playbackRate.value=speeds[(i+1)%speeds.length]}
function goPrev(){}
function goNext(){}
function goNextLesson(){}
function saveNote(){noteContent.value='';showNotes.value=false}

function goBack(){uni.navigateBack()}

let controlsTimer:any=null
onUnmounted(()=>{if(controlsTimer)clearTimeout(controlsTimer)})
</script>
<style scoped>
.page{background:#000;min-height:100vh;display:flex;flex-direction:column}
.video-area{position:relative;aspect-ratio:16/9;background:#1a1a2e;display:flex;align-items:center;justify-content:center}.video-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center}.vp-icon{font-size:80rpx;color:rgba(255,255,255,.3)}
.controls-overlay{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;background:rgba(0,0,0,.4);transition:opacity .3s}.controls-overlay.hide{opacity:0;pointer-events:none}
.co-top{padding:20rpx 24rpx;display:flex;align-items:center;gap:16rpx}.co-back{font-size:32rpx;color:#fff}.co-title{font-size:24rpx;color:rgba(255,255,255,.8)}
.co-center{display:flex;align-items:center;justify-content:center;gap:40rpx}.co-btn{font-size:40rpx;color:#fff;padding:16rpx}.co-btn.large{font-size:56rpx}
.co-bottom{padding:16rpx 24rpx 24rpx}.cob-progress{display:flex;align-items:center;gap:12rpx;margin-bottom:12rpx}.cob-bar{flex:1;height:6rpx;background:rgba(255,255,255,.3);border-radius:3rpx;overflow:hidden}.cob-fill{height:100%;background:#C41E3A;border-radius:3rpx}.cob-time{font-size:20rpx;color:rgba(255,255,255,.7)}.cob-actions{display:flex;align-items:center;gap:24rpx;font-size:28rpx;color:#fff}.cob-speed{font-size:22rpx;padding:4rpx 12rpx;background:rgba(255,255,255,.2);border-radius:8rpx}
.info{padding:24rpx;background:#fff}.info-title{font-size:30rpx;font-weight:600;color:#2C2C2C;display:block}.info-course{font-size:22rpx;color:#999;margin-top:4rpx}
.bottom-bar{position:fixed;bottom:0;left:0;right:0;padding:20rpx 24rpx;background:#fff;border-top:1px solid #E8E0D5;z-index:50}.bb-btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:40rpx;font-size:28rpx}
.drawer-mask{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:80}.drawer{position:fixed;right:0;top:0;bottom:0;width:560rpx;background:#fff;z-index:81;display:flex;flex-direction:column}.dr-head{display:flex;justify-content:space-between;align-items:center;padding:24rpx;border-bottom:1px solid #E8E0D5;font-size:28rpx;font-weight:600}.dr-close{font-size:28rpx;color:#999;padding:8rpx}.dr-ch{padding:16rpx 24rpx}.drc-title{font-size:26rpx;font-weight:500;color:#2C2C2C;margin-bottom:12rpx;display:block}.dr-lesson{display:flex;align-items:center;gap:12rpx;padding:12rpx 0 12rpx 24rpx;font-size:24rpx;color:#999}.dr-lesson.act{color:#C41E3A}.drl-icon{width:36rpx}.drl-title{flex:1}.drl-dur{color:#ccc}
.note-input-area{display:flex;gap:12rpx;padding:20rpx 24rpx;border-top:1px solid #E8E0D5;margin-top:auto}.note-input{flex:1;height:80rpx;padding:12rpx 20rpx;background:#F5F1EB;border-radius:16rpx;font-size:24rpx}.note-send{padding:16rpx 28rpx;background:#C41E3A;color:#fff;border-radius:16rpx;font-size:24rpx}
</style>
