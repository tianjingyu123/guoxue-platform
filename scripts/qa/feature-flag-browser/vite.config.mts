import { defineConfig } from '../../../apps/admin/node_modules/vite/dist/node/index.js'
import vue from '../../../apps/admin/node_modules/@vitejs/plugin-vue/dist/index.mjs'
import { resolve } from 'node:path'
const root = resolve(import.meta.dirname)
export default defineConfig({ root, plugins: [vue()], resolve: { alias: [
  { find: '@/api', replacement: resolve(root, 'api.ts') },
  { find: '@', replacement: resolve(root, '../../../apps/admin/src') },
  { find: 'vue', replacement: resolve(root, '../../../apps/admin/node_modules/vue/dist/vue.esm-bundler.js') },
  { find: 'element-plus', replacement: resolve(root, '../../../apps/admin/node_modules/element-plus') },
] }, server: { host: '127.0.0.1', port: 4187, strictPort: true, fs: { allow: [resolve(root, '../../..'), 'D:/gx-deploy-91/node_modules'] } } })
