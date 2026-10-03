<script setup lang="ts">
/**
 * 通用富文本编辑器（wangEditor v5，替换 Quill）。
 * 特性：作品级排版（标题/引用/代码/表格/对齐/字号字色/列表等）+ 傻瓜式所见即所得；
 *   - 插入图片 → 走 uploadApi.image 直传 COS
 *   - 插入视频 → 走 uploadVodFile 直传腾讯云 VOD（自动转码压缩）
 * 用法：<RichEditor v-model="form.body" placeholder="请输入正文..." />
 * 组件卸载/dialog 关闭时会自动销毁编辑器实例，避免内存泄漏。
 */
import '@wangeditor/editor/dist/css/style.css'
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor'
import { ElMessage } from 'element-plus'
import { uploadApi } from '@/api'
import { uploadVodFile } from '@/utils/vod-upload'
import { normalizeRichText } from '@/utils/rich-text'
import { enhanceEditorAccessibility } from '@/utils/editor-accessibility'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    /** 编辑区最小高度，默认 300px */
    minHeight?: string
  }>(),
  { modelValue: '', placeholder: '请输入内容...', minHeight: '300px' },
)
const emit = defineEmits<{ 'update:modelValue': [string] }>()

// 编辑器实例：wangEditor 要求用 shallowRef 保存（非响应式深代理）
const editorRef = shallowRef<IDomEditor>()
const editorRoot = ref<HTMLElement>()
let accessibilityObserver: MutationObserver | undefined
const valueHtml = ref(props.modelValue || '')

// 外部 modelValue 变化（如打开弹窗回填已有内容）时同步进编辑器
watch(
  () => props.modelValue,
  (v) => {
    if ((v || '') !== valueHtml.value) valueHtml.value = v || ''
  },
)

const toolbarConfig: Partial<IToolbarConfig> = {}
const editorConfig: Partial<IEditorConfig> = {
  // 路由/弹窗负责焦点顺序，正文不要抢走标题和主内容焦点。
  autoFocus: false,
  placeholder: props.placeholder,
  MENU_CONF: {
    // 图片上传 → COS
    uploadImage: {
      async customUpload(file: File, insertFn: (url: string, alt: string, href: string) => void) {
        try {
          const { data } = await uploadApi.image(file)
          const url = data.url
          insertFn(url, '', url)
        } catch {
          ElMessage.error('图片上传失败，请重试')
        }
      },
    },
    // 视频上传 → 腾讯云 VOD（自动转码压缩）
    uploadVideo: {
      async customUpload(file: File, insertFn: (url: string, poster?: string) => void) {
        const closeLoading = ElMessage({ message: '视频上传中，请稍候…', type: 'info', duration: 0 })
        try {
          const url = await uploadVodFile(file)
          if (!url) throw new Error('empty url')
          insertFn(url)
          ElMessage.success('视频上传成功')
        } catch {
          ElMessage.error('视频上传失败，请重试')
        } finally {
          closeLoading.close()
        }
      },
    },
  },
}

function handleCreated(editor: IDomEditor) {
  editorRef.value = editor
}

function handleChange(editor: IDomEditor) {
  // 空段落、换行和空格不算正文，也不应让新建页面立即进入“未保存”状态。
  emit('update:modelValue', normalizeRichText(editor.getHtml()))
}

onMounted(() => {
  if (!editorRoot.value) return
  const root = editorRoot.value
  enhanceEditorAccessibility(root)
  accessibilityObserver = new MutationObserver(() => enhanceEditorAccessibility(root))
  accessibilityObserver.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-tooltip'] })
})

onBeforeUnmount(() => {
  accessibilityObserver?.disconnect()
  editorRef.value?.destroy()
  editorRef.value = undefined
})
</script>

<template>
  <div
    ref="editorRoot"
    class="rich-editor"
  >
    <Toolbar
      class="rich-editor__toolbar"
      :editor="editorRef"
      :default-config="toolbarConfig"
      mode="default"
    />
    <Editor
      class="rich-editor__body"
      :style="{ minHeight: props.minHeight }"
      :model-value="valueHtml"
      :default-config="editorConfig"
      mode="default"
      @on-created="handleCreated"
      @on-change="handleChange"
    />
  </div>
</template>

<style scoped>
.rich-editor {
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 4px;
  overflow: hidden;
}
.rich-editor__toolbar {
  border-bottom: 1px solid var(--el-border-color-light, #ebeef5);
}
.rich-editor__body {
  overflow-y: auto;
}
.rich-editor :deep(button:focus-visible) {
  outline: 2px solid var(--el-color-primary);
  outline-offset: -2px;
}
/* 原分组菜单只在悬停时打开；键盘进入组按钮时也需要显示子项。 */
.rich-editor :deep(.w-e-bar-item-group:focus-within .w-e-bar-item-menus-container) {
  display: block;
}
</style>
