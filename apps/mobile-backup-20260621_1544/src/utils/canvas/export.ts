/**
 * Canvas 导出与保存（替代 toDataURL + a.download）
 * toDataURL → uni.canvasToTempFilePath；下载 → uni.saveImageToPhotosAlbum（需相册授权）。
 */
import type { CanvasHandle } from './adapter'

export function toTempFilePath(handle: CanvasHandle, comp?: any): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.canvasToTempFilePath(
      {
        canvas: handle.canvas,
        success: (res: any) => resolve(res.tempFilePath),
        fail: (err: any) => reject(new Error(err.errMsg || '导出失败')),
      } as any,
      comp,
    )
  })
}

export async function saveToAlbum(handle: CanvasHandle, comp?: any): Promise<void> {
  const filePath = await toTempFilePath(handle, comp)
  return new Promise((resolve, reject) => {
    uni.saveImageToPhotosAlbum({
      filePath,
      success: () => { uni.showToast({ title: '已保存到相册', icon: 'success' }); resolve() },
      fail: (err) => {
        if (/auth|deny|授权/.test(err.errMsg || '')) {
          uni.showModal({ title: '提示', content: '需要相册权限才能保存，请在设置中开启', showCancel: false })
        }
        reject(new Error(err.errMsg || '保存失败'))
      },
    })
  })
}
