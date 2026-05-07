<script setup lang="ts">
/**
 * 八字传统模式展示
 * 参考热卜旧系统传统排盘样式
 */
import type { BaziResult, SiZhu, Pillar, DaYunStep } from '@guoxue/bazi-engine'

const props = defineProps<{
  result: BaziResult
}>()

const { siZhu, qiYun, kongWang, shengXiao, taiYuan, mingGong, shenGong, wangXiang } = props.result

// 颜色映射
const ganColor: Record<string, string> = {
  '甲': '#43ab18', '乙': '#43ab18',
  '丙': '#e40b06', '丁': '#e40b06',
  '戊': '#964607', '己': '#964607',
  '庚': '#f4a600', '辛': '#f4a600',
  '壬': '#006aff', '癸': '#006aff',
}
const zhiColor: Record<string, string> = {
  '子': '#006aff', '丑': '#964607',
  '寅': '#43ab18', '卯': '#43ab18',
  '辰': '#964607', '巳': '#e40b06',
  '午': '#e40b06', '未': '#964607',
  '申': '#f4a600', '酉': '#f4a600',
  '戌': '#964607', '亥': '#006aff',
}

const pillars = [
  { key: 'nian' as const, label: '年柱', p: siZhu.nian },
  { key: 'yue' as const, label: '月柱', p: siZhu.yue },
  { key: 'ri' as const, label: '日柱', p: siZhu.ri },
  { key: 'shi' as const, label: '时柱', p: siZhu.shi },
]

const extraCols = [
  { label: '胎元', p: taiYuan },
  { label: '命宫', p: mingGong },
  { label: '身宫', p: shenGong },
]

function ganStyle(g: string) {
  return { color: ganColor[g] || '#333', fontWeight: 'bold' as const }
}
function zhiStyle(z: string) {
  return { color: zhiColor[z] || '#333', fontWeight: 'bold' as const }
}
</script>

<template>
  <div class="traditional-bazi">
    <!-- 基本信息 -->
    <div class="bazi-header">
      <span class="header-item">生肖：<strong>{{ shengXiao }}</strong></span>
      <span class="header-item">空亡：<strong>{{ kongWang }}</strong></span>
      <span class="header-item">日主旺衰：<strong>{{ wangXiang }}</strong></span>
    </div>

    <!-- 四柱主表 -->
    <table class="bazi-table">
      <thead>
        <tr>
          <th></th>
          <th v-for="col in pillars" :key="col.key">{{ col.label }}</th>
          <th v-for="col in extraCols" :key="col.label">{{ col.label }}</th>
        </tr>
      </thead>
      <tbody>
        <!-- 天干行 -->
        <tr>
          <td class="label">天干</td>
          <td v-for="col in pillars" :key="'gan-'+col.key">
            <span :style="ganStyle(col.p.gan)">{{ col.p.gan }}</span>
          </td>
          <td v-for="col in extraCols" :key="'gan-'+col.label">
            <span :style="ganStyle(col.p.gan)">{{ col.p.gan }}</span>
          </td>
        </tr>
        <!-- 十神行 -->
        <tr>
          <td class="label">十神</td>
          <td v-for="col in pillars" :key="'gs-'+col.key">{{ col.p.ganShiShen }}</td>
          <td v-for="col in extraCols" :key="'gs-'+col.label">{{ col.p.ganShiShen }}</td>
        </tr>
        <!-- 地支行 -->
        <tr>
          <td class="label">地支</td>
          <td v-for="col in pillars" :key="'zhi-'+col.key">
            <span :style="zhiStyle(col.p.zhi)">{{ col.p.zhi }}</span>
          </td>
          <td v-for="col in extraCols" :key="'zhi-'+col.label">
            <span :style="zhiStyle(col.p.zhi)">{{ col.p.zhi }}</span>
          </td>
        </tr>
        <!-- 藏干行 -->
        <tr>
          <td class="label">藏干</td>
          <td v-for="col in pillars" :key="'cg-'+col.key" class="canggan-cell">
            <span v-for="cg in col.p.cangGan" :key="cg.gan" class="canggan-item">
              <span :style="ganStyle(cg.gan)">{{ cg.gan }}</span>
              <sub>{{ cg.shiShen }}</sub>
            </span>
          </td>
          <td v-for="col in extraCols" :key="'cg-'+col.label">—</td>
        </tr>
        <!-- 纳音行 -->
        <tr>
          <td class="label">纳音</td>
          <td v-for="col in pillars" :key="'ny-'+col.key">{{ col.p.nayin }}</td>
          <td v-for="col in extraCols" :key="'ny-'+col.label">{{ col.p.nayin }}</td>
        </tr>
      </tbody>
    </table>

    <!-- 起运信息 -->
    <div class="qiyun-info">
      <p>起运：{{ qiYun.startYear }}年{{ qiYun.jiaoYunMonth }}月 {{ qiYun.startAge }}岁起运</p>
      <p>{{ qiYun.desc }}</p>
    </div>

    <!-- 大运表 -->
    <table class="dayun-table">
      <thead>
        <tr>
          <th>大运</th>
          <th v-for="(step, idx) in qiYun.daYun" :key="idx">
            {{ step.ganZhi }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="label">十神</td>
          <td v-for="(step, idx) in qiYun.daYun" :key="'ss-'+idx">
            {{ step.ganShiShen }}{{ step.zhiShiShen !== step.ganShiShen ? '/' + step.zhiShiShen : '' }}
          </td>
        </tr>
        <tr>
          <td class="label">年龄</td>
          <td v-for="(step, idx) in qiYun.daYun" :key="'age-'+idx">
            {{ step.startAge }}-{{ step.endAge }}
          </td>
        </tr>
        <tr>
          <td class="label">年份</td>
          <td v-for="(step, idx) in qiYun.daYun" :key="'yr-'+idx">
            {{ step.startYear }}-{{ step.endYear }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.traditional-bazi {
  font-family: "Microsoft YaHei", "SimSun", sans-serif;
  padding: 16px;
  max-width: 900px;
  margin: 0 auto;
}

.bazi-header {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #666;
}
.header-item strong {
  color: #333;
}

.bazi-table, .dayun-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
}
.bazi-table th, .bazi-table td,
.dayun-table th, .dayun-table td {
  border: 1px solid #e0d5c1;
  padding: 8px 12px;
  text-align: center;
  font-size: 14px;
}
.bazi-table thead th {
  background: #8b4513;
  color: #fff;
  font-weight: normal;
}
.bazi-table .label, .dayun-table .label {
  background: #f5f0e6;
  color: #8b4513;
  font-weight: bold;
  width: 60px;
}

.canggan-cell {
  padding: 4px 8px;
}
.canggan-item {
  display: inline-block;
  margin: 0 4px;
}
.canggan-item sub {
  font-size: 10px;
  color: #999;
}

.dayun-table thead th {
  background: #8b4513;
  color: #fff;
  font-weight: normal;
}

.qiyun-info {
  background: #f5f0e6;
  padding: 12px 16px;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 14px;
  line-height: 1.8;
}
.qiyun-info p {
  margin: 0;
}
</style>
