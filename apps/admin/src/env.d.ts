/// <reference types="vite/client" />

// @wangeditor/editor-for-vue 的 package.json exports 未正确暴露 types 条件，
// 直接 import 会报 TS7016；此 shim 为其两个组件补上最小类型声明。
declare module '@wangeditor/editor-for-vue' {
  import type { DefineComponent } from 'vue'
  export const Editor: DefineComponent<Record<string, unknown>>
  export const Toolbar: DefineComponent<Record<string, unknown>>
}
