<template>
  <view class="page">
    <view class="section">
      <text class="title">申请加入研究院</text>
      <input v-model="form.name" placeholder="姓名" class="input" />
      <input v-model="form.title" placeholder="职称/头衔" class="input" />
      <input v-model="form.institution" placeholder="所属机构" class="input" />
      <input v-model="form.research" placeholder="研究方向" class="input" />
      <textarea v-model="form.intro" placeholder="个人简介及学术成果" class="textarea" />
      <view class="upload" @click="uploadFile"><text>+ 上传学术材料</text></view>
      <button class="btn-submit" @click="submit">提交申请</button>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { instituteApi } from '../../api'
const form = ref({ name: '', title: '', institution: '', research: '', intro: '' })
function uploadFile() { uni.chooseImage({ count: 3, success: () => uni.showToast({ title: '已选择', icon: 'none' }) }) }
async function submit() {
  if (!form.value.name) { uni.showToast({ title: '请填写姓名', icon: 'none' }); return }
  try { await instituteApi.apply(form.value); uni.showToast({ title: '申请已提交' }); setTimeout(() => uni.navigateBack(), 1500) } catch {}
}
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.section { background: #fff; border-radius: 12px; padding: 20px 16px; }
.title { font-size: 16px; font-weight: 600; display: block; margin-bottom: 16px; }
.input { border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; font-size: 14px; margin-bottom: 12px; width: 100%; box-sizing: border-box; }
.textarea { border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; font-size: 14px; height: 100px; width: 100%; box-sizing: border-box; margin-bottom: 12px; }
.upload { border: 1px dashed #ccc; border-radius: 8px; padding: 16px; text-align: center; color: #999; font-size: 13px; margin-bottom: 16px; }
.btn-submit { width: 100%; background: #C41E3A; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 15px; }
</style>
