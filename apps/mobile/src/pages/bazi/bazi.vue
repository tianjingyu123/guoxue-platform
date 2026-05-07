<template>
  <view class="page">
    <view class="title-row">八字排盘</view>

    <!-- 输入表单 -->
    <view class="form">
      <view class="form-row">
        <text class="label">姓名</text>
        <input v-model="form.name" placeholder="请输入" class="input" />
      </view>
      <view class="form-row">
        <text class="label">性别</text>
        <view class="gender-switch">
          <text :class="{ active: form.gender === '男' }" @click="form.gender='男'">男</text>
          <text :class="{ active: form.gender === '女' }" @click="form.gender='女'">女</text>
        </view>
      </view>
      <view class="form-row">
        <text class="label">公历</text>
        <input v-model.number="form.year" type="number" class="input small" />年
        <input v-model.number="form.month" type="number" class="input small" />月
        <input v-model.number="form.day" type="number" class="input small" />日
      </view>
      <view class="form-row">
        <text class="label">时辰</text>
        <input v-model.number="form.hour" type="number" class="input small" />时
        <input v-model.number="form.minute" type="number" class="input small" />分
      </view>
      <button class="calc-btn" @click="doCalc">开始排盘</button>
    </view>

    <!-- 结果 -->
    <view v-if="result" class="result">
      <view class="sizhu">
        <view v-for="(col, ck) in [['nian','年柱'],['yue','月柱'],['ri','日柱'],['shi','时柱']]" :key="ck" class="pillar">
          <text class="pillar-label">{{ col[1] }}</text>
          <text class="gan">{{ result.siZhu[col[0]].gan }}</text>
          <text class="zhi">{{ result.siZhu[col[0]].zhi }}</text>
          <text class="shishen">{{ result.siZhu[col[0]].ganShiShen }}</text>
        </view>
      </view>
      <view class="info-grid">
        <text>生肖：{{ result.shengXiao }}</text>
        <text>空亡：{{ result.kongWang }}</text>
        <text>旺衰：{{ result.wangXiang }}</text>
      </view>
      <view class="dayun-section">
        <text class="section-title">大运</text>
        <view class="dayun-scroll">
          <view v-for="(step, idx) in result.qiYun.daYun" :key="idx" class="dayun-item">
            <text class="dy-ganzhi">{{ step.ganZhi }}</text>
            <text class="dy-shishen">{{ step.ganShiShen }}</text>
            <text class="dy-age">{{ step.startAge }}-{{ step.endAge }}岁</text>
          </view>
        </view>
      </view>
      <view v-if="result.geJu" class="geju-section">
        <text class="section-title">格局：{{ result.geJu.name }}</text>
        <text class="geju-desc">{{ result.geJu.desc }}</text>
      </view>
      <button class="save-btn" @click="saveRecord">保存排盘</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import { paipanApi } from "../../api";

const form = reactive({
  name: "",
  gender: "男",
  year: 1984,
  month: 2,
  day: 4,
  hour: 12,
  minute: 0,
});
const result = ref<any>(null);

async function doCalc() {
  try {
    result.value = await paipanApi.preview({ ...form });
  } catch { /* error handled by api */ }
}

async function saveRecord() {
  try {
    await paipanApi.save({ ...form });
    uni.showToast({ title: "已保存" });
  } catch { /* */ }
}
</script>

<style>
.page { padding: 12px; background: #f5f0e6; min-height: 100vh; }
.title-row { font-size: 18px; font-weight: bold; color: #8b4513; margin-bottom: 12px; }

.form { background: #fff; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
.form-row { display: flex; align-items: center; margin-bottom: 10px; gap: 8px; }
.label { width: 50px; font-size: 14px; color: #666; flex-shrink: 0; }
.input { flex: 1; background: #f5f5f5; border-radius: 6px; padding: 6px 10px; font-size: 14px; }
.input.small { width: 50px; flex: none; }
.gender-switch { display: flex; gap: 4px; }
.gender-switch text {
  padding: 4px 16px; border-radius: 14px; font-size: 13px;
  background: #f5f5f5; color: #666;
}
.gender-switch text.active { background: #8b4513; color: #fff; }
.calc-btn {
  background: linear-gradient(135deg, #8b4513, #c4943a);
  color: #fff; border-radius: 22px; padding: 10px; font-size: 16px; margin-top: 8px;
}

.result { background: #fff; border-radius: 8px; padding: 16px; }
.sizhu { display: flex; justify-content: space-around; margin-bottom: 12px; }
.pillar { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.pillar-label { font-size: 11px; color: #999; }
.gan { font-size: 24px; font-weight: bold; color: #c4943a; }
.zhi { font-size: 16px; color: #666; }
.shishen { font-size: 11px; color: #8b4513; }
.info-grid { display: flex; gap: 16px; font-size: 13px; color: #666; margin-bottom: 12px; }

.section-title { font-size: 15px; font-weight: bold; color: #8b4513; display: block; margin-bottom: 8px; }
.dayun-scroll { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; }
.dayun-item {
  display: flex; flex-direction: column; align-items: center;
  background: #f5f0e6; border-radius: 8px; padding: 8px 12px;
  min-width: 70px; flex-shrink: 0;
}
.dy-ganzhi { font-size: 15px; font-weight: bold; color: #333; }
.dy-shishen { font-size: 11px; color: #8b4513; }
.dy-age { font-size: 11px; color: #999; }
.geju-section { margin-top: 12px; }
.geju-desc { font-size: 13px; color: #666; }
.save-btn { margin-top: 12px; background: #8b4513; color: #fff; border-radius: 20px; padding: 8px; font-size: 14px; }
</style>
