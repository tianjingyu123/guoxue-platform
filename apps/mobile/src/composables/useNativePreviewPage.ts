import { ref } from 'vue'
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import { getToken } from '@/utils/storage'
import { legacyPaipanApi } from '@/lib/legacy-paipan-data'
import { withNativeHistoryScope } from '@/lib/paipan/native-history-scope'

/** 共用整套资格核验：正式自研账号或第三方模式下管理员预览；不持久化授权，不设单工具权限。 */
export function useNativePreviewPage(onReady: () => void, clearPrivateView: () => void, onEnter?: () => void) {
  const allowed = ref(false)
  const checking = ref(false)
  let generation = 0
  let boundSubjectId: string | null = null

  function invalidate() {
    generation++
    allowed.value = false
    checking.value = false
    clearPrivateView()
  }

  async function run(action: () => void = onReady): Promise<boolean> {
    const current = ++generation
    const token = getToken()
    allowed.value = false
    checking.value = true
    clearPrivateView()
    try {
      if (!token) return false
      const result = await legacyPaipanApi.nativeQaAccess()
      if (current !== generation || token !== getToken() || result.allowed !== true) return false
      // 同一页面实例不能把旧账号的URL参数/表单状态带给另一个账号。
      if (boundSubjectId && boundSubjectId !== result.subjectId) return false
      // 回调仅做同步本地读取/修改；不能把异步写入延期至资格检查之后。
      withNativeHistoryScope(result.subjectId, token, action)
      boundSubjectId = result.subjectId
      allowed.value = true
      return true
    } catch {
      if (current === generation) clearPrivateView()
      return false
    } finally {
      if (current === generation) checking.value = false
    }
  }
  /** 网络期间不保留本地历史作用域；响应后再次在线核验再提交本地状态。服务端写权限仍由服务端独立验证。 */
  async function runTask<T>(work: (checkpoint: () => Promise<boolean>) => Promise<T>, commit: (value: T) => void): Promise<boolean> {
    const current = ++generation
    const token = getToken()
    allowed.value = false
    checking.value = true
    clearPrivateView()
    const stillCurrent = () => current === generation && token === getToken()
    try {
      if (!token) return false
      const first = await legacyPaipanApi.nativeQaAccess()
      if (!stillCurrent() || first.allowed !== true || (boundSubjectId && boundSubjectId !== first.subjectId)) return false
      // 在发起业务请求前验证 subjectId 格式，且提前绑定当前页面账号。
      withNativeHistoryScope(first.subjectId, token, () => {})
      boundSubjectId = first.subjectId
      const checkpoint = async () => {
        if (!stillCurrent()) return false
        const access = await legacyPaipanApi.nativeQaAccess()
        return stillCurrent() && access.allowed === true && access.subjectId === first.subjectId
      }
      const value = await work(checkpoint)
      if (!stillCurrent()) return false
      const last = await legacyPaipanApi.nativeQaAccess()
      if (!stillCurrent() || last.allowed !== true || last.subjectId !== first.subjectId) return false
      withNativeHistoryScope(last.subjectId, token, () => commit(value))
      allowed.value = true
      return true
    } catch {
      if (current === generation) clearPrivateView()
      return false
    } finally {
      if (current === generation) checking.value = false
    }
  }
  onShow(() => { if (onEnter) onEnter(); else void run() })
  onHide(invalidate)
  onUnload(invalidate)
  /** 弹窗只属于打开时的页面会话；隐藏、切号或重新核验后不可消费旧确认。 */
  function captureInteraction(): () => boolean {
    const current = generation
    const token = getToken()
    return () => allowed.value && current === generation && token === getToken()
  }
  return { allowed, checking, run, runTask, captureInteraction }
}
