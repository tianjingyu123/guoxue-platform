<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text class="back-icon">←</text><text class="nav-title">连麦预约</text></view><view style="width:48rpx"/></view>

    <view v-if="loading" class="skel"><view v-for="i in 4" :key="i" class="skel-card"/></view>
    <view v-else-if="showSuccess" class="success-page">
      <text class="succ-icon">✅</text><text class="succ-title">预约成功</text><text class="succ-desc">我们已向专家发送通知，请准时参加</text>
      <view class="succ-card">
        <view class="succ-row"><text class="s-label">专家</text><text class="s-val">{{selectedExpert?.name}}</text></view>
        <view class="succ-row"><text class="s-label">日期</text><text class="s-val">{{fmtDate(selectedDate)}}</text></view>
        <view class="succ-row"><text class="s-label">时间</text><text class="s-val">{{selectedSlot?.startTime}}-{{selectedSlot?.endTime}}</text></view>
        <view class="succ-row"><text class="s-label">主题</text><text class="s-val">{{topic}}</text></view>
        <view class="succ-row"><text class="s-label">费用</text><text class="s-val price">¥{{totalPrice}}</text></view>
      </view>
      <view class="succ-btns"><view class="s-btn outline" @click="addToCalendar">📅 添加到日历</view><view class="s-btn fill" @click="goBack">返回圈子</view></view>
    </view>
    <scroll-view v-else scroll-y class="content" :style="{height:'calc(100vh - 56px - 140rpx)'}">
      <view class="section"><text class="s-title">选择专家</text>
        <scroll-view scroll-x class="expert-scroll">
          <view v-for="e in experts" :key="e.id" class="expert-card" :class="{sel:selectedExpert?.id===e.id,dis:!e.available}" @click="e.available&&(selectedExpert=e)">
            <view class="e-avatar">{{e.name[0]}}</view><text class="e-name">{{e.name}}</text><text class="e-title">{{e.title}}</text><text class="e-rating">⭐{{e.rating}}</text><text class="e-price">¥{{e.pricePerMinute}}/分钟</text><text v-if="!e.available" class="e-unavail">暂不可约</text>
          </view>
        </scroll-view>
      </view>
      <view class="section"><text class="s-title">选择日期</text>
        <view class="cal">
          <view class="cal-nav"><text @click="prevMonth">‹</text><text class="cal-month">{{currMonth.getFullYear()}}年{{currMonth.getMonth()+1}}月</text><text @click="nextMonth">›</text></view>
          <view class="cal-week"><text v-for="d in wdays" :key="d" class="cal-wd">{{d}}</text></view>
          <view class="cal-grid"><view v-for="(d,i) in days" :key="i" class="cal-cell"><text v-if="d" class="cal-day" :class="{sel:isSelDate(d),past:isPast(d)}" @click="!isPast(d)&&(selectedDate=d)">{{d.getDate()}}</text></view></view>
        </view>
      </view>
      <view class="section"><text class="s-title">选择时段</text>
        <view class="slot-grid">
          <view v-for="s in slots" :key="s.id" class="slot-item" :class="{sel:selectedSlot?.id===s.id,dis:!s.available}" @click="s.available&&(selectedSlot=s)">{{s.startTime}}</view>
        </view>
        <view v-if="slots.length===0" class="no-slots">该日期暂无可用时段</view>
      </view>
      <view class="section"><text class="s-title">咨询时长</text><view class="dur-row"><text v-for="m in [15,30,45,60]" :key="m" class="dur-chip" :class="{sel:duration===m}" @click="duration=m">{{m}}分钟</text></view></view>
      <view class="section"><text class="s-title">咨询主题</text><textarea v-model="topic" class="topic-input" placeholder="请简要描述您想咨询的问题..." :rows="3"/></view>
      <view v-if="selectedExpert" class="fee-card"><text class="fee-title">费用预览</text>
        <view class="fee-row"><text>单价</text><text>¥{{selectedExpert.pricePerMinute}}/分钟</text></view>
        <view class="fee-row"><text>时长</text><text>{{duration}}分钟</text></view>
        <view class="fee-row total"><text>合计</text><text class="fee-total">¥{{totalPrice}}</text></view>
      </view>
      <view style="height:24rpx"/>
    </scroll-view>

    <view v-if="!showSuccess" class="bottom-bar">
      <view class="bb-info"><text>📅 {{selectedSlot?fmtDate(selectedDate)+' '+selectedSlot.startTime:'请选择时段'}}</text><text class="bb-price">¥{{totalPrice}}</text></view>
      <view class="bb-btn" :class="{dis:!selectedExpert||!selectedSlot||!topic.trim()||submitting}" @click="handleSubmit"><text>{{submitting?'⏳ 预约中...':'立即预约'}}</text></view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading=ref(true),experts=ref<any[]>([]),selectedExpert=ref<any>(null)
const selectedDate=ref(new Date()),currMonth=ref(new Date()),slots=ref<any[]>([]),selectedSlot=ref<any>(null)
const duration=ref(30),topic=ref(''),submitting=ref(false),showSuccess=ref(false)
const wdays=['日','一','二','三','四','五','六']

const mockExperts=[{id:'1',name:'张明远',title:'资深命理师',specialty:['八字','紫微'],pricePerMinute:5,rating:4.9,available:true},{id:'2',name:'李易风',title:'风水大师',specialty:['风水','择日'],pricePerMinute:8,rating:4.8,available:true},{id:'3',name:'王国学',title:'易学研究员',specialty:['周易','六爻'],pricePerMinute:6,rating:4.7,available:false}]
const mockSlots=[{id:'1',startTime:'09:00',endTime:'09:30',available:true},{id:'2',startTime:'09:30',endTime:'10:00',available:false},{id:'3',startTime:'10:00',endTime:'10:30',available:true},{id:'4',startTime:'10:30',endTime:'11:00',available:true},{id:'5',startTime:'14:00',endTime:'14:30',available:true},{id:'6',startTime:'14:30',endTime:'15:00',available:true},{id:'7',startTime:'15:00',endTime:'15:30',available:false},{id:'8',startTime:'15:30',endTime:'16:00',available:true}]

const totalPrice=computed(()=>selectedExpert.value?selectedExpert.value.pricePerMinute*duration.value:0)
const days=computed(()=>{const y=currMonth.value.getFullYear(),m=currMonth.value.getMonth(),first=new Date(y,m,1),last=new Date(y,m+1,0),res:(Date|null)[]=[];for(let i=0;i<first.getDay();i++)res.push(null);for(let i=1;i<=last.getDate();i++)res.push(new Date(y,m,i));return res})

function isSelDate(d:Date){return d.toDateString()===selectedDate.value.toDateString()}
function isPast(d:Date){const t=new Date();t.setHours(0,0,0,0);return d<t}
function fmtDate(d:Date){return d.toLocaleDateString('zh-CN')}
function prevMonth(){currMonth.value=new Date(currMonth.value.getFullYear(),currMonth.value.getMonth()-1)}
function nextMonth(){currMonth.value=new Date(currMonth.value.getFullYear(),currMonth.value.getMonth()+1)}

async function handleSubmit(){
  if(!selectedExpert.value||!selectedSlot.value||!topic.value.trim())return
  submitting.value=true;await new Promise(r=>setTimeout(r,1500));submitting.value=false;showSuccess.value=true
}
function addToCalendar(){}
function goBack(){uni.navigateBack()}

onMounted(async()=>{loading.value=true;experts.value=mockExperts;selectedExpert.value=mockExperts[0];slots.value=mockSlots;loading.value=false})
onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx}
.back-icon{font-size:36rpx;color:#2C2C2C}
.nav-title{font-size:32rpx;font-weight:600;color:#2C2C2C}
.content{}
.section{padding:24rpx}
.s-title{font-size:26rpx;font-weight:600;color:#2C2C2C;margin-bottom:16rpx;display:block}
.expert-scroll{white-space:nowrap}
.expert-card{display:inline-flex;flex-direction:column;align-items:center;width:200rpx;padding:24rpx 16rpx;background:#fff;border-radius:20rpx;margin-right:16rpx;border:2rpx solid transparent}
.expert-card.sel{border-color:#C41E3A;background:rgba(196,30,58,.03)}
.expert-card.dis{opacity:.5}
.e-avatar{width:80rpx;height:80rpx;border-radius:50%;background:linear-gradient(135deg,#C41E3A,#E85A6B);display:flex;align-items:center;justify-content:center;color:#fff;font-size:32rpx;margin-bottom:12rpx}
.e-name{font-size:26rpx;font-weight:500;color:#2C2C2C}
.e-title{font-size:20rpx;color:#999;margin-top:2rpx}
.e-rating{font-size:22rpx;color:#C9A96E;margin-top:4rpx}
.e-price{font-size:22rpx;color:#C41E3A;font-weight:600;margin-top:4rpx}
.e-unavail{font-size:20rpx;color:#999;margin-top:4rpx}
.cal{background:#fff;border-radius:20rpx;padding:24rpx}
.cal-nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:16rpx;font-size:28rpx;color:#2C2C2C}
.cal-month{font-weight:500}
.cal-week{display:grid;grid-template-columns:repeat(7,1fr);text-align:center;margin-bottom:8rpx}
.cal-wd{font-size:22rpx;color:#999;padding:8rpx 0}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4rpx}
.cal-cell{aspect-ratio:1;display:flex;align-items:center;justify-content:center}
.cal-day{width:60rpx;height:60rpx;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26rpx;color:#2C2C2C}
.cal-day.sel{background:#C41E3A;color:#fff}
.cal-day.past{color:#ccc}
.slot-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12rpx}
.slot-item{padding:18rpx;text-align:center;background:#FAF8F5;border-radius:16rpx;font-size:24rpx;color:#2C2C2C}
.slot-item.sel{background:#C41E3A;color:#fff}
.slot-item.dis{background:#f0f0f0;color:#ccc;text-decoration:line-through}
.no-slots{text-align:center;padding:40rpx;color:#999;font-size:24rpx}
.dur-row{display:flex;gap:12rpx}
.dur-chip{flex:1;padding:20rpx;text-align:center;background:#fff;border-radius:16rpx;font-size:26rpx;color:#2C2C2C}
.dur-chip.sel{background:#C41E3A;color:#fff}
.topic-input{width:100%;background:#fff;border-radius:20rpx;padding:24rpx;font-size:26rpx;color:#2C2C2C;box-sizing:border-box;resize:none}
.fee-card{background:#fff;border-radius:20rpx;padding:24rpx;margin:0 24rpx 24rpx}
.fee-title{font-size:26rpx;font-weight:600;color:#2C2C2C;margin-bottom:16rpx;display:block}
.fee-row{display:flex;justify-content:space-between;font-size:26rpx;color:#666;margin-bottom:12rpx}
.fee-row.total{padding-top:12rpx;border-top:1px solid #E8E0D5;font-weight:500;color:#2C2C2C}
.fee-total{font-size:36rpx;font-weight:700;color:#C41E3A}
.bottom-bar{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #E8E0D5;padding:20rpx 24rpx;z-index:50;display:flex;align-items:center;justify-content:space-between}
.bb-info{font-size:24rpx;color:#666;flex:1}
.bb-price{font-size:36rpx;font-weight:700;color:#C41E3A;display:block}
.bb-btn{background:#C41E3A;color:#fff;padding:24rpx 48rpx;border-radius:24rpx;font-size:28rpx;font-weight:500}
.bb-btn.dis{background:#D9D9D9;color:#999}
.success-page{display:flex;flex-direction:column;align-items:center;padding:80rpx 24rpx}
.succ-icon{font-size:96rpx;margin-bottom:24rpx}
.succ-title{font-size:36rpx;font-weight:700;color:#2C2C2C;margin-bottom:12rpx}
.succ-desc{font-size:26rpx;color:#999;text-align:center;margin-bottom:40rpx}
.succ-card{width:100%;background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:40rpx}
.succ-row{display:flex;justify-content:space-between;padding:12rpx 0;font-size:26rpx;border-bottom:1px solid #F5F1EB}
.s-label{color:#999}.s-val{color:#2C2C2C}.s-val.price{color:#C41E3A;font-weight:600}
.succ-btns{display:flex;flex-direction:column;gap:16rpx;width:100%}
.s-btn{padding:24rpx;text-align:center;border-radius:24rpx;font-size:28rpx;font-weight:500}
.s-btn.outline{border:1px solid #C41E3A;color:#C41E3A}
.s-btn.fill{background:#C41E3A;color:#fff}
.skel{padding:24rpx}.skel-card{height:200rpx;background:#e8e8e8;border-radius:20rpx;margin-bottom:16rpx}
</style>
