<template>
  <view class="page">
    <view v-if="imageUrl" class="result">
      <image :src="imageUrl" class="cover-img" mode="aspectFill" />
      <view class="actions"><button class="btn-save" @click="save">保存</button><button class="btn-retry" @click="retry">重新生成</button></view>
    </view>
    <view v-else class="form">
      <text class="title">AI 封面生成</text>
      <textarea v-model="prompt" placeholder="描述你想要的封面风格..." class="textarea" />
      <view class="styles">
        <view v-for="s in styles" :key="s" class="style-tag" :class="{ selected: s === selectedStyle }" @click="selectedStyle = s"><text>{{ s }}</text></view>
      </view>
      <button class="btn-gen" @click="generate">生成封面</button>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { aiApi } from '../../api'
const prompt = ref(''); const selectedStyle = ref(''); const imageUrl = ref('')
const styles = ['古风', '水墨', '青花', '篆刻', '敦煌']
async function generate() {
  if (!prompt.value) { uni.showToast({ title: '请输入描述', icon: 'none' }); return }
  try { const res: any = await aiApi.generateCover({ prompt: prompt.value, style: selectedStyle.value }); imageUrl.value = res?.url || '' } catch { uni.showToast({ title: '生成失败', icon: 'none' }) }
}
function save() { uni.showToast({ title: '已保存' }) }
function retry() { imageUrl.value = '' }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.form { background: #fff; border-radius: 12px; padding: 20px 16px; }
.result { text-align: center; }
.title { font-size: 16px; font-weight: 600; display: block; margin-bottom: 14px; }
.textarea { border: 1px solid #ddd; border-radius: 8px; padding: 12px; font-size: 14px; height: 80px; width: 100%; box-sizing: border-box; margin-bottom: 14px; }
.styles { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.style-tag { padding: 6px 14px; border: 1px solid #ddd; border-radius: 20px; font-size: 13px; }
.style-tag.selected { border-color: #C41E3A; background: #FFF8F8; color: #C41E3A; }
.btn-gen { width: 100%; background: #C41E3A; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 15px; }
.cover-img { width: 100%; border-radius: 8px; margin-bottom: 16px; }
.actions { display: flex; gap: 12px; }
.btn-save, .btn-retry { flex: 1; background: #C41E3A; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 14px; }
.btn-retry { background: #fff; border: 1px solid #C41E3A; color: #C41E3A; }
</style>
