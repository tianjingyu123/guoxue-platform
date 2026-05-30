<template>
  <view class="page">
    <view class="section">
      <text class="title">传承人认证</text>
      <text class="desc">提交您的传承人资质证明，审核通过后可获得专属标识和权限。</text>
      <input v-model="form.name" placeholder="姓名" class="input" />
      <input v-model="form.tradition" placeholder="传承项目" class="input" />
      <input v-model="form.level" placeholder="传承级别（国家级/省级/市级）" class="input" />
      <view class="upload" @click="uploadCert"><text>+ 上传证书照片</text></view>
      <textarea v-model="form.intro" placeholder="简要介绍您的传承经历" class="textarea" />
      <button class="btn-submit" @click="submit">提交认证</button>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
const form = ref({ name: '', tradition: '', level: '', intro: '', certUrl: '' })
function uploadCert() {
  uni.chooseImage({ count: 1, success: (res) => { form.value.certUrl = res.tempFilePaths[0]; uni.showToast({ title: '已选择', icon: 'none' }) } })
}
function submit() { uni.showToast({ title: '认证申请已提交', icon: 'none' }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.section { background: #fff; border-radius: 12px; padding: 20px 16px; }
.title { font-size: 16px; font-weight: 600; display: block; margin-bottom: 8px; }
.desc { font-size: 13px; color: #666; line-height: 1.6; display: block; margin-bottom: 16px; }
.input { border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; font-size: 14px; margin-bottom: 12px; width: 100%; box-sizing: border-box; }
.textarea { border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; font-size: 14px; height: 80px; width: 100%; box-sizing: border-box; margin-bottom: 12px; }
.upload { border: 1px dashed #ccc; border-radius: 8px; padding: 20px; text-align: center; color: #999; font-size: 13px; margin-bottom: 12px; }
.btn-submit { width: 100%; background: #C41E3A; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 15px; }
</style>
