import { WORLDS } from '../src/content/worlds.ts';
import { buildCourse } from '../src/content/course.ts';
import { solve, tolerance } from './plan.ts';

const MIN_TOL = Number(process.env.MIN_TOL ?? 6);
let bad = 0;
const only = process.argv[2];
for (const w of WORLDS) {
  if (only && w.id !== only) continue;
  const c = buildCourse(w);
  const t0 = Date.now();
  const tol = tolerance(w);
  const s3 = solve(w, Math.min(3, Math.max(0, tol.margin)));
  const ok = tol.margin >= MIN_TOL && s3.maxFood >= 10 && c.seconds <= 80;
  if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${w.id.padEnd(7)} ${c.seconds.toFixed(1)}s  tolerancia ${tol.margin} px  comida máx. (margen 3) ${s3.maxFood}/${c.foodCount}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}
process.exit(bad ? 1 : 0);
