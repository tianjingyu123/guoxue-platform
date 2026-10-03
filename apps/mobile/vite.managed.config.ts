import {defineConfig} from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
export default defineConfig(()=>({root:process.env.UNI_INPUT_DIR,plugins:[uni()],base:'/managed/',build:{modulePreload:false,rollupOptions:process.env.UNI_PLATFORM==='app'?{output:{inlineDynamicImports:true}}:undefined},server:{host:'127.0.0.1',proxy:process.env.MANAGED_LOCAL_API_PROXY?{'/api':{target:process.env.MANAGED_LOCAL_API_PROXY,changeOrigin:true}}:undefined}}))
