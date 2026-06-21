<template>
  <view class="pd-page">
    <!-- 顶部导航 -->
    <view
      class="pd-header"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view class="pd-header-row">
        <view
          class="pd-icon-btn"
          @tap="goBack"
        >
          <app-icon
            name="arrow-left"
            :size="40"
            color="var(--poem-text)"
          />
        </view>
        <text class="pd-header-title">
          诗词详情
        </text>
        <view
          class="pd-icon-btn"
          @tap="showSharePanel = true"
        >
          <app-icon
            name="share-2"
            :size="40"
            color="var(--poem-text)"
          />
        </view>
      </view>
    </view>

    <view class="pd-main">
      <!-- 诗题与作者 -->
      <view class="pd-titlesec">
        <text class="pd-poem-title">
          {{ poem.title }}
        </text>
        <text class="pd-poem-meta">
          〔{{ poem.dynasty }}〕{{ poem.author }} · {{ poem.form }}
        </text>
        <view class="pd-poem-tags">
          <text
            v-for="tag in poem.tags"
            :key="tag"
            class="pd-tag"
          >
            {{ tag }}
          </text>
        </view>
      </view>

      <!-- Tab 导航 -->
      <view class="pd-tabs">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="pd-tab"
          @tap="activeTab = tab.key"
        >
          <view class="pd-tab-inner">
            <text
              class="pd-tab-label"
              :style="{ color: activeTab === tab.key ? 'var(--poem-gold)' : 'var(--poem-text-soft)' }"
            >
              {{ tab.label }}
            </text>
            <text
              v-if="tab.key === 'appreciation'"
              class="pd-tab-ai"
              @tap.stop="showAiPanel = true"
            >
              AI
            </text>
          </view>
          <view
            v-if="activeTab === tab.key"
            class="pd-tab-indicator"
          />
        </view>
      </view>

      <!-- Tab 内容区 -->
      <view class="pd-tabcontent">
        <!-- 原文 -->
        <view
          v-if="activeTab === 'poem'"
          class="pd-poem-body"
        >
          <view class="pd-pinyin-toggle">
            <view
              class="pd-pinyin-btn"
              :class="{ 'pd-pinyin-on': showPinyin }"
              @tap="showPinyin = !showPinyin"
            >
              <text
                class="pd-pinyin-text"
                :style="{ color: showPinyin ? 'var(--poem-gold)' : 'var(--poem-text-soft)' }"
              >
                拼音
              </text>
            </view>
          </view>

          <!-- 竖排诗文（从右到左） -->
          <view class="pd-verse-wrap">
            <view class="pd-verse-row">
              <view
                v-for="(item, i) in reversedContent"
                :key="i"
                class="pd-verse-col"
              >
                <text
                  v-if="showPinyin"
                  class="pd-verse-pinyin"
                >
                  {{ item.pinyin }}
                </text>
                <text class="pd-verse-line">
                  {{ item.line }}
                </text>
              </view>
            </view>
          </view>

          <!-- 装饰分隔线 -->
          <view class="pd-divider">
            <view class="pd-divider-line" />
            <text class="pd-divider-star">
              ✦
            </text>
            <view class="pd-divider-line" />
          </view>

          <!-- 互动统计 -->
          <view class="pd-stats">
            <view
              class="pd-stat"
              @tap="isLiked = !isLiked"
            >
              <view
                class="pd-stat-icon"
                :style="{ background: isLiked ? 'rgba(192,67,58,0.2)' : 'var(--poem-gold-soft)' }"
              >
                <app-icon
                  name="heart"
                  :size="34"
                  :color="isLiked ? '#c0433a' : '#e8c07a'"
                  :fill="isLiked"
                />
              </view>
              <text class="pd-stat-text">
                {{ (poem.likes / 1000).toFixed(1) }}k
              </text>
            </view>
            <view
              class="pd-stat"
              @tap="isBookmarked = !isBookmarked"
            >
              <view
                class="pd-stat-icon"
                style="background: var(--poem-gold-soft)"
              >
                <app-icon
                  :name="isBookmarked ? 'bookmark-check' : 'bookmark'"
                  :size="34"
                  color="#e8c07a"
                />
              </view>
              <text class="pd-stat-text">
                {{ (poem.collections / 1000).toFixed(1) }}k
              </text>
            </view>
            <view
              class="pd-stat"
              @tap="handleCopy"
            >
              <view
                class="pd-stat-icon"
                style="background: var(--poem-gold-soft)"
              >
                <app-icon
                  :name="copied ? 'check' : 'copy'"
                  :size="34"
                  color="#e8c07a"
                />
              </view>
              <text class="pd-stat-text">
                {{ copied ? '已复制' : '复制' }}
              </text>
            </view>
          </view>
        </view>

        <!-- 赏析 -->
        <view
          v-else-if="activeTab === 'appreciation'"
          class="pd-appreciation"
        >
          <view
            class="pd-ai-entry"
            @tap="showAiPanel = true"
          >
            <app-icon
              name="sparkles"
              :size="28"
              color="#9b7ec8"
            />
            <view class="pd-ai-entry-body">
              <view class="pd-ai-entry-titlerow">
                <text class="pd-ai-entry-title">
                  AI 深度赏析
                </text>
                <text class="pd-ai-entry-badge">
                  AI 生成
                </text>
              </view>
              <text class="pd-ai-entry-sub">
                创作背景 · 意象分析 · 情感解读
              </text>
            </view>
            <app-icon
              name="chevron-right"
              :size="28"
              color="#9b7ec8"
            />
          </view>

          <view class="pd-appr-card">
            <text class="pd-appr-label">
              人工赏析
            </text>
            <text class="pd-appr-text">
              {{ poem.appreciation }}
            </text>
          </view>
        </view>

        <!-- 译文 -->
        <view
          v-else-if="activeTab === 'translation'"
          class="pd-trans-card"
        >
          <view
            v-for="(item, i) in poem.content"
            :key="i"
            class="pd-trans-row"
          >
            <text class="pd-trans-orig">
              {{ item.line }}
            </text>
            <view class="pd-trans-divider" />
            <text class="pd-trans-text">
              {{ translations[i] }}
            </text>
          </view>
        </view>

        <!-- 注释 -->
        <view
          v-else-if="activeTab === 'notes'"
          class="pd-notes"
        >
          <view
            v-for="(note, i) in poem.notes"
            :key="i"
            class="pd-note"
          >
            <text class="pd-note-word">
              {{ note.word }}
            </text>
            <view class="pd-note-divider" />
            <text class="pd-note-text">
              {{ note.note }}
            </text>
          </view>
        </view>
      </view>

      <!-- 作者简介 -->
      <view
        class="pd-author-sec"
        @tap="toPoet(poem.authorId)"
      >
        <view class="pd-author-avatar">
          <text class="pd-author-avatar-text">
            {{ poem.authorInfo.name.charAt(0) }}
          </text>
        </view>
        <view class="pd-author-body">
          <view class="pd-author-head">
            <text class="pd-author-name">
              {{ poem.authorInfo.name }}
            </text>
            <text class="pd-author-title">
              {{ poem.authorInfo.title }}
            </text>
          </view>
          <text class="pd-author-meta">
            {{ poem.authorInfo.dynasty }} · {{ poem.authorInfo.years }} · {{ poem.authorInfo.poemCount }} 首
          </text>
          <text class="pd-author-intro">
            {{ poem.authorInfo.intro }}
          </text>
        </view>
        <app-icon
          name="chevron-right"
          :size="34"
          color="var(--poem-text-muted)"
        />
      </view>

      <!-- 诗词品评 -->
      <view class="pd-disc-sec">
        <view class="pd-disc-head">
          <text class="pd-disc-title">
            诗词品评
          </text>
          <text class="pd-disc-meta">
            {{ commentCount }} 条
          </text>
        </view>
        <view
          class="pd-disc-card"
          @tap="showComments = true"
        >
          <view class="pd-disc-preview">
            <view class="pd-disc-avatar">
              {{ firstComment.author.name.charAt(0) }}
            </view>
            <view class="pd-disc-body">
              <text class="pd-disc-name">
                {{ firstComment.author.name }}
              </text>
              <text class="pd-disc-content">
                {{ firstComment.content }}
              </text>
              <view class="pd-disc-like">
                <app-icon
                  name="heart"
                  :size="26"
                  color="rgba(245,234,216,0.3)"
                />
                <text class="pd-disc-like-text">
                  {{ firstComment.likeCount }}
                </text>
              </view>
            </view>
          </view>
          <view class="pd-disc-all">
            <app-icon
              name="message-circle"
              :size="28"
              color="#e8c07a"
            />
            <text class="pd-disc-all-text">
              查看全部 {{ commentCount }} 条品评
            </text>
          </view>
        </view>
      </view>

      <!-- 相关诗词 -->
      <view class="pd-related-sec">
        <view class="pd-related-head">
          <text class="pd-related-title">
            相关诗词
          </text>
          <view
            class="pd-related-more"
            @tap="toHome"
          >
            <text class="pd-more-muted">
              更多
            </text>
            <app-icon
              name="chevron-right"
              :size="26"
              color="var(--poem-text-muted)"
            />
          </view>
        </view>
        <view class="pd-related-list">
          <view
            v-for="rp in poem.relatedPoems"
            :key="rp.id"
            class="pd-related-item"
            @tap="toDetail(rp.id)"
          >
            <view class="pd-related-body">
              <text class="pd-related-name">
                {{ rp.title }}
              </text>
              <text class="pd-related-preview">
                {{ rp.preview }}
              </text>
            </view>
            <text class="pd-related-author">
              {{ rp.author }}
            </text>
            <app-icon
              name="chevron-right"
              :size="28"
              color="var(--poem-text-muted)"
            />
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view
      class="pd-bottom"
      :style="{ paddingBottom: 'calc(24rpx + ' + safeBottom + 'px)' }"
    >
      <view class="pd-bottom-row">
        <view
          class="pd-read-btn"
          :style="{
            background: isPlaying ? 'var(--poem-gold-soft)' : 'var(--poem-surface)',
            borderColor: isPlaying ? 'var(--poem-gold-dim)' : 'var(--poem-border)',
          }"
          @tap="isPlaying = !isPlaying"
        >
          <template v-if="isPlaying">
            <view class="pd-soundwave">
              <view
                v-for="n in 5"
                :key="n"
                class="pd-wave-bar"
                :class="'bar-wave-' + n"
              />
            </view>
            <text
              class="pd-read-text"
              style="color: var(--poem-gold)"
            >
              朗读中
            </text>
            <app-icon
              name="volume-x"
              :size="30"
              color="#e8c07a"
            />
          </template>
          <template v-else>
            <app-icon
              name="volume-2"
              :size="30"
              color="rgba(245,234,216,0.55)"
            />
            <text class="pd-read-text">
              朗读
            </text>
          </template>
        </view>

        <view
          class="pd-act-btn"
          :style="{ background: isBookmarked ? 'var(--poem-gold-soft)' : 'var(--poem-surface)', borderColor: isBookmarked ? 'var(--poem-gold-dim)' : 'var(--poem-border)' }"
          @tap="isBookmarked = !isBookmarked"
        >
          <app-icon
            :name="isBookmarked ? 'bookmark-check' : 'bookmark'"
            :size="34"
            :color="isBookmarked ? '#e8c07a' : 'rgba(245,234,216,0.55)'"
          />
        </view>

        <view
          class="pd-act-btn"
          :style="{ background: isLiked ? 'rgba(192,67,58,0.15)' : 'var(--poem-surface)', borderColor: isLiked ? 'rgba(192,67,58,0.4)' : 'var(--poem-border)' }"
          @tap="isLiked = !isLiked"
        >
          <app-icon
            name="heart"
            :size="34"
            :color="isLiked ? '#c0433a' : 'rgba(245,234,216,0.55)'"
            :fill="isLiked"
          />
        </view>

        <view
          class="pd-act-btn pd-act-disc"
          @tap="showComments = true"
        >
          <app-icon
            name="message-circle"
            :size="34"
            color="rgba(245,234,216,0.55)"
          />
          <view class="pd-act-dot" />
        </view>

        <view
          class="pd-act-btn"
          @tap="showSharePanel = true"
        >
          <app-icon
            name="share-2"
            :size="34"
            color="rgba(245,234,216,0.55)"
          />
        </view>
      </view>
    </view>

    <!-- AI 深度赏析面板 -->
    <view
      v-if="showAiPanel"
      class="pd-overlay"
    >
      <view
        class="pd-overlay-mask"
        @tap="showAiPanel = false"
      />
      <view class="pd-sheet sheet-slide-up">
        <view class="pd-sheet-head">
          <view class="pd-sheet-headleft">
            <app-icon
              name="sparkles"
              :size="28"
              color="#9b7ec8"
            />
            <text class="pd-sheet-title">
              AI 深度赏析
            </text>
            <text class="pd-sheet-badge">
              AI 生成
            </text>
          </view>
          <view
            class="pd-sheet-close"
            @tap="showAiPanel = false"
          >
            <app-icon
              name="x"
              :size="28"
              color="var(--poem-text-soft)"
            />
          </view>
        </view>
        <scroll-view
          scroll-y
          class="pd-sheet-body"
        >
          <!-- idle -->
          <view
            v-if="aiStatus === 'idle'"
            class="pd-ai-idle"
          >
            <view class="pd-ai-idle-icon">
              <app-icon
                name="sparkles"
                :size="48"
                color="#9b7ec8"
              />
            </view>
            <view class="pd-ai-idle-text">
              <text class="pd-ai-idle-title">
                AI 深度解读《{{ poem.title }}》
              </text>
              <text class="pd-ai-idle-sub">
                从创作背景、意象分析、情感解读三个维度深入解析
              </text>
            </view>
            <view
              class="pd-ai-btn"
              @tap="generateAi"
            >
              <text class="pd-ai-btn-text">
                开始解析
              </text>
            </view>
          </view>
          <!-- loading -->
          <view v-else-if="aiStatus === 'loading'">
            <view class="pd-ai-loading">
              <app-icon
                name="loader-2"
                :size="28"
                color="#9b7ec8"
                class="pd-spin"
              />
              <text class="pd-ai-loading-text">
                AI 正在解读诗词意境…
              </text>
            </view>
            <rich-text
              class="pd-ai-richtext ai-cursor"
              :nodes="displayedHtml"
            />
          </view>
          <!-- done -->
          <view v-else-if="aiStatus === 'done'">
            <view class="pd-ai-donehead">
              <view class="pd-ai-donestatus">
                <app-icon
                  name="check"
                  :size="26"
                  color="#e8c07a"
                />
                <text class="pd-ai-donetext">
                  解析完成
                </text>
              </view>
              <view
                class="pd-ai-regen"
                @tap="generateAi"
              >
                <app-icon
                  name="refresh-cw"
                  :size="24"
                  color="#9b7ec8"
                />
                <text class="pd-ai-regen-text">
                  重新生成
                </text>
              </view>
            </view>
            <rich-text
              class="pd-ai-richtext"
              :nodes="displayedHtml"
            />
            <view class="pd-ai-extra">
              <text class="pd-ai-extra-label">
                AI 赏析后的延伸阅读
              </text>
              <view class="pd-ai-extra-list">
                <view
                  v-for="rp in poem.relatedPoems.slice(0, 2)"
                  :key="rp.id"
                  class="pd-ai-extra-item"
                  @tap="goRelated(rp.id)"
                >
                  <view class="pd-ai-extra-body">
                    <text class="pd-ai-extra-title">
                      {{ rp.title }}
                    </text>
                    <text class="pd-ai-extra-preview">
                      {{ rp.preview }}
                    </text>
                  </view>
                  <app-icon
                    name="chevron-right"
                    :size="28"
                    color="var(--poem-text-muted)"
                  />
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- AI 配图分享面板 -->
    <view
      v-if="showSharePanel"
      class="pd-overlay"
    >
      <view
        class="pd-overlay-mask"
        @tap="showSharePanel = false"
      />
      <view class="pd-sheet sheet-slide-up">
        <view class="pd-sheet-head">
          <text class="pd-sheet-title">
            生成诗词海报
          </text>
          <view
            class="pd-sheet-close"
            @tap="showSharePanel = false"
          >
            <app-icon
              name="x"
              :size="28"
              color="var(--poem-text-soft)"
            />
          </view>
        </view>
        <view class="pd-share-body">
          <!-- 配图选项 -->
          <view class="pd-share-opts">
            <view
              class="pd-share-opt"
              :style="{ background: useAiImage ? 'var(--poem-ai-soft)' : 'var(--poem-bg-2)', borderColor: useAiImage ? 'var(--poem-ai)' : 'var(--poem-border)' }"
              @tap="useAiImage = true"
            >
              <app-icon
                name="sparkles"
                :size="28"
                :color="useAiImage ? '#9b7ec8' : 'rgba(245,234,216,0.3)'"
              />
              <text class="pd-share-opt-text">
                AI 配图
              </text>
              <text
                v-if="useAiImage"
                class="pd-share-opt-badge"
              >
                AI 生成
              </text>
            </view>
            <view
              class="pd-share-opt"
              :style="{ background: !useAiImage ? 'var(--poem-gold-soft)' : 'var(--poem-bg-2)', borderColor: !useAiImage ? 'var(--poem-gold)' : 'var(--poem-border)' }"
              @tap="useAiImage = false"
            >
              <app-icon
                name="image"
                :size="28"
                :color="!useAiImage ? '#e8c07a' : 'rgba(245,234,216,0.3)'"
              />
              <text class="pd-share-opt-text">
                默认样式
              </text>
            </view>
          </view>

          <!-- 预览区 -->
          <view
            class="pd-poster"
            :style="{ background: imgStatus === 'done' ? 'linear-gradient(160deg, #0d1a2e 0%, #1a0e05 50%, #2e1f10 100%)' : 'linear-gradient(135deg, #1a0e05 0%, #2e1f10 100%)' }"
          >
            <view
              v-if="imgStatus === 'idle'"
              class="pd-poster-idle"
            >
              <view class="poem-vertical pd-poster-verse">
                <text
                  v-for="(c, i) in poem.content"
                  :key="i"
                >
                  {{ c.line }}
                </text>
              </view>
              <text class="pd-poster-hint">
                {{ useAiImage ? '点击生成 AI 配图' : '默认深色背景海报' }}
              </text>
            </view>
            <view
              v-else-if="imgStatus === 'generating'"
              class="pd-poster-gen"
            >
              <app-icon
                name="loader-2"
                :size="44"
                color="#9b7ec8"
                class="pd-spin"
              />
              <text class="pd-poster-gen-text">
                AI 正在感受诗词意境…
              </text>
            </view>
            <view
              v-else
              class="pd-poster-done"
            >
              <view class="poem-vertical pd-poster-verse">
                <text
                  v-for="(c, i) in poem.content"
                  :key="i"
                >
                  {{ c.line }}
                </text>
              </view>
              <text class="pd-poster-sign">
                — {{ poem.dynasty }} · {{ poem.author }}
              </text>
              <view class="pd-poster-badge">
                AI 生成
              </view>
            </view>
          </view>

          <!-- 操作按钮 -->
          <view class="pd-share-actions">
            <view
              v-if="imgStatus === 'idle'"
              class="pd-share-genbtn"
              @tap="generateImg"
            >
              <app-icon
                name="sparkles"
                :size="30"
                color="#ffffff"
              />
              <text class="pd-share-genbtn-text">
                {{ useAiImage ? '生成 AI 配图' : '生成海报' }}
              </text>
            </view>
            <view
              v-else-if="imgStatus === 'generating'"
              class="pd-share-genbtn pd-share-genbtn-disabled"
            >
              <app-icon
                name="loader-2"
                :size="30"
                color="#ffffff"
                class="pd-spin"
              />
              <text class="pd-share-genbtn-text">
                生成中…
              </text>
            </view>
            <template v-else>
              <view
                class="pd-share-regen"
                @tap="generateImg"
              >
                <app-icon
                  name="refresh-cw"
                  :size="28"
                  color="#ffffff"
                />
                <text class="pd-share-regen-text">
                  重新生成
                </text>
              </view>
              <view class="pd-share-save">
                <app-icon
                  name="download"
                  :size="28"
                  color="#1c1208"
                />
                <text class="pd-share-save-text">
                  保存分享
                </text>
              </view>
            </template>
          </view>
        </view>
      </view>
    </view>

    <!-- 诗词品评抽屉 -->
    <discussion-sheet
      :open="showComments"
      :config="discussionConfig"
      :items="POEM_DISCUSSIONS"
      :enable-a-i-assist="true"
      @close="showComments = false"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { navigateTo, navigateBack } from '@/utils/router'
import DiscussionSheet from '@/components/common/discussion-sheet.vue'
import type { DiscussionConfig, DiscussionItem } from '@/lib/discussion-types'

const statusBarHeight = ref(0)
const safeBottom = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
  safeBottom.value = info.safeAreaInsets?.bottom || 0
} catch (e) {}

type TabKey = 'poem' | 'appreciation' | 'translation' | 'notes'

const poem = {
  id: '1',
  title: '静夜思',
  author: '李白',
  authorId: '1',
  dynasty: '唐',
  form: '五言绝句',
  content: [
    { line: '床前明月光，', pinyin: 'chuáng qián míng yuè guāng，' },
    { line: '疑是地上霜。', pinyin: 'yí shì dì shàng shuāng。' },
    { line: '举头望明月，', pinyin: 'jǔ tóu wàng míng yuè，' },
    { line: '低头思故乡。', pinyin: 'dī tóu sī gù xiāng。' },
  ],
  appreciation: `这首诗写的是在寂静的月夜思念家乡的感受。

诗的前两句，是写诗人在作客他乡的特定环境中一刹那间所产生的错觉。一个独处他乡的人，白天奔波忙碌，倒还能冲淡离愁，然而一到夜深人静的时候，心头就难免泛起阵阵思念故乡的波澜。何况是在月明之夜，更何况是月色如霜的秋夜。

"疑"字生动地表达了诗人睡梦初醒，迷离恍惚中将照射在床前的清冷月光误作铺在地面的浓霜。"霜"字用得更妙，既形容了月光的皎洁，又表达了季节的寒冷，还烘托出诗人飘泊他乡的孤寂凄凉之情。

后两句通过动作神态的刻画，深化思乡之情。"举头望明月"把诗人的思绪由地上引向天上，由近处引向远处。"低头思故乡"是诗人完成从疑到望再到思这一系列心理活动的终点。`,
  aiAppreciation: `**创作背景**

此诗当作于唐玄宗开元十四年（726年），李白二十六岁时。是年秋，诗人离故乡赴长安求仕途，旅宿扬州旅舍，月夜难眠，感怀乡愁而作。

**意象分析**

- **月光如霜**：以"疑"字将月光与白霜并置，形成触觉（冷）与视觉（白）的通感，将静夜的凄清具象化
- **举头 / 低头**：两组对仗动作构成完整的心理弧线——由外物（月）引发内情（乡愁），以行为外化情感
- **故乡**：全诗至此才点出主旨，是蓄势后的情感爆发，留白与克制是李白绝句的典型风格

**情感解读**

全诗20字，无一字言"愁"，却字字含愁。李白用最简洁的笔墨完成了从"疑"到"望"再到"思"的完整情感旅程，是唐诗中"以少总多"手法的极致体现。`,
  notes: [
    { word: '床', note: '此指井栏，或作井边的围栏解。一说为窗的通假字。' },
    { word: '疑', note: '好像、似乎。' },
    { word: '举头', note: '抬头。' },
    { word: '思', note: '思念。' },
  ],
  authorInfo: {
    name: '李白',
    dynasty: '唐',
    years: '701-762',
    title: '诗仙',
    intro: '李白（701年—762年），字太白，号青莲居士，唐代伟大的浪漫主义诗人，被后人誉为"诗仙"。',
    poemCount: 1184,
  },
  relatedPoems: [
    { id: '2', title: '月下独酌', author: '李白', preview: '花间一壶酒，独酌无相亲...' },
    { id: '3', title: '望庐山瀑布', author: '李白', preview: '日照香炉生紫烟...' },
    { id: '4', title: '早发白帝城', author: '李白', preview: '朝辞白帝彩云间...' },
  ],
  tags: ['思乡', '月亮', '夜晚', '五言绝句'],
  likes: 12800,
  collections: 8900,
}

const translations = ['明亮的月光洒在床前，', '好像地上泛起了一层霜。', '抬头望着天上的明月，', '低下头思念起远方的故乡。']

const POEM_DISCUSSIONS: DiscussionItem[] = [
  {
    id: 'p1',
    author: { id: 1, name: '明月客' },
    content: '二十字写尽天下游子心。最妙在『疑』字，半梦半醒间把月光错认成霜，那份恍惚正是思乡情最真实的模样。',
    time: '2天前',
    likeCount: 96,
    featured: true,
    quote: { text: '疑是地上霜', source: '全诗品评' },
    replies: [
      { id: 'p1r1', author: { id: 11, name: '归雁' }, content: '『疑是地上霜』这一『疑』，比直接写愁高明太多。', time: '1天前', likeCount: 14, replyToName: '明月客' },
      { id: 'p1r2', author: { id: 12, name: '采薇' }, content: '李白的绝句就是这样，看似平淡，回味无穷。', time: '1天前', likeCount: 7, replyToName: '明月客' },
    ],
    replyCount: 2,
  },
  {
    id: 'p2',
    author: { id: 2, name: '竹下听雨' },
    content: '举头、低头两个动作，把思绪从天上拉回心里，短短十字完成了一次完整的情感起落，太见功力。',
    time: '4天前',
    likeCount: 58,
    replies: [],
  },
  {
    id: 'p3',
    author: { id: 3, name: '青莲居士迷' },
    content: '请教各位，『床』字到底作何解？有说是井栏，有说是坐具，有说是窗的通假，哪种更合理？',
    time: '1周前',
    likeCount: 33,
    replies: [
      { id: 'p3r1', author: { id: 31, name: '明月客' }, content: '我倾向井栏说，月夜立于井边望月更有画面感。', time: '6天前', likeCount: 11, replyToName: '青莲居士迷' },
    ],
    replyCount: 1,
  },
]

const discussionConfig: DiscussionConfig = {
  scene: 'article',
  mode: 'comment',
  title: '诗词品评',
  accentColor: '#a8741f',
  placeholder: '说说你的品读感受…',
}

const tabs: { key: TabKey; label: string }[] = [
  { key: 'poem', label: '原文' },
  { key: 'appreciation', label: '赏析' },
  { key: 'translation', label: '译文' },
  { key: 'notes', label: '注释' },
]

const activeTab = ref<TabKey>('poem')
const isLiked = ref(false)
const isBookmarked = ref(false)
const isPlaying = ref(false)
const showPinyin = ref(false)
const copied = ref(false)
const showAiPanel = ref(false)
const showSharePanel = ref(false)
const showComments = ref(false)

const reversedContent = computed(() => [...poem.content].reverse())
const firstComment = POEM_DISCUSSIONS[0]
const commentCount = POEM_DISCUSSIONS.reduce((n, c) => n + 1 + c.replies.length, 0)

// AI 赏析流式
const aiStatus = ref<'idle' | 'loading' | 'done'>('idle')
const displayed = ref('')
let aiTimer: ReturnType<typeof setInterval> | null = null

const displayedHtml = computed(() => {
  const html = displayed.value
    .replace(/\*\*(.*?)\*\*/g, aiStatus.value === 'done' ? '<strong style="color:#e8c07a">$1</strong>' : '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')
  return `<div style="color:#f5ead8;font-size:28rpx;line-height:1.9">${html}</div>`
})

function generateAi() {
  aiStatus.value = 'loading'
  displayed.value = ''
  if (aiTimer) clearInterval(aiTimer)
  const full = poem.aiAppreciation
  let i = 0
  aiTimer = setInterval(() => {
    i += 3
    displayed.value = full.slice(0, i)
    if (i >= full.length) {
      if (aiTimer) clearInterval(aiTimer)
      aiStatus.value = 'done'
    }
  }, 30)
}

// AI 配图
const imgStatus = ref<'idle' | 'generating' | 'done'>('idle')
const useAiImage = ref(true)
let imgTimer: ReturnType<typeof setTimeout> | null = null

function generateImg() {
  imgStatus.value = 'generating'
  if (imgTimer) clearTimeout(imgTimer)
  imgTimer = setTimeout(() => {
    imgStatus.value = 'done'
  }, 2200)
}

function handleCopy() {
  const text = poem.content.map((c) => c.line).join('\n')
  const full = `${poem.title}\n【${poem.dynasty}】${poem.author}\n\n${text}`
  // #ifdef H5
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(full)
  }
  // #endif
  uni.setClipboardData({ data: full, showToast: false, success: () => {}, fail: () => {} })
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

function goBack() {
  navigateBack()
}
function toDetail(id: string) {
  navigateTo(`/poetry/${id}`)
}
function goRelated(id: string) {
  showAiPanel.value = false
  navigateTo(`/poetry/${id}`)
}
function toPoet(id: string) {
  navigateTo(`/poetry/poet/${id}`)
}
function toHome() {
  navigateTo('/poetry')
}

onLoad(() => {
  // 当前仅静夜思一首示例数据，q.id 预留
})
</script>

<style scoped>
.pd-page {
  min-height: 100vh;
  background: radial-gradient(ellipse at top, #2a1a0a 0%, #1c1208 60%, #0e0b06 100%);
  padding-bottom: 180rpx;
  color: var(--poem-text);
}

/* 顶栏 */
.pd-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(28, 18, 8, 0.92);
  backdrop-filter: blur(12rpx);
  -webkit-backdrop-filter: blur(12rpx);
  border-bottom: 2rpx solid var(--poem-border);
}
.pd-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 112rpx;
}
.pd-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  border-radius: 24rpx;
}
.pd-header-title {
  font-family: var(--font-serif, serif);
  font-size: 30rpx;
  font-weight: 500;
  color: var(--poem-text);
}

.pd-main {
  padding: 0 32rpx;
}

/* 诗题 */
.pd-titlesec {
  text-align: center;
  padding: 48rpx 0 0;
  margin-bottom: 48rpx;
}
.pd-poem-title {
  display: block;
  font-family: var(--font-serif, serif);
  font-size: 56rpx;
  font-weight: 700;
  letter-spacing: 4rpx;
  color: var(--poem-gold);
  margin-bottom: 16rpx;
}
.pd-poem-meta {
  display: block;
  font-size: 26rpx;
  color: var(--poem-text-soft);
}
.pd-poem-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12rpx;
  margin-top: 24rpx;
}
.pd-tag {
  font-size: 20rpx;
  padding: 2rpx 16rpx;
  border-radius: 999rpx;
  background: var(--poem-gold-soft);
  color: var(--poem-gold);
}

/* Tab */
.pd-tabs {
  display: flex;
  border-bottom: 2rpx solid var(--poem-border);
}
.pd-tab {
  flex: 1;
  position: relative;
  padding: 24rpx 0;
}
.pd-tab-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}
.pd-tab-label {
  font-size: 26rpx;
  font-weight: 500;
}
.pd-tab-ai {
  font-size: 18rpx;
  padding: 1rpx 12rpx;
  border-radius: 999rpx;
  background: var(--poem-ai-soft);
  color: var(--poem-ai);
}
.pd-tab-indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40rpx;
  height: 4rpx;
  border-radius: 999rpx;
  background: var(--poem-gold);
}

.pd-tabcontent {
  padding: 48rpx 0;
}

/* 原文竖排 */
.pd-pinyin-toggle {
  display: flex;
  justify-content: center;
  margin-bottom: 48rpx;
}
.pd-pinyin-btn {
  padding: 8rpx 24rpx;
  border-radius: 999rpx;
  background: var(--poem-line);
  border: 2rpx solid transparent;
}
.pd-pinyin-on {
  background: var(--poem-gold-soft);
  border-color: var(--poem-gold-dim);
}
.pd-pinyin-text {
  font-size: 22rpx;
}
.pd-verse-wrap {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 440rpx;
}
.pd-verse-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 50rpx;
}
.pd-verse-col {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.pd-verse-pinyin {
  writing-mode: vertical-rl;
  font-size: 20rpx;
  letter-spacing: 0.1em;
  margin-bottom: 16rpx;
  color: var(--poem-text-muted);
}
.pd-verse-line {
  writing-mode: vertical-rl;
  font-family: var(--font-serif, serif);
  font-size: 44rpx;
  letter-spacing: 0.3em;
  line-height: 2.2;
  color: var(--poem-text);
}
.pd-divider {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 0 64rpx;
  margin: 48rpx 0;
}
.pd-divider-line {
  flex: 1;
  height: 2rpx;
  background: var(--poem-border);
}
.pd-divider-star {
  font-size: 22rpx;
  color: var(--poem-text-muted);
}
.pd-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 64rpx;
}
.pd-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.pd-stat-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pd-stat-text {
  font-size: 22rpx;
  color: var(--poem-text-soft);
}

/* 赏析 */
.pd-appreciation {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.pd-ai-entry {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background: var(--poem-ai-soft);
  border: 2rpx solid rgba(155, 126, 200, 0.25);
}
.pd-ai-entry-body {
  flex: 1;
  min-width: 0;
}
.pd-ai-entry-titlerow {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.pd-ai-entry-title {
  font-size: 26rpx;
  color: var(--poem-ai);
}
.pd-ai-entry-badge {
  font-size: 18rpx;
  padding: 1rpx 10rpx;
  border-radius: 6rpx;
  background: rgba(155, 126, 200, 0.2);
  color: var(--poem-ai);
}
.pd-ai-entry-sub {
  display: block;
  font-size: 22rpx;
  margin-top: 4rpx;
  color: var(--poem-text-muted);
}
.pd-appr-card {
  padding: 32rpx;
  border-radius: 24rpx;
  background: var(--poem-surface);
  border: 2rpx solid var(--poem-border);
}
.pd-appr-label {
  display: block;
  font-size: 22rpx;
  font-weight: 500;
  color: var(--poem-gold);
  margin-bottom: 24rpx;
}
.pd-appr-text {
  font-size: 28rpx;
  line-height: 1.95;
  white-space: pre-line;
  color: var(--poem-text);
}

/* 译文 */
.pd-trans-card {
  padding: 40rpx;
  border-radius: 24rpx;
  background: var(--poem-surface);
  border: 2rpx solid var(--poem-border);
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.pd-trans-row {
  display: flex;
  gap: 24rpx;
  align-items: flex-start;
}
.pd-trans-orig {
  font-family: var(--font-serif, serif);
  font-size: 30rpx;
  flex-shrink: 0;
  line-height: 1.6;
  color: var(--poem-gold);
}
.pd-trans-divider {
  width: 2rpx;
  align-self: stretch;
  flex-shrink: 0;
  background: var(--poem-border);
}
.pd-trans-text {
  font-size: 28rpx;
  line-height: 1.6;
  color: var(--poem-text-soft);
}

/* 注释 */
.pd-notes {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.pd-note {
  display: flex;
  gap: 24rpx;
  align-items: flex-start;
  padding: 32rpx;
  border-radius: 24rpx;
  background: var(--poem-surface);
  border: 2rpx solid var(--poem-border);
}
.pd-note-word {
  font-family: var(--font-serif, serif);
  font-size: 30rpx;
  font-weight: 700;
  flex-shrink: 0;
  width: 64rpx;
  text-align: center;
  color: var(--poem-gold);
}
.pd-note-divider {
  width: 2rpx;
  align-self: stretch;
  flex-shrink: 0;
  background: var(--poem-border);
}
.pd-note-text {
  font-size: 28rpx;
  line-height: 1.6;
  color: var(--poem-text-soft);
}

/* 作者简介 */
.pd-author-sec {
  display: flex;
  align-items: center;
  gap: 32rpx;
  padding: 32rpx 0;
  border-top: 2rpx solid var(--poem-border);
}
.pd-author-avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--poem-gold-soft) 0%, var(--poem-ai-soft) 100%);
  border: 2rpx solid var(--poem-border);
}
.pd-author-avatar-text {
  font-family: var(--font-serif, serif);
  font-size: 40rpx;
  font-weight: 700;
  color: var(--poem-gold);
}
.pd-author-body {
  flex: 1;
  min-width: 0;
}
.pd-author-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 8rpx;
}
.pd-author-name {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--poem-text);
}
.pd-author-title {
  font-size: 18rpx;
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  background: var(--poem-gold-soft);
  color: var(--poem-gold);
}
.pd-author-meta {
  display: block;
  font-size: 22rpx;
  margin-bottom: 8rpx;
  color: var(--poem-text-muted);
}
.pd-author-intro {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 26rpx;
  line-height: 1.5;
  color: var(--poem-text-soft);
}

/* 品评 */
.pd-disc-sec {
  border-top: 2rpx solid var(--poem-border);
}
.pd-disc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 0;
}
.pd-disc-title {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--poem-text);
}
.pd-disc-meta {
  font-size: 22rpx;
  color: var(--poem-text-muted);
}
.pd-disc-card {
  border-radius: 24rpx;
  overflow: hidden;
  background: var(--poem-surface);
  border: 2rpx solid var(--poem-border);
  margin-bottom: 16rpx;
}
.pd-disc-preview {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  padding: 28rpx;
}
.pd-disc-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 26rpx;
  font-weight: 500;
  background: var(--poem-gold-soft);
  color: var(--poem-gold);
}
.pd-disc-body {
  flex: 1;
  min-width: 0;
}
.pd-disc-name {
  display: block;
  font-size: 24rpx;
  font-weight: 500;
  color: var(--poem-text);
}
.pd-disc-content {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 24rpx;
  line-height: 1.6;
  margin-top: 4rpx;
  color: var(--poem-text-soft);
}
.pd-disc-like {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 12rpx;
}
.pd-disc-like-text {
  font-size: 22rpx;
  color: var(--poem-text-muted);
}
.pd-disc-all {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 20rpx 0;
  border-top: 2rpx solid var(--poem-border);
}
.pd-disc-all-text {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--poem-gold);
}

/* 相关诗词 */
.pd-related-sec {
  border-top: 2rpx solid var(--poem-border);
  padding-bottom: 48rpx;
}
.pd-related-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 0;
}
.pd-related-title {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--poem-text);
}
.pd-related-more {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.pd-more-muted {
  font-size: 22rpx;
  color: var(--poem-text-muted);
}
.pd-related-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.pd-related-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background: var(--poem-surface);
  border: 2rpx solid var(--poem-border);
}
.pd-related-body {
  flex: 1;
  min-width: 0;
}
.pd-related-name {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  margin-bottom: 4rpx;
  color: var(--poem-text);
}
.pd-related-preview {
  display: block;
  font-size: 22rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--poem-text-muted);
}
.pd-related-author {
  font-size: 22rpx;
  flex-shrink: 0;
  color: var(--poem-text-muted);
}

/* 底部操作栏 */
.pd-bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  padding: 24rpx 32rpx;
  background: rgba(28, 18, 8, 0.96);
  border-top: 2rpx solid var(--poem-border);
  backdrop-filter: blur(24rpx);
  -webkit-backdrop-filter: blur(24rpx);
}
.pd-bottom-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.pd-read-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  border: 2rpx solid var(--poem-border);
}
.pd-read-text {
  font-size: 26rpx;
  color: var(--poem-text-soft);
}
.pd-soundwave {
  display: flex;
  align-items: center;
  gap: 6rpx;
  height: 40rpx;
}
.pd-wave-bar {
  width: 6rpx;
  height: 36rpx;
  border-radius: 999rpx;
  background: var(--poem-gold);
  transform-origin: bottom;
}
.pd-act-btn {
  position: relative;
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--poem-surface);
  border: 2rpx solid var(--poem-border);
}
.pd-act-dot {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  width: 12rpx;
  height: 12rpx;
  border-radius: 999rpx;
  background: var(--poem-gold);
}

/* 浮层 */
.pd-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
}
.pd-overlay-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4rpx);
  -webkit-backdrop-filter: blur(4rpx);
}
.pd-sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 80vh;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--poem-surface);
  border-top: 2rpx solid var(--poem-border);
}
.pd-sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 40rpx;
  flex-shrink: 0;
  border-bottom: 2rpx solid var(--poem-border);
}
.pd-sheet-headleft {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.pd-sheet-title {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--poem-text);
}
.pd-sheet-badge {
  font-size: 18rpx;
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  font-weight: 500;
  background: var(--poem-ai-soft);
  color: var(--poem-ai);
}
.pd-sheet-close {
  width: 48rpx;
  height: 48rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pd-sheet-body {
  flex: 1;
  max-height: 60vh;
  padding: 32rpx 40rpx;
}

/* AI idle */
.pd-ai-idle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
  padding: 80rpx 0;
}
.pd-ai-idle-icon {
  width: 112rpx;
  height: 112rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--poem-ai-soft);
}
.pd-ai-idle-text {
  text-align: center;
}
.pd-ai-idle-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  margin-bottom: 8rpx;
  color: var(--poem-text);
}
.pd-ai-idle-sub {
  display: block;
  font-size: 26rpx;
  color: var(--poem-text-soft);
}
.pd-ai-btn {
  padding: 20rpx 64rpx;
  border-radius: 16rpx;
  background: var(--poem-ai);
}
.pd-ai-btn-text {
  font-size: 28rpx;
  color: #ffffff;
}

/* AI loading/done */
.pd-ai-loading {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 32rpx;
}
.pd-ai-loading-text {
  font-size: 26rpx;
  color: var(--poem-text-soft);
}
.pd-spin {
  animation: pd-spin 1s linear infinite;
}
@keyframes pd-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
.pd-ai-richtext {
  font-size: 28rpx;
  line-height: 1.9;
  color: var(--poem-text);
}
.pd-ai-donehead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
}
.pd-ai-donestatus {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.pd-ai-donetext {
  font-size: 22rpx;
  color: var(--poem-text-soft);
}
.pd-ai-regen {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.pd-ai-regen-text {
  font-size: 22rpx;
  color: var(--poem-ai);
}
.pd-ai-extra {
  margin-top: 48rpx;
  padding-top: 32rpx;
  border-top: 2rpx solid var(--poem-border);
}
.pd-ai-extra-label {
  display: block;
  font-size: 22rpx;
  margin-bottom: 24rpx;
  color: var(--poem-text-soft);
}
.pd-ai-extra-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.pd-ai-extra-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  border: 2rpx solid var(--poem-border);
}
.pd-ai-extra-body {
  flex: 1;
  min-width: 0;
}
.pd-ai-extra-title {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: var(--poem-text);
}
.pd-ai-extra-preview {
  display: block;
  font-size: 22rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--poem-text-muted);
}

/* AI 配图分享 */
.pd-share-body {
  padding: 32rpx 40rpx 16rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.pd-share-opts {
  display: flex;
  gap: 24rpx;
}
.pd-share-opt {
  flex: 1;
  position: relative;
  padding: 24rpx;
  border-radius: 24rpx;
  border: 2rpx solid var(--poem-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.pd-share-opt-text {
  font-size: 26rpx;
  color: var(--poem-text);
}
.pd-share-opt-badge {
  font-size: 18rpx;
  color: var(--poem-ai);
}
.pd-poster {
  aspect-ratio: 3 / 4;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 2rpx solid var(--poem-border);
}
.pd-poster-idle,
.pd-poster-done {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48rpx;
}
.pd-poster-verse {
  height: 280rpx;
  font-size: 40rpx;
  margin-bottom: 32rpx;
  color: var(--poem-text);
}
.pd-poster-hint {
  font-size: 22rpx;
  color: var(--poem-text-muted);
}
.pd-poster-sign {
  font-size: 22rpx;
  color: var(--poem-gold);
}
.pd-poster-done {
  position: relative;
}
.pd-poster-badge {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  font-size: 18rpx;
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  background: var(--poem-ai-soft);
  color: var(--poem-ai);
}
.pd-poster-gen {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}
.pd-poster-gen-text {
  font-size: 26rpx;
  color: var(--poem-text-soft);
}
.pd-share-actions {
  display: flex;
  gap: 24rpx;
}
.pd-share-genbtn {
  flex: 1;
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  background: var(--poem-ai);
}
.pd-share-genbtn-disabled {
  opacity: 0.7;
}
.pd-share-genbtn-text {
  font-size: 28rpx;
  color: #ffffff;
}
.pd-share-regen {
  flex: 1;
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.2);
}
.pd-share-regen-text {
  font-size: 28rpx;
  color: #ffffff;
}
.pd-share-save {
  flex: 1;
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  background: var(--poem-gold);
}
.pd-share-save-text {
  font-size: 28rpx;
  color: #1c1208;
}
</style>
