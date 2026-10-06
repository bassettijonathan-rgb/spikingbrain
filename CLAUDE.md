# spikingbrain: conventions for Claude Code

A browser simulation of soft-bodied creatures controlled by spiking neural networks that learn
during their lifetime and evolve across generations. The scientific goal is to watch the Baldwin
effect and genetic assimilation emerge. **DESIGN.md is the approved design**; read the relevant
section before changing a model, and update DESIGN.md in the same pull request when a model changes.

## Commands

- `npm run dev`: run in the browser
- `npm test`: Vitest
- `npm run typecheck`, `npm run lint`: must pass before every push
- `npm run sim -- --seed 42`: headless runner in Node
- `npm run build`: production build (deployed to GitHub Pages from `main`)

## Layout (DESIGN.md section 10.1)

- `src/core/`: seeded random numbers, state hash, clock, shared helpers
- `src/neural/`, `src/physics/`, `src/body/`, `src/world/`, `src/genome/`, `src/evolution/`,
  `src/experiment/`, `src/sim/`: the simulation, added milestone by milestone
- `src/worker/`, `src/ui/`, `src/main.ts`: the page and workers; the only code allowed to touch the browser
- `tools/`: Node command-line runners. `tests/`: Vitest tests, `tests/science/` for validation milestones

## Rules

1. **Deterministic.** Same seed and config give the same state hash on the same JavaScript engine.
   - Randomness only from `Rng` (`src/core/rng.ts`), seeded from a tuple such as
     `(seed, replicate, generation, creatureId, Purpose.x)`, never from shared mutable order.
   - No real time in the simulation: no `Date`, `performance.now`, timers. Time is counted in steps.
   - Iterate in data order or sorted by id; never key a `Map`/`Set` by object identity.
   - Lint enforces this for everything under `src/` except `ui/`, `worker/` and `main.ts`.
2. **Simulation code has no browser code.** It runs in workers, in Node and in tests.
3. **Simulation state is plain data**: numbers, strings, arrays, plain objects, `Map`s, typed arrays.
   It must save, hash (`hashState`) and copy.
4. **SI units** (metres, kilograms, seconds, newtons, joules); membrane potential in mV, neural
   time constants may be written in ms but say so in the name (`tauMs`).
5. **Science first.** Every model rule gets a test; validation milestones reproduce published
   results (DESIGN.md section 13). Cite the source in a comment where a constant comes from a paper.
   If a result is negative or evolution stalls, stop and report rather than tuning silently.
6. **Readable over clever.** Marco wants to read and tweak the model: name variables after the
   equations in DESIGN.md, keep hot loops simple, explain non-obvious numerics in comments.
7. **Typed arrays for per-neuron, per-synapse and per-node state** (DESIGN.md section 8.3).
8. **One milestone per pull request** (or a few small ones), committed when its tests pass.
