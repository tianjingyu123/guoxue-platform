<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text>←</text><text class="nav-title">提交作业</text></view><view style="width:48rpx"/></view>

    <scroll-view v-if="!isLoading" scroll-y class="content" :style="{height:'calc(100vh - 56px - 56px)'}">
      <view class="info-card"><view class="ic-icon">📄</view><view><text class="ic-title">{{req.title}}</text><text class="ic-meta">{{req.courseTitle}}·{{req.chapterTitle}}</text><text v-if="req.deadline" class="ic-deadline">⏰ 截止时间：{{req.deadline}}</text></view></view>

      <view class="card"><text class="card-title">⚠️ 作业要求</text><text class="req-text">{{req.description}}</text></view>

      <view class="card"><textarea v-model="content" class="content-input" placeholder="请在此输入你的作业内容..." :rows="8"/>
        <view class="word-count" :class="{warn:wordCount<(req.minWords||100)}"><text>{{wordCount}}/{{req.minWords||100}}字（最少）</text></view>
      </view>

      <view class="card"><text class="card-title">🖼️ 添加图片（{{images.length}}/{{req.maxImages||9}}）</text>
        <view class="img-grid"><view v-for="(img,i) in images" :key="i" class="img-thumb"><text>🖼️</text><text class="img-del" @click="images.splice(i,1)">✕</text></view>
          <view v-if="images.length<(req.maxImages||9)" class="img-add" @click="addImage"><text class="img-add-icon">＋</text><text class="img-add-text">添加图片</text></view>
        </view>
      </view>
    </scroll-view>

    <view class="bottom-bar"><view class="bb-btn" :class="{dis:wordCount<(req.minWords||100)||submitting}" @click="handleSubmit"><text>{{submitting?'⏳提交中...':'📤 提交作业'}}</text></view></view>
  </view>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
const isLoading=ref(true),content=ref(''),images=ref<string[]>([]),submitting=ref(false)
const req=ref({title:'八字命理基础练习',description:'请分析以下八字命盘的五行分布，要求：\n1.分析命盘五行强弱\n2.找出命主的喜用神\n3.简要分析命主性格特点',chapterTitle:'第三章：五行生克',courseTitle:'八字命理入门精讲',deadline:'2024-12-31 23:59',maxImages:9,minWords:100})
const wordCount=computed(()=>content.value.length)

function addImage(){images.value.push('placeholder')}
async function handleSubmit(){if(wordCount.value<(req.value.minWords||100))return;submitting.value=true;await new Promise(r=>setTimeout(r,1000));submitting.value=false;uni.showToast({title:'提交成功',icon:'success'});uni.navigateBack()}
function goBack(){uni.navigateBack()}

onMounted(async()=>{await new Promise(r=>setTimeout(r,400));isLoading.value=false})
onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx;font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}
.content{padding:24rpx}
.info-card{display:flex;gap:16rpx;background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ic-icon{font-size:48rpx}.ic-title{font-size:28rpx;font-weight:600;color:#2C2C2C;display:block}.ic-meta{font-size:22rpx;color:#999;margin-top:4rpx}.ic-deadline{font-size:22rpx;color:#f97316;margin-top:4rpx;display:block}
.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.card-title{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:16rpx;display:block}
.req-text{font-size:26rpx;color:#666;line-height:1.6;white-space:pre-line}
.content-input{width:100%;padding:20rpx;font-size:26rpx;color:#2C2C2C;box-sizing:border-box;resize:none;border:none;background:transparent}.word-count{text-align:right;font-size:22rpx;color:#999;padding-top:16rpx;border-top:1px solid #E8E0D5}.word-count.warn{color:#f97316}
.img-grid{display:flex;flex-wrap:wrap;gap:16rpx}.img-thumb{width:180rpx;height:180rpx;border-radius:16rpx;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:48rpx;position:relative}.img-del{position:absolute;top:-8rpx;right:-8rpx;width:40rpx;height:40rpx;border-radius:50%;background:#ef4444;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20rpx}.img-add{width:180rpx;height:180rpx;border-radius:16rpx;border:2rpx dashed #E8E0D5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8rpx}.img-add-icon{font-size:40rpx;color:#999}.img-add-text{font-size:20rpx;color:#999}
.bottom-bar{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #E8E0D5;padding:20rpx 24rpx;z-index:50}.bb-btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:40rpx;font-size:28rpx;font-weight:600}.bb-btn.dis{background:#D9D9D9;color:#999}
</style>
