<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text>←</text><text class="nav-title">结业证书</text></view><view style="width:48rpx"/></view>

    <view v-if="isLoading" class="loading"><text class="spinner">⏳</text></view>
    <view v-else-if="!cert" class="empty"><text class="empty-icon">🎓</text><text>暂无证书</text><text class="empty-sub">完成全部课程后可获得结业证书</text></view>
    <view v-else class="body">
      <view class="congrats"><text class="cg-icon">✅</text><text class="cg-text">恭喜您完成课程学习！</text></view>

      <view class="cert-card">
        <view class="cert-inner"><text class="cert-star">★</text><text class="cert-label">结业证书</text><text class="cert-sub">CERTIFICATE OF COMPLETION</text><text class="cert-student">{{cert.studentName}}</text><text class="cert-desc">已完成</text><text class="cert-course">《{{cert.courseName}}》</text><text class="cert-hours">全部课程学习，共计{{cert.totalHours}}学时</text><text v-if="cert.score" class="cert-score">综合评分：{{cert.score}}分</text>
          <view class="cert-divider"/>
          <view class="cert-foot"><view><text class="cf-label">授课讲师</text><text class="cf-val">{{cert.instructor}}</text></view><view style="text-align:right"><text class="cf-label">颁发日期</text><text class="cf-val">{{fmtDate(cert.completedAt)}}</text></view></view>
          <text class="cert-no">证书编号：{{cert.certificateNo}}</text>
          <text class="cert-brand">热卜国学</text>
        </view>
      </view>

      <view class="cert-info"><view class="ci-row"><text>👤 学员：{{cert.studentName}}</text><text>⏰ 学时：{{cert.totalHours}}小时</text></view><view class="ci-row"><text>📅 日期：{{fmtDate(cert.completedAt)}}</text><text>🔢 编号：{{cert.certificateNo}}</text></view></view>

      <view class="actions"><view class="act-btn primary" @click="handleSave">💾 保存到相册</view><view class="act-btn" @click="handleShare">📤 分享给好友</view></view>
    </view>

    <view v-if="showSuccess" class="toast"><text>✅ 操作成功</text></view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
const isLoading=ref(true),cert=ref<any>(null),showSuccess=ref(false)

function fmtDate(d:string){return new Date(d).toLocaleDateString('zh-CN')}
function handleSave(){showSuccess.value=true;setTimeout(()=>showSuccess.value=false,2000)}
function handleShare(){showSuccess.value=true;setTimeout(()=>showSuccess.value=false,2000)}
function goBack(){uni.navigateBack()}

onMounted(async()=>{await new Promise(r=>setTimeout(r,600));cert.value={courseName:'八字命理入门精讲',studentName:'张三',completedAt:new Date().toISOString(),certificateNo:'RB2024010001',instructor:'李明德',totalHours:32,score:95};isLoading.value=false})
</script>
<style scoped>
.page{background:linear-gradient(180deg,#1a1a2e,#16213e);min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;color:#fff}.nav-left{display:flex;align-items:center;gap:12rpx;font-size:36rpx}.nav-title{font-size:32rpx;font-weight:500}
.loading{display:flex;align-items:center;justify-content:center;padding:200rpx 0}.spinner{font-size:64rpx;animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.empty{display:flex;flex-direction:column;align-items:center;padding:200rpx 0;color:rgba(255,255,255,.6);font-size:26rpx}.empty-icon{font-size:80rpx;margin-bottom:16rpx;opacity:.5}.empty-sub{font-size:22rpx;margin-top:4rpx}
.body{padding:24rpx}
.congrats{text-align:center;margin-bottom:24rpx}.cg-icon{font-size:40rpx}.cg-text{font-size:26rpx;color:#C9A96E;display:block;margin-top:8rpx}
.cert-card{background:linear-gradient(180deg,#FDF8F3,#F5EDE4);border-radius:16rpx;padding:4rpx;margin-bottom:24rpx}
.cert-inner{border:3px solid #C9A96E;border-radius:14rpx;padding:40rpx 32rpx;text-align:center}
.cert-star{font-size:48rpx;color:#C41E3A;display:block}.cert-label{font-size:40rpx;font-weight:700;color:#C41E3A;margin:8rpx 0;display:block}.cert-sub{font-size:20rpx;color:#999;margin-bottom:32rpx;display:block}
.cert-student{font-size:36rpx;font-weight:700;color:#2C2C2C;display:block;margin-bottom:24rpx}.cert-desc{font-size:24rpx;color:#666;display:block}.cert-course{font-size:30rpx;font-weight:700;color:#C41E3A;margin:8rpx 0;display:block}.cert-hours{font-size:24rpx;color:#666;display:block}.cert-score{font-size:26rpx;color:#C9A96E;margin-top:8rpx;display:block}
.cert-divider{height:1px;background:#E8D5B5;margin:28rpx 0}
.cert-foot{display:flex;justify-content:space-between}.cf-label{font-size:20rpx;color:#999;display:block}.cf-val{font-size:26rpx;color:#2C2C2C;display:block;margin-top:4rpx;font-style:italic}
.cert-no{font-size:18rpx;color:#999;margin-top:32rpx;display:block}.cert-brand{font-size:22rpx;font-weight:600;color:#C41E3A;margin-top:24rpx;display:block}
.cert-info{background:rgba(255,255,255,.05);border-radius:16rpx;padding:20rpx;margin-bottom:24rpx}.ci-row{display:flex;justify-content:space-between;padding:8rpx 0;font-size:24rpx;color:rgba(255,255,255,.6)}
.actions{display:flex;flex-direction:column;gap:16rpx}.act-btn{padding:28rpx;text-align:center;border-radius:40rpx;font-size:28rpx;font-weight:500;background:rgba(255,255,255,.1);color:#fff}.act-btn.primary{background:linear-gradient(90deg,#C41E3A,#E74C3C)}
.toast{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.8);color:#fff;padding:24rpx 40rpx;border-radius:24rpx;font-size:26rpx;z-index:100}
</style>
