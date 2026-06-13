<template>
  <view class="page">
    <view class="nav-header">
      <view class="nav-left" @click="goBack"><text class="nav-back-icon">←</text><text class="nav-title">圈子设置</text></view>
      <view style="width:48rpx" />
    </view>
    <scroll-view scroll-y class="content" :style="{height:'calc(100vh - 56px)'}">
      <view class="section"><text class="s-label">基础信息</text>
        <view class="card">
          <view class="c-row"><text class="c-icon">📷</text><text class="c-text">圈子封面</text><view class="c-right"><view class="cover-preview">🖼️</view><text>›</text></view></view>
          <view class="c-row"><text class="c-icon">✏️</text><text class="c-text">圈子名称</text>
            <view v-if="editingField==='name'" class="edit-inline"><input v-model="tempValue" class="edit-input" auto-focus/><text class="edit-ok" @click="saveField('name')">✓</text><text class="edit-no" @click="editingField=null">✕</text></view>
            <text v-else class="c-val" @click="startEdit('name',settings.name)">{{settings.name}} ›</text>
          </view>
          <view class="c-row"><text class="c-icon">💬</text><text class="c-text">圈子简介</text><text class="c-val trunc">{{settings.description}} ›</text></view>
          <view class="c-row"><text class="c-icon">🏷️</text><text class="c-text">圈子标签</text><view class="c-right"><view class="tags"><text v-for="t in settings.tags.slice(0,2)" :key="t" class="tag">{{t}}</text><text v-if="settings.tags.length>2" class="tag">+{{settings.tags.length-2}}</text></view><text>›</text></view></view>
        </view>
      </view>
      <view class="section"><text class="s-label">入圈规则</text>
        <view class="card">
          <view class="c-row"><text class="c-icon">🔒</text><text class="c-text">圈子类型</text><text class="c-val badge-gold">{{({free:'免费',paid:'付费',yearly:'年费'}as any)[settings.type]}}</text></view>
          <view v-if="settings.type!=='free'" class="c-row"><text class="c-icon">🎁</text><text class="c-text">{{settings.type==='yearly'?'年费价格':'入圈价格'}}</text><text class="c-val price">¥{{settings.type==='yearly'?settings.yearlyPrice:settings.price}} ›</text></view>
          <view class="c-row"><text class="c-icon">👥</text><text class="c-text">加入方式</text><text class="c-val">{{({direct:'直接加入',approval:'需要审批',invite:'仅限邀请'}as any)[settings.joinMethod]}} ›</text></view>
          <view class="c-row"><text class="c-icon">💬</text><text class="c-text">自动欢迎语</text><text class="c-val trunc">{{settings.welcomeMessage}} ›</text></view>
        </view>
      </view>
      <view class="section"><text class="s-label">成员权限</text>
        <view class="card">
          <view class="c-row"><text class="c-icon">✏️</text><text class="c-text">发帖权限</text><text class="c-val">{{settings.postPermission==='all'?'所有成员':'仅管理员'}} ›</text></view>
          <view class="c-row"><text class="c-icon">💬</text><text class="c-text">评论权限</text><text class="c-val">{{settings.commentPermission==='all'?'所有成员':'仅管理员'}} ›</text></view>
          <view class="c-row toggle-r"><view><text class="c-icon">📤</text><text class="c-text">允许分享到圈外</text></view><view class="sw" :class="{on:settings.sharePermission}" @click="toggle('sharePermission')"><view class="sw-dot"/></view></view>
          <view class="c-row toggle-r"><view><text class="c-icon">{{settings.memberListVisible?'👁️':'🔒'}}</text><text class="c-text">成员列表对外公开</text></view><view class="sw" :class="{on:settings.memberListVisible}" @click="toggle('memberListVisible')"><view class="sw-dot"/></view></view>
        </view>
      </view>
      <view class="section"><text class="s-label">内容保护</text>
        <view class="card"><view class="c-row toggle-r"><view><text class="c-icon">🛡️</text><view><text class="c-text">内容保护模式</text><text class="c-desc">开启后禁止截图和复制</text></view></view><view class="sw" :class="{on:settings.contentProtection}" @click="toggle('contentProtection')"><view class="sw-dot"/></view></view></view>
      </view>
      <view class="section"><text class="s-label">圈主助理</text>
        <view class="card">
          <view class="c-row toggle-r"><view><text class="c-icon">🤖</text><view><text class="c-text">启用圈主助理</text><text class="c-desc">AI助理自动回复成员问题</text></view></view><view class="sw" :class="{on:settings.assistantEnabled}" @click="toggle('assistantEnabled')"><view class="sw-dot"/></view></view>
          <view v-if="settings.assistantEnabled" class="c-row"><text class="c-text">助理欢迎语</text><text class="c-val trunc">{{settings.assistantWelcome}} ›</text></view>
          <view v-if="settings.assistantEnabled" class="c-row" @click="go('/pages/circle/id-detail/settings/knowledge/index')"><text class="c-text">知识库管理</text><text class="c-val"><text class="badge-doc">12篇文档</text> ›</text></view>
        </view>
      </view>
      <view class="section"><text class="s-label">搜索可见性</text>
        <view class="card"><view class="c-row toggle-r"><view><text class="c-icon">🔍</text><view><text class="c-text">平台搜索中可见</text><text class="c-desc">关闭后仅通过链接可访问</text></view></view><view class="sw" :class="{on:settings.searchVisible}" @click="toggle('searchVisible')"><view class="sw-dot"/></view></view></view>
      </view>
      <view class="section"><text class="s-label">分享有赏</text>
        <view class="card">
          <view class="c-row toggle-r"><view><text class="c-icon">🎁</text><view><text class="c-text">启用分享有赏</text><text class="c-desc">成员邀请新人可获得佣金</text></view></view><view class="sw" :class="{on:settings.shareRewardEnabled}" @click="toggle('shareRewardEnabled')"><view class="sw-dot"/></view></view>
          <view v-if="settings.shareRewardEnabled" class="c-row"><text class="c-text">佣金比例</text><text class="c-val gold">{{settings.shareRewardRate}}% ›</text></view>
        </view>
      </view>
      <view class="section"><text class="s-label" style="color:#C41E3A">危险操作</text>
        <view class="card">
          <view class="c-row" @click="danger='transfer'"><text class="c-icon">⚠️</text><view><text class="c-text">转让圈主</text><text class="c-desc">将圈主身份转让给其他成员</text></view><text>›</text></view>
          <view class="c-row" @click="danger='dissolve'"><text class="c-icon">🗑️</text><view><text class="c-text" style="color:#C41E3A">解散圈子</text><text class="c-desc">此操作不可逆</text></view><text>›</text></view>
        </view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>

    <view v-if="danger" class="mask" @click="danger=null;cfm=''"/>
    <view v-if="danger" class="d-modal">
      <view class="d-icon-wrap" :style="{bg:danger==='dissolve'?'rgba(196,30,58,.1)':'rgba(249,115,22,.1)'}"><text class="d-icon">{{danger==='dissolve'?'🗑️':'⚠️'}}</text></view>
      <text class="d-title">{{danger==='transfer'?'确认转让圈主？':'确认解散圈子？'}}</text>
      <text class="d-desc">{{danger==='transfer'?'转让后你将失去圈主权限':'解散后所有内容将被删除，不可撤销'}}</text>
      <text class="d-hint">请输入「{{danger==='transfer'?'确认转让':'确认解散'}}」以继续</text>
      <input v-model="cfm" class="d-input" :placeholder="danger==='transfer'?'确认转让':'确认解散'"/>
      <view class="d-btns"><view class="d-btn cancel" @click="danger=null;cfm=''">取消</view><view class="d-btn ok" :class="{dis:cfm!==(danger==='transfer'?'确认转让':'确认解散')}">确认</view></view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
const settings=reactive({name:'八字命理研习社',description:'专注八字命理学习与实践',tags:['八字','命理','易学','排盘'],type:'paid',price:199,yearlyPrice:99,joinMethod:'direct',welcomeMessage:'欢迎加入！请先阅读圈规',postPermission:'all',commentPermission:'all',sharePermission:true,memberListVisible:true,contentProtection:true,assistantEnabled:true,assistantWelcome:'你好，我是圈主助理~',searchVisible:true,shareRewardEnabled:true,shareRewardRate:10} as any)
const editingField=ref<string|null>(null),tempValue=ref(''),danger=ref<string|null>(null),cfm=ref('')
function startEdit(k:string,v:string){editingField.value=k;tempValue.value=v}
function saveField(k:string){settings[k]=tempValue.value;editingField.value=null}
function toggle(k:string){settings[k]=!settings[k]}
function goBack(){uni.navigateBack()}
function go(u:string){uni.navigateTo({url:u})}
onPullDownRefresh(()=>{setTimeout(()=>uni.stopPullDownRefresh(),500)})
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:rgba(250,248,245,.95);backdrop-filter:blur(10px);border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx}
.nav-back-icon{font-size:36rpx;color:#2C2C2C}
.nav-title{font-size:32rpx;font-weight:600;color:#2C2C2C}
.section{margin-bottom:32rpx}
.s-label{display:block;font-size:24rpx;color:#999;padding:0 28rpx;margin-bottom:12rpx}
.card{background:#fff;border-radius:20rpx;margin:0 24rpx;overflow:hidden;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}
.c-row{display:flex;align-items:center;gap:16rpx;padding:24rpx;border-bottom:1px solid #F5F1EB}
.c-row:last-child{border-bottom:none}
.c-icon{font-size:32rpx}
.c-text{font-size:26rpx;color:#2C2C2C;flex-shrink:0}
.c-desc{font-size:20rpx;color:#999;margin-top:4rpx}
.c-val{font-size:26rpx;color:#999;margin-left:auto;flex-shrink:0}
.c-val.trunc{max-width:200rpx;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.c-right{display:flex;align-items:center;gap:8rpx;margin-left:auto;font-size:26rpx;color:#999}
.cover-preview{width:96rpx;height:56rpx;background:#F5F1EB;border-radius:12rpx;display:flex;align-items:center;justify-content:center;font-size:28rpx}
.tags{display:flex;gap:6rpx}
.tag{font-size:18rpx;padding:2rpx 10rpx;background:#F5F1EB;border-radius:6rpx;color:#999}
.badge-gold{background:rgba(201,169,110,.2);color:#C9A96E;padding:4rpx 12rpx;border-radius:8rpx;font-size:24rpx}
.badge-doc{font-size:20rpx;padding:4rpx 12rpx;background:#F5F1EB;border-radius:8rpx;color:#999}
.c-val.price{color:#C41E3A;font-weight:500}
.c-val.gold{color:#C9A96E;font-weight:500}
.edit-inline{display:flex;align-items:center;gap:8rpx;margin-left:auto}
.edit-input{width:180rpx;padding:8rpx 16rpx;background:#F5F1EB;border-radius:12rpx;font-size:24rpx;color:#2C2C2C}
.edit-ok{color:#22c55e;font-weight:700;font-size:28rpx}
.edit-no{color:#999;font-size:28rpx}
.toggle-r{display:flex;justify-content:space-between;align-items:center}
.sw{width:88rpx;height:48rpx;border-radius:24rpx;background:#E8E0D5;position:relative;transition:background .2s;flex-shrink:0;margin-left:16rpx}
.sw.on{background:#C41E3A}
.sw-dot{width:40rpx;height:40rpx;border-radius:50%;background:#fff;position:absolute;top:4rpx;left:4rpx;box-shadow:0 2rpx 6rpx rgba(0,0,0,.1);transition:left .2s}
.sw.on .sw-dot{left:44rpx}
.mask{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100}
.d-modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border-radius:32rpx;padding:48rpx;width:600rpx;z-index:101;text-align:center}
.d-icon-wrap{width:96rpx;height:96rpx;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20rpx}
.d-icon{font-size:48rpx}
.d-title{font-size:32rpx;font-weight:600;color:#2C2C2C;display:block;margin-bottom:12rpx}
.d-desc{font-size:24rpx;color:#999;display:block;margin-bottom:20rpx}
.d-hint{font-size:22rpx;color:#999;display:block;margin-bottom:12rpx}
.d-input{width:100%;padding:20rpx;background:#F5F1EB;border-radius:16rpx;font-size:26rpx;text-align:center;box-sizing:border-box}
.d-btns{display:flex;gap:16rpx;margin-top:24rpx}
.d-btn{flex:1;padding:22rpx;border-radius:20rpx;font-size:28rpx;font-weight:500}
.d-btn.cancel{background:#F5F1EB;color:#2C2C2C}
.d-btn.ok{background:#C41E3A;color:#fff}
.d-btn.ok.dis{background:#D9D9D9;color:#999}
</style>
