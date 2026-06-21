// 三工具综合测试 — 真太阳时/早晚子时/节气边界
import { calcBazi, calcRiZhu } from '@guoxue/bazi-engine';
import { calcZiwei } from '@guoxue/ziwei-engine';
import { calculateQimenYang } from './src/modules/tool-registry/calculators/qimen.calculator';

// ====== 辅助函数 ======

const DI_ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];

function formatBazi(r: any) {
  const s = r.siZhu;
  return `${s.nian.gan}${s.nian.zhi} ${s.yue.gan}${s.yue.zhi} ${s.ri.gan}${s.ri.zhi} ${s.shi.gan}${s.shi.zhi}`;
}

function verifyXunShou(caseName: string, shiGanZhi: string) {
  const zhi = shiGanZhi[1];
  const zhiIdx = DI_ZHI.indexOf(zhi);
  const jiaIdx = Math.floor(zhiIdx / 2) * 2;
  const yiMap = ["戊","癸","壬","辛","庚","己"];
  const yi = yiMap[jiaIdx / 2];
  const result = `甲${yi}${DI_ZHI[jiaIdx]}`;
  console.log(`  旬首验证: 时${shiGanZhi} → ${result} (甲${DI_ZHI[jiaIdx]}旬)`);
  return result;
}

// ====== 测试案例 ======

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║     三工具综合验证 — 边界案例测试                           ║');
console.log('╚══════════════════════════════════════════════════════════════╝');

// ━━━ 案例组A：真太阳时 ━━━
console.log('\n━━━ 案例组A：真太阳时差异 ━━━');
console.log('（同一平太阳时，不同经度，真太阳时不同 → 时辰不同）\n');

const solarCases = [
  { name: 'A1 北京 116°E', year: 2024, month: 6, day: 21, hour: 6, minute: 55, lng: 116.4 },
  { name: 'A2 喀什 76°E',  year: 2024, month: 6, day: 21, hour: 6, minute: 55, lng: 76.0 },
  { name: 'A3 佳木斯 130°E', year: 2024, month: 6, day: 21, hour: 6, minute: 55, lng: 130.4 },
];

for (const c of solarCases) {
  console.log(`\n${c.name} (${c.hour}:${String(c.minute).padStart(2,'0')} BJT, lng=${c.lng})`);
  const bazi = calcBazi({ name: c.name, gender: '男', year: c.year, month: c.month, day: c.day, hour: c.hour, minute: c.minute, longitude: c.lng, useTrueSolarTime: true });
  console.log(`  八字: ${formatBazi(bazi)}`);
  if (bazi.taiYangShi) {
    console.log(`  真太阳时: ${bazi.taiYangShi.adjustedHour}:${String(bazi.taiYangShi.adjustedMinute).padStart(2,'0')}`);
    console.log(`  时差: ${bazi.taiYangShi.offset}分`);
  }
}

// ━━━ 案例组B：早晚子时 ━━━
console.log('\n━━━ 案例组B：早晚子时边界 ━━━');
console.log('（23:00-01:00 子时拆分，earlyZi=true 启用早晚子时）\n');

const ziShiCases = [
  { name: 'B1 夜子时 23:30', year: 2024, month: 6, day: 20, hour: 23, minute: 30, ziShiMode: "modern" },
  { name: 'B2 早子时 00:30', year: 2024, month: 6, day: 21, hour: 0, minute: 30, ziShiMode: "modern" },
  { name: 'B3 默认子时 23:30', year: 2024, month: 6, day: 20, hour: 23, minute: 30, ziShiMode: "traditional" },
  { name: 'B4 默认子时 00:30', year: 2024, month: 6, day: 21, hour: 0, minute: 30, ziShiMode: "traditional" },
  { name: 'B5 冬夜子时 23:30', year: 2024, month: 12, day: 22, hour: 23, minute: 30, ziShiMode: "modern" },
  { name: 'B6 冬早子时 00:30', year: 2024, month: 12, day: 23, hour: 0, minute: 30, ziShiMode: "modern" },
];

for (const c of ziShiCases) {
  console.log(`\n${c.name} (${c.year}-${c.month}-${c.day} ${c.hour}:${String(c.minute).padStart(2,'0')}, ziShiMode=${c.ziShiMode})`);
  const bazi = calcBazi({ name: c.name, gender: '男', year: c.year, month: c.month, day: c.day, hour: c.hour, minute: c.minute, ziShiMode: c.ziShiMode as "traditional" | "modern" });
  console.log(`  八字: ${formatBazi(bazi)}`);
  console.log(`  日柱: ${bazi.siZhu.ri.gan}${bazi.siZhu.ri.zhi}`);
}

// ━━━ 案例组C：节气边界（八字/奇门共用）━━━
console.log('\n━━━ 案例组C：节气边界（四柱/局数临界）━━━\n');

const jieqiCases = [
  { name: 'C1 立春当天', year: 2024, month: 2, day: 4, hour: 10, minute: 0 },   // 2024立春 2月4日
  { name: 'C2 立春前一天', year: 2024, month: 2, day: 3, hour: 10, minute: 0 },
  { name: 'C3 夏至当天', year: 2024, month: 6, day: 21, hour: 10, minute: 0 },
  { name: 'C4 冬至当天', year: 2024, month: 12, day: 21, hour: 10, minute: 0 },
  { name: 'C5 芒种换局临界', year: 2024, month: 6, day: 5, hour: 10, minute: 0 }, // 芒种前后
  { name: 'C6 小暑换局临界', year: 2024, month: 7, day: 6, hour: 10, minute: 0 },
];

for (const c of jieqiCases) {
  console.log(`\n${c.name} (${c.year}-${c.month}-${c.day} ${c.hour}:${String(c.minute).padStart(2,'0')})`);
  const bazi = calcBazi({ name: c.name, gender: '男', year: c.year, month: c.month, day: c.day, hour: c.hour, minute: c.minute });
  const riZhu = calcRiZhu(c.year, c.month, c.day);
  console.log(`  八字: ${formatBazi(bazi)}`);
  console.log(`  日柱(calcRiZhu): ${riZhu.gan}${riZhu.zhi}`);

  // 奇门
  const dt = `${c.year}-${String(c.month).padStart(2,'0')}-${String(c.day).padStart(2,'0')}T${String(c.hour).padStart(2,'0')}:${String(c.minute).padStart(2,'0')}:00`;
  const qimen = calculateQimenYang({ datetime: dt, qiJuMethod: 'chaibu', panMethod: 'zhuan', anganMethod: 'dipan' });
  console.log(`  奇门: ${qimen.dunType==='yang'?'阳':'阴'}遁${qimen.juNumber}局 节气:${qimen.jieQi} 值符:${qimen.zhiFu} 值使:${qimen.zhiShiMen} 时:${qimen.yongShi}`);
}
//
//// ━━━ 案例组D：紫微验证 ━━━
//console.log('\n━━━ 案例组D：紫微斗数 ━━━');
//console.log('（闰月、子时、真太阳时）\n');
//
//const ziweiCases = [
//  { name: 'D1 标准案例', year: 1984, month: 11, day: 15, hour: 8, minute: 0, gender: '男' as const, isLeap: false },
//  { name: 'D2 子时案例', year: 1990, month: 5, day: 10, hour: 0, minute: 15, gender: '女' as const, isLeap: false },
//  { name: 'D3 闰月案例', year: 2023, month: 3, day: 15, hour: 12, minute: 0, gender: '男' as const, isLeap: true },
//  { name: 'D4 真太阳时西北', year: 1995, month: 8, day: 22, hour: 14, minute: 0, gender: '女' as const, isLeap: false, lng: 87.6 },
//];
//
//for (const c of ziweiCases) {
//  console.log(`\n${c.name} (${c.year}-${c.isLeap?'闰':''}${c.month}-${c.day} ${c.hour}:${String(c.minute).padStart(2,'0')} ${c.gender}, lng=${c.lng || 'default'})`);
//  try {
//    const zw = calcZiwei({ name: c.name, gender: c.gender, year: c.year, month: c.month, day: c.day, hour: c.hour, minute: c.minute, isLeap: c.isLeap, longitude: c.lng });
//    console.log(`  命宫: ${zw.mingGong?.name || 'N/A'}`);
//    console.log(`  身宫: ${zw.shenGong?.name || 'N/A'}`);
//    console.log(`  五行局: ${zw.wuXingJu || 'N/A'}`);
//    const stars = zw.mingGong?.stars || [];
//    console.log(`  命宫主星: ${stars.slice(0,5).join(' ')}`);
//    if (zw.siHua) {
//      console.log(`  四化: ${zw.siHua.map((h:any) => `${h.star}${h.type}`).join(' ')}`);
//    }
//  } catch (e: any) {
//    console.log(`  错误: ${e.message}`);
//  }
//}

// ━━━ 案例组E：奇门算法详细校验 ━━━
console.log('\n━━━ 案例组E：奇门各步骤校验 ━━━');

const eCase = { year: 2024, month: 6, day: 21, hour: 10, minute: 0 };
const dt = `2024-06-21T10:00:00`;
console.log(`\nE1 标准阴遁6局案例 (${dt})`);
const qr = calculateQimenYang({ datetime: dt, qiJuMethod: 'chaibu', panMethod: 'zhuan', anganMethod: 'dipan' });

console.log(`  局数: ${qr.dunType==='yang'?'阳':'阴'}遁${qr.juNumber}`);
console.log(`  节气: ${qr.jieQi}`);
console.log(`  时柱: ${qr.yongShi}`);
console.log(`  值符: ${qr.zhiFu}  值使: ${qr.zhiShiMen}`);

// 手动验证每一步
const shiGan = qr.yongShi[0];
const shiZhi = qr.yongShi[1];
console.log(`\n  手动验证:`);
verifyXunShou('E1', qr.yongShi);

// 地盘期望（阴遁6局）
const YAN9_BASE_DI = ['辛','庚','己','戊','乙','丙','丁','癸','壬']; // 阴遁6局理论地盘
const expectedDi = YAN9_BASE_DI;
console.log(`  期望地盘: ${expectedDi.join(' ')}`);
console.log(`  实际地盘: ${qr.gongs.map(g=>g.diPan).join(' ')}`);
const diMatch = qr.gongs.every((g,i) => g.diPan === expectedDi[i]);
console.log(`  地盘匹配: ${diMatch ? '✅' : '❌'}`);

// 值符星验证
const yongShi = qr.yongShi;
const shiGanIdx = ['戊','己','庚','辛','壬','癸','丁','丙','乙'].indexOf(shiGan);
const xunShouYi = (() => {
  const zidx = DI_ZHI.indexOf(shiZhi);
  const jidx = Math.floor(zidx/2)*2;
  return ["戊","癸","壬","辛","庚","己"][jidx/2];
})();
const expectedZhiFuGong = expectedDi.indexOf(xunShouYi);
const expectedZhiFu = ['天蓬','天芮','天冲','天辅','天禽','天心','天柱','天任','天英'][expectedZhiFuGong];
console.log(`  期望值符星: ${expectedZhiFu} (旬首${xunShouYi}在${['坎','坤','震','巽','中','乾','兑','艮','离'][expectedZhiFuGong]}宫)`);
console.log(`  实际值符星: ${qr.zhiFu} ${expectedZhiFu === qr.zhiFu ? '✅' : '❌'}`);

// 值使门验证
const expectedZhiShiMen = ['休','死','伤','杜','死','开','惊','生','景'][expectedZhiFuGong];
console.log(`  期望值使门: ${expectedZhiShiMen}`);
console.log(`  实际值使门: ${qr.zhiShiMen} ${expectedZhiShiMen === qr.zhiShiMen ? '✅' : '❌'}`);

// 九星对照
console.log(`\n  九星对照:`);
for (let i = 0; i < 9; i++) {
  const g = qr.gongs.find(g => g.index === [1,2,3,4,5,6,7,8,9][i])!;
  console.log(`    宫${g.index}${g.name}: 星=${g.star.padEnd(3)} 门=${g.men.padEnd(2)} 神=${g.shen?.padEnd(2)||'—'}`);
}

// ━━━ 案例组F：阳盘命理奇门 ━━━
console.log('\n━━━ 案例组F：阳盘命理奇门（大运顺逆+真太阳时）━━━\n');

const yangpanCases = [
  { name: 'F1 阳男顺排', year: 1990, month: 6, day: 15, hour: 14, minute: 0, gender: 'male' as const },
  { name: 'F2 阴女顺排', year: 1990, month: 6, day: 15, hour: 14, minute: 0, gender: 'female' as const },
  { name: 'F3 真太阳时西北', year: 1990, month: 6, day: 15, hour: 14, minute: 0, gender: 'male' as const, lng: 87.6 },
  { name: 'F4 冬夜子时', year: 2024, month: 12, day: 22, hour: 23, minute: 30, gender: 'female' as const },
];

for (const c of yangpanCases) {
  console.log(`\n${c.name} (${c.year}-${c.month}-${c.day} ${c.hour}:${String(c.minute).padStart(2,'0')}, ${c.gender})`);
  const riZhu = calcRiZhu(c.year, c.month, c.day);
  const riGan = riZhu.gan, riZhi = riZhu.zhi;
  const ganIdx = GAN.indexOf(riGan);
  const isYangGan = ganIdx % 2 === 0;
  const isYangGender = c.gender === 'male';
  const shunPai = (isYangGan && isYangGender) || (!isYangGan && !isYangGender);
  console.log(`  日柱: ${riGan}${riZhi} (${isYangGan?'阳':'阴'}干, ${isYangGender?'阳':'阴'}性别 → ${shunPai?'顺排':'逆排'})`);

  // 输出前3个大运
  const zhiIdx = DI_ZHI.indexOf(riZhi);
  for (let i = 0; i < 3; i++) {
    const step = shunPai ? i + 1 : -(i + 1);
    const g = GAN[(ganIdx + step + 10) % 10];
    const z = DI_ZHI[(zhiIdx + step + 12) % 12];
    const startAge = i * 10 + 1;
    console.log(`    大运${i+1}: ${g}${z} (${startAge}-${startAge+9}岁)`);
  }

  // 阳盘奇门排盘
  const dt = `${c.year}-${String(c.month).padStart(2,'0')}-${String(c.day).padStart(2,'0')}T${String(c.hour).padStart(2,'0')}:${String(c.minute).padStart(2,'0')}:00`;
  const qimen = calculateQimenYang({
    datetime: dt,
    qiJuMethod: 'chaibu',
    panMethod: 'zhuan',
    jigongMethod: 'zifu',
    anganMethod: 'dipan',
  });
  console.log(`  奇门: ${qimen.dunType==='yang'?'阳':'阴'}遁${qimen.juNumber}局 节气:${qimen.jieQi} 值符:${qimen.zhiFu}`);
}

console.log('\n' + '='.repeat(64));
console.log('测试完成 — 请对照上方结果与已知正确的排盘结果');
