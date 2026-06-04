<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="nav-bar">
      <view
        class="nav-left"
        @click="goBack"
      >
        <text class="nav-back">
          ‹
        </text>
      </view>
      <text class="nav-title">
        {{ isEdit ? '编辑文章' : '写文章' }}
      </text>
      <view class="nav-right">
        <text
          class="draft-btn"
          :class="{ disabled: saving }"
          @click="saveDraft"
        >
          {{ saving ? '保存中...' : '存草稿' }}
        </text>
        <text
          class="publish-btn"
          :class="{ disabled: publishing }"
          @click="publish"
        >
          {{ publishing ? '发布中...' : '发布' }}
        </text>
      </view>
    </view>

    <!-- 标题 -->
    <input
      v-model="title"
      class="title-input"
      placeholder="请输入文章标题（2-100字）"
      maxlength="100"
    >

    <!-- 封面 -->
    <view class="cover-row">
      <view
        v-if="cover"
        class="cover-preview-wrap"
      >
        <image
          :src="cover"
          class="cover-preview"
          mode="aspectFill"
        />
        <text
          class="cover-remove"
          @click="cover = ''"
        >
          ×
        </text>
      </view>
      <view
        v-else
        class="cover-add"
        @click="uploadCover"
      >
        <text class="cover-add-icon">
          🖼
        </text>
        <text class="cover-add-text">
          添加封面
        </text>
      </view>
    </view>

    <!-- 正文 -->
    <textarea
      v-model="content"
      class="content-input"
      placeholder="请输入文章正文..."
      :maxlength="20000"
    />

    <!-- 标签 -->
    <view class="tags-section">
      <view class="section-label">
        标签
      </view>
      <view class="tags-row">
        <view
          v-for="(tag, idx) in tags"
          :key="idx"
          class="tag-item"
        >
          <text>{{ tag }}</text>
          <text
            class="tag-remove"
            @click="removeTag(idx)"
          >
            ×
          </text>
        </view>
        <input
          v-if="tags.length < 5"
          v-model="tagInput"
          class="tag-input"
          placeholder="添加标签"
          maxlength="10"
          @confirm="addTag"
        >
      </view>
    </view>

    <!-- 安全区 -->
    <view class="bottom-safe" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { contentApi, uploadApi } from "../../api"

const id = ref("")
const circleId = ref("")
const isEdit = ref(false)
const draftId = ref("")

const title = ref("")
const content = ref("")
const cover = ref("")
const tags = ref<string[]>([])
const tagInput = ref("")

const saving = ref(false)
const publishing = ref(false)

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const opts = page?.$page?.options || page?.options || {}
  id.value = opts.id || ""
  circleId.value = opts.circleId || ""
  draftId.value = opts.draftId || ""
  if (opts.mode === "edit" && opts.id) {
    isEdit.value = true
    loadArticle(opts.id)
  } else if (opts.draftId) {
    loadDraft(opts.draftId)
  }
})

async function loadArticle(articleId: string) {
  try {
    const article = await contentApi.detail(articleId)
    title.value = article.title || ""
    content.value = article.content || ""
    cover.value = article.cover || ""
    tags.value = article.tags || []
    circleId.value = article.circleId || circleId.value
  } catch {
    uni.showToast({ title: "加载文章失败", icon: "none" })
  }
}

async function loadDraft(dId: string) {
  try {
    const drafts = await contentApi.drafts({ page: 1, pageSize: 50 })
    const list = drafts?.list || drafts?.data || drafts || []
    const draft = Array.isArray(list) ? list.find((d: any) => d.id === dId) : null
    if (draft) {
      title.value = draft.title || ""
      content.value = draft.content || ""
      cover.value = draft.cover || ""
      tags.value = draft.tags || []
      circleId.value = draft.circleId || circleId.value
    }
  } catch { /* 忽略 */ }
}

async function uploadCover() {
  try {
    const res: any = await new Promise((resolve, reject) => {
      uni.chooseImage({
        count: 1,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: (r) => resolve(r),
        fail: reject,
      })
    })
    const filePath = res.tempFilePaths?.[0]
    if (!filePath) return
    uni.showLoading({ title: "上传中..." })
    const uploadRes: any = await uploadApi.image(filePath)
    uni.hideLoading()
    const url = uploadRes?.data?.url || uploadRes?.url || ""
    if (url) {
      cover.value = url
    } else {
      uni.showToast({ title: "上传失败", icon: "none" })
    }
  } catch {
    uni.hideLoading()
  }
}

function addTag() {
  const val = tagInput.value.trim()
  if (!val) return
  if (tags.value.includes(val)) {
    uni.showToast({ title: "标签已存在", icon: "none" })
    return
  }
  tags.value.push(val)
  tagInput.value = ""
}

function removeTag(idx: number) {
  tags.value.splice(idx, 1)
}

async function saveDraft() {
  if (!title.value.trim()) {
    uni.showToast({ title: "请输入标题", icon: "none" })
    return
  }
  saving.value = true
  try {
    const data: any = {
      title: title.value.trim(),
      content: content.value.trim(),
      cover: cover.value || undefined,
      tags: tags.value,
      circleId: circleId.value || undefined,
    }
    if (draftId.value) {
      await contentApi.updateDraft(draftId.value, data)
    } else {
      const res = await contentApi.saveDraft(data)
      draftId.value = res?.id || draftId.value
    }
    uni.showToast({ title: "草稿已保存", icon: "success" })
  } catch (e: any) {
    uni.showToast({ title: e?.errMsg || "保存失败", icon: "none" })
  } finally {
    saving.value = false
  }
}

async function publish() {
  if (!title.value.trim()) {
    uni.showToast({ title: "请输入标题", icon: "none" })
    return
  }
  if (!content.value.trim()) {
    uni.showToast({ title: "请输入正文", icon: "none" })
    return
  }
  if (!circleId.value) {
    uni.showToast({ title: "缺少圈子信息", icon: "none" })
    return
  }
  publishing.value = true
  try {
    const data: any = {
      title: title.value.trim(),
      content: content.value.trim(),
      cover: cover.value || undefined,
      tags: tags.value,
    }
    if (draftId.value) {
      await contentApi.publishDraft(draftId.value)
      uni.showToast({ title: "已从草稿发布", icon: "success" })
    } else if (isEdit.value) {
      await contentApi.update(id.value, data)
      uni.showToast({ title: "已更新", icon: "success" })
    } else {
      const res = await contentApi.create(circleId.value, data)
      uni.showToast({ title: "发布成功", icon: "success" })
      id.value = res?.id || res?.data?.id || ""
    }
    // 延迟返回
    setTimeout(() => { uni.navigateBack() }, 800)
  } catch (e: any) {
    uni.showToast({ title: e?.errMsg || "发布失败", icon: "none" })
  } finally {
    publishing.value = false
  }
}

function goBack() {
  uni.navigateBack()
}
</script>

<style>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 40px;
}

/* ===== 顶栏 ===== */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  padding-top: calc(10px + env(safe-area-inset-top));
  background: #fff;
  border-bottom: 1px solid #E8E0D5;
}
.nav-left {
  width: 44px;
}
.nav-back {
  font-size: 32px;
  color: #333;
  line-height: 1;
}
.nav-title {
  font-size: 16px;
  font-weight: bold;
  color: #2C2C2C;
}
.nav-right {
  display: flex;
  gap: 12px;
  align-items: center;
}
.draft-btn {
  font-size: 13px;
  color: #999;
}
.draft-btn.disabled {
  opacity: 0.5;
}
.publish-btn {
  font-size: 13px;
  color: #fff;
  background: #C41E3A;
  padding: 6px 16px;
  border-radius: 14px;
  font-weight: 500;
}
.publish-btn.disabled {
  opacity: 0.5;
}

/* ===== 标题 ===== */
.title-input {
  width: 100%;
  height: 52px;
  padding: 12px 16px;
  font-size: 18px;
  font-weight: bold;
  color: #2C2C2C;
  background: #fff;
  border-bottom: 1px solid #F5F0E8;
  box-sizing: border-box;
}

/* ===== 封面 ===== */
.cover-row {
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #F5F0E8;
}
.cover-preview-wrap {
  position: relative;
  width: 120px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
}
.cover-preview {
  width: 100%;
  height: 100%;
}
.cover-remove {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 22px;
  height: 22px;
  background: #C41E3A;
  color: #fff;
  border-radius: 50%;
  text-align: center;
  line-height: 20px;
  font-size: 16px;
  font-weight: bold;
}
.cover-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 80px;
  border: 2px dashed #C9A96E;
  border-radius: 6px;
  background: #F5F0E8;
}
.cover-add-icon {
  font-size: 24px;
}
.cover-add-text {
  font-size: 11px;
  color: #C9A96E;
  margin-top: 4px;
}

/* ===== 正文 ===== */
.content-input {
  width: 100%;
  min-height: 300px;
  padding: 16px;
  font-size: 15px;
  color: #444;
  background: #fff;
  line-height: 1.8;
  box-sizing: border-box;
}

/* ===== 标签 ===== */
.tags-section {
  padding: 12px 16px;
  background: #fff;
  margin-top: 10px;
}
.section-label {
  font-size: 13px;
  color: #999;
  margin-bottom: 8px;
}
.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.tag-item {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #F5F0E8;
  color: #C41E3A;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
}
.tag-remove {
  font-size: 14px;
  color: #999;
  font-weight: bold;
}
.tag-input {
  flex: none;
  width: 90px;
  height: 28px;
  border: 1px solid #E8E0D5;
  border-radius: 12px;
  padding: 0 10px;
  font-size: 12px;
  color: #666;
  box-sizing: border-box;
}

/* ===== 底部安全区 ===== */
.bottom-safe {
  height: calc(40px + env(safe-area-inset-bottom));
}
</style>
