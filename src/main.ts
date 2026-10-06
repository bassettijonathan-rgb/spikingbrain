/**
 * Starts the page. M0: a placeholder that shows the build works and the
 * seeded generator gives the same numbers in the browser as in Node.
 */
import { hashHex, hashState } from './core/hash';
import { Purpose, Rng } from './core/rng';

const seed = 42;
const rng = new Rng(seed, Purpose.test);
const sample = Array.from({ length: 5 }, () => rng.float().toFixed(6));

const app = document.getElementById('app');
if (app) {
  app.innerHTML = `
    <h1>spikingbrain</h1>
    <p>Soft-bodied creatures with spiking brains that learn during life and evolve across generations.</p>
    <p>Milestone M0: project skeleton. Nothing lives here yet.</p>
    <p>Determinism check, seed ${seed}: <code>${sample.join(' ')}</code>,
       state hash <code>${hashHex(hashState({ seed, rng: rng.state }))}</code>.
       <code>npm run sim -- --seed ${seed}</code> prints the same values.</p>
  `;
}
