<script setup lang="ts">
/**
 * 八字传统模式展示
 * 使用 SiZhuDisplay + DaYunTimeline + ShenShaList 业务组件
 * 布局对标热卜
 */
import type { BaziResult } from '@guoxue/shared'
import { UI_COLORS, FONT_SIZE, JIXIONG } from '@guoxue/shared'
import { SiZhuDisplay, DaYunTimeline, ShenShaList } from '@/components/paipan'

const props = defineProps<{
  result: BaziResult
}>()

const { siZhu, qiYun, kongWang, shengXiao, taiYuan, mingGong, shenGong, wangXiang, fenXiTiShi, shenSha, geJu, ziZuo, taiYangShi, daylightSaving, liuShiList } = props.result
</script>

<template>
  <div class="traditional-bazi">
    <!-- 基本信息条 -->
    <div class="info-bar">
      <span class="info-item">生肖：<strong>{{ shengXiao }}</strong></span>
      <span class="info-item">空亡：<strong>{{ kongWang }}</strong></span>
      <span class="info-item">旺衰：<strong>{{ wangXiang }}</strong></span>
      <span class="info-item">胎元：<strong>{{ taiYuan.gan }}{{ taiYuan.zhi }}</strong></span>
      <span class="info-item">命宫：<strong>{{ mingGong.gan }}{{ mingGong.zhi }}</strong></span>
      <span class="info-item">身宫：<strong>{{ shenGong.gan }}{{ shenGong.zhi }}</strong></span>
    </div>

    <!-- 时间校正信息（真太阳时/夏令时） -->
    <div
      v-if="taiYangShi || daylightSaving"
      class="time-correction-bar"
    >
      <span
        v-if="taiYangShi"
        class="correction-item"
      >
        🌞 真太阳时校正：{{ taiYangShi.desc }}
      </span>
      <span
        v-if="daylightSaving && daylightSaving.adjusted"
        class="correction-item"
      >
        ⏰ 夏令时校正：{{ daylightSaving.desc }}
      </span>
    </div>

    <!-- 四柱主表 -->
    <SiZhuDisplay
      :si-zhu="siZhu"
      :show-shi-shen="true"
      :show-cang-gan="true"
      :show-nayin="true"
      :show-di-shi="true"
    />

    <!-- 自坐 -->
    <div
      v-if="ziZuo"
      class="zizuo-card"
    >
      <span class="zizuo-label">自坐：</span>
      <span class="zizuo-value">{{ ziZuo.riGan }}坐{{ ziZuo.riZhi }}（{{ ziZuo.shiShen }}）</span>
      <span class="zizuo-desc">{{ ziZuo.desc }}</span>
    </div>

    <!-- 格局（如果有） -->
    <div
      v-if="geJu"
      class="geju-card"
    >
      <div class="geju-header">
        <span class="geju-name">{{ geJu.name }}</span>
        <span :class="['geju-badge', geJu.type === 'zheng' ? 'badge-zheng' : 'badge-bian']">
          {{ geJu.type === 'zheng' ? '正格' : '变格' }}
        </span>
      </div>
      <p class="geju-desc">
        {{ geJu.desc }}
      </p>
      <div class="yongji-row">
        <span class="yongji-tag tag-yong">用神：{{ geJu.yongShen }}</span>
        <span
          v-if="geJu.xiShen"
          class="yongji-tag tag-xi"
        >喜神：{{ geJu.xiShen }}</span>
        <span
          v-if="geJu.jiShen"
          class="yongji-tag tag-ji"
        >忌神：{{ geJu.jiShen }}</span>
      </div>
    </div>

    <!-- 神煞 -->
    <div
      v-if="shenSha?.length"
      class="section"
    >
      <h3 class="section-title">
        神煞
      </h3>
      <ShenShaList
        :shen-sha="shenSha"
        mode="compact"
        :max-visible="12"
      />
    </div>

    <!-- 大运时间轴 -->
    <div class="section">
      <h3 class="section-title">
        大运
      </h3>
      <DaYunTimeline
        :da-yun="qiYun.daYun"
        :start-age="qiYun.startAge"
        :current-age="undefined"
      />
    </div>

    <!-- 合冲刑害 -->
    <div
      v-if="fenXiTiShi"
      class="section"
    >
      <h3 class="section-title">
        合冲刑害
      </h3>
      <div class="fenxi-grid">
        <template v-if="fenXiTiShi.ganHe?.length">
          <span class="fx-label">天干合</span>
          <div class="fx-tags">
            <span
              v-for="h in fenXiTiShi.ganHe"
              :key="h"
              class="fx-tag tag-he"
            >{{ h }}</span>
          </div>
        </template>
        <template v-if="fenXiTiShi.liuHe?.length">
          <span class="fx-label">地支合</span>
          <div class="fx-tags">
            <span
              v-for="h in fenXiTiShi.liuHe"
              :key="h"
              class="fx-tag tag-he"
            >{{ h }}</span>
          </div>
        </template>
        <template v-if="fenXiTiShi.sanHe?.length">
          <span class="fx-label">三合</span>
          <div class="fx-tags">
            <span
              v-for="h in fenXiTiShi.sanHe"
              :key="h"
              class="fx-tag tag-sanhe"
            >{{ h }}</span>
          </div>
        </template>
        <template v-if="fenXiTiShi.sanHui?.length">
          <span class="fx-label">三会</span>
          <div class="fx-tags">
            <span
              v-for="h in fenXiTiShi.sanHui"
              :key="h"
              class="fx-tag tag-sanhui"
            >{{ h }}</span>
          </div>
        </template>
        <template v-if="fenXiTiShi.liuChong?.length">
          <span class="fx-label">六冲</span>
          <div class="fx-tags">
            <span
              v-for="h in fenXiTiShi.liuChong"
              :key="h"
              class="fx-tag tag-chong"
            >{{ h }}</span>
          </div>
        </template>
        <template v-if="fenXiTiShi.liuHai?.length">
          <span class="fx-label">六害</span>
          <div class="fx-tags">
            <span
              v-for="h in fenXiTiShi.liuHai"
              :key="h"
              class="fx-tag tag-hai"
            >{{ h }}</span>
          </div>
        </template>
        <template v-if="fenXiTiShi.sanXing?.length">
          <span class="fx-label">三刑</span>
          <div class="fx-tags">
            <span
              v-for="h in fenXiTiShi.sanXing"
              :key="h"
              class="fx-tag tag-xing"
            >{{ h }}</span>
          </div>
        </template>
        <template v-if="fenXiTiShi.anHe?.length">
          <span class="fx-label">暗合</span>
          <div class="fx-tags">
            <span
              v-for="h in fenXiTiShi.anHe"
              :key="h"
              class="fx-tag tag-anhe"
            >{{ h }}</span>
          </div>
        </template>
        <template v-if="fenXiTiShi.xiangPo?.length">
          <span class="fx-label">相破</span>
          <div class="fx-tags">
            <span
              v-for="h in fenXiTiShi.xiangPo"
              :key="h"
              class="fx-tag tag-po"
            >{{ h }}</span>
          </div>
        </template>
        <template v-if="fenXiTiShi.anJue?.length">
          <span class="fx-label">暗绝</span>
          <div class="fx-tags">
            <span
              v-for="h in fenXiTiShi.anJue"
              :key="h"
              class="fx-tag tag-jue"
            >{{ h }}</span>
          </div>
        </template>
      </div>
    </div>

    <!-- 流时列表 -->
    <div
      v-if="liuShiList?.length"
      class="section"
    >
      <h3 class="section-title">
        流时（十二时辰）
      </h3>
      <div class="liushi-grid">
        <div
          v-for="ls in liuShiList"
          :key="ls.hour"
          class="liushi-cell"
        >
          <span class="ls-hour">{{ String(ls.hour).padStart(2, '0') }}:00</span>
          <span class="ls-ganzhi">{{ ls.ganZhi }}</span>
          <span class="ls-shishen">{{ ls.ganShiShen }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.traditional-bazi {
  padding: 24px;
  max-width: 960px;
  margin: 0 auto;
}

/* 基本信息条 */
.info-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 10px 16px;
  background: v-bind('UI_COLORS.headerBg');
  border-radius: 8px;
  border: 1px solid v-bind('UI_COLORS.border');
  margin-bottom: 16px;
  font-size: v-bind('FONT_SIZE.sm');
}
.info-item {
  color: v-bind('UI_COLORS.textSecondary');
}
.info-item strong {
  color: v-bind('UI_COLORS.textPrimary');
  font-weight: 600;
}

/* 通用分区 */
.section {
  margin-top: 20px;
  background: v-bind('UI_COLORS.cardBg');
  border: 1px solid v-bind('UI_COLORS.border');
  border-radius: 8px;
  padding: 16px;
}
.section-title {
  font-size: v-bind('FONT_SIZE.base');
  font-weight: 600;
  color: v-bind('UI_COLORS.brand');
  margin: 0 0 12px;
  padding-left: 8px;
  border-left: 3px solid v-bind('UI_COLORS.brand');
}

/* 格局 */
.geju-card {
  margin-top: 16px;
  padding: 16px;
  background: v-bind('UI_COLORS.cardBg');
  border: 1px solid v-bind('UI_COLORS.border');
  border-radius: 8px;
}
.geju-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.geju-name {
  font-size: v-bind('FONT_SIZE.xl');
  font-weight: 700;
  color: v-bind('UI_COLORS.brand');
}
.geju-badge {
  font-size: v-bind('FONT_SIZE.xs');
  padding: 2px 10px;
  border-radius: 10px;
}
.badge-zheng {
  background: #e8f5e9;
  color: v-bind('JIXIONG.ji');
}
.badge-bian {
  background: #fff3e0;
  color: #e65100;
}
.geju-desc {
  font-size: v-bind('FONT_SIZE.sm');
  color: v-bind('UI_COLORS.textSecondary');
  line-height: 1.7;
  margin: 0 0 10px;
}
.yongji-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.yongji-tag {
  padding: 4px 14px;
  border-radius: 20px;
  font-size: v-bind('FONT_SIZE.xs');
}
.tag-yong { background: #e3f2fd; color: #1565c0; }
.tag-xi { background: #e8f5e9; color: #2e7d32; }
.tag-ji { background: #fce4ec; color: #c62828; }

/* 合冲刑害 */
.fenxi-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 12px;
  align-items: center;
}
.fx-label {
  font-size: v-bind('FONT_SIZE.xs');
  color: v-bind('UI_COLORS.textHint');
}
.fx-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.fx-tag {
  font-size: v-bind('FONT_SIZE.xs');
  padding: 2px 10px;
  border-radius: 10px;
}
.tag-he { background: #e8f5e9; color: #2e7d32; }
.tag-sanhe { background: #e3f2fd; color: #1565c0; }
.tag-sanhui { background: #f3e5f5; color: #7b1fa2; }
.tag-chong { background: #fce4ec; color: #c62828; }
.tag-hai { background: #fff3e0; color: #e65100; }
.tag-xing { background: #fbe9e7; color: #bf360c; }
.tag-anhe { background: #fce4ec; color: #880e4f; }
.tag-po { background: #ede7f6; color: #4527a0; }
.tag-jue { background: #eceff1; color: #37474f; }

/* 时间校正信息 */
.time-correction-bar {
  display: flex; gap: 16px; padding: 8px 16px;
  margin: 12px 0; background: #fff8e1; border-radius: 8px;
  font-size: 12px; color: #f57f17; flex-wrap: wrap;
}
.correction-item { white-space: nowrap; }

/* 自坐 */
.zizuo-card {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; margin: 12px 0;
  background: #f3e5f5; border-radius: 10px; font-size: 13px;
}
.zizuo-label { color: #7b1fa2; font-weight: 600; }
.zizuo-value { color: #4a148c; font-weight: 500; }
.zizuo-desc { color: #6a1b9a; }

/* 流时列表 */
.liushi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 6px;
}
.liushi-cell {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px; background: #f5f5f5;
  border-radius: 8px; font-size: 12px;
}
.ls-hour { color: #999; }
.ls-ganzhi { color: #2c2c2c; font-weight: 600; }
.ls-shishen { color: v-bind('UI_COLORS.brand'); }
</style>
