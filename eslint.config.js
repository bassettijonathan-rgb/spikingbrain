import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Simulation code must be deterministic and must not touch the browser
 * (DESIGN.md section 10.3). It runs unchanged in workers, in Node and in tests.
 */
const simRules = {
  'no-restricted-properties': [
    'error',
    { object: 'Math', property: 'random', message: 'Use the seeded Rng (src/core/rng.ts).' },
    { object: 'Date', property: 'now', message: 'The simulation never reads the clock; use simulated time.' },
    { object: 'performance', property: 'now', message: 'The simulation never reads the clock; use simulated time.' },
  ],
  'no-restricted-syntax': [
    'error',
    { selector: "NewExpression[callee.name='Date']", message: 'The simulation never reads the clock; use simulated time.' },
  ],
  'no-restricted-globals': [
    'error',
    { name: 'window', message: 'No browser code in the simulation.' },
    { name: 'document', message: 'No browser code in the simulation.' },
    { name: 'self', message: 'No browser code in the simulation.' },
    { name: 'setTimeout', message: 'Use simulated time, not real time.' },
    { name: 'setInterval', message: 'Use simulated time, not real time.' },
  ],
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        { group: ['**/ui/*', '**/worker/*', '**/main'], message: 'Simulation code cannot import the page or workers.' },
      ],
    },
  ],
};

/** Everything under src/ except the page, the UI and the worker entry points. */
const simFiles = ['src/**/*.ts'];
const notSimFiles = ['src/ui/**', 'src/worker/**', 'src/main.ts'];

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  { files: simFiles, ignores: notSimFiles, rules: simRules },
);
