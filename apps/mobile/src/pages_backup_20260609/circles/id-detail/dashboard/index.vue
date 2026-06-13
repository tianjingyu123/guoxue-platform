<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text class="back-icon">←</text><text class="nav-title">数据看板</text></view><text class="refresh-btn" :class="{spin:refreshing}" @click="refresh">🔄</text></view>

    <view v-if="loading" class="skel"><view v-for="i in 6" :key="i" class="skel-block"/></view>
    <scroll-view v-else scroll-y class="content" :style="{height:'calc(100vh - 56px)'}">
      <view class="metrics-grid">
        <view v-for="m in metrics" :key="m.label" class="metric-card">
          <view class="mc-icon" :style="{backgroundColor:m.bg}"><text>{{m.icon}}</text></view>
          <text class="mc-label">{{m.label}}</text>
          <text class="mc-value">{{m.isPrice?'¥':''}}{{fmt(m.value)}}</text>
          <text class="mc-change" :class="m.growth>=0?'up':'down'">{{m.growth>=0?'↑':'↓'}}{{Math.abs(m.growth)}}%</text>
        </view>
      </view>

      <view class="card"><view class="card-head"><text class="card-title">近30天趋势</text>
        <view class="trend-tabs"><text v-for="t in trendTypes" :key="t.key" class="tt-chip" :class="{sel:trendType===t.key}" @click="trendType=t.key">{{t.label}}</text></view>
      </view>
        <view class="line-chart"><view v-for="(t,i) in trends.slice(-30)" :key="i" class="lc-bar" :style="{height:trendH(t)+'%',background:i===trends.length-1?'linear-gradient(180deg,#C41E3A,#E85A71)':'linear-gradient(180deg,#E8E0D5,#F5F1EB)'}"/></view>
        <view class="lc-labels"><text>30天前</text><text>今日</text></view>
      </view>

      <view class="card"><text class="card-title">活跃贡献者 TOP5</text>
        <view v-for="(c,i) in contributors" :key="c.id" class="contr-row">
          <view class="cr-rank" :class="'r'+i"><text>{{i+1}}</text></view>
          <text class="cr-avatar">{{c.name[0]}}</text>
          <view class="cr-info"><text class="cr-name">{{c.name}}</text><text class="cr-posts">{{c.posts}}篇帖子</text></view>
          <text class="cr-likes">❤️{{fmt(c.likes)}}</text>
        </view>
      </view>

      <view class="card"><text class="card-title">热门内容 TOP5</text>
        <view v-for="(p,i) in hotPosts" :key="p.id" class="hot-row" @click="go(`/pages/circles/id-detail/posts/post-detail/index`)">
          <text class="hr-rank" :class="'r'+i">{{i+1}}</text>
          <view class="hr-info"><text class="hr-title">{{p.title}}</text><view class="hr-meta"><text>👁️{{fmt(p.views)}}</text><text>❤️{{fmt(p.likes)}}</text><text>💬{{p.comments}}</text></view></view>
        </view>
      </view>

      <view v-if="churnWarning.length>0" class="card churn"><view class="card-head"><text class="card-title">⚠️ 流失预警</text><text class="churn-badge">{{churnWarning.length}}人</text></view>
        <view v-for="u in churnWarning" :key="u.id" class="churn-row">
          <text class="chu-avatar">{{u.name[0]}}</text><view class="chu-info"><text class="chu-name">{{u.name}}</text><text class="chu-days">已沉默{{u.daysSilent}}天</text></view><text class="chu-wake">唤醒</text>
        </view>
      </view>

      <view v-if="revenue" class="card"><view class="card-head"><text class="card-title">收益构成</text><text class="rev-total">¥{{fmt(revenue.total)}}</text></view>
        <view v-for="(item,i) in revenue.items" :key="i" class="rev-row">
          <view class="rev-label"><view class="rev-dot" :style="{backgroundColor:item.color}"/><text>{{item.name}}</text></view>
          <text class="rev-val">¥{{fmt(item.value)}}</text>
          <view class="rev-bar-bg"><view class="rev-bar-fill" :style="{width:item.percent+'%',backgroundColor:item.color}"/></view>
        </view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading=ref(true),refreshing=ref(false),trendType=ref<'members'|'posts'|'active'|'revenue'>('members')
const overview=ref({totalMembers:12580,membersGrowth:8.5,activeMembers:3240,activeGrowth:12.3,totalPosts:8960,postsGrowth:-2.1,totalRevenue:156800,revenueGrowth:15.8})
const trends=ref<any[]>(Array.from({length:30},(_,i)=>({date:'',members:12000+Math.floor(Math.random()*600),posts:200+Math.floor(Math.random()*100),active:2800+Math.floor(Math.random()*500),revenue:4000+Math.floor(Math.random()*2000)})))
const contributors=ref([{id:'1',name:'易学大师',posts:128,likes:3560},{id:'2',name:'命理研究者',posts:96,likes:2840},{id:'3',name:'周易爱好者',posts:85,likes:2120},{id:'4',name:'风水学徒',posts:72,likes:1890},{id:'5',name:'国学传承',posts:68,likes:1650}])
const hotPosts=ref([{id:'1',title:'八字入门：如何看懂自己的命盘',views:12580,likes:896,comments:234},{id:'2',title:'紫微斗数与八字的区别详解',views:9860,likes:756,comments:189},{id:'3',title:'2024年流年运势预测方法',views:8420,likes:623,comments:156},{id:'4',title:'风水布局的基本原则',views:7650,likes:542,comments:128},{id:'5',title:'易经六十四卦快速记忆法',views:6890,likes:489,comments:98}])
const churnWarning=ref([{id:'1',name:'沉默用户A',daysSilent:28},{id:'2',name:'流失风险B',daysSilent:25},{id:'3',name:'待唤醒C',daysSilent:23}])
const revenue=ref({total:156800,items:[{name:'入圈费',value:89600,percent:57.1,color:'#C41E3A'},{name:'打赏收入',value:34200,percent:21.8,color:'#C9A96E'},{name:'连麦咨询',value:23400,percent:14.9,color:'#4A90D9'},{name:'知识付费',value:9600,percent:6.2,color:'#52C41A'}]})

const trendTypes=[{key:'members' as const,label:'成员'},{key:'posts' as const,label:'帖子'},{key:'active' as const,label:'活跃'},{key:'revenue' as const,label:'收益'}]
const metrics=computed(()=>[{label:'总成员',value:overview.value.totalMembers,growth:overview.value.membersGrowth,icon:'👥',bg:'rgba(196,30,58,.1)',isPrice:false},{label:'活跃成员',value:overview.value.activeMembers,growth:overview.value.activeGrowth,icon:'📊',bg:'rgba(74,144,217,.1)',isPrice:false},{label:'总帖子',value:overview.value.totalPosts,growth:overview.value.postsGrowth,icon:'📄',bg:'rgba(201,169,110,.1)',isPrice:false},{label:'总收益',value:overview.value.totalRevenue,growth:overview.value.revenueGrowth,icon:'💰',bg:'rgba(82,196,26,.1)',isPrice:true}])

function fmt(n:number){return n>=10000?(n/10000).toFixed(1)+'万':n>=1000?(n/1000).toFixed(1)+'k':''+n}
function trendH(t:any){const vals=trends.value.map((x:any)=>x[trendType.value]);const max=Math.max(...vals),min=Math.min(...vals);return max===min?50:((t[trendType.value]-min)/(max-min))*100}
async function refresh(){refreshing.value=true;await new Promise(r=>setTimeout(r,800));refreshing.value=false}
function goBack(){uni.navigateBack()}
function go(u:string){uni.navigateTo({url:u})}

onMounted(async()=>{await new Promise(r=>setTimeout(r,600));loading.value=false})
onPullDownRefresh(()=>{refresh().finally(()=>uni.stopPullDownRefresh())})
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx}
.back-icon{font-size:36rpx;color:#2C2C2C}
.nav-title{font-size:32rpx;font-weight:600;color:#2C2C2C}
.refresh-btn{font-size:32rpx;padding:8rpx}
.refresh-btn.spin{animation:spin 1s linear infinite}
@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.content{padding:24rpx}
.metrics-grid{display:grid;grid-template-columns:1fr 1fr;gap:16rpx;margin-bottom:24rpx}
.metric-card{background:#fff;border-radius:20rpx;padding:28rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}
.mc-icon{width:56rpx;height:56rpx;border-radius:16rpx;display:flex;align-items:center;justify-content:center;font-size:28rpx;margin-bottom:12rpx}
.mc-label{font-size:22rpx;color:#999}
.mc-value{font-size:36rpx;font-weight:700;color:#2C2C2C;display:block;margin-top:4rpx}
.mc-change{font-size:20rpx;margin-top:4rpx}
.mc-change.up{color:#22c55e}.mc-change.down{color:#ef4444}
.card{background:#fff;border-radius:20rpx;padding:28rpx;margin-bottom:24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}
.card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:20rpx}
.card-title{font-size:28rpx;font-weight:600;color:#2C2C2C}
.trend-tabs{display:flex;gap:8rpx}
.tt-chip{padding:8rpx 20rpx;border-radius:40rpx;background:#FAF8F5;font-size:22rpx;color:#999}
.tt-chip.sel{background:#C41E3A;color:#fff}
.line-chart{display:flex;align-items:flex-end;gap:4rpx;height:180rpx}
.lc-bar{flex:1;border-radius:4rpx 4rpx 0 0;min-height:6rpx}
.lc-labels{display:flex;justify-content:space-between;margin-top:12rpx;font-size:20rpx;color:#999}
.contr-row,.hot-row{display:flex;align-items:center;gap:16rpx;margin-bottom:20rpx}
.cr-rank,.hr-rank{width:44rpx;height:44rpx;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22rpx;font-weight:700;flex-shrink:0}
.r0{background:#FFD700;color:#fff}.r1{background:#C0C0C0;color:#fff}.r2{background:#CD7F32;color:#fff}.r3,.r4{background:#F5F1EB;color:#999}
.cr-avatar{width:60rpx;height:60rpx;border-radius:50%;background:linear-gradient(135deg,#C9A96E,#E8D5B7);display:flex;align-items:center;justify-content:center;color:#fff;font-size:24rpx;flex-shrink:0}
.cr-info{flex:1;min-width:0}
.cr-name{font-size:26rpx;color:#2C2C2C;display:block}
.cr-posts{font-size:20rpx;color:#999}
.cr-likes{font-size:22rpx;color:#C41E3A;flex-shrink:0}
.hr-info{flex:1;min-width:0}
.hr-title{font-size:26rpx;color:#2C2C2C;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.hr-meta{display:flex;gap:16rpx;margin-top:4rpx;font-size:20rpx;color:#999}
.churn{background:linear-gradient(135deg,#FFF7E6,#FFF1D6);border:1px solid #FFD591}
.churn-badge{background:#FA8C16;color:#fff;padding:4rpx 16rpx;border-radius:40rpx;font-size:20rpx}
.churn-row{display:flex;align-items:center;gap:12rpx;padding:12rpx;background:rgba(255,255,255,.6);border-radius:16rpx;margin-bottom:12rpx}
.chu-avatar{width:56rpx;height:56rpx;border-radius:50%;background:#FAF8F5;display:flex;align-items:center;justify-content:center;font-size:24rpx;color:#999;flex-shrink:0}
.chu-info{flex:1}
.chu-name{font-size:26rpx;color:#2C2C2C;display:block}
.chu-days{font-size:20rpx;color:#999}
.chu-wake{font-size:22rpx;color:#FA8C16}
.rev-total{font-size:34rpx;font-weight:700;color:#C41E3A}
.rev-row{margin-bottom:16rpx}
.rev-label{display:flex;align-items:center;gap:8rpx;margin-bottom:6rpx;font-size:24rpx;color:#666}
.rev-dot{width:12rpx;height:12rpx;border-radius:50%}
.rev-val{font-size:24rpx;font-weight:500;color:#2C2C2C;display:block;margin-bottom:8rpx}
.rev-bar-bg{height:12rpx;background:#F5F5F5;border-radius:6rpx;overflow:hidden}
.rev-bar-fill{height:100%;border-radius:6rpx}
.skel{padding:24rpx}
.skel-block{height:180rpx;background:#e8e8e8;border-radius:20rpx;margin-bottom:16rpx}
</style>
