// 可选基线：node deploy/benchmark.mjs ./engine/baseline.mjs
// 只测本机物理CPU，不代表线上并发容量或完整房间/网络成本。
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as current from '../engine/index.mjs';

const versions = [['current', current]];
if (process.argv[2]) versions.unshift(['baseline', await import(pathToFileURL(resolve(process.argv[2])).href)]);
const runs = new Map(versions.map(([name]) => [name, { idle: [], active: [] }]));
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

for (let round = 0; round < 8; round++) {
  for (const [name, module] of round % 2 ? [...versions].reverse() : versions) {
    for (const mode of ['idle', 'active']) {
      const game = new module.Rt({ matchTime: 10000 });
      let elapsed;
      try {
        const start = performance.now();
        for (let step = 0; step < 14400; step++) {
          if (mode === 'active' && step % 240 === 0) {
            // 确定性压力场景，每两秒将一球从底线发出；不包含AI搜索。
            game.world.launch(2, 0, 0, -14, 0);
          }
          game.update(module.k);
          if (step % 12 === 0) game.syncPucks(true);
          game.drainEvents();
        }
        elapsed = performance.now() - start;
      } finally { game.world.free(); }
      if (round > 0) runs.get(name)[mode].push(elapsed);
    }
  }
}
for (const [name, modes] of runs) {
  console.log(JSON.stringify({ version: name, simulatedSeconds: 120, trials: 7,
    idleMedianMs: +median(modes.idle).toFixed(2), activeMedianMs: +median(modes.active).toFixed(2) }));
}
