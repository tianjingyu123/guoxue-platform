/**
 * 全平台统一图片预览入口。
 * 病灶：pkg-common/image-viewer 是孤儿页（全站无人跳转），导致绝大多数图片不可点击放大。
 * 解药：统一用 uni.previewImage（多端原生支持 缩放/滑动/长按保存），所有图文页接此。
 *
 * 用法：
 *   import { usePreviewImage } from '@/composables/usePreviewImage'
 *   const { preview } = usePreviewImage()
 *   preview(imageList, clickedUrl)   // 或 preview(singleUrl)
 */
export function usePreviewImage() {
  /**
   * @param urls    单图字符串或图片数组
   * @param current 当前点击项（url 或下标），默认首张
   */
  function preview(urls: string | string[], current?: string | number) {
    const list = Array.isArray(urls) ? urls.filter(Boolean) : [urls].filter(Boolean)
    if (!list.length) return
    let cur: string
    if (typeof current === 'number') cur = list[current] ?? list[0]
    else cur = current ?? list[0]
    uni.previewImage({
      urls: list,
      current: cur,
      indicator: 'number',
      loop: true,
    })
  }
  return { preview }
}
