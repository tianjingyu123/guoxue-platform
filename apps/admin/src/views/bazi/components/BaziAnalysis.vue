<script setup lang="ts">
/**
 * 八字分析模式展示
 * 整合问真八字的格局、用神、旺衰、五行、合冲刑害、神煞等分析
 */
import type { BaziResult } from '@guoxue/bazi-engine'

const props = defineProps<{
  result: BaziResult
}>()

const { siZhu, qiYun, fenXiTiShi, shenSha, geJu, wuXingEnergy, wangXiang, kongWang } = props.result

const wuXingNames: Record<string, string> = { mu: '木', huo: '火', tu: '土', jin: '金', shui: '水' }

const jiShen = shenSha.filter((s: { type: string }) => s.type === 'ji')
const xiongShen = shenSha.filter((s: { type: string }) => s.type === 'xiong')
</script>

<template>
  <div class="analysis-bazi">
    <!-- 格局分析 -->
    <section
      v-if="geJu"
      class="analysis-section"
    >
      <h3>格局分析</h3>
      <div class="geju-card">
        <div class="geju-name">
          <span
            class="tag"
            :class="geJu.type"
          >{{ geJu.type === 'zheng' ? '正格' : '变格' }}</span>
          <strong>{{ geJu.name }}</strong>
        </div>
        <p class="geju-desc">
          {{ geJu.desc }}
        </p>
      </div>
    </section>

    <!-- 用神喜忌 -->
    <section
      v-if="geJu"
      class="analysis-section"
    >
      <h3>用神 · 喜忌</h3>
      <div class="yongshen-row">
        <div class="yongshen-item use">
          <span class="label">用神</span>
          <span class="value">{{ geJu.yongShen }}</span>
        </div>
        <div class="yongshen-item like">
          <span class="label">喜神</span>
          <span class="value">{{ geJu.xiShen }}</span>
        </div>
        <div class="yongshen-item dislike">
          <span class="label">忌神</span>
          <span class="value">{{ geJu.jiShen }}</span>
        </div>
      </div>
    </section>

    <!-- 旺衰 + 五行能量 -->
    <section class="analysis-section">
      <h3>旺衰 · 五行</h3>
      <div class="wangxiang-row">
        <div class="wx-card">
          <span class="label">日主旺衰</span>
          <span class="value wx-status">{{ wangXiang }}</span>
        </div>
        <div class="wx-card">
          <span class="label">空亡</span>
          <span class="value">{{ kongWang }}</span>
        </div>
      </div>
      <!-- 五行柱状图 -->
      <div
        v-if="wuXingEnergy"
        class="wuxing-bars"
      >
        <div
          v-for="k in (['mu','huo','tu','jin','shui'] as const)"
          :key="k"
          class="wx-bar"
        >
          <div class="bar-label">
            {{ wuXingNames[k] }}
          </div>
          <div class="bar-track">
            <div
              class="bar-fill"
              :style="{ width: Math.max(wuXingEnergy[k] / 50 * 100, 2) + '%' }"
            />
          </div>
          <div class="bar-val">
            {{ wuXingEnergy[k] }}
          </div>
        </div>
        <p class="wx-desc">
          {{ wuXingEnergy?.desc }}
        </p>
      </div>
    </section>

    <!-- 合冲刑害 -->
    <section
      v-if="Object.values(fenXiTiShi).some((v: any) => v.length)"
      class="analysis-section"
    >
      <h3>合冲刑害</h3>
      <div class="relation-tags">
        <template v-if="fenXiTiShi.ganHe.length">
          <span
            v-for="h in fenXiTiShi.ganHe"
            :key="h"
            class="tag ganhe"
          >{{ h }}</span>
        </template>
        <template v-if="fenXiTiShi.liuHe.length">
          <span
            v-for="h in fenXiTiShi.liuHe"
            :key="h"
            class="tag liuhe"
          >{{ h }}</span>
        </template>
        <template v-if="fenXiTiShi.sanHe.length">
          <span
            v-for="h in fenXiTiShi.sanHe"
            :key="h"
            class="tag sanhe"
          >{{ h }}</span>
        </template>
        <template v-if="fenXiTiShi.sanHui.length">
          <span
            v-for="h in fenXiTiShi.sanHui"
            :key="h"
            class="tag sanhui"
          >{{ h }}</span>
        </template>
        <template v-if="fenXiTiShi.liuChong.length">
          <span
            v-for="h in fenXiTiShi.liuChong"
            :key="h"
            class="tag chong"
          >{{ h }}</span>
        </template>
        <template v-if="fenXiTiShi.liuHai.length">
          <span
            v-for="h in fenXiTiShi.liuHai"
            :key="h"
            class="tag hai"
          >{{ h }}</span>
        </template>
        <template v-if="fenXiTiShi.sanXing.length">
          <span
            v-for="h in fenXiTiShi.sanXing"
            :key="h"
            class="tag xing"
          >{{ h }}</span>
        </template>
        <template v-if="fenXiTiShi.ziXing.length">
          <span
            v-for="h in fenXiTiShi.ziXing"
            :key="h"
            class="tag xing"
          >{{ h }}</span>
        </template>
      </div>
    </section>

    <!-- 神煞 -->
    <section
      v-if="shenSha.length"
      class="analysis-section"
    >
      <h3>神煞</h3>
      <div class="shensha-grid">
        <div
          v-if="jiShen.length"
          class="shensha-col good"
        >
          <h4 class="ji">
            吉神 ({{ jiShen.length }})
          </h4>
          <ul>
            <li
              v-for="s in jiShen"
              :key="'ji-'+s.name"
            >
              <strong>{{ s.name }}</strong>
              <span class="pillar-tag">{{ s.pillar }}</span>
              <p class="desc">
                {{ s.desc }}
              </p>
            </li>
          </ul>
        </div>
        <div
          v-if="xiongShen.length"
          class="shensha-col bad"
        >
          <h4 class="xiong">
            凶煞 ({{ xiongShen.length }})
          </h4>
          <ul>
            <li
              v-for="s in xiongShen"
              :key="'xiong-'+s.name"
            >
              <strong>{{ s.name }}</strong>
              <span class="pillar-tag">{{ s.pillar }}</span>
              <p class="desc">
                {{ s.desc }}
              </p>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.analysis-bazi {
  padding: 16px;
  max-width: 800px;
  margin: 0 auto;
  font-family: "Microsoft YaHei", sans-serif;
}

.analysis-section {
  margin-bottom: 24px;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,.08);
}
.analysis-section h3 {
  margin: 0 0 12px;
  font-size: 16px;
  color: #8b4513;
  border-bottom: 2px solid #f0e6d3;
  padding-bottom: 8px;
}

/* 格局 */
.geju-card { text-align: center; padding: 12px; }
.geju-name { font-size: 20px; margin-bottom: 8px; }
.geju-name strong { margin-left: 8px; }
.geju-desc { color: var(--color-text-body); font-size: 14px; }
.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  vertical-align: middle;
}
.tag.zheng { background: #e8f5e9; color: #2e7d32; }
.tag.bian { background: #fff3e0; color: #e65100; }

/* 用神 */
.yongshen-row {
  display: flex;
  gap: 12px;
}
.yongshen-item {
  flex: 1;
  text-align: center;
  padding: 12px;
  border-radius: 8px;
}
.yongshen-item.use { background: #e8f5e9; }
.yongshen-item.like { background: #fff8e1; }
.yongshen-item.dislike { background: #ffebee; }
.yongshen-item .label { display: block; font-size: 12px; color: #888; }
.yongshen-item .value { display: block; font-size: 18px; font-weight: bold; margin-top: 4px; }

/* 旺衰 */
.wangxiang-row { display: flex; gap: 12px; margin-bottom: 16px; }
.wx-card { flex: 1; text-align: center; padding: 12px; background: #f5f0e6; border-radius: 8px; }
.wx-card .label { display: block; font-size: 12px; color: #888; }
.wx-card .value { display: block; font-size: 18px; font-weight: bold; margin-top: 4px; }

/* 五行能量条 */
.wuxing-bars { padding: 8px 0; }
.wx-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.bar-label { width: 24px; font-size: 14px; color: var(--color-text-body); }
.bar-track {
  flex: 1;
  height: 16px;
  background: #f0e6d3;
  border-radius: 8px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #c4943a, #8b4513);
  border-radius: 8px;
  transition: width .3s;
}
.bar-val { width: 24px; font-size: 12px; color: var(--color-text-secondary); text-align: right; }
.wx-desc { font-size: 12px; color: var(--color-text-secondary); margin-top: 8px; }

/* 合冲刑害标签 */
.relation-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.relation-tags .tag {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 13px;
}
.tag.ganhe { background: #e3f2fd; color: #1565c0; }
.tag.liuhe { background: #e8f5e9; color: #2e7d32; }
.tag.sanhe { background: #f3e5f5; color: #6a1b9a; }
.tag.sanhui { background: #fce4ec; color: #880e4f; }
.tag.chong { background: #ffebee; color: #c62828; }
.tag.hai { background: #fff3e0; color: #e65100; }
.tag.xing { background: #fbe9e7; color: #bf360c; }

/* 神煞 */
.shensha-grid { display: flex; gap: 16px; }
.shensha-col { flex: 1; }
.shensha-col h4 { margin: 0 0 8px; font-size: 14px; }
.shensha-col h4.ji { color: #2e7d32; }
.shensha-col h4.xiong { color: #c62828; }
.shensha-col ul { list-style: none; padding: 0; margin: 0; }
.shensha-col li {
  padding: 8px;
  margin-bottom: 6px;
  border-radius: 6px;
  background: var(--color-bg-page);
}
.shensha-col li strong { font-size: 14px; }
.pillar-tag {
  display: inline-block;
  margin-left: 8px;
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 11px;
  background: #e0e0e0;
  color: var(--color-text-body);
}
.shensha-col .desc { margin: 4px 0 0; font-size: 12px; color: var(--color-text-secondary); }
</style>
