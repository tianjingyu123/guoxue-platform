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
      <button class="calc-btn" :loading="loading" @click="doCalc">开始排盘</button>
    </view>

    <!-- 结果 -->
    <view v-if="result" class="result">
      <!-- 四柱 -->
      <view class="card">
        <text class="card-title">四柱八字</text>
        <view class="sizhu">
          <view v-for="(col, ck) in sizhuCols" :key="ck" class="pillar">
            <text class="pillar-label">{{ col[1] }}</text>
            <text class="gan">{{ result.siZhu[col[0]].gan }}</text>
            <text class="zhi">{{ result.siZhu[col[0]].zhi }}</text>
            <view v-if="result.siZhu[col[0]].cangGan?.length" class="canggan-row">
              <text v-for="cg in result.siZhu[col[0]].cangGan" :key="cg.gan" class="canggan-item">{{ cg.gan }}({{ cg.shiShen }})</text>
            </view>
            <text class="shishen">{{ result.siZhu[col[0]].ganShiShen }}/{{ result.siZhu[col[0]].zhiShiShen }}</text>
          </view>
        </view>
      </view>

      <!-- 基本信息 -->
      <view class="card">
        <text class="card-title">基本信息</text>
        <view class="info-grid">
          <view class="info-item"><text class="info-label">生肖</text><text class="info-val">{{ result.shengXiao }}</text></view>
          <view class="info-item"><text class="info-label">空亡</text><text class="info-val">{{ result.kongWang }}</text></view>
          <view class="info-item"><text class="info-label">旺衰</text><text class="info-val">{{ result.wangXiang }}</text></view>
          <view class="info-item"><text class="info-label">农历</text><text class="info-val">{{ result.lunarDate }}</text></view>
        </view>
      </view>

      <!-- 胎元·命宫·身宫 -->
      <view class="card">
        <text class="card-title">胎元·命宫·身宫</text>
        <view class="tms-row">
          <view class="tms-item">
            <text class="tms-label">胎元</text>
            <text class="tms-gz">{{ result.taiYuan?.gan }}{{ result.taiYuan?.zhi }}</text>
            <text v-if="result.taiYuan?.nayin" class="tms-nayin">{{ result.taiYuan.nayin }}</text>
          </view>
          <view class="tms-item">
            <text class="tms-label">命宫</text>
            <text class="tms-gz">{{ result.mingGong?.gan }}{{ result.mingGong?.zhi }}</text>
            <text v-if="result.mingGong?.nayin" class="tms-nayin">{{ result.mingGong.nayin }}</text>
          </view>
          <view class="tms-item">
            <text class="tms-label">身宫</text>
            <text class="tms-gz">{{ result.shenGong?.gan }}{{ result.shenGong?.zhi }}</text>
            <text v-if="result.shenGong?.nayin" class="tms-nayin">{{ result.shenGong.nayin }}</text>
          </view>
        </view>
      </view>

      <!-- 起运 + 大运 -->
      <view class="card">
        <text class="card-title">大运</text>
        <text class="qiyun-desc">{{ result.qiYun?.desc }}</text>
        <text class="qiyun-info">{{ result.qiYun?.startAge }}岁起运 · {{ result.qiYun?.startYear }}年{{ result.qiYun?.jiaoYunMonth }}月交运</text>
        <view class="dayun-scroll">
          <view v-for="(step, idx) in result.qiYun.daYun" :key="idx" class="dayun-item">
            <text class="dy-ganzhi">{{ step.ganZhi }}</text>
            <text class="dy-shishen">{{ step.ganShiShen }}/{{ step.zhiShiShen }}</text>
            <text class="dy-age">{{ step.startAge }}-{{ step.endAge }}岁</text>
          </view>
        </view>
      </view>

      <!-- 流年 -->
      <view v-if="activeDayun" class="card">
        <text class="card-title">流年（{{ activeDayun.ganZhi }}大运）</text>
        <view class="liunian-scroll">
          <view v-for="ln in activeDayun.liuNian" :key="ln.year" class="liunian-item">
            <text class="ln-year">{{ ln.year }}</text>
            <text class="ln-gz">{{ ln.ganZhi }}</text>
            <text class="ln-ss">{{ ln.ganShiShen }}/{{ ln.zhiShiShen }}</text>
          </view>
        </view>
      </view>

      <!-- 格局 -->
      <view v-if="result.geJu" class="card">
        <text class="card-title">格局分析</text>
        <view class="geju-header">
          <text class="geju-name">{{ result.geJu.name }}</text>
          <text :class="['geju-type', result.geJu.type === 'zheng' ? 'type-zheng' : 'type-bian']">{{ result.geJu.type === 'zheng' ? '正格' : '变格' }}</text>
        </view>
        <text class="geju-desc">{{ result.geJu.desc }}</text>
        <view v-if="result.geJu.yongShen" class="yongji-row">
          <text class="yongji-item yong">用神：{{ result.geJu.yongShen }}</text>
          <text v-if="result.geJu.xiShen" class="yongji-item xi">喜神：{{ result.geJu.xiShen }}</text>
          <text v-if="result.geJu.jiShen" class="yongji-item ji">忌神：{{ result.geJu.jiShen }}</text>
        </view>
      </view>

      <!-- 五行能量 -->
      <view v-if="result.wuXingEnergy" class="card">
        <text class="card-title">五行能量</text>
        <text class="wx-desc">{{ result.wuXingEnergy.desc }}</text>
        <view class="wx-bars">
          <view v-for="wx in wuXingList" :key="wx.key" class="wx-bar-row">
            <text class="wx-label">{{ wx.label }}</text>
            <view class="wx-bar-track">
              <view class="wx-bar-fill" :style="{ width: wx.percent + '%', backgroundColor: wx.color }" />
            </view>
            <text class="wx-score">{{ result.wuXingEnergy[wx.key] }}分</text>
          </view>
        </view>
      </view>

      <!-- 合冲刑害 -->
      <view v-if="result.fenXiTiShi" class="card">
        <text class="card-title">合冲刑害</text>
        <view v-if="result.fenXiTiShi.ganHe?.length" class="fxt-row">
          <text class="fxt-label">天干合：</text>
          <text v-for="g in result.fenXiTiShi.ganHe" :key="g" class="fxt-tag tag-he">{{ g }}</text>
        </view>
        <view v-if="result.fenXiTiShi.liuHe?.length" class="fxt-row">
          <text class="fxt-label">地支六合：</text>
          <text v-for="h in result.fenXiTiShi.liuHe" :key="h" class="fxt-tag tag-he">{{ h }}</text>
        </view>
        <view v-if="result.fenXiTiShi.sanHe?.length" class="fxt-row">
          <text class="fxt-label">三合局：</text>
          <text v-for="s in result.fenXiTiShi.sanHe" :key="s" class="fxt-tag tag-sanhe">{{ s }}</text>
        </view>
        <view v-if="result.fenXiTiShi.sanHui?.length" class="fxt-row">
          <text class="fxt-label">三会局：</text>
          <text v-for="s in result.fenXiTiShi.sanHui" :key="s" class="fxt-tag tag-sanhui">{{ s }}</text>
        </view>
        <view v-if="result.fenXiTiShi.liuChong?.length" class="fxt-row">
          <text class="fxt-label">六冲：</text>
          <text v-for="c in result.fenXiTiShi.liuChong" :key="c" class="fxt-tag tag-chong">{{ c }}</text>
        </view>
        <view v-if="result.fenXiTiShi.liuHai?.length" class="fxt-row">
          <text class="fxt-label">六害：</text>
          <text v-for="h in result.fenXiTiShi.liuHai" :key="h" class="fxt-tag tag-hai">{{ h }}</text>
        </view>
        <view v-if="result.fenXiTiShi.sanXing?.length" class="fxt-row">
          <text class="fxt-label">三刑：</text>
          <text v-for="x in result.fenXiTiShi.sanXing" :key="x" class="fxt-tag tag-xing">{{ x }}</text>
        </view>
        <view v-if="result.fenXiTiShi.ziXing?.length" class="fxt-row">
          <text class="fxt-label">自刑：</text>
          <text v-for="z in result.fenXiTiShi.ziXing" :key="z" class="fxt-tag tag-xing">{{ z }}</text>
        </view>
        <text v-if="!hasFenXi" class="fxt-empty">无特殊合冲刑害</text>
      </view>

      <!-- 神煞 -->
      <view v-if="result.shenSha?.length" class="card">
        <text class="card-title">神煞</text>
        <view class="shensha-grid">
          <view v-for="ss in result.shenSha" :key="ss.name" :class="['ss-item', ss.type === 'ji' ? 'ss-ji' : 'ss-xiong']">
            <text class="ss-name">{{ ss.name }}</text>
            <text class="ss-desc">{{ ss.desc }}</text>
            <text class="ss-pillar">{{ ss.pillar }}</text>
          </view>
        </view>
      </view>

      <!-- AI分析 -->
      <view class="card">
        <text class="card-title">AI 智能解读</text>
        <text v-if="aiResult" class="ai-text">{{ aiResult }}</text>
        <button v-else class="ai-btn" :loading="aiLoading" @click="doAiAnalyze">AI 深度解读</button>
      </view>

      <!-- 操作按钮 -->
      <view class="action-row">
        <button class="save-btn" @click="saveRecord">保存排盘</button>
        <button class="history-btn" @click="goHistory">历史记录</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from "vue";
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
const loading = ref(false);
const aiLoading = ref(false);
const aiResult = ref("");
const activeDayunIdx = ref(0);

const sizhuCols: [string, string][] = [
  ["nian", "年柱"], ["yue", "月柱"], ["ri", "日柱"], ["shi", "时柱"],
];

const wuXingList = [
  { key: "mu", label: "木", color: "#4CAF50" },
  { key: "huo", label: "火", color: "#FF5722" },
  { key: "tu", label: "土", color: "#FF9800" },
  { key: "jin", label: "金", color: "#FFC107" },
  { key: "shui", label: "水", color: "#2196F3" },
].map(w => ({
  ...w,
  get percent() {
    return computed(() => {
      const val = result.value?.wuXingEnergy?.[w.key] || 0;
      const max = Math.max(...Object.values(result.value?.wuXingEnergy || {}).filter((v: any) => typeof v === "number") as number[], 1);
      return (val / max) * 100;
    });
  },
})).map(w => ({ key: w.key, label: w.label, color: w.color, percent: w.percent.value }));

const activeDayun = computed(() => {
  if (!result.value?.qiYun?.daYun) return null;
  return result.value.qiYun.daYun[activeDayunIdx.value] || null;
});

const hasFenXi = computed(() => {
  const f = result.value?.fenXiTiShi;
  if (!f) return false;
  return (f.ganHe?.length || f.liuHe?.length || f.sanHe?.length || f.sanHui?.length ||
    f.liuChong?.length || f.liuHai?.length || f.sanXing?.length || f.ziXing?.length) > 0;
});

async function doCalc() {
  loading.value = true;
  aiResult.value = "";
  activeDayunIdx.value = 0;
  try {
    result.value = await paipanApi.preview({ ...form });
  } catch {
    result.value = null;
  } finally {
    loading.value = false;
  }
}

async function saveRecord() {
  try {
    await paipanApi.save({ ...form });
    uni.showToast({ title: "已保存", icon: "success" });
  } catch { /* */ }
}

async function doAiAnalyze() {
  aiLoading.value = true;
  try {
    // 调用AI分析API（后端实现后可用）
    const data = await (uni as any).request({
      url: "http://localhost:3000/api/v1/paipan/bazi/analyze",
      method: "POST",
      data: { baziResult: result.value },
      header: { "Content-Type": "application/json" },
    });
    aiResult.value = data.data?.analysis || data.data?.data?.analysis || "AI分析暂不可用";
  } catch {
    aiResult.value = "AI分析服务暂未配置，请联系管理员。您可通过保存记录后，在历史记录中查看AI解读。";
  } finally {
    aiLoading.value = false;
  }
}

function goHistory() {
  uni.navigateTo({ url: "/pages/bazi/history" as any });
}
</script>

<style>
.page { padding: 12px; background: #f5f0e6; min-height: 100vh; padding-bottom: 40px; }
.title-row { font-size: 20px; font-weight: bold; color: #8b4513; text-align: center; margin-bottom: 12px; }

.form { background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 12px; }
.form-row { display: flex; align-items: center; margin-bottom: 10px; gap: 6px; }
.label { width: 46px; font-size: 14px; color: #666; flex-shrink: 0; }
.input { flex: 1; background: #f5f5f5; border-radius: 6px; padding: 6px 10px; font-size: 14px; height: 34px; }
.input.small { width: 52px; flex: none; }
.gender-switch { display: flex; gap: 4px; }
.gender-switch text {
  padding: 5px 18px; border-radius: 16px; font-size: 13px;
  background: #f0f0f0; color: #888; transition: all 0.2s;
}
.gender-switch text.active { background: linear-gradient(135deg, #8b4513, #a0522d); color: #fff; }
.calc-btn {
  background: linear-gradient(135deg, #8b4513, #c4943a);
  color: #fff; border-radius: 22px; padding: 11px; font-size: 16px; margin-top: 10px;
  border: none;
}

.result { display: flex; flex-direction: column; gap: 10px; }

/* 卡片 */
.card { background: #fff; border-radius: 10px; padding: 14px; }
.card-title { font-size: 15px; font-weight: bold; color: #8b4513; display: block; margin-bottom: 10px; border-left: 3px solid #c4943a; padding-left: 8px; }

/* 四柱 */
.sizhu { display: flex; justify-content: space-around; }
.pillar { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 64px; }
.pillar-label { font-size: 11px; color: #999; }
.gan { font-size: 26px; font-weight: bold; color: #c4943a; }
.zhi { font-size: 18px; color: #555; margin-top: -4px; }
.shishen { font-size: 11px; color: #8b4513; margin-top: 2px; }
.canggan-row { display: flex; flex-wrap: wrap; gap: 2px; margin-top: 2px; }
.canggan-item { font-size: 10px; color: #999; background: #f9f6f0; padding: 1px 4px; border-radius: 3px; }

/* 基本信息 */
.info-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.info-item { width: calc(50% - 4px); display: flex; gap: 6px; }
.info-label { font-size: 13px; color: #999; }
.info-val { font-size: 13px; color: #333; font-weight: 500; }

/* 胎元命宫身宫 */
.tms-row { display: flex; justify-content: space-around; }
.tms-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.tms-label { font-size: 12px; color: #999; }
.tms-gz { font-size: 22px; font-weight: bold; color: #5d3a1a; }
.tms-nayin { font-size: 11px; color: #c4943a; }

/* 大运 */
.qiyun-desc { font-size: 12px; color: #999; display: block; }
.qiyun-info { font-size: 13px; color: #8b4513; font-weight: 500; display: block; margin: 4px 0 8px; }
.dayun-scroll { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
.dayun-item {
  display: flex; flex-direction: column; align-items: center;
  background: linear-gradient(135deg, #fdf8f0, #f5e6cc); border-radius: 10px;
  padding: 10px 14px; min-width: 72px; flex-shrink: 0;
  border: 1px solid #f0d9a0;
}
.dy-ganzhi { font-size: 16px; font-weight: bold; color: #5d3a1a; }
.dy-shishen { font-size: 11px; color: #8b4513; margin-top: 2px; }
.dy-age { font-size: 11px; color: #aaa; margin-top: 2px; }

/* 流年 */
.liunian-scroll { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
.liunian-item {
  display: flex; flex-direction: column; align-items: center;
  background: #fafafa; border-radius: 6px; padding: 6px 8px;
  min-width: 52px; flex-shrink: 0;
}
.ln-year { font-size: 11px; color: #999; }
.ln-gz { font-size: 13px; font-weight: bold; color: #333; }
.ln-ss { font-size: 10px; color: #8b4513; }

/* 格局 */
.geju-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.geju-name { font-size: 17px; font-weight: bold; color: #5d3a1a; }
.geju-type { font-size: 12px; padding: 2px 8px; border-radius: 10px; }
.type-zheng { background: #e8f5e9; color: #2e7d32; }
.type-bian { background: #fff3e0; color: #e65100; }
.geju-desc { font-size: 13px; color: #666; line-height: 1.6; display: block; margin-bottom: 6px; }
.yongji-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.yongji-item { font-size: 12px; padding: 3px 10px; border-radius: 12px; }
.yongji-item.yong { background: #e3f2fd; color: #1565c0; }
.yongji-item.xi { background: #e8f5e9; color: #2e7d32; }
.yongji-item.ji { background: #fce4ec; color: #c62828; }

/* 五行能量 */
.wx-desc { font-size: 12px; color: #999; display: block; margin-bottom: 8px; text-align: center; }
.wx-bars { display: flex; flex-direction: column; gap: 6px; }
.wx-bar-row { display: flex; align-items: center; gap: 6px; }
.wx-label { font-size: 13px; color: #333; width: 20px; text-align: center; }
.wx-bar-track { flex: 1; height: 16px; background: #f0f0f0; border-radius: 8px; overflow: hidden; }
.wx-bar-fill { height: 16px; border-radius: 8px; transition: width 0.5s; min-width: 4px; }
.wx-score { font-size: 12px; color: #888; width: 32px; text-align: right; }

/* 合冲刑害 */
.fxt-row { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
.fxt-label { font-size: 12px; color: #666; flex-shrink: 0; }
.fxt-tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.tag-he { background: #e8f5e9; color: #2e7d32; }
.tag-sanhe { background: #e3f2fd; color: #1565c0; }
.tag-sanhui { background: #f3e5f5; color: #7b1fa2; }
.tag-chong { background: #fce4ec; color: #c62828; }
.tag-hai { background: #fff3e0; color: #e65100; }
.tag-xing { background: #fbe9e7; color: #bf360c; }
.fxt-empty { font-size: 12px; color: #ccc; text-align: center; width: 100%; display: block; }

/* 神煞 */
.shensha-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.ss-item { display: flex; flex-direction: column; padding: 6px 10px; border-radius: 8px; min-width: 80px; }
.ss-ji { background: #e8f5e9; border: 1px solid #c8e6c9; }
.ss-xiong { background: #fce4ec; border: 1px solid #f8bbd0; }
.ss-name { font-size: 13px; font-weight: bold; color: #333; }
.ss-desc { font-size: 10px; color: #888; }
.ss-pillar { font-size: 10px; color: #aaa; margin-top: 2px; }

/* AI分析 */
.ai-text { font-size: 14px; color: #333; line-height: 1.8; white-space: pre-wrap; }
.ai-btn {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff; border-radius: 20px; padding: 10px 24px; font-size: 14px;
  align-self: center; border: none;
}

/* 操作 */
.action-row { display: flex; gap: 10px; margin-top: 4px; }
.save-btn, .history-btn {
  flex: 1; background: #8b4513; color: #fff; border-radius: 22px; padding: 10px; font-size: 14px;
  border: none;
}
.history-btn { background: #fff; color: #8b4513; border: 1px solid #8b4513; }
</style>
