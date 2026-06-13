<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">草稿箱</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content" :style="{height:'calc(100vh - 56px)'}">
      <view v-if="drafts.length===0" class="empty"><text class="em-icon">📝</text><text class="em-text">暂无草稿</text><text class="em-sub">保存的内容将出现在这里</text></view>
      <view v-for="d in drafts" :key="d.id" class="draft-card">
        <view class="dc-head"><text class="dc-type">{{d.type==='article'?'文章':'帖子'}}</text><text class="dc-time">{{d.updatedAt}}</text></view>
        <text class="dc-title">{{d.title||'无标题'}}</text>
        <text class="dc-preview">{{d.content}}</text>
        <view class="dc-actions"><text class="dca-edit" @click="goEdit(d.id)">✏️继续编辑</text><text class="dca-del" @click="delDraft(d.id)">🗑️删除</text></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const drafts=ref([{id:'1',title:'八字学习笔记',content:'今天学习了八字排盘方法，记录一下要点...',type:'article',updatedAt:'2小时前'},{id:'2',title:'',content:'请问各位老师，食神制杀和伤官见官有什么区别？',type:'post',updatedAt:'昨天'},{id:'3',title:'风水知识分享',content:'客厅沙发背后是窗户的化解方法有几种...',type:'article',updatedAt:'3天前'}]);function goEdit(id:string){uni.navigateTo({url:'/pages/articles/editor/index'})};function delDraft(id:string){drafts.value=drafts.value.filter(d=>d.id!==id)};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.empty{display:flex;flex-direction:column;align-items:center;padding:160rpx 0}.em-icon{font-size:88rpx;opacity:.3;margin-bottom:16rpx}.em-text{font-size:28rpx;color:#999}.em-sub{font-size:22rpx;color:#ccc;margin-top:4rpx}.draft-card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.dc-head{display:flex;justify-content:space-between;margin-bottom:12rpx}.dc-type{font-size:20rpx;padding:4rpx 12rpx;background:#F5F1EB;color:#999;border-radius:8rpx}.dc-time{font-size:22rpx;color:#ccc}.dc-title{font-size:30rpx;font-weight:600;color:#2C2C2C;display:block;margin-bottom:12rpx}.dc-preview{font-size:24rpx;color:#999;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:16rpx}.dc-actions{display:flex;gap:32rpx;padding-top:16rpx;border-top:1px solid #F5F1EB;font-size:24rpx}.dca-edit{color:#C41E3A}.dca-del{color:#999}
</style>
