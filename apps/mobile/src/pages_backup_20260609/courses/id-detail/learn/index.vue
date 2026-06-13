<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text>←</text><text class="nav-title">{{course.title}}</text></view><view style="width:48rpx"/></view>

    <view class="info-bar">
      <view class="progress-ring"><text class="pr-pct">{{progress.progressPercent}}%</text></view>
      <view class="ib-info"><text class="ib-title">{{course.title}}</text><view class="ib-instructor"><text class="ib-avatar">{{course.instructor.name[0]}}</text><text>{{course.instructor.name}}</text></view><text class="ib-meta">已学{{progress.completedLessons.length}}/{{progress.totalLessons}}节·🕐{{Math.floor(progress.studyTime/60)}}时{{progress.studyTime%60}}分</text></view>
    </view>

    <view class="tab-bar"><view v-for="t in tabs" :key="t.id" class="tab" :class="{act:activeTab===t.id}" @click="activeTab=t.id"><text>{{t.icon}} {{t.label}} {{t.count}}</text></view></view>

    <scroll-view v-if="!isLoading" scroll-y class="content" :style="{height:'calc(100vh - 56px - 56px - 56px - 140rpx)'}">
      <!-- 目录 -->
      <view v-if="activeTab==='catalog'" class="panel">
        <view v-for="c in chapters" :key="c.id" class="ch-card">
          <view class="ch-head" @click="toggleCh(c.id)"><text class="ch-check">{{isChDone(c)?'✓':completedIn(c)+'/'+c.lessons.length}}</text><view class="ch-info"><text class="ch-title">{{c.title}}</text><text class="ch-dur">{{c.lessons.length}}节·{{c.duration}}分钟</text></view><text class="ch-arrow" :class="{exp:expanded.has(c.id)}">▼</text></view>
          <view v-if="expanded.has(c.id)" class="ch-body">
            <view v-for="(l,i) in c.lessons" :key="l.id" class="l-item" @click="goPlayer(l.id)">
              <text class="l-icon">{{l.isCompleted?'✓':!c.isFree&&!l.isFree?'🔒':'▶'}}</text><view class="l-info"><text class="l-title" :class="{done:l.isCompleted}">{{i+1}}. {{l.title}}</text></view><text v-if="l.isFree" class="l-free">试看</text><text class="l-dur">{{l.duration}}分钟</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 笔记 -->
      <view v-if="activeTab==='notes'" class="panel">
        <view v-for="n in notes" :key="n.id" class="note-card"><text class="nc-chapter">{{n.chapterTitle}}</text><text class="nc-lesson">{{n.lessonTitle}}</text><text class="nc-content">{{n.content}}</text><text class="nc-date">{{n.createdAt}}</text></view>
        <view v-if="notes.length===0" class="empty">📄 暂无笔记</view>
      </view>

      <!-- 问答 -->
      <view v-if="activeTab==='questions'" class="panel">
        <view class="ask-btn" @click="showAsk=true">💬 我要提问</view>
        <view v-for="q in questions" :key="q.id" class="q-card"><view class="qc-head"><text class="qc-avatar">{{q.author.name[0]}}</text><view><text class="qc-name">{{q.author.name}}</text><text class="qc-time">{{q.createdAt}}</text></view></view><text class="qc-content">{{q.content}}</text><view class="qc-foot"><text>{{q.chapterTitle}}</text><text class="qc-answers">{{q.answers}}条回答</text><text v-if="q.isAnswered" class="qc-answered">已解答</text></view></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>

    <view class="bottom-bar"><view class="bb-btn" @click="goPlayer(progress.lastLesson.id)">▶ 继续学习·{{progress.lastLesson.title}}</view></view>

    <view v-if="showAsk" class="modal-mask" @click="showAsk=false"/>
    <view v-if="showAsk" class="ask-modal"><view class="am-head"><text>我要提问</text><text class="am-close" @click="showAsk=false">✕</text></view><textarea v-model="askContent" class="am-textarea" placeholder="请输入问题..." :rows="5"/><view class="am-btn" :class="{dis:!askContent.trim()}" @click="submitAsk">提交问题</view></view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
const isLoading=ref(true),activeTab=ref<'catalog'|'notes'|'questions'>('catalog'),expanded=ref(new Set(['c1','c2'])),showAsk=ref(false),askContent=ref('')

const course={title:'八字命理入门到精通',instructor:{name:'李明远'}}
const progress={courseId:'1',completedLessons:['l1','l2','l3','l4','l5'],totalLessons:32,progressPercent:15,lastLesson:{id:'l6',title:'天干地支的阴阳属性'},studyTime:180}
const tabs=[{id:'catalog' as const,label:'目录',icon:'📚',count:3},{id:'notes' as const,label:'笔记',icon:'📄',count:3},{id:'questions' as const,label:'问答',icon:'💬',count:3}]

const chapters=ref([{id:'c1',title:'第一章 八字基础概念',duration:180,isFree:true,lessons:[{id:'l1',title:'什么是八字命理',duration:15,isFree:true,isCompleted:true},{id:'l2',title:'八字的起源与发展',duration:18,isFree:true,isCompleted:true},{id:'l3',title:'四柱八字的构成',duration:20,isFree:true,isCompleted:true}]},{id:'c2',title:'第二章 天干地支详解',duration:240,isFree:false,lessons:[{id:'l4',title:'十天干基础',duration:25,isFree:false,isCompleted:true},{id:'l5',title:'十二地支基础',duration:25,isFree:false,isCompleted:true},{id:'l6',title:'天干地支的阴阳属性',duration:22,isFree:false,isCompleted:false},{id:'l7',title:'干支的五行属性',duration:28,isFree:false,isCompleted:false}]},{id:'c3',title:'第三章 排盘方法',duration:300,isFree:false,lessons:[{id:'l8',title:'年柱的推算',duration:30,isFree:false,isCompleted:false},{id:'l9',title:'月柱的推算',duration:32,isFree:false,isCompleted:false},{id:'l10',title:'日柱的推算',duration:28,isFree:false,isCompleted:false}]}])
const notes=[{id:'n1',content:'八字由年、月、日、时四柱组成',chapterTitle:'第一章 八字基础概念',lessonTitle:'四柱八字的构成',createdAt:'2024-01-15'},{id:'n2',content:'十天干：甲乙丙丁戊己庚辛壬癸',chapterTitle:'第二章 天干地支详解',lessonTitle:'十天干基础',createdAt:'2024-01-16'},{id:'n3',content:'十二地支：子丑寅卯辰巳午未申酉戌亥',chapterTitle:'第二章 天干地支详解',lessonTitle:'十二地支基础',createdAt:'2024-01-16'}]
const questions=[{id:'q1',content:'请问老师，为什么说八字中日柱最重要？',author:{name:'学习者小王'},chapterTitle:'第一章',createdAt:'2024-01-18',answers:3,isAnswered:true},{id:'q2',content:'天干地支的阴阳划分有什么实际应用意义？',author:{name:'命理新手'},chapterTitle:'第二章',createdAt:'2024-01-17',answers:5,isAnswered:true},{id:'q3',content:'如何判断一个八字的五行是否平衡？',author:{name:'易学爱好者'},chapterTitle:'第三章',createdAt:'2024-01-16',answers:0,isAnswered:false}]

function completedIn(c:any){return c.lessons.filter((l:any)=>l.isCompleted).length}
function isChDone(c:any){return completedIn(c)===c.lessons.length}
function toggleCh(id:string){const s=new Set(expanded.value);s.has(id)?s.delete(id):s.add(id);expanded.value=s}
function goPlayer(id:string){uni.navigateTo({url:'/pages/courses/id-detail/player/index'})}
function submitAsk(){showAsk.value=false;askContent.value=''}

function goBack(){uni.navigateBack()}
onMounted(async()=>{await new Promise(r=>setTimeout(r,600));isLoading.value=false})
onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx;font-size:36rpx;color:#2C2C2C}.nav-title{font-size:26rpx;font-weight:500;max-width:440rpx;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.info-bar{display:flex;align-items:center;gap:20rpx;padding:24rpx;background:#fff;border-bottom:1px solid #E8E0D5}
.progress-ring{width:100rpx;height:100rpx;border-radius:50%;border:6rpx solid #E8E0D5;display:flex;align-items:center;justify-content:center;flex-shrink:0}.pr-pct{font-size:28rpx;font-weight:700;color:#C41E3A}
.ib-title{font-size:28rpx;font-weight:600;color:#2C2C2C;display:block}.ib-instructor{display:flex;align-items:center;gap:8rpx;margin-top:4rpx;font-size:22rpx;color:#999}.ib-avatar{width:36rpx;height:36rpx;border-radius:50%;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:18rpx;color:#999}.ib-meta{font-size:20rpx;color:#999;margin-top:4rpx;display:block}
.tab-bar{display:flex;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:30}.tab{flex:1;text-align:center;padding:20rpx;font-size:24rpx;color:#999;border-bottom:2rpx solid transparent}.tab.act{color:#C41E3A;border-bottom-color:#C41E3A}
.content{padding:24rpx}
.panel{}.ch-card{background:#fff;border-radius:20rpx;overflow:hidden;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ch-head{display:flex;align-items:center;gap:16rpx;padding:20rpx 24rpx}.ch-check{width:48rpx;height:48rpx;border-radius:50%;background:rgba(196,30,58,.1);color:#C41E3A;display:flex;align-items:center;justify-content:center;font-size:22rpx;font-weight:600;flex-shrink:0}.ch-arrow{font-size:22rpx;color:#999;transition:transform .2s}.ch-arrow.exp{transform:rotate(180deg)}
.ch-info{flex:1}.ch-title{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.ch-dur{font-size:20rpx;color:#999}
.ch-body{background:#FAF8F5;padding:0 24rpx 16rpx}.l-item{display:flex;align-items:center;gap:12rpx;padding:16rpx 0;border-bottom:1px solid #E8E0D5}.l-item:last-child{border-bottom:none}.l-icon{font-size:24rpx;width:36rpx;text-align:center}.l-info{flex:1}.l-title{font-size:24rpx;color:#2C2C2C}.l-title.done{color:#999}.l-free{font-size:18rpx;padding:2rpx 8rpx;background:rgba(34,197,94,.1);color:#22c55e;border-radius:6rpx}.l-dur{font-size:20rpx;color:#999}
.note-card{background:#fff;border-radius:16rpx;padding:20rpx;margin-bottom:12rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.nc-chapter{font-size:20rpx;color:#C41E3A;display:block}.nc-lesson{font-size:20rpx;color:#999;margin-top:2rpx}.nc-content{font-size:26rpx;color:#2C2C2C;margin-top:8rpx;line-height:1.5}.nc-date{font-size:20rpx;color:#999;margin-top:8rpx;display:block}
.empty{text-align:center;padding:80rpx 0;font-size:26rpx;color:#999}
.ask-btn{width:100%;padding:24rpx;text-align:center;background:#fff;border:2rpx dashed #C41E3A;border-radius:20rpx;font-size:26rpx;color:#C41E3A;margin-bottom:16rpx}
.q-card{background:#fff;border-radius:16rpx;padding:20rpx;margin-bottom:12rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.qc-head{display:flex;align-items:center;gap:12rpx;margin-bottom:12rpx}.qc-avatar{width:48rpx;height:48rpx;border-radius:50%;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:20rpx;color:#999}.qc-name{font-size:24rpx;font-weight:500;color:#2C2C2C;display:block}.qc-time{font-size:20rpx;color:#999}.qc-content{font-size:26rpx;color:#2C2C2C;margin-bottom:12rpx}.qc-foot{display:flex;gap:16rpx;font-size:20rpx;color:#999}.qc-answers{color:#C41E3A}.qc-answered{background:rgba(34,197,94,.1);color:#22c55e;padding:2rpx 10rpx;border-radius:6rpx;font-size:18rpx}
.bottom-bar{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #E8E0D5;padding:20rpx 24rpx;z-index:50}.bb-btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:40rpx;font-size:28rpx;font-weight:600}
.modal-mask{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100}.ask-modal{position:fixed;bottom:0;left:0;right:0;background:#fff;border-radius:32rpx 32rpx 0 0;padding:24rpx;z-index:101}.am-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:20rpx;font-size:32rpx;font-weight:600;color:#2C2C2C}.am-close{font-size:28rpx;color:#999;padding:8rpx}.am-textarea{width:100%;padding:20rpx;background:#F5F1EB;border-radius:16rpx;font-size:24rpx;box-sizing:border-box;resize:none;margin-bottom:20rpx}.am-btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600}.am-btn.dis{background:#D9D9D9;color:#999}
</style>
