<template>
  <view class="editor-page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-back" @tap="goBack">
          <app-icon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <view class="nav-actions">
          <view class="btn-draft" :class="{ disabled: saving }" @tap="handleSaveDraft">
            <app-icon :name="saving ? 'loader-2' : 'save'" :size="16" color="#8a8a8a" :class="{ spin: saving }" />
            <text class="btn-draft-text">草稿</text>
          </view>
          <view class="btn-publish" :class="{ disabled: publishing || !content.trim() }" @tap="handlePublish">
            <app-icon :name="publishing ? 'loader-2' : 'send'" :size="16" color="#fff" :class="{ spin: publishing }" />
            <text class="btn-publish-text">发布</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 类型选择 -->
    <!-- 无文章权限的成员不渲染死 tab（点了也被拦，置灰徒增认知负担）；只剩「发帖」时整条 type-bar 隐藏。
         用 roleLoaded && 而非 !roleLoaded ||：普通成员占多数，确认有权限才出现，避免渲染后又消失的闪烁 -->
    <view v-if="roleLoaded && canPublishArticle" class="type-bar">
      <view
        v-for="t in (['post', 'article'] as const)"
        :key="t"
        class="type-item"
        :class="{ active: type === t, disabled: t === 'article' && roleLoaded && !canPublishArticle }"
        @tap="onSelectType(t)"
      >
        <text class="type-text" :class="{ active: type === t }">{{ t === 'post' ? '发帖' : '写文章' }}</text>
      </view>
    </view>

    <!-- 编辑区 -->
    <view class="edit-area">
      <input
        v-if="type === 'article'"
        v-model="title"
        class="title-input"
        placeholder="请输入标题"
        placeholder-class="ph"
      />
      <textarea
        v-if="type === 'article'"
        v-model="excerpt"
        class="excerpt-input"
        maxlength="140"
        auto-height
        placeholder="导语（用于文章列表和详情页开篇，建议 40—80 字）"
        placeholder-class="ph"
      />
      <!-- @blur/@input 记录光标位（uni-app textarea 事件 detail 带 cursor·H5/MP 均有；拿不到时退化为末尾插入） -->
      <textarea
        v-model="content"
        class="content-input"
        :placeholder="type === 'post' ? '分享你的想法...' : '开始写作...'"
        placeholder-class="ph"
        auto-height
        @blur="onContentCursor"
        @input="onContentCursor"
      />
      <!-- 文章模式写作提示（插图 + 轻量小标题语法） -->
      <text v-if="type === 'article'" class="article-hint">图片将插入光标处，行首 ## 空格写小标题（### 为小节标题）</text>

      <!-- 已上传图片（发帖九宫格；文章模式有独立「文章配图」预览区） -->
      <view v-if="type === 'post' && images.length > 0" class="img-grid">
        <view v-for="(img, i) in images" :key="i" class="img-cell">
          <image lazy-load :src="img" class="img-thumb" mode="aspectFill" />
          <view class="img-del" @tap="removeImage(i)">
            <app-icon name="x" :size="12" color="#fff" />
          </view>
        </view>
      </view>

      <!-- 文章配图预览区：横滑小图 + 序号角标（对应正文 [图N] 标记）+ 删除（删除同步移除标记并重排序号） -->
      <view v-if="type === 'article' && articleImages.length > 0" class="article-img-block">
        <text class="cover-label">文章配图（{{ articleImages.length }}）</text>
        <view class="article-img-scroll">
          <view v-for="(img, i) in articleImages" :key="img + i" class="article-img-cell">
            <image lazy-load :src="img" class="article-img-thumb" mode="aspectFill" />
            <view class="article-img-badge"><text class="article-img-badge-text">图{{ i + 1 }}</text></view>
            <view class="img-del" @tap="removeArticleImage(i)">
              <app-icon name="x" :size="12" color="#fff" />
            </view>
          </view>
        </view>
      </view>

      <!-- 附件文件卡（V0 门控模型「帖子/文件/问答」核心三件套之一·仅发帖态） -->
      <view v-if="type === 'post' && attachments.length > 0" class="file-list">
        <view v-for="(f, i) in attachments" :key="i" class="file-card">
          <view class="file-icon"><app-icon name="file-text" :size="40" color="#C41E3A" /></view>
          <view class="file-info">
            <text class="file-name">{{ f.name }}</text>
            <text class="file-size">{{ formatFileSize(f.size) }}</text>
          </view>
          <view class="file-del" @tap="removeAttachment(i)"><app-icon name="x" :size="28" color="#8a8a8a" /></view>
        </view>
      </view>

      <!-- 添加图片/文件：虚线大按钮（真机反馈：原工具栏小图标入口太小不明显）。
           发帖=九宫格附图；文章=正文插图（上传后在光标处插 [图N] 占位标记）；文件附件仅发帖态 -->
      <view class="media-add-row">
        <view
          v-if="type === 'post' ? images.length < 9 : articleImages.length < ARTICLE_IMG_MAX"
          class="media-add-btn"
          :class="{ disabled: imgUploading }"
          @tap="type === 'post' ? handleImageUpload() : handleArticleImageInsert()"
        >
          <app-icon :name="imgUploading ? 'loader-2' : 'image-plus'" :size="48" color="#8a8a8a" :class="{ spin: imgUploading }" />
          <text class="media-add-text">{{ imgUploading ? '上传中…' : (type === 'post' ? '添加图片' : '插入图片') }}</text>
        </view>
        <view v-if="type === 'post' && attachments.length < 3" class="media-add-btn" :class="{ disabled: fileUploading }" @tap="handleFileUpload">
          <app-icon :name="fileUploading ? 'loader-2' : 'file-text'" :size="48" color="#8a8a8a" :class="{ spin: fileUploading }" />
          <text class="media-add-text">{{ fileUploading ? '上传中…' : '添加文件' }}</text>
        </view>
      </view>

      <!-- 封面（文章必选·体验标准 V1.0 五·附节：手动上传 + 底部「封面」AI 生成双入口） -->
      <view v-if="type === 'article'" class="cover-block">
        <text class="cover-label">封面图 <text class="cover-req">*</text></text>
        <view v-if="cover" class="cover-wrap">
          <image lazy-load :src="cover" class="cover-img" mode="aspectFill" />
          <view class="cover-del" @tap="cover = ''">
            <app-icon name="x" :size="16" color="#fff" />
          </view>
        </view>
        <view v-else class="cover-upload-btn" :class="{ disabled: coverUploading }" @tap="handleCoverUpload">
          <app-icon :name="coverUploading ? 'loader-2' : 'image-plus'" :size="40" color="#8a8a8a" :class="{ spin: coverUploading }" />
          <text class="cover-upload-text">{{ coverUploading ? '上传中…' : '上传封面图' }}</text>
        </view>
        <text class="cover-hint">建议 16:9 横图 · 1280×720 以上，也可用底部「封面」AI 生成</text>
      </view>

      <view v-if="type === 'article'" class="layout-block">
        <text class="cover-label">文章展示形式</text>
        <view class="layout-grid">
          <view
            v-for="option in layoutOptions"
            :key="option.value"
            class="layout-option"
            :class="{ active: articleLayout === option.value }"
            @tap="articleLayout = option.value"
          >
            <view class="layout-preview" :class="`layout-preview--${option.value.toLowerCase()}`">
              <i /><i /><i />
            </view>
            <text class="layout-name">{{ option.name }}</text>
            <text class="layout-desc">{{ option.desc }}</text>
          </view>
        </view>
        <text class="cover-hint">“智能匹配”会按正文配图数量自动选择；专题、图集、专栏可手动指定。</text>
      </view>

      <view v-if="type === 'article'" class="visibility-block">
        <text class="cover-label">发布范围</text>
        <view class="visibility-switch">
          <view :class="{ active: visibility === 'CIRCLE_ONLY' }" @tap="visibility = 'CIRCLE_ONLY'">
            <text>仅圈内</text>
            <text class="visibility-desc">圈子成员可见</text>
          </view>
          <view :class="{ active: visibility === 'PLATFORM' }" @tap="visibility = 'PLATFORM'">
            <text>全平台</text>
            <text class="visibility-desc">审核后进入文章专区</text>
          </view>
        </view>
      </view>

      <!-- 关联商品（文章带货作者端·可选·上限3件·帖子模式不显示；发布成功后逐件 POST /articles/:id/recommends 挂载） -->
      <view v-if="type === 'article'" class="product-block">
        <text class="cover-label">关联商品 <text class="product-optional">（可选 · 最多 3 件，展示在文章「文中好物」）</text></text>
        <view v-if="linkedProducts.length > 0" class="linked-scroll">
          <view v-for="(p, i) in linkedProducts" :key="p.id" class="linked-card">
            <image lazy-load :src="p.cover" class="linked-img" mode="aspectFill" />
            <text class="linked-name">{{ p.name }}</text>
            <text class="linked-price">¥{{ p.price }}</text>
            <view class="linked-del" @tap="removeLinkedProduct(i)">
              <app-icon name="x" :size="12" color="#fff" />
            </view>
          </view>
        </view>
        <view v-if="linkedProducts.length < 3" class="product-add-btn" @tap="openProductSelect">
          <app-icon name="shopping-bag" :size="16" color="#8a8a8a" />
          <text class="product-add-text">{{ linkedProducts.length ? '继续添加商品' : '添加商品' }}</text>
        </view>
      </view>
    </view>

    <!-- 选择圈子（必选，后端发帖/发文章均需归属圈子） -->
    <!-- 从圈子进入时圈子已定，改只读展示（无下拉箭头/不可点），少一个无效决策点 -->
    <view class="select-row" @tap="!circleLocked && (showCircleSelect = true)">
      <template v-if="selectedCircleData">
        <view class="circle-avatar">
          <image lazy-load :src="selectedCircleData.cover" class="circle-avatar-img" mode="aspectFill" />
        </view>
        <text class="select-text">{{ selectedCircleData.name }}</text>
      </template>
      <template v-else>
        <app-icon name="hash" :size="16" color="#8a8a8a" />
        <text class="select-placeholder">选择要发布到的圈子</text>
      </template>
      <app-icon v-if="!circleLocked" name="chevron-down" :size="16" color="#8a8a8a" class="select-arrow" />
    </view>

    <!-- 选择标签（仅文章，后端文章支持 tags，帖子无标签字段） -->
    <view v-if="type === 'article'" class="select-row" @tap="showTopicSelect = true">
      <app-icon name="tag" :size="16" color="#8a8a8a" />
      <view v-if="selectedTopics.length > 0" class="topic-tags">
        <text v-for="t in selectedTopics" :key="t" class="topic-tag">#{{ t }}</text>
      </view>
      <text v-else class="select-placeholder">添加标签</text>
      <app-icon name="chevron-down" :size="16" color="#8a8a8a" class="select-arrow" />
    </view>

    <!-- 底部工具栏（引用/斜体/粗体三个 Markdown 小图标已按拍板移除：帖子是轻内容不需要富文本；图片/文件入口上移为编辑区虚线大按钮） -->
    <view class="toolbar">
      <view class="tool-ai">
        <!-- 创-P3 创作助手抽屉入口（引用/命盘/案例/润色四合一·原独立润色并入第四 tab） -->
        <view class="ai-chip ai-red" @tap="showAssist = true">
          <app-icon name="sparkles" :size="12" color="#C41E3A" />
          <text class="ai-chip-text red">创作助手</text>
        </view>
        <!-- AI 一键排版：只加格式不改字（帖子/文章通用），排版中禁重复点 -->
        <view class="ai-chip ai-purple" :class="{ disabled: typesetting }" @tap="handleTypeset">
          <app-icon :name="typesetting ? 'loader-2' : 'type'" :size="12" color="#7c3aed" :class="{ spin: typesetting }" />
          <text class="ai-chip-text purple">{{ typesetting ? 'AI排版中…' : 'AI排版' }}</text>
        </view>
        <template v-if="type === 'article'">
          <view class="ai-chip ai-blue" @tap="openAIPanel('title')">
            <app-icon name="wand-2" :size="12" color="#2563eb" />
            <text class="ai-chip-text blue">标题</text>
          </view>
          <view class="ai-chip ai-green" @tap="openAIPanel('cover')">
            <app-icon name="image-plus" :size="12" color="#059669" />
            <text class="ai-chip-text green">封面</text>
          </view>
          <view class="ai-chip ai-orange" @tap="openAIPanel('tags')">
            <app-icon name="tag" :size="12" color="#ea580c" />
            <text class="ai-chip-text orange">标签</text>
          </view>
        </template>
      </view>
    </view>

    <!-- 圈子选择弹窗 -->
    <view v-if="showCircleSelect" class="mask" @tap="showCircleSelect = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-header">
          <text class="sheet-title center">选择圈子</text>
        </view>
        <view class="sheet-body">
          <view v-if="circlesLoading" class="sheet-state">
            <app-icon name="loader-2" :size="28" color="#a855f7" class="spin" />
            <text class="sheet-state-text">加载中...</text>
          </view>
          <view v-else-if="circles.length === 0" class="sheet-state">
            <text class="sheet-state-text">你还没有加入任何圈子</text>
          </view>
          <view
            v-for="circle in circles"
            :key="circle.id"
            class="opt-row"
            :class="{ active: selectedCircle === circle.id }"
            @tap="selectCircle(circle.id)"
          >
            <view class="opt-avatar"><image lazy-load :src="circle.cover" class="opt-avatar-img" mode="aspectFill" /></view>
            <text class="opt-text">{{ circle.name }}</text>
            <app-icon v-if="selectedCircle === circle.id" name="check" :size="20" color="#C41E3A" class="opt-check" />
          </view>
        </view>
      </view>
    </view>

    <!-- 标签选择弹窗 -->
    <view v-if="showTopicSelect" class="mask" @tap="showTopicSelect = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-header between">
          <text class="sheet-count">已选 {{ selectedTopics.length }}/3</text>
          <text class="sheet-title">选择标签</text>
          <text class="sheet-done" @tap="showTopicSelect = false">完成</text>
        </view>
        <view class="sheet-body">
          <view v-if="tags.length === 0" class="sheet-state">
            <text class="sheet-state-text">暂无热门标签</text>
          </view>
          <view v-else class="topic-pool">
            <view
              v-for="tag in tags"
              :key="tag.id"
              class="topic-pick"
              :class="{ active: selectedTopics.includes(tag.name) }"
              @tap="toggleTopic(tag.name)"
            >
              #{{ tag.name }}
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 选品抽屉（文章带货·商品库=GET /videos/products 全平台在售·多选上限3件） -->
    <view v-if="showProductSelect" class="mask" @tap="showProductSelect = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-header between">
          <text class="sheet-count">已选 {{ linkedProducts.length }}/3</text>
          <text class="sheet-title">选择商品</text>
          <text class="sheet-done" @tap="showProductSelect = false">完成</text>
        </view>
        <view class="sheet-body">
          <view v-if="productLibLoading" class="sheet-state">
            <app-icon name="loader-2" :size="28" color="#a855f7" class="spin" />
            <text class="sheet-state-text">加载中...</text>
          </view>
          <view v-else-if="productLib.length === 0" class="sheet-state">
            <text class="sheet-state-text">暂无在售商品</text>
          </view>
          <view
            v-for="p in productLib"
            :key="p.id"
            class="opt-row"
            :class="{ active: isProductLinked(p.id) }"
            @tap="toggleLinkedProduct(p)"
          >
            <view class="opt-product-img"><image lazy-load :src="p.cover" class="opt-avatar-img" mode="aspectFill" /></view>
            <view class="opt-product-info">
              <text class="opt-text ellipsis">{{ p.name }}</text>
              <text class="opt-product-price">¥{{ p.price }}</text>
            </view>
            <app-icon v-if="isProductLinked(p.id)" name="check" :size="20" color="#C41E3A" class="opt-check" />
          </view>
        </view>
      </view>
    </view>

    <!-- AI面板 -->
    <view v-if="showAIPanel" class="mask" @tap="showAIPanel = null">
      <view class="sheet ai-sheet" @tap.stop>
        <view class="sheet-header between">
          <view @tap="showAIPanel = null"><app-icon name="x" :size="20" color="#1a1a1a" /></view>
          <view class="ai-sheet-title">
            <app-icon name="sparkles" :size="16" color="#a855f7" />
            <text class="ai-sheet-title-text">{{ aiPanelTitle }}</text>
          </view>
          <view class="ai-sheet-spacer" />
        </view>

        <view class="sheet-body">
          <view v-if="aiLoading" class="ai-loading">
            <app-icon name="loader-2" :size="32" color="#a855f7" class="spin" />
            <text class="ai-loading-text">AI正在思考中...</text>
          </view>

          <template v-else>
            <!-- 标题建议 -->
            <view v-if="showAIPanel === 'title' && aiResult" class="ai-section">
              <view
                v-for="(s, i) in aiResult.titles"
                :key="i"
                class="title-sug"
                @tap="applyTitle(s)"
              >{{ s }}</view>
              <view class="ai-refresh-full" @tap="handleAITitle">
                <app-icon name="refresh-cw" :size="16" color="#8a8a8a" />
                <text class="ai-refresh-text">换一批</text>
              </view>
            </view>

            <!-- 标签推荐 -->
            <view v-if="showAIPanel === 'tags' && aiResult" class="ai-section">
              <view class="tag-pool">
                <view
                  v-for="(tag, i) in aiResult.tags"
                  :key="i"
                  class="tag-pick"
                  :class="{ active: selectedTopics.includes(tag) }"
                  @tap="pickTag(tag)"
                >{{ tag }}</view>
              </view>
              <view class="ai-actions">
                <view class="ai-apply orange" @tap="showAIPanel = null">完成选择</view>
                <view class="ai-refresh" @tap="handleAITags"><app-icon name="refresh-cw" :size="16" color="#8a8a8a" /></view>
              </view>
            </view>

            <!-- 封面生成 -->
            <view v-if="showAIPanel === 'cover'" class="ai-section">
              <view class="cover-gen">
                <text class="cover-gen-label">描述你想要的封面</text>
                <textarea
                  v-model="coverPrompt"
                  class="cover-gen-input"
                  placeholder="例如：古典中国风，山水画背景，配八卦图案..."
                  placeholder-class="ph"
                />
              </view>
              <!-- 真实图片 -->
              <image lazy-load
                v-if="aiResult && aiResult.imageUrl"
                :src="aiResult.imageUrl"
                class="cover-gen-result"
                mode="aspectFill"
              />
              <!-- 降级：图片生成服务未配置，仅返回设计提示词 -->
              <view v-else-if="aiResult && aiResult.designPrompt" class="cover-gen-fallback">
                <text class="cover-gen-fallback-label">AI 已生成封面设计提示词（图片生成服务待配置）：</text>
                <text class="cover-gen-fallback-text">{{ aiResult.designPrompt }}</text>
              </view>
              <view class="ai-actions">
                <template v-if="aiResult && aiResult.imageUrl">
                  <view class="ai-apply green" @tap="useCover">使用此封面</view>
                  <view class="ai-refresh" @tap="handleAICover"><app-icon name="refresh-cw" :size="16" color="#8a8a8a" /></view>
                </template>
                <view v-else class="ai-apply green full" :class="{ disabled: !coverPrompt.trim() }" @tap="handleAICover">生成封面</view>
              </view>
            </view>
          </template>
        </view>
      </view>
    </view>

    <!-- 创-P3 创作助手抽屉（引用/命盘/案例/润色） -->
    <creation-assist-drawer
      :visible="showAssist"
      :content="content"
      :tags="selectedTopics"
      @close="showAssist = false"
      @insert="handleAssistInsert"
      @apply-polish="handleAssistPolish"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { uploadImage, uploadDocument } from '@/utils/request'
import { composeArticleHtml, decomposeArticleHtml } from '@/utils/rich-content'
import { navigateBack } from '@/utils/router'
import { VOICE } from '@/lib/voice'
import { circleApi } from '@/lib/circle-data'
import { circleDetailApi } from '@/lib/circle-detail-data'
import { articleApi, tagApi, addArticleRecommend, type ProductLibraryItem, type ArticleLayout } from '@/lib/article-data'
import { publishAssistApi } from '@/pkg-circle/lib/publish-assist-data'
import CreationAssistDrawer from '@/pkg-circle/components/creation-assist-drawer.vue'

interface CircleItem { id: string; name: string; cover: string }

const statusBarHeight = ref(0)

const type = ref<'post' | 'article'>('post')
const title = ref('')
const excerpt = ref('')
const content = ref('')
const cover = ref('')                        // 封面图：AI 生成的 base64 data url 或本地临时路径
const articleLayout = ref<ArticleLayout>('AUTO')
const visibility = ref<'CIRCLE_ONLY' | 'PLATFORM'>('CIRCLE_ONLY')
const layoutOptions: { value: ArticleLayout; name: string; desc: string }[] = [
  { value: 'AUTO', name: '智能匹配', desc: '按配图自动编排' },
  { value: 'FEATURE', name: '专题大图', desc: '适合深度策划' },
  { value: 'GALLERY', name: '图集叙事', desc: '适合三图以上' },
  { value: 'COLUMN', name: '专栏文章', desc: '适合观点长文' },
]
const images = ref<string[]>([])             // 已上传成功的图片 URL（选图后即传 COS，发布时直接带 URL）
const attachments = ref<{ name: string; size: number; url: string }[]>([]) // 文件卡附件（≤3 个·COS /upload/file）

// ── 文章正文插图（占位标记式·微博长文同款）：正文 [图N] 标记 ↔ articleImages[N-1] ──
const ARTICLE_IMG_MAX = 20
const articleImages = ref<string[]>([])      // 文章配图 URL 列表（已传 COS）
// 正文 textarea 最近一次光标位（@blur/@input 的 e.detail.cursor·uni-app H5/MP 均带该字段）；
// null=从未拿到（如从未聚焦），插图退化为追加到正文末尾。非响应式，纯记录用
let lastCursor: number | null = null
const imgUploading = ref(false)
const fileUploading = ref(false)
const selectedCircle = ref<string | null>(null)
const selectedTopics = ref<string[]>([])     // 已选标签名（文章 tags）
const circles = ref<CircleItem[]>([])
const circlesLoading = ref(false)
const tags = ref<{ id: string; name: string }[]>([])

// ── 文章带货 · 关联商品（可选 ≤3 件·发布成功后逐件 POST recommends 挂载·存草稿不挂）──
const linkedProducts = ref<ProductLibraryItem[]>([])
const showProductSelect = ref(false)
const productLib = ref<ProductLibraryItem[]>([])
const productLibLoading = ref(false)
let productLibLoaded = false   // 商品库懒加载一次（打开抽屉才拉，避免发帖用户白拉）

const showCircleSelect = ref(false)
/** 从圈子详情带 circleId 进入时圈子锁定，选择行退化为只读展示 */
const circleLocked = ref(false)
const showTopicSelect = ref(false)
const showAssist = ref(false)   // 创-P3 创作助手抽屉
const showAIPanel = ref<'title' | 'tags' | 'cover' | null>(null)
const aiLoading = ref(false)
// AI 返回结构不定（润色/标题/标签/封面各异），保守保留 any
const aiResult = ref<any>(null)
const coverPrompt = ref('')
const saving = ref(false)
const publishing = ref(false)
const typesetting = ref(false)   // AI 一键排版进行中（禁重复点）

// 续编：从草稿箱带 draftId 进来，加载草稿全文续写；保存回写同一草稿（updateDraft），发布走 publishDraft
const editingDraftId = ref<string | null>(null)
// 本地草稿兜底 storage key（防误触返回丢失长内容·纯前端·成功提交后清）
const LOCAL_DRAFT_KEY = 'draft:circle-editor'
// 已成功提交/发布，onUnload 不再回写本地缓存
let submittedClean = false

// 发文章需圈主/合伙人/管理员（后端 ensureCircleAdmin）。前置查角色，非管理员只能发帖，避免写完才 403。
const myRole = ref<string | null>(null)
const roleLoaded = ref(false)
const canPublishArticle = computed(() => ['OWNER', 'PARTNER', 'ADMIN'].includes(myRole.value || ''))

async function refreshRole(circleId: string | null) {
  roleLoaded.value = false
  myRole.value = null
  if (!circleId) { roleLoaded.value = true; return }
  try {
    const s = await circleDetailApi.getJoinStatus(circleId)
    myRole.value = s.role
  } catch {
    myRole.value = null
  } finally {
    roleLoaded.value = true
    // 已知不是管理员却停在文章模式时，回退到发帖
    if (type.value === 'article' && !canPublishArticle.value) type.value = 'post'
  }
}

const selectedCircleData = computed(() => circles.value.find(c => c.id === selectedCircle.value))
const aiPanelTitle = computed(() => {
  const m: Record<string, string> = { title: '标题优化', tags: '标签推荐', cover: '生成封面' }
  return showAIPanel.value ? m[showAIPanel.value] : ''
})

onLoad((opts) => {
  if (opts?.draftId) {
    // 续编模式：加载后端草稿全文，忽略本地缓存
    loadDraft(opts.draftId)
    return
  }
  if (opts?.circleId) {
    selectedCircle.value = opts.circleId
    circleLocked.value = true
    refreshRole(opts.circleId)
  }
  // 圈子「写文章」入口直达文章模式（双轨合并：publish.vue 文章表单退役·统一走本编辑器）
  if (opts?.type === 'article') type.value = 'article'
  // 无草稿参数时，检测本地兜底草稿，提示恢复
  restoreLocalDraft()
})

/** 续编：拉草稿全文（草稿也是 article，GET /articles/:id 可取），填充表单并回写模式 */
async function loadDraft(draftId: string) {
  editingDraftId.value = draftId
  type.value = 'article'
  uni.showLoading({ title: '加载中' })
  try {
    const d = await articleApi.detail(draftId)
    title.value = d.title || ''
    // 草稿存的是组装 HTML → 反解回「纯文本 + [图N] 标记 + 配图列表」回填 textarea（旧纯文本草稿原样返回）
    const parsed = decomposeArticleHtml(d.content || '')
    content.value = parsed.text
    articleImages.value = parsed.images
    cover.value = d.cover || ''
    excerpt.value = d.excerpt || ''
    articleLayout.value = d.layout || 'AUTO'
    visibility.value = d.visibility || 'CIRCLE_ONLY'
    selectedTopics.value = Array.isArray(d.tags) ? d.tags.slice(0, 3) : []
    if (d.circleId) {
      selectedCircle.value = d.circleId
      refreshRole(d.circleId)
    }
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '草稿加载失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

/** 本地兜底草稿：读缓存 → 若有内容且当前为空则询问恢复 */
function restoreLocalDraft() {
  try {
    const raw = uni.getStorageSync(LOCAL_DRAFT_KEY)
    if (!raw) return
    // 缓存结构由本页写入，字段与表单一一对应
    const c = (typeof raw === 'string' ? JSON.parse(raw) : raw) as {
      type?: 'post' | 'article'; title?: string; content?: string; cover?: string; excerpt?: string; articleLayout?: ArticleLayout; visibility?: 'CIRCLE_ONLY' | 'PLATFORM'
      images?: string[]; articleImages?: string[]
      attachments?: { name: string; size: number; url: string }[]
      selectedCircle?: string | null; selectedTopics?: string[]
    }
    if (!c || (!c.content?.trim() && !c.title?.trim())) { uni.removeStorageSync(LOCAL_DRAFT_KEY); return }
    if (content.value.trim() || title.value.trim()) return // 当前已有内容，不覆盖
    uni.showModal({
      title: '恢复未完成的内容',
      content: '检测到上次未发布的草稿，是否恢复继续编辑？',
      confirmText: '恢复',
      cancelText: '不用了',
      success: (r) => {
        if (r.confirm) {
          type.value = c.type === 'article' ? 'article' : 'post'
          title.value = c.title || ''
          content.value = c.content || ''
          cover.value = c.cover || ''
          excerpt.value = c.excerpt || ''
          articleLayout.value = c.articleLayout || 'AUTO'
          visibility.value = c.visibility || 'CIRCLE_ONLY'
          images.value = Array.isArray(c.images) ? c.images : []
          articleImages.value = Array.isArray(c.articleImages) ? c.articleImages : []
          attachments.value = Array.isArray(c.attachments) ? c.attachments : []
          selectedTopics.value = Array.isArray(c.selectedTopics) ? c.selectedTopics : []
          if (c.selectedCircle) { selectedCircle.value = c.selectedCircle; refreshRole(c.selectedCircle) }
        } else {
          uni.removeStorageSync(LOCAL_DRAFT_KEY)
        }
      },
    })
  } catch {
    // 缓存解析失败：清掉脏数据，不阻断
    try { uni.removeStorageSync(LOCAL_DRAFT_KEY) } catch { /* noop */ }
  }
}

function clearLocalDraft() {
  try { uni.removeStorageSync(LOCAL_DRAFT_KEY) } catch { /* noop */ }
}

// 切页/退出时兜底：有内容且非刚提交，则把关键字段存本地（防误触返回丢失长内容）
onUnload(() => {
  if (submittedClean) { clearLocalDraft(); return }
  if (!content.value.trim() && !title.value.trim()) { clearLocalDraft(); return }
  try {
    uni.setStorageSync(LOCAL_DRAFT_KEY, JSON.stringify({
      type: type.value,
      title: title.value,
      content: content.value,
      cover: cover.value,
      excerpt: excerpt.value,
      articleLayout: articleLayout.value,
      visibility: visibility.value,
      images: images.value,
      articleImages: articleImages.value,
      attachments: attachments.value,
      selectedCircle: selectedCircle.value,
      selectedTopics: selectedTopics.value,
    }))
  } catch { /* 存储失败静默，不影响退出 */ }
})

onMounted(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 0
  } catch (e) {}
  loadCircles()
  loadTags()
})

async function loadCircles() {
  circlesLoading.value = true
  try {
    const list = await circleApi.my()
    circles.value = list.map(c => ({ id: c.id, name: c.name, cover: c.cover }))
  } catch {
    circles.value = []
  } finally {
    circlesLoading.value = false
  }
}

async function loadTags() {
  try {
    const hot = await tagApi.hot(15)
    tags.value = hot.map(t => ({ id: t.id, name: t.name }))
  } catch {
    tags.value = []
  }
}

function goBack() { navigateBack() }

/** 选图后立即上传 COS，images 存真实 URL（此前直接存本地临时路径，发布后图片失效） */
function handleImageUpload() {
  if (imgUploading.value) return
  uni.chooseImage({
    count: Math.max(1, 9 - images.value.length),
    sizeType: ['compressed'],
    // uni.chooseImage 成功回调类型由 SDK 重载约束，保留 any
    success: async (res: any) => {
      const paths: string[] = res.tempFilePaths || []
      if (!paths.length) return
      imgUploading.value = true
      let failed = 0
      for (const p of paths) {
        try {
          images.value.push(await uploadImage(p))
        } catch {
          failed++
        }
      }
      imgUploading.value = false
      if (failed) uni.showToast({ title: `${failed} 张图片上传失败`, icon: 'none' })
    },
  })
}
function removeImage(i: number) { images.value.splice(i, 1) }

/** 正文光标追踪：uni-app textarea 的 blur/input 事件 detail 均带 cursor 字段（H5 端为 selection 位置）。
 *  入参收宽为 unknown（Vue DOM 类型把 blur 标成 FocusEvent·detail:number，与 uni 运行时口径不符），内部自行收窄 */
function onContentCursor(e: unknown) {
  const c = (e as { detail?: { cursor?: number } } | undefined)?.detail?.cursor
  if (typeof c === 'number' && c >= 0) lastCursor = c
}

/** 在光标处插入占位标记块（拿不到光标则追加末尾）；标记前后补换行避免与文字黏连 */
function insertMarkersAtCursor(markers: string[]) {
  const text = content.value
  const at = lastCursor !== null ? Math.min(Math.max(lastCursor, 0), text.length) : text.length
  const before = text.slice(0, at)
  const after = text.slice(at)
  const block = markers.join('\n')
  const prefix = before && !/\n$/.test(before) ? '\n' : ''
  const suffix = after && !/^\n/.test(after) ? '\n' : ''
  content.value = `${before}${prefix}${block}${suffix}${after}`
  lastCursor = (before + prefix + block + suffix).length
}

/** 文章模式插图：选图 → 传 COS → 光标处插入 [图N] 标记（N=配图序号，与预览区角标一致） */
function handleArticleImageInsert() {
  if (imgUploading.value) return
  uni.chooseImage({
    count: Math.max(1, Math.min(9, ARTICLE_IMG_MAX - articleImages.value.length)),
    sizeType: ['compressed'],
    // uni.chooseImage 成功回调类型由 SDK 重载约束，保留 any
    success: async (res: any) => {
      const paths: string[] = res.tempFilePaths || []
      if (!paths.length) return
      imgUploading.value = true
      const uploaded: string[] = []
      let failed = 0
      for (const p of paths) {
        try {
          uploaded.push(await uploadImage(p))
        } catch {
          failed++
        }
      }
      imgUploading.value = false
      if (uploaded.length) {
        const startN = articleImages.value.length + 1
        articleImages.value.push(...uploaded)
        insertMarkersAtCursor(uploaded.map((_, k) => `[图${startN + k}]`))
      }
      if (failed) uni.showToast({ title: `${failed} 张图片上传失败`, icon: 'none' })
    },
  })
}

/** 删除文章配图：同步移除正文对应 [图N] 标记，并把后续序号前移一位。
 *  重排实现=升序逐号字符串替换（[图j]→[图j-1]，目标号刚被腾出不会撞车；
 *  右括号定界保证 [图1] 不会误伤 [图10]）。文本重排后旧光标失真，置空退化为末尾插入 */
function removeArticleImage(i: number) {
  const total = articleImages.value.length
  articleImages.value.splice(i, 1)
  let text = content.value.split(`[图${i + 1}]`).join('')
  for (let j = i + 2; j <= total; j++) {
    text = text.split(`[图${j}]`).join(`[图${j - 1}]`)
  }
  content.value = text.replace(/\n{3,}/g, '\n\n')
  lastCursor = null
}

/** 文章封面手动上传（封面必选后不能只留 AI 生成一条路——生图服务未配置时会把发文章堵死） */
const coverUploading = ref(false)
function handleCoverUpload() {
  if (coverUploading.value) return
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    // uni.chooseImage 成功回调类型由 SDK 重载约束，保留 any
    success: async (res: any) => {
      const p: string | undefined = (res.tempFilePaths || [])[0]
      if (!p) return
      coverUploading.value = true
      try {
        cover.value = await uploadImage(p)
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '封面上传失败', icon: 'none' })
      } finally {
        coverUploading.value = false
      }
    },
  })
}

/** 文档附件扩展名白名单（与后端 /upload/file MIME 白名单对应） */
const DOC_EXTS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.zip']
const MAX_DOC_SIZE = 50 * 1024 * 1024

function formatFileSize(size: number): string {
  if (!size) return ''
  if (size < 1024) return `${size}B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`
  return `${(size / 1024 / 1024).toFixed(1)}MB`
}

/** 跨端选文件：H5 用 uni.chooseFile；微信小程序用 chooseMessageFile；其余端提示暂不支持 */
function chooseDocFiles(count: number): Promise<Array<{ path: string; name: string; size: number }>> {
  return new Promise((resolve, reject) => {
    // 选文件回调结构跨端不一（tempFiles/tempFilePaths），保守用宽松类型
    const normalize = (res: { tempFiles?: Array<{ path?: string; name?: string; size?: number }>; tempFilePaths?: string[] }) => {
      const files = (res.tempFiles || []).map((f, i) => ({
        path: f.path || res.tempFilePaths?.[i] || '',
        name: f.name || `文件${i + 1}`,
        size: f.size || 0,
      })).filter((f) => f.path)
      resolve(files)
    }
    const u = uni as unknown as Record<string, (opts: Record<string, unknown>) => void>
    let handled = false
    // #ifdef H5
    handled = true
    u.chooseFile({ count, type: 'all', extension: DOC_EXTS, success: normalize, fail: () => reject(new Error('已取消')) })
    // #endif
    // #ifdef MP-WEIXIN
    handled = true
    u.chooseMessageFile({ count, type: 'file', extension: DOC_EXTS.map((e) => e.slice(1)), success: normalize, fail: () => reject(new Error('已取消')) })
    // #endif
    if (!handled) reject(new Error('当前端暂不支持选择文件'))
  })
}

/** 添加文件：选择 → 校验扩展名/大小 → 上传 COS → 文件卡入列 */
async function handleFileUpload() {
  if (fileUploading.value) return
  let files: Array<{ path: string; name: string; size: number }> = []
  try {
    files = await chooseDocFiles(Math.max(1, 3 - attachments.value.length))
  } catch (e) {
    const msg = (e as Error)?.message || ''
    if (msg && msg !== '已取消') uni.showToast({ title: msg, icon: 'none' })
    return
  }
  if (!files.length) return
  fileUploading.value = true
  let failed = 0
  for (const f of files) {
    const ext = (f.name.match(/\.[^.]+$/)?.[0] || '').toLowerCase()
    if (!DOC_EXTS.includes(ext)) { uni.showToast({ title: `不支持的文件类型：${f.name}`, icon: 'none' }); continue }
    if (f.size > MAX_DOC_SIZE) { uni.showToast({ title: `文件超过 50MB：${f.name}`, icon: 'none' }); continue }
    try {
      const url = await uploadDocument(f.path)
      attachments.value.push({ name: f.name, size: f.size, url })
    } catch {
      failed++
    }
  }
  fileUploading.value = false
  if (failed) uni.showToast({ title: `${failed} 个文件上传失败`, icon: 'none' })
}
function removeAttachment(i: number) { attachments.value.splice(i, 1) }

function selectCircle(id: string) {
  selectedCircle.value = id
  showCircleSelect.value = false
  refreshRole(id)
}

// 切换发帖/文章：非管理员选文章时拦下并提示
function onSelectType(t: 'post' | 'article') {
  if (t === 'article' && roleLoaded.value && !canPublishArticle.value) {
    uni.showToast({ title: selectedCircle.value ? '仅圈主/管理员可发文章' : '请先选择圈子', icon: 'none' })
    return
  }
  type.value = t
}
// ── 关联商品：打开抽屉（懒加载商品库）/ 勾选切换 / 移除 ──
function isProductLinked(id: string) { return linkedProducts.value.some(p => p.id === id) }
async function openProductSelect() {
  showProductSelect.value = true
  if (productLibLoaded) return
  productLibLoading.value = true
  try {
    productLib.value = await articleApi.getProductLibrary()
    productLibLoaded = true
  } catch {
    productLib.value = []
  } finally {
    productLibLoading.value = false
  }
}
function toggleLinkedProduct(p: ProductLibraryItem) {
  const idx = linkedProducts.value.findIndex(x => x.id === p.id)
  if (idx >= 0) { linkedProducts.value.splice(idx, 1); return }
  if (linkedProducts.value.length >= 3) { uni.showToast({ title: '最多关联 3 件商品', icon: 'none' }); return }
  linkedProducts.value.push(p)
}
function removeLinkedProduct(i: number) { linkedProducts.value.splice(i, 1) }

/** 发布成功后挂品（失败不阻断发布主流程，仅提示；后端校验作者本人） */
async function attachLinkedProducts(articleId: string): Promise<number> {
  if (!linkedProducts.value.length) return 0
  const results = await Promise.allSettled(
    linkedProducts.value.map((p, i) => addArticleRecommend(articleId, p.id, { title: p.name, cover: p.cover, sortOrder: i })),
  )
  return results.filter(r => r.status === 'rejected').length
}

function toggleTopic(name: string) {
  const idx = selectedTopics.value.indexOf(name)
  if (idx >= 0) selectedTopics.value.splice(idx, 1)
  else if (selectedTopics.value.length < 3) selectedTopics.value.push(name)
}

function openAIPanel(panel: 'title' | 'tags' | 'cover') {
  showAIPanel.value = panel
  aiResult.value = null
  if (panel === 'title') handleAITitle()
  else if (panel === 'tags') { if (content.value.trim()) handleAITags() }
  else if (panel === 'cover') coverPrompt.value = ''
}

/** 创作助手插入：引用卡/命盘卡/案例卡文本追加到正文末尾（uni-app textarea 无跨端光标 API，只能尾插） */
function handleAssistInsert(text: string) {
  const cur = content.value.replace(/\s+$/, '')
  content.value = cur ? `${cur}\n\n${text}\n` : `${text}\n`
}

/** 创作助手润色应用：整文替换（与原独立润色面板行为一致） */
function handleAssistPolish(text: string) {
  content.value = text
}

async function handleAITitle() {
  const base = content.value.trim() || title.value.trim()
  if (!base) { uni.showToast({ title: '请先输入内容', icon: 'none' }); showAIPanel.value = null; return }
  aiLoading.value = true
  try {
    const res = await publishAssistApi.optimizeTitle(base)
    aiResult.value = { titles: res.titles }
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '生成失败', icon: 'none' })
    showAIPanel.value = null
  } finally { aiLoading.value = false }
}
async function handleAITags() {
  if (!content.value.trim()) { uni.showToast({ title: '请先输入内容', icon: 'none' }); showAIPanel.value = null; return }
  aiLoading.value = true
  try {
    const res = await publishAssistApi.suggestTags(content.value)
    aiResult.value = { tags: res.tags }
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '推荐失败', icon: 'none' })
    showAIPanel.value = null
  } finally { aiLoading.value = false }
}
async function handleAICover() {
  if (!coverPrompt.value.trim()) return
  aiLoading.value = true
  try {
    const res = await publishAssistApi.generateCover(coverPrompt.value)
    aiResult.value = res
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '生成失败', icon: 'none' })
  } finally { aiLoading.value = false }
}

function applyTitle(s: string) { title.value = s; showAIPanel.value = null }
function pickTag(tag: string) {
  if (!selectedTopics.value.includes(tag) && selectedTopics.value.length < 3) selectedTopics.value.push(tag)
}
function useCover() {
  if (aiResult.value?.imageUrl) { cover.value = aiResult.value.imageUrl; showAIPanel.value = null }
}

/** AI 一键排版：取当前正文 → 后端只加 Markdown 格式不改字。
 *  changed=true 则整文替换回正文；changed=false 说明 AI 改了字被后端拒绝，弹 warning 不动内容让用户重试 */
async function handleTypeset() {
  if (typesetting.value) return
  if (!content.value.trim()) { uni.showToast({ title: '请先输入内容', icon: 'none' }); return }
  typesetting.value = true
  try {
    const res = await publishAssistApi.typeset(content.value)
    if (res.changed) {
      content.value = res.formatted
      lastCursor = null   // 整文替换后旧光标失真，退化为末尾插入
      uni.showToast({ title: '排版完成', icon: 'success' })
    } else {
      // 后端拒绝（AI 改动了文字）：保留原文不替换，仅提示重试
      uni.showToast({ title: res.warning || 'AI 排版改动了文字，请重试', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '排版失败', icon: 'none' })
  } finally {
    typesetting.value = false
  }
}

/** 公共校验：内容 + 圈子必选 */
function validateBase(): boolean {
  if (!content.value.trim()) { uni.showToast({ title: '请输入内容', icon: 'none' }); return false }
  if (!selectedCircle.value) { uni.showToast({ title: '请选择要发布到的圈子', icon: 'none' }); return false }
  return true
}

function buildExcerpt(source: string): string {
  return source
    .replace(/\[图\d+\]/g, ' ')
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
}

async function handleSaveDraft() {
  if (saving.value) return
  if (!validateBase()) return
  if (type.value === 'article' && !canPublishArticle.value) { uni.showToast({ title: '仅圈主/合伙人/管理员可发文章', icon: 'none' }); return }
  saving.value = true
  try {
    if (type.value === 'article') {
      // 草稿也存组装 HTML（后端草稿即文章，渲染端统一走 HTML 分支）；续编回填时 decompose 反解
      const articleHtml = composeArticleHtml(content.value, articleImages.value)
      if (editingDraftId.value) {
        // 续编回写同一草稿，避免重复生成
        await articleApi.updateDraft(editingDraftId.value, {
          title: title.value.trim() || '无标题',
          content: articleHtml,
          cover: cover.value || undefined,
          excerpt: excerpt.value.trim() || buildExcerpt(content.value),
          layout: articleLayout.value,
          visibility: visibility.value,
          tags: selectedTopics.value,
        })
      } else {
        const res = await articleApi.saveDraft({
          title: title.value.trim() || '无标题',
          content: articleHtml,
          cover: cover.value || undefined,
          excerpt: excerpt.value.trim() || buildExcerpt(content.value),
          layout: articleLayout.value,
          visibility: visibility.value,
          tags: selectedTopics.value,
          circleId: selectedCircle.value!,
        })
        // 记录草稿 id，后续保存走 updateDraft
        if (res?.id) editingDraftId.value = res.id
      }
    } else {
      await articleApi.createPost(selectedCircle.value!, {
        type: images.value.length ? 'IMAGE' : (attachments.value.length ? 'FILE' : 'TEXT'),
        content: content.value,
        images: images.value.length ? images.value : undefined,
        attachments: attachments.value.length ? attachments.value : undefined,
        status: 'DRAFT',
      })
    }
    // 草稿已入后端，清本地兜底缓存（避免下次误恢复旧内容）
    clearLocalDraft()
    uni.showToast({ title: '草稿已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '保存失败', icon: 'none' })
  } finally { saving.value = false }
}

async function handlePublish() {
  if (publishing.value) return
  if (!validateBase()) return
  if (type.value === 'article' && !canPublishArticle.value) { uni.showToast({ title: '仅圈主/合伙人/管理员可发文章', icon: 'none' }); return }
  if (type.value === 'article' && !title.value.trim()) { uni.showToast({ title: '请输入文章标题', icon: 'none' }); return }
  // 文章封面必选（体验标准 V1.0 五·附节·董事长 2026-07-17 拍板）；发帖(post)不要求封面
  if (type.value === 'article' && !cover.value) { uni.showToast({ title: '请上传文章封面（建议 16:9 横图）', icon: 'none' }); return }
  publishing.value = true
  try {
    // 挂品失败数（挂品是发布后的附加动作，失败不阻断发布成功流程）
    let recFailed = 0
    if (type.value === 'article') {
      // 发布组装：纯文本 + [图N] 标记 + ##/### 小标题 → 规范 HTML（排版由渲染端 normalizeArticleContent 统一注入）
      const articleHtml = composeArticleHtml(content.value, articleImages.value)
      // 拿到文章 id 供发布后挂载关联商品（create 返回 {id}；草稿发布沿用 draftId 即文章 id）
      let publishedArticleId: string | null = null
      if (editingDraftId.value) {
        // 续编发布：先回写最新内容，再走草稿发布（DRAFT→PENDING）
        await articleApi.updateDraft(editingDraftId.value, {
          title: title.value.trim(),
          content: articleHtml,
          cover: cover.value || undefined,
          excerpt: excerpt.value.trim() || buildExcerpt(content.value),
          layout: articleLayout.value,
          visibility: visibility.value,
          tags: selectedTopics.value,
        })
        await articleApi.publishDraft(editingDraftId.value)
        publishedArticleId = editingDraftId.value
      } else {
        const res = await articleApi.create(selectedCircle.value!, {
          title: title.value.trim(),
          content: articleHtml,
          cover: cover.value || undefined,
          excerpt: excerpt.value.trim() || buildExcerpt(content.value),
          layout: articleLayout.value,
          visibility: visibility.value,
          tags: selectedTopics.value,
        })
        publishedArticleId = res?.id || null
      }
      // 发布成功后挂载关联商品（存草稿不挂；失败仅提示可稍后重试）
      if (publishedArticleId) recFailed = await attachLinkedProducts(publishedArticleId)
      else if (linkedProducts.value.length) recFailed = linkedProducts.value.length
    } else {
      await articleApi.createPost(selectedCircle.value!, {
        type: images.value.length ? 'IMAGE' : (attachments.value.length ? 'FILE' : 'TEXT'),
        content: content.value,
        images: images.value.length ? images.value : undefined,
        attachments: attachments.value.length ? attachments.value : undefined,
        status: 'PUBLISHED',
      })
    }
    // 已发布，标记清缓存（onUnload 不再回写）
    submittedClean = true
    clearLocalDraft()
    if (recFailed > 0) uni.showToast({ title: '已发布，商品关联失败可稍后在文章中重试', icon: 'none' })
    else uni.showToast({ title: VOICE.TOAST_PUBLISHED, icon: 'success' })
    // 广播圈子详情页立即刷新（配合后端 createPost 缓存失效，新帖即时可见·董事长反馈）
    uni.$emit('circle:refresh', selectedCircle.value)
    setTimeout(() => navigateBack(), 600)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '发布失败', icon: 'none' })
  } finally { publishing.value = false }
}
</script>

<style scoped>
.editor-page {
  min-height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
}

/* 顶部导航 */
.nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #fff;
  border-bottom: 1rpx solid #ececec;
}
.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 112rpx;
}
.nav-back { padding: 16rpx; margin-left: -16rpx; }
.nav-actions { display: flex; align-items: center; gap: 16rpx; }
.btn-draft {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
}
.btn-draft-text { font-size: 26rpx; color: #8a8a8a; }
.btn-publish {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 32rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.btn-publish.disabled { opacity: 0.5; }
.btn-draft.disabled { opacity: 0.5; }
.btn-publish-text { font-size: 26rpx; color: #fff; }

/* 类型选择 */
.type-bar {
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #ececec;
  display: flex;
  gap: 32rpx;
}
.type-item { padding-bottom: 8rpx; border-bottom: 4rpx solid transparent; }
.type-item.active { border-bottom-color: var(--brand); }
.type-item.disabled .type-text { color: #c4c4c4; }
.type-text { font-size: 28rpx; font-weight: 500; color: #8a8a8a; }
.type-text.active { color: var(--brand); }

/* 编辑区 */
.edit-area { flex: 1; padding: 32rpx; }
.title-input {
  width: 100%;
  font-size: 40rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 32rpx;
}
.excerpt-input {
  width: 100%;
  min-height: 92rpx;
  margin: -8rpx 0 24rpx;
  padding: 20rpx 24rpx;
  box-sizing: border-box;
  border-left: 4rpx solid rgba(196, 30, 58, 0.58);
  border-radius: 0 14rpx 14rpx 0;
  background: #faf7f1;
  color: #5e5851;
  font-size: 26rpx;
  line-height: 1.65;
}
.content-input {
  width: 100%;
  min-height: 400rpx;
  font-size: 32rpx;
  line-height: 1.6;
  color: #1a1a1a;
}
.ph { color: #8a8a8a; }

.img-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin-top: 32rpx;
}
.img-cell {
  position: relative;
  aspect-ratio: 1;
  border-radius: 16rpx;
  overflow: hidden;
  background: #f4f4f5;
}
.img-thumb { width: 100%; height: 100%; }
.img-del {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 40rpx;
  height: 40rpx;
  background: rgba(0,0,0,0.5);
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* 附件文件卡 */
.file-list { display: flex; flex-direction: column; gap: 16rpx; margin-top: 32rpx; }
.file-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 24rpx;
  background: #faf8f5;
  border: 1rpx solid #ececec;
  border-radius: 16rpx;
}
.file-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 12rpx;
  background: rgba(196,30,58,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.file-info { flex: 1; min-width: 0; }
.file-name {
  display: block;
  font-size: 28rpx;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-size { display: block; font-size: 22rpx; color: #8a8a8a; margin-top: 4rpx; }
.file-del { padding: 12rpx; flex-shrink: 0; }

/* 文章模式写作提示（插图/小标题语法） */
.article-hint { display: block; font-size: 22rpx; color: #999; margin-top: 8rpx; }

/* 文章配图预览区：横滑小图 + 序号角标 */
.article-img-block { margin-top: 32rpx; }
.article-img-scroll { display: flex; gap: 16rpx; overflow-x: auto; padding-bottom: 8rpx; }
.article-img-cell {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  flex-shrink: 0;
  border-radius: 16rpx;
  overflow: hidden;
  background: #f4f4f5;
}
.article-img-thumb { width: 100%; height: 100%; }
.article-img-badge {
  position: absolute;
  left: 0;
  bottom: 0;
  background: rgba(0,0,0,0.55);
  border-radius: 0 12rpx 0 0;
  padding: 4rpx 12rpx;
}
.article-img-badge-text { font-size: 20rpx; color: #fff; }

/* 添加图片/文件：虚线大按钮（明显入口） */
.media-add-row { display: flex; gap: 24rpx; margin-top: 32rpx; }
.media-add-btn {
  width: 200rpx;
  height: 200rpx;
  border: 2rpx dashed #c4c4c4;
  border-radius: 16rpx;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.media-add-btn.disabled { opacity: 0.6; }
.media-add-text { font-size: 26rpx; color: #8a8a8a; }

.cover-block { margin-top: 32rpx; }
.cover-label { font-size: 26rpx; color: #8a8a8a; margin-bottom: 16rpx; display: block; }
.cover-wrap {
  position: relative;
  aspect-ratio: 16/9;
  border-radius: 16rpx;
  overflow: hidden;
  background: #f4f4f5;
}
.cover-img { width: 100%; height: 100%; }
.cover-del {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  width: 48rpx;
  height: 48rpx;
  background: rgba(0,0,0,0.5);
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cover-req { color: #C41E3A; }
/* 封面手动上传入口（与 media-add-btn 同风格虚线框） */
.cover-upload-btn {
  height: 160rpx;
  border: 2rpx dashed #c4c4c4;
  border-radius: 16rpx;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.cover-upload-btn.disabled { opacity: 0.6; }
.cover-upload-text { font-size: 26rpx; color: #8a8a8a; }
/* 素材尺寸建议（体验标准 V1.0 五·附节） */
.cover-hint { display: block; font-size: 22rpx; color: #999; margin-top: 12rpx; }

.layout-block { margin-top: 32rpx; }
.layout-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}
.layout-option {
  padding: 18rpx;
  border: 2rpx solid #ece6dc;
  border-radius: 18rpx;
  background: #fff;
}
.layout-option.active {
  border-color: rgba(196, 30, 58, 0.72);
  background: #fff8f6;
  box-shadow: 0 8rpx 24rpx rgba(115, 37, 45, 0.08);
}
.layout-preview {
  height: 68rpx;
  margin-bottom: 12rpx;
  padding: 8rpx;
  border-radius: 10rpx;
  background: #f1ede6;
  display: grid;
  gap: 5rpx;
}
.layout-preview i { display: block; border-radius: 3rpx; background: #9e8465; opacity: 0.72; }
.layout-preview--auto { grid-template-columns: 1.4fr 0.8fr; grid-template-rows: 1fr 1fr; }
.layout-preview--auto i:first-child { grid-row: 1 / 3; }
.layout-preview--feature { grid-template-columns: 1fr; grid-template-rows: 2fr 0.45fr 0.35fr; }
.layout-preview--gallery { grid-template-columns: repeat(3, 1fr); grid-template-rows: 1fr; }
.layout-preview--column { grid-template-columns: 0.12fr 1fr; grid-template-rows: repeat(2, 1fr); }
.layout-preview--column i:first-child { grid-row: 1 / 3; background: #ba3148; }
.layout-name { display: block; color: #28231f; font-size: 25rpx; font-weight: 700; }
.layout-desc { display: block; margin-top: 3rpx; color: #99918a; font-size: 20rpx; }
.visibility-block { margin-top: 32rpx; }
.visibility-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}
.visibility-switch > view {
  padding: 20rpx 22rpx;
  border: 2rpx solid #ece6dc;
  border-radius: 16rpx;
  color: #38332f;
  font-size: 26rpx;
  font-weight: 650;
}
.visibility-switch > view.active {
  border-color: rgba(196, 30, 58, 0.65);
  background: #fff7f5;
  color: #b51f38;
}
.visibility-desc {
  display: block;
  margin-top: 4rpx;
  color: #9a938b;
  font-size: 20rpx;
  font-weight: 400;
}

/* 关联商品（文章带货作者端） */
.product-block { margin-top: 32rpx; }
.product-optional { color: #c4c4c4; font-size: 22rpx; }
.linked-scroll { display: flex; gap: 16rpx; margin-bottom: 16rpx; overflow-x: auto; }
.linked-card {
  position: relative;
  width: 176rpx;
  flex-shrink: 0;
  background: #faf8f5;
  border: 1rpx solid #ececec;
  border-radius: 16rpx;
  overflow: hidden;
  padding-bottom: 12rpx;
}
.linked-img { width: 176rpx; height: 176rpx; background: #f4f4f5; }
.linked-name {
  display: block;
  font-size: 22rpx;
  color: #1a1a1a;
  padding: 8rpx 12rpx 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.linked-price { display: block; font-size: 22rpx; color: #C41E3A; font-weight: 600; padding: 4rpx 12rpx 0; }
.linked-del {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 36rpx;
  height: 36rpx;
  background: rgba(0,0,0,0.5);
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.product-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  height: 88rpx;
  border: 2rpx dashed #c4c4c4;
  border-radius: 16rpx;
  background: #fafafa;
}
.product-add-text { font-size: 26rpx; color: #8a8a8a; }
/* 选品抽屉行 */
.opt-product-img { width: 80rpx; height: 80rpx; border-radius: 12rpx; overflow: hidden; flex-shrink: 0; background: #f4f4f5; }
.opt-product-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.opt-product-price { font-size: 24rpx; color: #C41E3A; font-weight: 600; }
.opt-text.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }

/* 选择行 */
.select-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 32rpx;
  border-top: 1rpx solid #ececec;
}
.circle-avatar { width: 48rpx; height: 48rpx; border-radius: 999rpx; overflow: hidden; }
.circle-avatar-img { width: 100%; height: 100%; }
.select-text { font-size: 28rpx; color: #1a1a1a; }
.select-placeholder { font-size: 28rpx; color: #8a8a8a; }
.select-arrow { margin-left: auto; }
.topic-tags { display: flex; flex-wrap: wrap; gap: 8rpx; flex: 1; }
.topic-tag {
  padding: 4rpx 16rpx;
  background: rgba(196,30,58,0.1);
  color: var(--brand);
  font-size: 22rpx;
  border-radius: 999rpx;
}

/* 工具栏 */
.toolbar {
  position: sticky;
  bottom: 0;
  background: #fff;
  border-top: 1rpx solid #ececec;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}
.tool-ai { display: flex; align-items: center; gap: 16rpx; }
.ai-chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
}
.ai-red { background: rgba(196,30,58,0.1); }
.ai-blue { background: rgba(37,99,235,0.1); }
.ai-green { background: rgba(5,150,105,0.1); }
.ai-orange { background: rgba(234,88,12,0.1); }
.ai-purple { background: rgba(124,58,237,0.1); }
.ai-chip.disabled { opacity: 0.6; }
.ai-chip-text { font-size: 22rpx; }
.ai-chip-text.red { color: #C41E3A; }
.ai-chip-text.blue { color: #2563eb; }
.ai-chip-text.green { color: #059669; }
.ai-chip-text.orange { color: #ea580c; }
.ai-chip-text.purple { color: #7c3aed; }

/* 弹窗 */
.mask {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0,0,0,0.5);
}
.sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  max-height: 60vh;
  overflow-y: auto;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
.ai-sheet { max-height: 70vh; }
.sheet-header {
  position: sticky;
  top: 0;
  background: #fff;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #ececec;
}
.sheet-header.between { display: flex; align-items: center; justify-content: space-between; }
.sheet-title { font-size: 30rpx; font-weight: 600; color: #1a1a1a; }
.sheet-title.center { text-align: center; display: block; }
.sheet-count { font-size: 26rpx; color: #8a8a8a; }
.sheet-done { font-size: 26rpx; color: var(--brand); }
.sheet-body { padding: 32rpx; }
.sheet-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 64rpx 0;
}
.sheet-state-text { font-size: 26rpx; color: #8a8a8a; }
.opt-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background: #f4f4f5;
  margin-bottom: 16rpx;
}
.opt-row.active { background: rgba(196,30,58,0.1); }
.opt-avatar { width: 80rpx; height: 80rpx; border-radius: 999rpx; overflow: hidden; }
.opt-avatar-img { width: 100%; height: 100%; }
.opt-text { font-size: 28rpx; color: #1a1a1a; }
.opt-check { margin-left: auto; }
.topic-pool { display: flex; flex-wrap: wrap; gap: 16rpx; }
.topic-pick {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  background: #f4f4f5;
  color: #1a1a1a;
}
.topic-pick.active { background: var(--brand); color: #fff; }

/* AI面板 */
.ai-sheet-title { display: flex; align-items: center; gap: 16rpx; }
.ai-sheet-title-text { font-size: 30rpx; font-weight: 600; color: #1a1a1a; }
.ai-sheet-spacer { width: 40rpx; }
.ai-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 96rpx 0;
}
.ai-loading-text { font-size: 26rpx; color: #8a8a8a; margin-top: 24rpx; }
.ai-section { display: flex; flex-direction: column; gap: 32rpx; }
.ai-actions { display: flex; gap: 16rpx; }
.ai-apply {
  flex: 1;
  text-align: center;
  padding: 24rpx;
  border-radius: 24rpx;
  font-size: 28rpx;
  color: #fff;
}
.ai-apply.orange { background: #f97316; }
.ai-apply.green { background: #22c55e; }
.ai-apply.full { flex: 1; }
.ai-apply.disabled { opacity: 0.5; }
.ai-refresh {
  padding: 24rpx 32rpx;
  border: 1rpx solid #ececec;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ai-refresh-full {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 20rpx;
  border: 1rpx solid #ececec;
  border-radius: 24rpx;
}
.ai-refresh-text { font-size: 28rpx; color: #1a1a1a; }
.title-sug {
  width: 100%;
  padding: 24rpx;
  background: rgba(37,99,235,0.08);
  border-radius: 24rpx;
  font-size: 28rpx;
  color: #1a1a1a;
}
.tag-pool { display: flex; flex-wrap: wrap; gap: 16rpx; }
.tag-pick {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  background: rgba(234,88,12,0.08);
  color: #ea580c;
}
.tag-pick.active { background: #f97316; color: #fff; }
.cover-gen { display: flex; flex-direction: column; }
.cover-gen-label { font-size: 28rpx; color: #8a8a8a; margin-bottom: 16rpx; }
.cover-gen-input {
  width: 100%;
  height: 192rpx;
  padding: 24rpx;
  background: #f4f4f5;
  border-radius: 24rpx;
  font-size: 28rpx;
}
.cover-gen-result {
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 24rpx;
  overflow: hidden;
}
.cover-gen-fallback {
  padding: 24rpx;
  background: rgba(5,150,105,0.06);
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.cover-gen-fallback-label { font-size: 24rpx; color: #059669; }
.cover-gen-fallback-text { font-size: 26rpx; color: #1a1a1a; line-height: 1.6; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
