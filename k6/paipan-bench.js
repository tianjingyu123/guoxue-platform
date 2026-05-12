// ═══════════════════════════════════════════════════════════════
// 国学平台 — 排盘接口专项压测
// 排盘是 CPU 密集型操作且涉及外部引擎调用，需单独压测
// ═══════════════════════════════════════════════════════════════
//
// 使用:
//   k6 run k6/paipan-bench.js
//   k6 run --vus 50 --duration 3m k6/paipan-bench.js

import http from 'k6/http';
import { check, sleep, group, trend } from 'k6';
import { Rate } from 'k6/metrics';

const baziDuration = new trend('bazi_preview', true);
const ziweiDuration = new trend('ziwei_preview', true);
const baziSaveDuration = new trend('bazi_save', true);
const errorRate = new Rate('errors');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  thresholds: {
    'bazi_preview': ['p(95)<2000', 'p(99)<3000'],
    'ziwei_preview': ['p(95)<2000', 'p(99)<3000'],
    'bazi_save': ['p(95)<3000'],
    'errors': ['rate<0.02'],
  },
};

// ═══════════ 生成随机排盘输入 ═══════════
function randomBaziInput() {
  const genders = ['男', '女'];
  return {
    name: `测试${Math.floor(Math.random() * 10000)}`,
    gender: genders[Math.floor(Math.random() * 2)],
    year: 1940 + Math.floor(Math.random() * 85),
    month: 1 + Math.floor(Math.random() * 12),
    day: 1 + Math.floor(Math.random() * 28),
    hour: Math.floor(Math.random() * 12),
    minute: 0,
    city: '北京',
  };
}

function randomZiweiInput() {
  const genders = ['男', '女'] as const;
  const tiangan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const dizhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  return {
    name: `测试${Math.floor(Math.random() * 10000)}`,
    gender: genders[Math.floor(Math.random() * 2)],
    year: 1940 + Math.floor(Math.random() * 85),
    month: 1 + Math.floor(Math.random() * 12),
    day: 1 + Math.floor(Math.random() * 28),
    hour: Math.floor(Math.random() * 12),
    lunarMonth: 1 + Math.floor(Math.random() * 12),
    lunarDay: 1 + Math.floor(Math.random() * 30),
    lunarHour: randomItem(dizhi),
    lunarYearGan: randomItem(tiangan),
    lunarYearZhi: randomItem(dizhi),
  };
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function () {
  // 80% 八字排盘预览（不登录），20% 紫微排盘
  if (Math.random() < 0.8) {
    baziPreview();
  } else {
    ziweiPreview();
  }
  sleep(1 + Math.random() * 3);
}

function baziPreview() {
  const payload = JSON.stringify(randomBaziInput());
  const start = Date.now();

  const res = http.post(`${BASE_URL}/api/paipan/bazi/preview`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'bazi_preview' },
  });

  baziDuration.add(Date.now() - start);
  errorRate.add(res.status !== 200 && res.status !== 201);

  // 验证返回数据包含八字段落
  if (res.status === 200 || res.status === 201) {
    try {
      const body = JSON.parse(res.body as string);
      check(body, {
        '排盘返回完整': (b) =>
          b.ganZhi || b.eightChar || b.baZiPan || b.data,
      });
    } catch { /* json parse error */ }
  }
}

function ziweiPreview() {
  const payload = JSON.stringify(randomZiweiInput());
  const start = Date.now();

  const res = http.post(`${BASE_URL}/api/paipan/ziwei/preview`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'ziwei_preview' },
  });

  ziweiDuration.add(Date.now() - start);
  errorRate.add(res.status !== 200 && res.status !== 201);
}

// ═══════════ 缓存命中率测试 ═══════════
// 多次请求相同输入验证缓存效果
export function cacheHitTest() {
  const fixedInput = {
    name: '张三',
    gender: '男' as const,
    year: 1990, month: 5, day: 15, hour: 8, minute: 0, city: '北京',
  };
  const payload = JSON.stringify(fixedInput);

  console.log('缓存命中率测试 — 同一输入请求 10 次');
  for (let i = 0; i < 10; i++) {
    const res = http.post(`${BASE_URL}/api/paipan/bazi/preview`, payload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'cache_test' },
    });
    console.log(`  第${i + 1}次: ${res.status} ${res.timings.duration}ms`);
  }
}

export function setup() {
  console.log('排盘压测开始...');
  // 预先执行一次排盘触发缓存预热
  const warmInput = JSON.stringify(randomBaziInput());
  http.post(`${BASE_URL}/api/paipan/bazi/preview`, warmInput, {
    headers: { 'Content-Type': 'application/json' },
  });
  console.log('预热完成');
}
