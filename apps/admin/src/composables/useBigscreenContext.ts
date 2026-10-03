import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/store/auth'

/** 此上下文仅用于清理缓存，不替代服务端鉴权；不存储、输出或验证任何凭据。 */
export function useBigscreenContext() {
  const route = useRoute()
  const auth = useAuthStore()
  const storageEpoch = ref(0)
  const hasScopedToken = computed(() => Object.prototype.hasOwnProperty.call(route.query, 'token'))
  const token = computed(() => typeof route.query.token === 'string' ? route.query.token : undefined)
  const invalidScopedToken = computed(() => hasScopedToken.value && !token.value?.trim())
  // auth.token 在登录/退出时变化；同页无感续期仅更新请求层 localStorage，不清空同主体快照。
  const key = computed(() => JSON.stringify([
    hasScopedToken.value, route.query.token, auth.user?.id, [...auth.roles].sort(), auth.token, storageEpoch.value,
  ]))
  function onStorage(event: StorageEvent) {
    if (event.storageArea === localStorage && (event.key === null || ['token', 'user_roles'].includes(event.key))) storageEpoch.value++
  }
  onMounted(() => window.addEventListener('storage', onStorage))
  onBeforeUnmount(() => window.removeEventListener('storage', onStorage))
  return { key, token, hasScopedToken, invalidScopedToken }
}
