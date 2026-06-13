<template>
  <view class="page">
    <view class="nav-red"><view class="nav-row"><text class="nav-back" @click="goBack">←</text><text class="nav-title">学习计划</text><view class="streak"><text>🔥 {{streak}}天连续</text></view></view>
      <view class="progress-bar"><view class="pb-row"><text>今日完成</text><text>{{doneCount}}/{{tasks.length}}项</text></view><view class="pb-track"><view class="pb-fill" :style="{width: tasks.length?(doneCount/tasks.length*100)+'%':'0%'}"/></view><view class="pb-pct">{{tasks.length?Math.round(doneCount/tasks.length*100):0}}%</view></view>
    </view>

    <scroll-view scroll-y class="content" :style="{height:'calc(100vh - 56px)'}">
      <view class="goal-card">
        <view class="gc-head"><view class="gc-icon">🎯</view><text>学习目标</text><text class="gc-edit" @click="showGoalEditor=true">✏️ 编辑</text></view>
        <view class="gc-grid"><view class="gc-item"><text class="gci-val">{{goal.daysPerWeek}}</text><text class="gci-label">天/周</text></view><view class="gc-item"><text class="gci-val gold">{{goal.minutesPerDay}}</text><text class="gci-label">分钟/天</text></view><view class="gc-item"><text class="gci-val blue">{{goal.daysPerWeek*goal.minutesPerDay}}</text><text class="gci-label">分钟/周</text></view></view>
        <view class="week-ind"><view v-for="(l,i) in weekLabels" :key="i" class="wi-day" :class="{today:i===todayDay,planned:i!==0&&i<=goal.daysPerWeek}"><text>{{l}}</text></view></view>
      </view>

      <view class="card"><view class="card-head"><text>🔥 今日任务</text><text class="card-date">{{todayDate}}</text><text class="card-count">{{doneCount}}/{{tasks.length}}</text></view>
        <view class="task-progress"><view class="tp-bar"><view class="tp-fill" :style="{width: tasks.length?(doneCount/tasks.length*100)+'%':'0%'}"/></view></view>
        <view v-if="tasks.length===0" class="empty-sm">今日没有安排学习任务</view>
        <view v-for="t in tasks" :key="t.id" class="task-item" @click="toggleTask(t.id)"><text class="ti-check" :class="{done:t.isDone}">{{t.isDone?'✓':'○'}}</text><view class="ti-info"><text class="ti-title" :class="{done:t.isDone}">{{t.title}}</text><text class="ti-lesson">{{t.lessonTitle}}</text></view><text class="ti-time">🕐{{t.duration}}分钟</text></view>
      </view>

      <view class="card"><view class="card-head"><text>📅 课程安排</text><text class="gc-add" @click="goCourseList">＋</text></view>
        <view v-if="courses.length===0" class="empty-sm">还没有安排课程，点击添加</view>
        <view v-for="c in courses" :key="c.id" class="course-row">
          <view class="cr-cover">📚</view><view class="cr-info"><text class="cr-title">{{c.title}}</text><view class="cr-prog"><view class="cr-pbar"><view class="cr-pfill" :style="{width:(c.completedLessons/c.totalLessons*100)+'%'}"/></view><text class="cr-pct">{{Math.round(c.completedLessons/c.totalLessons*100)}}%</text></view>
            <view class="cr-days"><text v-for="(l,i) in weekLabels" :key="i" class="crd" :class="{on:c.scheduledDays.includes(i)}">{{l}}</text></view>
          </view><text class="cr-del" @click="removeCourse(c.id)">🗑️</text>
        </view>
      </view>
      <view class="add-hint"><text>从 </text><text class="link" @click="goCourseList">课程广场</text><text> 添加更多课程到学习计划</text></view>
      <view style="height:48rpx"/>
    </scroll-view>

    <view v-if="showGoalEditor" class="modal-mask" @click="showGoalEditor=false"/>
    <view v-if="showGoalEditor" class="goal-modal">
      <view class="gm-head"><text class="gm-title">设置学习目标</text><text class="gm-close" @click="showGoalEditor=false">✕</text></view>
      <text class="gm-label">每周学习天数</text>
      <view class="gm-nums"><text v-for="d in 7" :key="d" class="gm-num" :class="{sel:goalForm.days===d}" @click="goalForm.days=d">{{d}}</text></view>
      <text class="gm-label">每日学习时长</text>
      <view class="gm-nums"><text v-for="m in [15,20,30,45,60,90,120]" :key="m" class="gm-num" :class="{sel:goalForm.mins===m}" @click="goalForm.mins=m">{{m>=60?m/60+'小时':m+'分钟'}}</text></view>
      <view class="gm-save" @click="saveGoal">保存目标</view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const weekLabels=['日','一','二','三','四','五','六'],todayDay=new Date().getDay(),todayDate=new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'}),streak=ref(7)
const goal=reactive({daysPerWeek:5,minutesPerDay:30})
const goalForm=reactive({days:5,mins:30})
const showGoalEditor=ref(false)
const courses=ref([{id:'pc1',courseId:'c1',title:'八字命理入门精讲',cover:'',totalLessons:32,completedLessons:12,scheduledDays:[1,3,5],order:0},{id:'pc2',courseId:'c2',title:'紫微斗数基础课',cover:'',totalLessons:24,completedLessons:6,scheduledDays:[2,4],order:1},{id:'pc3',courseId:'c3',title:'周易易经入门',cover:'',totalLessons:18,completedLessons:0,scheduledDays:[6],order:2}])

const tasks=computed(()=>courses.value.filter(c=>c.scheduledDays.includes(todayDay)).map(c=>({id:'task-'+c.courseId,courseId:c.courseId,title:c.title,lessonTitle:'第'+(c.completedLessons+1)+'课',duration:30,isDone:false,date:new Date().toISOString().slice(0,10)})))
const doneCount=computed(()=>tasks.value.filter((t:any)=>t.isDone).length)

const toggleTask=()=>{/* toggle task state */};
const removeCourse=(id:string)=>{courses.value=courses.value.filter(c=>c.id!==id)}
const saveGoal=()=>{goal.daysPerWeek=goalForm.days;goal.minutesPerDay=goalForm.mins;showGoalEditor.value=false}

function goBack(){uni.navigateBack()}
function goCourseList(){uni.navigateTo({url:'/pages/courses/courses/index'})}
onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-red{background:linear-gradient(180deg,#C41E3A,#9B0B28);padding:24rpx 24rpx 32rpx;color:#fff}
.nav-row{display:flex;align-items:center;gap:16rpx;margin-bottom:20rpx}.nav-back{font-size:36rpx}.nav-title{font-size:34rpx;font-weight:700;flex:1}
.streak{background:rgba(255,255,255,.2);padding:8rpx 20rpx;border-radius:40rpx;font-size:22rpx}
.progress-bar{}.pb-row{display:flex;justify-content:space-between;font-size:22rpx;margin-bottom:8rpx;opacity:.8}.pb-track{height:10rpx;background:rgba(255,255,255,.2);border-radius:5rpx;overflow:hidden;margin-bottom:4rpx}.pb-fill{height:100%;background:#C9A96E;border-radius:5rpx}.pb-pct{font-size:44rpx;font-weight:900;color:#C9A96E;display:block}
.content{padding:24rpx}
.goal-card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.gc-head{display:flex;align-items:center;gap:8rpx;font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx}.gc-icon{font-size:32rpx}.gc-edit{margin-left:auto;font-size:22rpx;color:#C41E3A}
.gc-grid{display:flex;gap:16rpx;margin-bottom:20rpx}.gc-item{flex:1;text-align:center;background:#FAF8F5;border-radius:16rpx;padding:24rpx 0}.gci-val{font-size:44rpx;font-weight:900;color:#C41E3A;display:block}.gci-val.gold{color:#C9A96E}.gci-val.blue{color:#4A90D9}.gci-label{font-size:20rpx;color:#999;margin-top:4rpx}
.week-ind{display:flex;gap:6rpx}.wi-day{flex:1;height:56rpx;border-radius:12rpx;display:flex;align-items:center;justify-content:center;font-size:20rpx;background:#F5F1EB;color:#ccc}.wi-day.today{background:#C41E3A;color:#fff}.wi-day.planned{background:rgba(196,30,58,.1);color:#C41E3A}
.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.card-head{display:flex;align-items:center;gap:8rpx;font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:16rpx}.card-date{font-size:20rpx;color:#999;flex:1}.card-count{font-size:22rpx;font-weight:700;color:#C41E3A}
.gc-add{font-size:36rpx;color:#C41E3A;margin-left:auto}
.task-progress{margin-bottom:16rpx}.tp-bar{height:8rpx;background:#F5F1EB;border-radius:4rpx;overflow:hidden}.tp-fill{height:100%;background:linear-gradient(90deg,#C41E3A,#E74C3C);border-radius:4rpx}
.empty-sm{text-align:center;padding:60rpx 0;font-size:24rpx;color:#ccc}
.task-item{display:flex;align-items:center;gap:16rpx;padding:16rpx 0;border-bottom:1px solid #F5F1EB}.ti-check{font-size:32rpx;color:#E8E0D5}.ti-check.done{color:#22c55e}.ti-title{font-size:26rpx;color:#2C2C2C;display:block}.ti-title.done{text-decoration:line-through;color:#ccc}.ti-lesson{font-size:22rpx;color:#999}.ti-time{font-size:20rpx;color:#ccc;margin-left:auto}
.course-row{display:flex;align-items:center;gap:12rpx;padding:16rpx 0;border-bottom:1px solid #F5F1EB}.cr-cover{width:72rpx;height:72rpx;border-radius:16rpx;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:32rpx;flex-shrink:0}.cr-info{flex:1;min-width:0}.cr-title{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cr-prog{display:flex;align-items:center;gap:8rpx;margin-top:6rpx}.cr-pbar{flex:1;height:6rpx;background:#F5F1EB;border-radius:3rpx;overflow:hidden}.cr-pfill{height:100%;background:linear-gradient(90deg,#C41E3A,#E74C3C);border-radius:3rpx}.cr-pct{font-size:18rpx;color:#ccc}.cr-days{display:flex;gap:4rpx;margin-top:6rpx}.crd{width:32rpx;height:32rpx;border-radius:6rpx;display:flex;align-items:center;justify-content:center;font-size:18rpx;background:#F5F1EB;color:#ccc}.crd.on{background:#C41E3A;color:#fff}.cr-del{font-size:28rpx;color:#ccc;padding:8rpx}
.add-hint{text-align:center;font-size:22rpx;color:#ccc;margin-bottom:24rpx}.link{color:#C41E3A}
.modal-mask{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:100}
.goal-modal{position:fixed;bottom:0;left:0;right:0;background:#fff;border-radius:32rpx 32rpx 0 0;padding:24rpx;z-index:101}.gm-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:24rpx}.gm-title{font-size:32rpx;font-weight:600}.gm-close{font-size:28rpx;color:#999;padding:8rpx}
.gm-label{font-size:24rpx;color:#999;margin-bottom:12rpx;display:block}
.gm-nums{display:flex;gap:12rpx;margin-bottom:24rpx;flex-wrap:wrap}.gm-num{padding:16rpx 28rpx;border-radius:16rpx;background:#F5F1EB;font-size:24rpx;color:#999}.gm-num.sel{background:#C41E3A;color:#fff}
.gm-save{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600}
</style>
