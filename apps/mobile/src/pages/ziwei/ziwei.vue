<template>
  <view class="page">
    <view class="page-header">
      <text class="page-title">紫微斗数</text>
      <text class="page-subtitle">十二宫 · 星曜 · 四化</text>
    </view>

    <!-- 输入表单 -->
    <view class="form-card">
      <view class="form-section-title">个人信息</view>

      <view class="form-row">
        <text class="form-label">姓名</text>
        <input v-model="form.name" placeholder="请输入姓名" class="form-input" maxlength="10" />
      </view>

      <view class="form-row">
        <text class="form-label">性别</text>
        <view class="gender-group">
          <text :class="['gender-btn', { active: form.gender === '男' }]" @click="form.gender='男'">男</text>
          <text :class="['gender-btn', { active: form.gender === '女' }]" @click="form.gender='女'">女</text>
        </view>
      </view>

      <view class="form-divider" />

      <view class="form-section-title">农历出生信息</view>

      <view class="form-row">
        <text class="form-label">农历年份</text>
        <input v-model.number="form.year" placeholder="如 1990" class="form-input" type="number" />
      </view>

      <view class="form-row">
        <text class="form-label">出生月</text>
        <picker :range="lunarMonths" :value="form.lunarMonth - 1" @change="onMonthChange" class="form-picker">
          <view class="picker-value">
            <text :class="['picker-text', { placeholder: !form.lunarMonth }]">{{ form.lunarMonth ? form.lunarMonth + '月' : '选择月份' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>

      <view class="form-row">
        <text class="form-label">出生日</text>
        <picker :range="lunarDays" :value="form.lunarDay - 1" @change="onDayChange" class="form-picker">
          <view class="picker-value">
            <text :class="['picker-text', { placeholder: !form.lunarDay }]">{{ form.lunarDay ? '农历' + form.lunarDay + '日' : '选择日期' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>

      <view class="form-row">
        <text class="form-label">出生时辰</text>
        <view class="shichen-list">
          <scroll-view scroll-x class="shichen-scroll" show-scrollbar="false">
            <view class="shichen-inner">
              <text
                v-for="sc in shiChenOptions"
                :key="sc.value"
                :class="['shichen-btn', { active: form.lunarHour === sc.value }]"
                @click="form.lunarHour = sc.value"
              >
                <text class="sc-dizhi">{{ sc.label }}</text>
                <text class="sc-time">{{ sc.timeRange }}</text>
              </text>
            </view>
          </scroll-view>
        </view>
      </view>

      <view class="form-divider" />

      <view class="form-section-title">年份干支</view>
      <view class="form-row">
        <text class="form-label">年干</text>
        <view class="tiangan-list">
          <text
            v-for="g in tianGanList"
            :key="g"
            :class="['gan-btn', { active: form.lunarYearGan === g }]"
            @click="form.lunarYearGan = g"
          >{{ g }}</text>
        </view>
      </view>
      <view class="form-row">
        <text class="form-label">年支</text>
        <view class="dizhi-list">
          <text
            v-for="z in diZhiList"
            :key="z"
            :class="['zhi-btn', { active: form.lunarYearZhi === z }]"
            @click="form.lunarYearZhi = z"
          >{{ z }}</text>
        </view>
      </view>

      <button class="calc-btn" :loading="loading" @click="doCalc" :disabled="loading">
        <text v-if="!loading">开始排盘</text>
        <text v-else>推演中 ...</text>
      </button>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-section">
      <view class="loading-animation">
        <text class="loading-icon">☯</text>
        <text class="loading-text">紫微斗数推演中...</text>
      </view>
    </view>

    <!-- 排盘结果 -->
    <view v-if="result && !loading" class="result-section">
      <!-- 概览卡片 -->
      <view class="overview-card">
        <view class="overview-grid">
          <view class="ov-item">
            <text class="ov-label">五行局</text>
            <text class="ov-val highlight">{{ result.wuXingJu }}</text>
          </view>
          <view class="ov-item">
            <text class="ov-label">命宫</text>
            <text class="ov-val">{{ result.mingGong.name }}·{{ result.mingGong.gan }}{{ result.mingGong.zhi }}</text>
          </view>
          <view class="ov-item">
            <text class="ov-label">身宫</text>
            <text class="ov-val">{{ result.shenGong }}</text>
          </view>
          <view class="ov-item">
            <text class="ov-label">格局</text>
            <text class="ov-val" v-if="result.geShi.length">{{ result.geShi.join(' · ') }}</text>
            <text class="ov-val dim" v-else>暂无特殊格局</text>
          </view>
        </view>
      </view>

      <!-- 四化 -->
      <view class="section-title">四化飞星</view>
      <view class="sihua-card">
        <view class="sihua-row">
          <view class="sihua-item lu">
            <text class="sihua-label">化禄</text>
            <text class="sihua-star">{{ result.siHua.huaLu }}</text>
          </view>
          <view class="sihua-item quan">
            <text class="sihua-label">化权</text>
            <text class="sihua-star">{{ result.siHua.huaQuan }}</text>
          </view>
          <view class="sihua-item ke">
            <text class="sihua-label">化科</text>
            <text class="sihua-star">{{ result.siHua.huaKe }}</text>
          </view>
          <view class="sihua-item ji">
            <text class="sihua-label">化忌</text>
            <text class="sihua-star">{{ result.siHua.huaJi }}</text>
          </view>
        </view>
      </view>

      <!-- 十二宫 -->
      <view class="section-title">十二宫（{{ result.wuXingJu }}）</view>
      <view class="gong-list">
        <view
          v-for="gong in result.gongWei"
          :key="gong.name"
          :class="['gong-card', { shen: gong.shenGong, ming: gong.name === '命宫' }]"
        >
          <view class="gong-header">
            <view class="gong-name-row">
              <text class="gong-name">{{ gong.name }}</text>
              <text v-if="gong.shenGong" class="gong-badge shen-badge">身</text>
              <text v-if="gong.name === '命宫'" class="gong-badge ming-badge">命</text>
            </view>
            <text class="gong-ganzhi">{{ gong.gan }}{{ gong.zhi }}</text>
            <text class="gong-daxian">{{ gong.daXianStart }}-{{ gong.daXianEnd }}岁</text>
          </view>

          <view class="gong-stars">
            <text v-if="!gong.stars.length" class="no-star">空宫</text>
            <text
              v-for="star in gong.stars"
              :key="star.name"
              :class="['star-badge', star.liangJi, star.type]"
            >{{ star.name }}</text>
          </view>

          <view class="gong-extra">
            <text class="extra-text">三方: {{ gong.sanFang.join('·') }}</text>
            <text class="extra-text">对宫: {{ gong.duiGong }}</text>
            <text class="extra-text">宫气: {{ gong.gongQi }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { paipanApi } from "../../api";

const shiChenOptions = [
  { label: "子", value: "子", timeRange: "23-1时" },
  { label: "丑", value: "丑", timeRange: "1-3时" },
  { label: "寅", value: "寅", timeRange: "3-5时" },
  { label: "卯", value: "卯", timeRange: "5-7时" },
  { label: "辰", value: "辰", timeRange: "7-9时" },
  { label: "巳", value: "巳", timeRange: "9-11时" },
  { label: "午", value: "午", timeRange: "11-13时" },
  { label: "未", value: "未", timeRange: "13-15时" },
  { label: "申", value: "申", timeRange: "15-17时" },
  { label: "酉", value: "酉", timeRange: "17-19时" },
  { label: "戌", value: "戌", timeRange: "19-21时" },
  { label: "亥", value: "亥", timeRange: "21-23时" },
];

const tianGanList = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const diZhiList = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const lunarMonths = Array.from({ length: 12 }, (_, i) => (i + 1) + "月");
const lunarDays = Array.from({ length: 30 }, (_, i) => "农历" + (i + 1) + "日");

const form = ref({
  name: "",
  gender: "男",
  year: 1990,
  lunarMonth: 1,
  lunarDay: 15,
  lunarHour: "子",
  lunarYearGan: "庚",
  lunarYearZhi: "午",
  hour: 0,
  month: 1,
  day: 15,
});

const loading = ref(false);
const result = ref<any>(null);

function onMonthChange(e: any) {
  form.value.lunarMonth = Number(e.detail.value) + 1;
}

function onDayChange(e: any) {
  form.value.lunarDay = Number(e.detail.value) + 1;
}

async function doCalc() {
  if (!form.value.lunarYearGan || !form.value.lunarYearZhi) {
    uni.showToast({ title: "请选择年份干支", icon: "none" });
    return;
  }
  loading.value = true;
  result.value = null;
  try {
    const dto = {
      name: form.value.name || "未命名",
      gender: form.value.gender,
      year: form.value.year,
      month: form.value.lunarMonth,
      day: form.value.lunarDay,
      hour: form.value.lunarHour === "子" ? 0 : shiChenOptions.findIndex(s => s.value === form.value.lunarHour) * 2,
      lunarMonth: form.value.lunarMonth,
      lunarDay: form.value.lunarDay,
      lunarHour: form.value.lunarHour,
      lunarYearGan: form.value.lunarYearGan,
      lunarYearZhi: form.value.lunarYearZhi,
    };
    const res = await paipanApi.ziweiPreview(dto);
    result.value = res;
  } catch {
    uni.showToast({ title: "排盘失败，请重试", icon: "none" });
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.page {
  padding: 16px;
  background: #f7f3ee;
  min-height: 100vh;
}

.page-header {
  text-align: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: bold;
  color: #5d3a1a;
  display: block;
}

.page-subtitle {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
}

/* 表单 */
.form-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.form-section-title {
  font-size: 14px;
  font-weight: bold;
  color: #8b4513;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0e6d3;
}

.form-row {
  margin-bottom: 14px;
}

.form-label {
  font-size: 13px;
  color: #666;
  display: block;
  margin-bottom: 6px;
}

.form-input {
  border: 1px solid #e0d8cc;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 15px;
  background: #faf9f6;
  width: 100%;
  box-sizing: border-box;
}

.form-divider {
  height: 1px;
  background: #f0e6d3;
  margin: 16px 0;
}

/* 性别选择 */
.gender-group {
  display: flex;
  gap: 12px;
}

.gender-btn {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  border-radius: 8px;
  border: 1px solid #e0d8cc;
  font-size: 15px;
  color: #666;
  background: #faf9f6;
}

.gender-btn.active {
  background: #8b4513;
  color: #fff;
  border-color: #8b4513;
}

/* 天干地支选择 */
.tiangan-list, .dizhi-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.gan-btn, .zhi-btn {
  width: 40px;
  height: 40px;
  line-height: 40px;
  text-align: center;
  border-radius: 50%;
  font-size: 15px;
  border: 1px solid #e0d8cc;
  background: #faf9f6;
  color: #666;
}

.gan-btn.active {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
}

.zhi-btn.active {
  background: #8b4513;
  color: #fff;
  border-color: #8b4513;
}

/* 时辰选择 */
.shichen-list {
  margin-top: 4px;
}

.shichen-scroll {
  white-space: nowrap;
}

.shichen-inner {
  display: flex;
  gap: 6px;
}

.shichen-btn {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #e0d8cc;
  background: #faf9f6;
  min-width: 52px;
  flex-shrink: 0;
}

.shichen-btn.active {
  background: #8b4513;
  border-color: #8b4513;
}

.shichen-btn.active .sc-dizhi,
.shichen-btn.active .sc-time {
  color: #fff;
}

.sc-dizhi {
  font-size: 16px;
  font-weight: bold;
  color: #5d3a1a;
}

.sc-time {
  font-size: 10px;
  color: #999;
  margin-top: 2px;
}

/* 计算按钮 */
.calc-btn {
  margin-top: 16px;
  width: 100%;
  padding: 14px 0;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #8b4513, #a0522d);
  color: #fff;
  font-size: 17px;
  font-weight: bold;
  letter-spacing: 2px;
}

.calc-btn[disabled] {
  opacity: 0.6;
}

/* 加载 */
.loading-section {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.loading-animation {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.loading-icon {
  font-size: 40px;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  color: #999;
}

/* 结果区域 */
.result-section {
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #5d3a1a;
  margin: 20px 0 12px;
  padding-left: 10px;
  border-left: 3px solid #8b4513;
}

/* 概览卡片 */
.overview-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.overview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.ov-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ov-label {
  font-size: 12px;
  color: #999;
}

.ov-val {
  font-size: 15px;
  font-weight: bold;
  color: #333;
}

.ov-val.highlight {
  color: #8b4513;
  font-size: 16px;
}

.ov-val.dim {
  color: #bbb;
  font-weight: normal;
  font-size: 13px;
}

/* 四化 */
.sihua-card {
  background: #fff;
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.sihua-row {
  display: flex;
  justify-content: space-around;
}

.sihua-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.sihua-label {
  font-size: 12px;
  color: #999;
}

.sihua-star {
  font-size: 18px;
  font-weight: bold;
}

.sihua-item.lu .sihua-star { color: #67c23a; }
.sihua-item.quan .sihua-star { color: #409eff; }
.sihua-item.ke .sihua-star { color: #9b59b6; }
.sihua-item.ji .sihua-star { color: #f56c6c; }

/* 十二宫 */
.gong-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.gong-card {
  background: #fff;
  border-radius: 10px;
  padding: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  border-left: 3px solid #e0d8cc;
}

.gong-card.ming {
  border-left-color: #8b4513;
  background: #fefbf6;
}

.gong-card.shen {
  border-left-color: #e6a23c;
}

.gong-header {
  margin-bottom: 8px;
}

.gong-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.gong-name {
  font-size: 15px;
  font-weight: bold;
  color: #333;
}

.gong-badge {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  color: #fff;
}

.ming-badge { background: #8b4513; }
.shen-badge { background: #e6a23c; }

.gong-ganzhi {
  font-size: 13px;
  color: #666;
  margin-top: 2px;
  display: block;
}

.gong-daxian {
  font-size: 11px;
  color: #bbb;
  margin-top: 2px;
  display: block;
}

.gong-stars {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}

.no-star {
  font-size: 12px;
  color: #ddd;
}

.star-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #f0f0f0;
  color: #666;
}

.star-badge.吉 { background: #f0f9eb; color: #67c23a; }
.star-badge.凶 { background: #fef0f0; color: #f56c6c; }
.star-badge.main { font-weight: bold; }
.star-badge.assist { font-size: 10px; }
.star-badge.sisha { font-style: italic; }

.gong-extra {
  border-top: 1px dashed #f0f0f0;
  padding-top: 6px;
}

.extra-text {
  font-size: 10px;
  color: #ccc;
  display: block;
  line-height: 1.6;
}

/* picker */
.form-picker {
  width: 100%;
}

.picker-value {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #e0d8cc;
  border-radius: 8px;
  padding: 10px 12px;
  background: #faf9f6;
}

.picker-text {
  font-size: 15px;
  color: #333;
}

.picker-text.placeholder {
  color: #bbb;
}

.picker-arrow {
  font-size: 12px;
  color: #999;
}
</style>
