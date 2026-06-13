/**
 * 自动扫描 src/pages/ 目录，生成 UniApp pages.json
 * 用法: node scripts/generate-pages-json.mjs
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAGES_DIR = path.resolve(__dirname, '../src/pages');
const OUTPUT = path.resolve(__dirname, '../src/pages.json');

// 路径 → 中文标题映射（常见页面）
const TITLE_MAP = {
  'index/index/index': '首页',
  'index/welcome/index': '欢迎页',
  'index/splash/index': '启动页',
  'demo/splash/index': '启动页',
  'discover/index/index': '发现',
  'shop/index/index': '商城',
  'courses/index/index': '课程',
  'profile/index/index': '个人中心',
  'login/index/index': '登录',
  'circles/index/index': '圈子',
  'live/index/index': '直播',
  'articles/index/index': '文章',
  'classics/index/index': '古籍',
  'fortune/index/index': '运势',
  'bazi/index/index': '八字排盘',
  'agents/index/index': 'AI智能体',
  'check-in/index/index': '签到',
  'messages/index/index': '消息中心',
};

function pageTitle(pagePath) {
  // 先精确匹配
  if (TITLE_MAP[pagePath]) return TITLE_MAP[pagePath];
  // 取最后一段路径名
  const seg = pagePath.split('/');
  const last = seg[seg.length - 1];
  return last.replace(/-/g, ' ');
}

function scanPages(dir, base = '') {
  const entries = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    if (item.name.startsWith('.') || item.name === 'node_modules') continue;

    const full = path.join(dir, item.name);
    const rel = base ? `${base}/${item.name}` : item.name;

    if (item.isDirectory()) {
      // 检查是否有 index.vue（叶子页面）
      const hasIndex = fs.existsSync(path.join(full, 'index.vue'));
      const hasIndexTs = fs.existsSync(path.join(full, 'index.ts'));
      const hasIndexJs = fs.existsSync(path.join(full, 'index.js'));

      if (hasIndex || hasIndexTs || hasIndexJs) {
        entries.push({
          path: `pages/${rel}/index`,
          style: {
            navigationBarTitleText: pageTitle(rel),
            navigationBarBackgroundColor: '#FAF8F5',
            navigationBarTextStyle: 'black',
            navigationStyle: 'custom',
          },
        });
      }

      // 递归扫描子目录
      const sub = scanPages(full, rel);
      entries.push(...sub);
    }
  }

  return entries;
}

function generate() {
  if (!fs.existsSync(PAGES_DIR)) {
    console.error('pages 目录不存在:', PAGES_DIR);
    process.exit(1);
  }

  const pages = scanPages(PAGES_DIR);

  // 确保首页在最前面
  const homeIdx = pages.findIndex(p => p.path === 'pages/index/index');
  if (homeIdx > 0) {
    const home = pages.splice(homeIdx, 1)[0];
    pages.unshift(home);
  }

  const config = {
    pages,
    globalStyle: {
      navigationBarTextStyle: 'black',
      navigationBarTitleText: '国学平台',
      navigationBarBackgroundColor: '#FAF8F5',
      backgroundColor: '#FAF8F5',
    },
    easycom: {
      autoscan: true,
      custom: {
        '^u-(.*)': '@/components/u-$1/u-$1.vue',
      },
    },
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(config, null, 2) + '\n', 'utf8');
  console.log(`✅ pages.json 已生成: ${pages.length} 个页面`);
  pages.forEach(p => console.log(`  - ${p.path}`));
}

generate();
