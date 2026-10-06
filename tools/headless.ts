/**
 * Headless runner (DESIGN.md section 10.2): runs the simulation in Node and prints a summary.
 *
 * M0 stub: there is no simulation yet, so it only proves the seeded generator
 * and the state hash work from the command line. Later milestones add real runs.
 *
 *   npm run sim -- --seed 42
 */
import { hashHex, hashState } from '../src/core/hash';
import { Purpose, Rng } from '../src/core/rng';

function parseArgs(argv: string[]): { seed: number } {
  let seed = 42;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--seed') {
      seed = Number(argv[++i]);
      if (!Number.isInteger(seed)) throw new Error('--seed needs an integer');
    } else {
      throw new Error(`Unknown argument: ${argv[i]}`);
    }
  }
  return { seed };
}

const { seed } = parseArgs(process.argv.slice(2));
const rng = new Rng(seed, Purpose.test);
const sample = Array.from({ length: 5 }, () => rng.float().toFixed(6));

console.log(`spikingbrain headless runner (M0 stub)`);
console.log(`seed          ${seed}`);
console.log(`first floats  ${sample.join(' ')}`);
console.log(`state hash    ${hashHex(hashState({ seed, rng: rng.state }))}`);
