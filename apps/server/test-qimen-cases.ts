// 奇门算法交叉验证脚本 — 用标准案例输出排盘结果
import { calculateQimenYang } from './src/modules/tool-registry/calculators/qimen.calculator';

const CASES = [
  // 案例1：阳遁，广州
  { name: '2024-06-21 10:00 广州', datetime: '2024-06-21T10:00:00', qiJuMethod: 'chaibu' },
  // 案例2：阳遁，北京
  { name: '2024-01-15 14:00 北京', datetime: '2024-01-15T14:00:00', qiJuMethod: 'chaibu' },
  // 案例3：阴遁，北京（夏至后）
  { name: '2024-07-15 10:00 北京', datetime: '2024-07-15T10:00:00', qiJuMethod: 'chaibu' },
  // 案例4：阳遁测试，拆补法
  { name: '2026-06-21 15:00 北京', datetime: '2026-06-21T15:00:00', qiJuMethod: 'chaibu' },
];

for (const c of CASES) {
  console.log(`\n${'='.repeat(72)}`);
  console.log(`案例：${c.name}  |  方法：${c.qiJuMethod}`);
  console.log('='.repeat(72));

  const input = {
    datetime: c.datetime,
    qiJuMethod: c.qiJuMethod,
    panMethod: 'zhuan',
    anganMethod: 'dipan',
  };

  const result = calculateQimenYang(input);

  console.log(`\n局数：${result.dunType === 'yang' ? '阳遁' : '阴遁'}${result.juNumber}局`);
  console.log(`节气：${result.jieQi}`);
  console.log(`用事时：${result.yongShi}`);
  console.log(`值符：${result.zhiFu}  值使：${result.zhiShiMen}`);
  console.log(`地盘八神：${result.dipanBashen.join(' ')}`);

  console.log(`\n宫│卦│天盘│地盘│九星  │八门│八神│空亡│马星│入墓`);
  console.log('─'.repeat(55));
  for (const g of result.gongs) {
    const kw = g.kongWang ? '空' : '  ';
    const mx = g.maXing ? '马' : '  ';
    const rm = g.isRuMu ? '墓' : '  ';
    console.log(
      `${g.index}│${g.name.padEnd(2)}│` +
      `${(g.tianPan||'').padEnd(2)}  │${(g.diPan||'').padEnd(2)}  │` +
      `${g.star.padEnd(4)}│${g.men.padEnd(2)}│${(g.shen||'').padEnd(2)}│` +
      `${kw}  │${mx}  │${rm}`
    );
  }

  if (result.summary) {
    console.log(`\n${result.summary}`);
  }
}
