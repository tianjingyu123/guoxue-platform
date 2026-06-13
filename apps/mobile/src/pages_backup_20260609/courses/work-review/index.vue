<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text>←</text><text class="nav-title">作业批改</text></view><view class="nav-batch" :class="{on:batchMode}" @click="batchMode=!batchMode"><text>{{batchMode?'取消批量':'批量批改'}}</text></view></view>

    <view class="stat-bar"><text>📚共{{submissions.length}}份作业</text><text class="sb-pending">⏰{{pendingCount}}份待批改</text></view>
    <view class="filter-row"><text v-for="f in filters" :key="f.key" class="fl-chip" :class="{act:filter===f.key}" @click="filter=f.key">{{f.label}}</text></view>

    <view v-if="isLoading" class="skel"><view v-for="i in 4" :key="i" class="skel-item"/></view>
    <scroll-view v-else scroll-y class="content" :style="{height:'calc(100vh - 56px - 56px - 56px)'}">
      <view v-if="selectedWork" class="review-panel">
        <view class="rp-top"><view class="rpt-student"><text class="rpt-avatar">{{selectedWork.student.name[0]}}</text><view><text class="rpt-name">{{selectedWork.student.name}}</text><text class="rpt-time">{{selectedWork.submittedAt}}</text></view></view><text class="rpt-close" @click="selectedWork=null">收起</text></view>
        <view class="rp-content"><text>{{selectedWork.content}}</text></view>
        <view v-if="selectedWork.images.length>0" class="rp-imgs"><view v-for="(_,i) in selectedWork.images" :key="i" class="rpi-thumb">🖼️</view></view>

        <text class="rp-label">评分</text>
        <view class="rp-score-row"><input v-model.number="score" class="rps-input" type="number"/><text v-for="s in [100,90,80,70,60]" :key="s" class="rps-chip" :class="{sel:score===s}" @click="score=s">{{s}}</text></view>

        <text class="rp-label">快捷评语</text>
        <view class="rp-templates"><text v-for="t in templates" :key="t.id" class="rptm" @click="comment=t.text">{{t.label}}</text></view>

        <text class="rp-label">教师评语</text>
        <textarea v-model="comment" class="rp-textarea" placeholder="请输入评语..." :rows="4"/>

        <text class="rp-label">修改建议</text>
        <view v-for="(s,i) in suggestions" :key="i" class="rp-sg"><text>{{s}}</text><text class="rps-del" @click="suggestions.splice(i,1)">✕</text></view>
        <view class="rp-sg-add"><input v-model="newSugg" class="rps-input" placeholder="输入修改建议..."/><view class="rps-add-btn" @click="addSuggestion">添加</view></view>

        <view class="rp-actions"><view class="rpa-btn back" @click="handleSubmit('returned')">↩ 退回修改</view><view class="rpa-btn ok" @click="handleSubmit('graded')">✓ 提交批改</view></view>
      </view>

      <view v-else class="work-list">
        <view v-for="w in filteredSubs" :key="w.id" class="work-item" :class="{sel:selectedIds.has(w.id)}" @click="!batchMode&&w.status==='pending'&&(selectedWork=w)">
          <view v-if="batchMode" class="wi-cb" :class="{on:selectedIds.has(w.id)}" @click.stop="toggleSelect(w.id)"><text v-if="selectedIds.has(w.id)">✓</text></view>
          <view class="wi-head"><text class="wi-avatar">{{w.student.name[0]}}</text><view><text class="wi-name">{{w.student.name}}</text><text class="wi-chapter">{{w.chapterTitle}}</text></view><text class="wi-status" :class="'ws-'+w.status">{{statusLabel(w.status)}}</text></view>
          <text class="wi-preview">{{w.content}}</text>
          <view class="wi-meta"><text>📄{{w.wordCount}}字</text><text v-if="w.images.length>0">🖼️{{w.images.length}}图</text><text class="wi-time">{{w.submittedAt}}</text></view>
        </view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>

    <view v-if="batchMode&&selectedIds.size>0" class="batch-bar"><text>已选{{selectedIds.size}}份</text><view class="batch-submit">批量批改</view></view>
  </view>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const isLoading=ref(true),batchMode=ref(false),filter=ref<'all'|'pending'|'graded'>('all'),selectedIds=ref(new Set<string>()),selectedWork=ref<any>(null)
const score=ref(80),comment=ref(''),suggestions=ref<string[]>([]),newSugg=ref('')

const filters=[{key:'all' as const,label:'全部'},{key:'pending' as const,label:'待批改'},{key:'graded' as const,label:'已批改'}]
const templates=[{id:'1',label:'优秀',text:'作业完成得非常出色，理解深入，表达清晰，继续保持！'},{id:'2',label:'良好',text:'整体完成较好，对知识点有一定理解。'},{id:'3',label:'合格',text:'基本完成作业要求。'},{id:'4',label:'需改进',text:'作业存在一些问题，请根据批注重新修改。'}]

const submissions=ref([{id:'1',student:{name:'张三'},chapterTitle:'第一章：八字基础',content:'通过本章学习，我了解到八字命理的核心是以出生时间为基础...',images:[''],submittedAt:'2024-01-15 14:30',status:'pending' as const,wordCount:156},{id:'2',student:{name:'李四'},chapterTitle:'第一章：八字基础',content:'八字命理学习心得：天干地支是基础，需要熟练掌握。',images:[],submittedAt:'2024-01-15 15:20',status:'pending' as const,wordCount:42},{id:'3',student:{name:'王五'},chapterTitle:'第二章：五行生克',content:'五行相生：木生火、火生土、土生金...',images:[''],submittedAt:'2024-01-14 10:15',status:'graded' as const,wordCount:78}])

const pendingCount=computed(()=>submissions.value.filter(s=>s.status==='pending').length)
const filteredSubs=computed(()=>filter.value==='all'?submissions.value:submissions.value.filter(s=>s.status===filter.value))

function statusLabel(s:string){const m:any={pending:'待批改',graded:'已批改',returned:'已退回'};return m[s]}
function toggleSelect(id:string){const s=new Set(selectedIds.value);s.has(id)?s.delete(id):s.add(id);selectedIds.value=s}
function addSuggestion(){if(newSugg.value.trim()){suggestions.value.push(newSugg.value.trim());newSugg.value=''}}
function handleSubmit(status:'graded'|'returned'){selectedWork.value=null}
function goBack(){uni.navigateBack()}

onMounted(async()=>{await new Promise(r=>setTimeout(r,500));isLoading.value=false})
onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx;font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}
.nav-batch{padding:10rpx 24rpx;border-radius:40rpx;background:#F5F1EB;font-size:24rpx;color:#999}.nav-batch.on{background:#C41E3A;color:#fff}
.stat-bar{display:flex;justify-content:space-between;padding:16rpx 24rpx;font-size:24rpx;color:#999}.sb-pending{color:#f97316}
.filter-row{display:flex;gap:12rpx;padding:0 24rpx 16rpx}.fl-chip{padding:10rpx 28rpx;border-radius:40rpx;background:#F5F1EB;font-size:24rpx;color:#999}.fl-chip.act{background:#C41E3A;color:#fff}
.skel{padding:24rpx}.skel-item{height:160rpx;background:#e8e8e8;border-radius:20rpx;margin-bottom:16rpx}
.content{padding:24rpx}
.work-item{position:relative;background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.work-item.sel{border:2rpx solid #C41E3A}
.wi-cb{position:absolute;left:-12rpx;top:40rpx;width:40rpx;height:40rpx;border-radius:50%;border:2rpx solid #E8E0D5;display:flex;align-items:center;justify-content:center;font-size:20rpx;background:#fff}.wi-cb.on{background:#C41E3A;border-color:#C41E3A;color:#fff}
.wi-head{display:flex;align-items:center;gap:12rpx;margin-bottom:12rpx}.wi-avatar{width:56rpx;height:56rpx;border-radius:50%;background:linear-gradient(135deg,rgba(196,30,58,.2),rgba(201,169,110,.2));display:flex;align-items:center;justify-content:center;font-size:24rpx;color:#C41E3A}.wi-name{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.wi-chapter{font-size:22rpx;color:#999}.wi-status{font-size:20rpx;padding:4rpx 14rpx;border-radius:8rpx;margin-left:auto}.ws-pending{background:rgba(249,115,22,.1);color:#f97316}.ws-graded{background:rgba(34,197,94,.1);color:#22c55e}.ws-returned{background:rgba(239,68,68,.1);color:#ef4444}
.wi-preview{font-size:24rpx;color:#666;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:12rpx}
.wi-meta{display:flex;gap:16rpx;font-size:20rpx;color:#999}.wi-time{margin-left:auto}

.review-panel{}.rp-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:16rpx}.rpt-student{display:flex;align-items:center;gap:12rpx}.rpt-avatar{width:56rpx;height:56rpx;border-radius:50%;background:linear-gradient(135deg,rgba(196,30,58,.2),rgba(201,169,110,.2));display:flex;align-items:center;justify-content:center;font-size:24rpx;color:#C41E3A}.rpt-name{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.rpt-time{font-size:20rpx;color:#999}.rpt-close{font-size:24rpx;color:#999}
.rp-content{background:#FAF8F5;border-radius:16rpx;padding:20rpx;margin-bottom:16rpx;font-size:26rpx;color:#2C2C2C;line-height:1.6}.rp-imgs{display:flex;gap:12rpx;margin-bottom:16rpx}.rpi-thumb{width:96rpx;height:96rpx;border-radius:12rpx;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:32rpx}
.rp-label{font-size:24rpx;font-weight:500;color:#2C2C2C;margin-bottom:12rpx;display:block}
.rp-score-row{display:flex;align-items:center;gap:12rpx;margin-bottom:20rpx}.rps-input{width:100rpx;height:64rpx;border:2rpx solid rgba(196,30,58,.3);border-radius:16rpx;text-align:center;font-size:36rpx;font-weight:700;color:#C41E3A}.rps-chip{padding:12rpx 20rpx;border-radius:40rpx;background:#F5F1EB;font-size:24rpx;color:#999}.rps-chip.sel{background:#C41E3A;color:#fff}
.rp-templates{display:flex;flex-wrap:wrap;gap:8rpx;margin-bottom:20rpx}.rptm{padding:10rpx 20rpx;border-radius:40rpx;background:#F5F1EB;font-size:22rpx;color:#999}
.rp-textarea{width:100%;padding:20rpx;border:1px solid #E8E0D5;border-radius:16rpx;font-size:24rpx;box-sizing:border-box;resize:none;margin-bottom:20rpx}
.rp-sg{display:flex;align-items:center;justify-content:space-between;padding:16rpx;background:rgba(239,68,68,.05);border-radius:12rpx;font-size:24rpx;color:#ef4444;margin-bottom:8rpx}.rps-del{color:#ef4444;padding:8rpx}
.rp-sg-add{display:flex;gap:12rpx;margin-bottom:24rpx}.rps-add-btn{padding:16rpx 28rpx;background:#F5F1EB;border-radius:16rpx;font-size:24rpx;color:#999;flex-shrink:0}
.rp-actions{display:flex;gap:16rpx}.rpa-btn{flex:1;padding:24rpx;text-align:center;border-radius:20rpx;font-size:26rpx;font-weight:500}.rpa-btn.back{border:2rpx solid #C41E3A;color:#C41E3A}.rpa-btn.ok{background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff}

.batch-bar{position:fixed;bottom:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:20rpx 24rpx;background:#fff;border-top:1px solid #E8E0D5;font-size:26rpx;color:#666;z-index:50}.batch-submit{padding:20rpx 40rpx;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:40rpx;font-size:26rpx}
</style>
