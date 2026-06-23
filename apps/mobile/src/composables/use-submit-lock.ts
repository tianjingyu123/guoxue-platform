/**
 * 防重复提交 Composable
 * 使用方式:
 *   const { submitting, withLock } = useSubmitLock()
 *   await withLock(async () => { await api.pay() })
 *   // 在模板中: :disabled="submitting" :loading="submitting"
 */
import { ref } from 'vue'

export function useSubmitLock() {
  const submitting = ref(false)

  async function withLock<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (submitting.value) return
    submitting.value = true
    try {
      return await fn()
    } finally {
      submitting.value = false
    }
  }

  return { submitting, withLock }
}
