<template>
  <TopicScreenFrame
    title="内容生态全景"
    subtitle="看见供给结构，识别创作贡献"
    topic="content"
    :snapshot="snapshot"
    :updated-at="data.updatedAt"
    footer="内容规模与近 30 天新增分开观察"
    @refresh="refresh"
  >
    <div class="ts-content-grid">
      <div class="ts-content-main">
        <section class="ts-surface">
          <div class="ts-supply-title">
            <div><h2>平台内容供给</h2><strong class="ts-hero-number">{{ metric(data.totalContent) }}</strong></div><p class="ts-note">
              文章、帖子、课程、视频<br>矩形面积对应实际数量
            </p>
          </div>
          <div
            v-if="mosaic.blocks.length"
            class="ts-mosaic"
            role="img"
            aria-label="四类内容数量面积图，具体数值见下方按钮"
          >
            <div
              v-for="block in mosaic.blocks"
              :key="block.key"
              class="ts-mosaic-block"
              :style="{ left: `${block.x / 640 * 100}%`, top: `${block.y / 300 * 100}%`, width: `${block.width / 640 * 100}%`, height: `${block.height / 300 * 100}%`, '--item-color': block.color, opacity: !selected || selected === block.key ? 1 : 0.3 }"
              :title="`${block.label} ${metric(block.value)}，占 ${percent(block.share)}`"
            >
              <template v-if="block.width > 110 && block.height > 85">
                <span>{{ block.label }}</span><strong>{{ metric(block.value) }}</strong>
              </template>
            </div>
          </div>
          <div
            v-else
            class="ts-empty"
          >
            <span
              class="ts-empty-mark"
              aria-hidden="true"
            >▦</span><strong>{{ mosaic.complete ? '内容生态等待生长' : '内容构成尚不完整' }}</strong><p>{{ mosaic.complete ? '四类内容均为零。内容进入相应统计状态后，矩阵将显示真实占比。' : '保留下方已知数值，待数据完整后计算面积与占比。' }}</p>
          </div>
          <div
            class="ts-content-legend"
            aria-label="选择内容类型"
          >
            <button
              v-for="kind in contentKinds"
              :key="kind.key"
              :style="{ '--item-color': kind.color }"
              :aria-pressed="selected === kind.key"
              @click="selected = selected === kind.key ? null : kind.key"
            >
              <span>{{ kind.label }} <small>{{ kind.scope }}</small></span><b>{{ metric(data[kind.key]) }}</b><small>占比 {{ percent(mosaic.items.find(item => item.key === kind.key)?.share ?? null) }}</small>
            </button>
          </div>
          <p
            v-if="selectedKind"
            class="ts-context"
          >
            {{ selectedKind.label }}统计范围：{{ selectedKind.scope }}。{{ ['totalArticles', 'totalPosts'].includes(selectedKind.key) ? '近 30 天新增见下方；不是自然月增长。' : '当前接口未提供该类型的新增时间序列。' }}
          </p>
        </section>
        <section
          class="ts-growth-pair"
          aria-label="近 30 天新增内容"
        >
          <div><h3>近 30 天新增文章</h3><strong>{{ metric(data.monthGrowth?.articles) }}</strong><p>占已审核文章 {{ percent(proportion(data.monthGrowth?.articles, data.totalArticles)) }}</p></div>
          <div><h3>近 30 天新增帖子</h3><strong>{{ metric(data.monthGrowth?.posts) }}</strong><p>占已发布帖子 {{ percent(proportion(data.monthGrowth?.posts, data.totalPosts)) }}</p></div>
        </section>
      </div>
      <section class="ts-surface ts-creators">
        <div class="ts-section-head">
          <div><h2>创作者贡献榜</h2><p>累计已审核文章数排名，最多 10 位</p></div>
        </div>
        <div
          v-if="creators.length"
          class="ts-table-scroll"
          tabindex="0"
          aria-label="创作者贡献排名"
        >
          <table class="ts-table">
            <thead>
              <tr>
                <th scope="col">
                  排名
                </th><th scope="col">
                  创作者
                </th><th
                  scope="col"
                  class="ts-align-right"
                >
                  文章 / 占全部
                </th>
              </tr>
            </thead><tbody>
              <tr
                v-for="(creator, index) in creators"
                :key="creator.userId"
              >
                <td class="ts-rank">
                  {{ String(index + 1).padStart(2, '0') }}
                </td><td>
                  {{ creator.nickname || '未设置昵称' }}<div
                    class="ts-creator-track"
                    aria-hidden="true"
                  >
                    <i :style="{ width: `${proportion(creator.articleCount, data.totalArticles) ?? 0}%` }" />
                  </div>
                </td><td class="ts-align-right ts-creator-count">
                  {{ metric(creator.articleCount) }}<small>{{ percent(proportion(creator.articleCount, data.totalArticles)) }}</small>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          v-else
          class="ts-empty"
        >
          <span
            class="ts-empty-mark"
            aria-hidden="true"
          >↗</span><strong>{{ Array.isArray(data.topCreators) ? '等待第一份创作贡献' : '创作者榜单暂未提供' }}</strong><p>文章通过审核后计入贡献榜。草稿不会显示在这里。</p>
        </div>
        <p class="ts-context">
          榜单创作者合计贡献 {{ metric(creatorTotal) }} 篇，占已审核文章 {{ percent(proportion(creatorTotal, data.totalArticles)) }}。榜单不代表全部创作者数量。
        </p>
      </section>
    </div>
    <template #scope>
      <p>总内容为审核通过文章、已发布帖子、审核通过课程与全部视频记录的合计；不含古籍、商品和圈子。近 30 天是滚动时间段，不是自然月。创作者仅按已审核文章数排序；占比以全部已审核文章为分母，不跨内容类型相加。</p>
    </template>
  </TopicScreenFrame>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { bigscreenApi } from '@/api'
import TopicScreenFrame from '@/components/TopicScreenFrame.vue'
import { useTopicSnapshot } from '@/composables/useTopicSnapshot'
import { contentKinds, contentMosaic, distribution, metric, percent, proportion, type ContentScreen } from '@/utils/topic-screen'
const { snapshot, data, refresh } = useTopicSnapshot<ContentScreen>(token => bigscreenApi.contentEco(token, true))
const selected = ref<string | null>(null)
// 权限快照清空时同步丢弃交互上下文；普通断线保留快照，不重置有效选择。
watch(() => snapshot.value.data, value => { if (!value) selected.value = null }, { flush: 'sync' })
const selectedKind = computed(() => contentKinds.find(kind => kind.key === selected.value))
const mosaic = computed(() => contentMosaic(data.value))
const creators = computed(() => Array.isArray(data.value.topCreators) ? data.value.topCreators : [])
const creatorTotal = computed(() => distribution(Array.isArray(data.value.topCreators) ? creators.value.map(creator => ({ key: creator.userId, label: '', value: creator.articleCount })) : undefined).total)
</script>
