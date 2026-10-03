import { fileURLToPath } from 'node:url'
import { defineConfig, mergeConfig } from 'vite'
import base from '../../vite.config'

// 仅本机组件验收；不对外暴露，不代理任何后端地址。
export default defineConfig(env => {
  const config = mergeConfig(typeof base === 'function' ? base(env) : base, {
    root: fileURLToPath(new URL('../../', import.meta.url)), base: '/',
  })
  return { ...config, server: { host: '127.0.0.1', port: 54181, strictPort: true, proxy: {}, open: false } }
})
