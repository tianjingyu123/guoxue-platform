/// <reference types="vite/client" />

// quill@1.3.7 无自带类型声明，富文本编辑器（ContentEdit/ProductList 详情）本地打包 import 时需此 shim
declare module 'quill';
declare module 'quill/dist/quill.snow.css';
