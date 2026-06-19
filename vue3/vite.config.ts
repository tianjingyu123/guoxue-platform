import { defineConfig } from 'vite'
import uniPlugin from '@dcloudio/vite-plugin-uni'
import UnoCSS from 'unocss/vite'

// @dcloudio/vite-plugin-uni 为 CJS 包，在 ESM 配置下默认导入会包一层 .default
const uni = ((uniPlugin as unknown as { default?: typeof uniPlugin }).default ?? uniPlugin) as typeof uniPlugin

export default defineConfig({
  plugins: [
    UnoCSS(),
    uni(),
  ],
})
