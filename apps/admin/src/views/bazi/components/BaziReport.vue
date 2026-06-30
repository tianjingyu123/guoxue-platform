<script setup lang="ts">
/**
 * 八字报告模式展示
 * 纵向排版，适合打印/阅读
 */
import type { BaziResult } from '@guoxue/bazi-engine'

const props = defineProps<{
  result: BaziResult
}>()

const { input, siZhu, qiYun, kongWang, shengXiao, wangXiang, taiYuan, mingGong, shenGong, fenXiTiShi } = props.result

const ganColor: Record<string, string> = {
  '甲': '#43ab18', '乙': '#43ab18',
  '丙': '#e40b06', '丁': '#e40b06',
  '戊': '#964607', '己': '#964607',
  '庚': '#f4a600', '辛': '#f4a600',
  '壬': '#006aff', '癸': '#006aff',
}

function pad(n: number) { return n < 10 ? '0' + n : '' + n }
const birthStr = `${input.year}/${pad(input.month)}/${pad(input.day)} ${pad(input.hour)}:${pad(input.minute)}`

const pillars = [
  { label: '年柱', p: siZhu.nian },
  { label: '月柱', p: siZhu.yue },
  { label: '日柱', p: siZhu.ri },
  { label: '时柱', p: siZhu.shi },
]
</script>

<template>
  <div class="report-bazi">
    <h2 class="report-title">
      八字命理报告
    </h2>

    <!-- 基本信息 -->
    <div class="report-section info">
      <p><strong>姓名：</strong>{{ input.name || '—' }}</p>
      <p><strong>性别：</strong>{{ input.gender }}</p>
      <p><strong>出生：</strong>{{ birthStr }}</p>
      <p><strong>生肖：</strong>{{ shengXiao }}</p>
      <p><strong>空亡：</strong>{{ kongWang }}</p>
      <p><strong>日主旺衰：</strong>{{ wangXiang }}</p>
    </div>

    <!-- 四柱详情 -->
    <div
      v-for="p in pillars"
      :key="p.label"
      class="report-section"
    >
      <h3>{{ p.label }}</h3>
      <div class="pillar-detail">
        <div class="pillar-main">
          <span
            class="gan"
            :style="{ color: ganColor[p.p.gan] }"
          >{{ p.p.gan }}</span>
          <span class="zhi">{{ p.p.zhi }}</span>
        </div>
        <div class="pillar-info">
          <span>天干十神：<strong>{{ p.p.ganShiShen }}</strong></span>
          <span>地支十神：<strong>{{ p.p.zhiShiShen }}</strong></span>
          <span>纳音：<strong>{{ p.p.nayin }}</strong></span>
          <span v-if="p.p.cangGan.length">
            藏干：
            <span
              v-for="cg in p.p.cangGan"
              :key="cg.gan"
              class="canggan"
            >
              <span :style="{ color: ganColor[cg.gan] }">{{ cg.gan }}</span>({{ cg.shiShen }})
            </span>
          </span>
        </div>
      </div>
    </div>

    <!-- 胎元命宫身宫 -->
    <div class="report-section">
      <h3>胎元 · 命宫 · 身宫</h3>
      <p>胎元：<strong>{{ taiYuan.gan }}{{ taiYuan.zhi }}</strong> {{ taiYuan.nayin }}</p>
      <p>命宫：<strong>{{ mingGong.gan }}{{ mingGong.zhi }}</strong> {{ mingGong.nayin }}</p>
      <p>身宫：<strong>{{ shenGong.gan }}{{ shenGong.zhi }}</strong> {{ shenGong.nayin }}</p>
    </div>

    <!-- 起运 -->
    <div class="report-section">
      <h3>起运信息</h3>
      <p>{{ qiYun.desc }}</p>
      <p>于 <strong>{{ qiYun.startYear }}年{{ qiYun.jiaoYunMonth }}月</strong>（{{ qiYun.startAge }}周岁）起运</p>
    </div>

    <!-- 大运 -->
    <div class="report-section">
      <h3>大运流年</h3>
      <div class="dayun-list">
        <div
          v-for="(step, idx) in qiYun.daYun"
          :key="idx"
          class="dayun-row"
        >
          <div class="dayun-header">
            <span class="dayun-step">第{{ idx + 1 }}步</span>
            <span class="dayun-ganzhi">{{ step.ganZhi }}</span>
            <span class="dayun-shishen">{{ step.ganShiShen }}{{ step.zhiShiShen !== step.ganShiShen ? '/' + step.zhiShiShen : '' }}</span>
            <span class="dayun-age">{{ step.startAge }}-{{ step.endAge }}岁</span>
          </div>
          <div
            v-if="step.liuNian.length"
            class="liunian-row"
          >
            <span
              v-for="ln in step.liuNian.slice(0, 10)"
              :key="ln.year"
              class="liunian-year"
            >
              {{ ln.year }}<small>{{ ln.ganZhi }}</small>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 合冲刑害 -->
    <div
      v-if="Object.values(fenXiTiShi).some((v: string[]) => v.length)"
      class="report-section"
    >
      <h3>合冲刑害</h3>
      <div class="relation-list">
        <p v-if="fenXiTiShi.ganHe.length">
          天干五合：{{ fenXiTiShi.ganHe.join('、') }}
        </p>
        <p v-if="fenXiTiShi.liuHe.length">
          地支六合：{{ fenXiTiShi.liuHe.join('、') }}
        </p>
        <p v-if="fenXiTiShi.sanHe.length">
          三合局：{{ fenXiTiShi.sanHe.join('、') }}
        </p>
        <p v-if="fenXiTiShi.sanHui.length">
          三会局：{{ fenXiTiShi.sanHui.join('、') }}
        </p>
        <p v-if="fenXiTiShi.liuChong.length">
          六冲：{{ fenXiTiShi.liuChong.join('、') }}
        </p>
        <p v-if="fenXiTiShi.liuHai.length">
          六害：{{ fenXiTiShi.liuHai.join('、') }}
        </p>
        <p v-if="fenXiTiShi.sanXing.length">
          三刑：{{ fenXiTiShi.sanXing.join('、') }}
        </p>
        <p v-if="fenXiTiShi.ziXing.length">
          自刑：{{ fenXiTiShi.ziXing.join('、') }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.report-bazi {
  font-family: "SimSun", "Microsoft YaHei", serif;
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
  line-height: 2;
  color: var(--color-text-title);
}

.report-title {
  text-align: center;
  font-size: 22px;
  margin-bottom: 24px;
  color: #8b4513;
}

.report-section {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px dashed var(--color-border);
}
.report-section h3 {
  font-size: 16px;
  color: #8b4513;
  margin: 0 0 8px;
}

.report-section p { margin: 4px 0; }

.pillar-detail {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}
.pillar-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 48px;
}
.pillar-main .gan { font-size: 28px; font-weight: bold; }
.pillar-main .zhi { font-size: 18px; color: var(--color-text-body); margin-top: 4px; }
.pillar-info { display: flex; flex-direction: column; gap: 4px; font-size: 14px; }
.canggan { margin: 0 4px; }

.dayun-list { display: flex; flex-direction: column; gap: 8px; }
.dayun-row { padding: 8px; background: var(--color-bg-page); border-radius: 6px; }
.dayun-header { display: flex; gap: 12px; align-items: center; }
.dayun-step { color: var(--color-text-secondary); font-size: 12px; }
.dayun-ganzhi { font-size: 16px; font-weight: bold; }
.dayun-shishen { color: #8b4513; font-size: 13px; }
.dayun-age { color: var(--color-text-body); font-size: 13px; margin-left: auto; }
.liunian-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.liunian-year {
  display: inline-block;
  padding: 2px 8px;
  background: #fff;
  border-radius: 4px;
  font-size: 12px;
}
.liunian-year small { color: var(--color-text-secondary); margin-left: 2px; }

.relation-list p { font-size: 14px; }
</style>
