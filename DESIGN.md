# DESIGN.md: soft-bodied creatures with spiking brains that learn and evolve

Status: **draft for Marco's approval. No code until approved.**
Date: 2026-10-06

This document describes the model, the data structures, the architecture and the milestone plan.
Where I think a better alternative exists to what the brief asked for, the text says so and gives
a recommendation. Section 1 collects every decision in one table so they
can be approved or overruled quickly; the rest of the document explains them.

Repository: `bassettijonathan-rgb/spikingbrain`.

---

## 0. The scientific question, stated precisely

We want to watch two things emerge:

1. **The Baldwin effect.** Learning changes the fitness landscape that evolution sees. An individual
   that can *learn* a good behavior gets partial credit for genotypes that are merely *close* to
   producing it innately, which smooths a needle-in-a-haystack landscape and speeds evolution
   (Hinton & Nowlan 1987).
2. **Genetic assimilation.** Over generations, a behavior that had to be learned becomes innate
   (Waddington 1953). The newborn, with learning switched off, already does what its ancestors had
   to learn.

The literature tells us when each should happen, and the design has to make these conditions
reachable and measurable, otherwise the experiments cannot show anything:

- **Assimilation needs learning to be costly** (Mayley 1996, 1997). If learning is free and
  perfect, a learner and an innate performer have equal fitness and there is no pressure to
  assimilate. Here the cost is natural: a learner eats toxic food a few times before it learns,
  wastes time, and pays energy for plastic synapses. Section 6.6 makes the cost explicit and tunable.
- **Assimilation needs the learned solution to be reachable by the genome** (Mayley's "neighbourhood
  correlation"). In this design learning changes exactly the weights the genome sets at birth, so
  whatever is learned can in principle be written into the genome by mutation. This is a deliberate
  constraint on the architecture: no learned structure the genome cannot express.
- **Learning can also slow evolution** (the "hiding effect": learning shields poor genotypes from
  selection). The design must be able to show this result too. We report it honestly when it happens.
- **When learning should win** (Stephens 1991; tested in *Drosophila* by Dunlap & Stephens 2009):
  learning is favoured when the environment is predictable *within* a lifetime but not *across*
  generations. Fixed innate preferences win when the environment is stable across generations.
  Neither works when the environment changes faster than learning can track. The volatility setting
  (section 7.3) spans these three regimes.

What we will measure, per generation, per experimental condition, per replicate:

- **Newborn performance**: a standardized assay with plasticity frozen at birth.
- **Learned performance**: the same assay at the end of life, with plasticity frozen at that point
  (so it measures what was learned, not further learning during the assay).
- **Evolved plasticity**: the population's mean learning rate and fraction of plastic synapses.
  In stable environments, assimilation is often followed by a decline in plasticity
  (canalization). Seeing that decline would be a second, independent signature.

Genetic assimilation shows up as newborn performance rising toward learned performance. The Baldwin
effect shows up as the learning population reaching a performance criterion in fewer generations
than the no-learning control. We need both curves and both controls; neither alone is convincing,
because a no-learning population can also evolve the innate behavior on its own.

---

## 1. Decisions for Marco

Each row is something the brief left open or where I recommend changing it. "Rec." is my
recommendation; the section number explains why.

| # | Decision | Rec. | Alternative | § |
|---|---|---|---|---|
| D1 | View of the world | **Top-down** plane (no gravity), friction or water drag in the plane | Side view with gravity and a ground line (Sodarace-style) | 3.1 |
| D2 | Integrator | **Semi-implicit (symplectic) Euler**, 1 ms step, optional substeps | Verlet; position-based dynamics (XPBD) | 3.3 |
| D3 | Land friction model | **Anisotropic Coulomb friction per edge** (scale-like: forward < backward < sideways), regularized; plus evolvable **grip** effectors | Isotropic friction (creatures could barely move) | 3.4 |
| D4 | Water model | **Resistive force theory** per edge (normal drag > tangential), linear + quadratic term | Isotropic drag per node (no swimming possible) | 3.5 |
| D5 | Muscle energy cost | **Positive work / efficiency + an isometric holding cost** | Work only (holding a contraction would be free) | 3.6 |
| D6 | Synapse model | **Exponential current synapses** (τ ≈ 5 ms exc., 10 ms inh.) for creatures; delta synapses for the paper-replication tests | Delta synapses everywhere; conductance synapses | 4.3 |
| D7 | Neuron type genes | **Four Izhikevich parameters, mutated inside a bounded box** spanning the 2003 types | Discrete type labels; unconstrained parameters | 4.2 |
| D8 | Sensor encoding | **Receptor current injected into sensory neurons** (the neuron does the rate coding), population coding for continuous sensors | Poisson spike generators | 5.2 |
| D9 | Punishment | **Two neuromodulator channels**: reward ("dopamine") and punishment, each with an evolvable gain | One signed dopamine signal with dips below baseline | 6.3 |
| D10 | Reward source | **Innate taste and pain pathways with evolvable gains**; network-internal modulatory neurons later | Fixed reward with fixed gain | 6.3 |
| D11 | Eligibility and weight updates | **Event-driven traces + a modulated weight pass every 10 ms** (exact for exponentials) | Decay every synapse every 1 ms (10× slower) | 6.4 |
| D12 | Food identity | **Smell is the same for all food; colour is seen; toxicity is only felt after eating** (delayed malaise) | Smell differs by food (toxicity becomes trivially detectable) | 7.2 |
| D13 | Eating | **A "bite" motor neuron** must fire while the mouth touches food | Automatic eating on contact | 7.2 |
| D14 | Lab-mode arenas | **Each creature in its own identical arena** (no competition, perfectly fair, parallel) | One shared arena per generation | 9.2 |
| D15 | Control conditions | No-learning, frozen-plasticity, Lamarckian **plus a random-reward control** | Only the three in the brief | 9.3 |
| D16 | Smell field | **Coarse diffusion grid** (real diffusion and decay) | Analytic sum of kernels around each food | 7.4 |
| D17 | Compute budget | **Defaults sized so a full experiment runs overnight**: lab brains 20–60 neurons, 60 s lifetimes, 100 creatures | 300-neuron brains in lab experiments (~days per experiment) | 11 |
| D18 | Determinism scope | **Bit-identical on the same JS engine**; cross-engine reproducibility only statistically | Own `exp`/`sin` to make Chrome, Firefox and Node agree bit for bit | 10.3 |
| D19 | Milestones | Brief's M1–M8, plus **M0 skeleton**, and **experiment runner moved into M4** with a Hinton & Nowlan replication to validate it | Experiment framework only in M5 | 12 |
| D20 | Parallelism | **Workers with transferable buffers, no SharedArrayBuffer** (GitHub Pages cannot send the headers it needs) | SharedArrayBuffer via a service-worker workaround | 10.2 |

None of these block each other; Marco can approve all, or change individual rows.

---

## 2. Units and scales

Everything in SI so the numbers can be compared with real animals.

| Quantity | Unit | Typical value |
|---|---|---|
| Length | m | creature 0.1–0.5 m; world 10–40 m across |
| Mass | kg | point mass 0.005–0.05 kg; creature 0.05–0.5 kg |
| Time | s | neural step 1 ms; lifetime 60–300 s (lab), open-ended (ecosystem) |
| Force | N | muscle up to ~0.5–5 N |
| Energy | J | creature store ~50–500 J; one food item ~10–50 J |
| Membrane potential | mV | Izhikevich convention, v ∈ [−90, 30] |

The creatures are roughly the size of a small newt, leech or fish. That sets the physics regime:
in water a 0.2 m creature at 0.1 m/s has Reynolds number around 10⁴, so drag has an important
quadratic part (section 3.5).

---

## 3. Bodies and physics

### 3.1 The world is seen from above (D1)

The brief asks for a 2D world with food patches, smell gradients and foraging. Foraging and
gradient-following need a 2D plane to search. A side view (gravity, walking on a ground line) turns
the world into a 1D line of food, which makes chemotaxis and choice between food items almost
meaningless.

**Decision D1: top-down.** The creature lies on a surface (land) or floats in a layer of water. There
is no gravity in the plane; gravity only appears as the normal force behind friction on land.
This is the world of a crawling leech, a flatworm, or a swimming eel seen from above, and of
*C. elegans* on an agar plate.

The consequence is that locomotion must come from **anisotropic** interaction with the medium,
exactly as in real animals of this kind (sections 3.4 and 3.5). This is good science and also a
good emergence driver: creatures have to evolve gaits that exploit the physics rather than pushing
against a floor.

### 3.2 The body graph

A body is a graph:

- **Nodes**: point masses with mass `m`, radius `r` (for contact and touch), and a friction
  profile. Nodes carry sensors (touch, smell, eye, mouth) and effectors (grip).
- **Edges**: damped springs between two nodes with rest length `L₀`, stiffness `k` and damping `c`
  (a dashpot along the spring axis). An edge can be a **muscle**: its rest length is driven by a
  motor activation (section 3.6). An edge can carry a **stretch receptor** (proprioception, like a
  muscle spindle).

Constraints enforced at development time (genome → body):

- The graph is connected.
- 3 ≤ nodes ≤ 30, edges ≤ 80 (configurable).
- Spring stiffness is bounded so the system stays stable at the chosen step: with
  `ω = sqrt(k/m_min)` we require `ω·Δt ≤ 0.3` (well inside the symplectic-Euler limit of 2, so
  the integration is also *accurate*, not only stable). With 1 ms steps and `m = 0.005 kg`, that is
  `k ≤ 450 N/m`. If the genome asks for more, physics substeps increase for that creature.
- No self-collision inside a body at first (flagged in section 14 as a later addition).

### 3.3 Integrator (D2)

**Decision D2: semi-implicit (symplectic) Euler at 1 ms, with optional substeps.**

```
for each substep (Δt = 1 ms / n):
    F = spring forces + damping + muscle forces + medium forces (friction or drag) + contact
    v ← v + Δt · F / m
    x ← x + Δt · v
```

Why this and not the alternatives:

- **Symplectic Euler** preserves a modified energy of the undamped system, so a passive body
  oscillates forever with bounded energy instead of exploding or decaying artificially. That is
  exactly the M3 validation test ("does not gain energy"). It is as cheap as explicit Euler.
- **Velocity Verlet** has the same good properties and is second order, but our forces depend on
  velocity (damping, drag, friction), which makes Verlet awkward and loses its advantage.
  Position Verlet (no explicit velocity) makes drag and friction hard to write correctly.
- **XPBD** (position-based dynamics) is unconditionally stable and handles stiff springs well, but
  forces only exist implicitly, so the *mechanical work* done by muscles (which we must charge as
  metabolic energy) is harder to compute honestly. For a scientifically grounded energy budget,
  force-based dynamics is clearer.

Matching the neural step: one physics step per 1 ms neural step by default; `n` substeps when a
creature's springs are stiff. Physics and neurons share the same clock, so a muscle responds to a
spike with the right latency.

### 3.4 Land: anisotropic friction (D3)

On a flat surface with ordinary isotropic Coulomb friction, a soft body that only deforms itself
cannot get anywhere efficiently: every push forward is resisted as much as every push back. Real
crawlers solve this with anisotropy:

- **Snakes** have belly scales that make sliding forward easier than backward and much easier than
  sideways (Hu, Nirody, Scott & Shelley 2009, *PNAS*: roughly μ_forward < μ_backward < μ_sideways).
- **Leeches and inchworms** alternately grip and release with suckers or prolegs.

**Decision D3:** friction is computed **per edge** (with the two endpoint nodes sharing it), using
the edge's direction as the local body axis:

```
v_edge  = average velocity of the two nodes
v_t     = component along the edge (split into forward/backward by the edge's genetic polarity)
v_n     = component perpendicular to the edge
F_fric  = −N · ( μ_t± · reg(v_t) · t̂ + μ_n · reg(v_n) · n̂ )
reg(v)  = tanh(v / v_ε)          (regularized Coulomb friction)
N       = (m₁ + m₂)/2 · g · (1 + grip)     (normal force share)
```

- Coefficients `μ_forward`, `μ_backward`, `μ_normal` are genetic per edge, within physical bounds.
- **Grip effectors** (genetic, optional, on nodes) multiply the node's friction when a motor neuron
  drives them, like a leech sucker. Grip costs energy per second while engaged.
- `reg()` replaces the discontinuous Coulomb law with a steep but smooth curve (`v_ε` ≈ 1 mm/s).
  True static friction would need an implicit solver; regularized friction is the standard
  approximation in explicit soft-body simulators and avoids stick-slip chatter.

A useful physical fact this setup respects: because friction is rate-independent, even a single
oscillating joint (a reciprocal motion) can produce net motion on land if the friction is
asymmetric. That is why one half-center oscillator is enough for an inchworm in M3.

### 3.5 Water: resistive force theory (D4)

Drag on independent point masses (isotropic) cannot produce swimming: a slender body swims because
moving sideways through water is harder than moving lengthwise (Gray & Hancock 1955; resistive
force theory). **Decision D4:** drag is computed **per edge**, with the edge treated as a slender
segment of length `L`:

```
F_n = −L · ( c_n,lin · v_n + c_n,quad · |v_n| · v_n )
F_t = −L · ( c_t,lin · v_t + c_t,quad · |v_t| · v_t )
with c_n ≈ 2 · c_t
```

The linear term is the low-Reynolds (viscous) regime; the quadratic term is the inertial regime
that dominates for animals our size. Both are configurable, so Marco can switch the world to
"syrup" (linear only) and see the **scallop theorem** in action: in pure viscous flow a body with
one hinge flapping back and forth goes nowhere (Purcell 1977), and creatures need a travelling wave
with at least two out-of-phase joints. This is a nice built-in physics lesson and also a sanity
test (section 13).

Water also gets an optional uniform current, which adds drift and makes station-keeping a behavior.

### 3.6 Muscles (D5)

A muscle is a spring whose rest length shortens with activation `a ∈ [0, 1]`:

```
L_rest(a) = L₀ · (1 − κ · a)          κ = maximum contraction, genetic, ≤ 0.4
F_muscle  = clamp( k_m · (L − L_rest(a)), 0, F_max · a_eff )
```

- Muscles **only pull**, like real muscle. Bending in two directions needs an antagonistic pair
  (left and right), which is exactly what a half-center oscillator drives.
- The force cap `F_max` stands in for the force-length limit of real muscle and stops a single
  spike train from producing absurd forces.
- The passive spring (the edge's own `k`, `c`) still acts in parallel, like connective tissue.

Activation comes from motor neurons through a low-pass filter (a twitch that sums):

```
a ← a · exp(−Δt / τ_m) + α · (number of motor spikes this step);   a ← min(a, 1)
τ_m ≈ 50–150 ms (genetic)
```

**Energy cost (D5).** The brief says cost proportional to work. A pure work cost means holding a
contraction still (isometric) is free, which is wrong for real muscle (holding a weight costs ATP)
and would let evolution find "free" rigid postures. The recommendation:

```
P_muscle = max(0, F · dL/dt shortening power) / η  +  β · F_max · a
η ≈ 0.25 (muscle efficiency),  β = isometric cost coefficient
```

Negative work (the muscle being stretched while active) is not refunded.

### 3.7 Contacts and the world boundary

- Lab arenas have walls; ecosystem worlds wrap around (toroidal) to avoid edge effects.
- Node–wall contact: penalty spring with damping and an energy check (contacts must not inject
  energy; covered by a test).
- Creature–creature contact (ecosystem mode only): node–node repulsion through a spatial hash.
  Off in lab mode, where each creature has its own arena (D14).
- Touch sensors fire on any contact force at their node.

---

## 4. Neurons

### 4.1 Izhikevich model

Izhikevich (2003):

```
dv/dt = 0.04 v² + 5 v + 140 − u + I
du/dt = a (b v − u)
if v ≥ 30 mV:  v ← c,  u ← u + d
```

Integration at Δt = 1 ms follows Izhikevich's own reference code: `v` is updated in two 0.5 ms
half-steps (the quadratic term is stiff near threshold and a single 1 ms Euler step misses or
distorts spikes), `u` once. This is a known detail that matters for the M1 tests.

### 4.2 Neuron type is genetic (D7)

The standard types from Izhikevich 2003, which the M1 tests reproduce:

| Type | a | b | c | d | Behavior |
|---|---|---|---|---|---|
| RS regular spiking | 0.02 | 0.2 | −65 | 8 | tonic spikes with adaptation |
| IB intrinsically bursting | 0.02 | 0.2 | −55 | 4 | initial burst, then tonic |
| CH chattering | 0.02 | 0.2 | −50 | 2 | repetitive high-frequency bursts |
| FS fast spiking | 0.1 | 0.2 | −65 | 2 | high rate, no adaptation |
| LTS low-threshold spiking | 0.02 | 0.25 | −65 | 2 | adaptation, rebound |
| TC thalamo-cortical | 0.02 | 0.25 | −65 | 0.05 | two firing modes |
| RZ resonator | 0.1 | 0.26 | −65 | 2 | subthreshold resonance |

**Decision D7:** the genome stores the four numbers `(a, b, c, d)` directly, initialized from one of
these types, and mutation moves them continuously inside a bounded box
(`a ∈ [0.01, 0.12]`, `b ∈ [0.15, 0.27]`, `c ∈ [−70, −45]`, `d ∈ [0.05, 10]`). This lets evolution
discover intermediate types (as Izhikevich's own networks do with his `r`-parameterized families),
while the box keeps away from parameter regions where the model behaves non-physiologically.
The inspector shows the nearest named type, so the brain stays readable.

Each neuron also has a genetic **bias current** `I_bias` (intrinsic excitability), which is what
lets a CPG neuron fire tonically without input.

### 4.3 Synapses (D6)

- **Dale's law**: a neuron is either excitatory or inhibitory (genetic, rarely mutated). All of its
  outgoing synapses share that sign. Weights are stored as non-negative magnitudes `w ∈ [0, w_max]`
  and plasticity can never flip a sign.
- **Delays**: integer 1–20 ms, genetic per synapse. Implemented with a per-creature ring buffer of
  future input (section 8.2), the same trick as Izhikevich's `spnet`.
- **Synaptic current (D6):** each arriving spike adds `±w` to a postsynaptic current that decays
  exponentially, `τ_exc ≈ 5 ms` (AMPA-like), `τ_inh ≈ 10 ms` (GABA_A-like). Two state variables per
  neuron (excitatory and inhibitory current), so it costs almost nothing.
  The replication tests of Izhikevich 2003/2007 use **delta synapses** (instantaneous voltage jumps)
  to match the papers exactly; this is a per-brain setting.
  Conductance-based synapses (current depends on the distance to the reversal potential) are more
  realistic but not needed for anything in the brief; they can be added later behind the same
  interface.
- **Noise**: a small genetic-independent background current noise per neuron (seeded RNG). Real
  neurons are noisy and STDP needs some spontaneous activity to explore.

### 4.4 Neuron roles

| Role | Created by | Notes |
|---|---|---|
| Sensory | sensor genes (section 5) | receive receptor current; may have inputs too |
| Hidden | neuron genes | free to wire |
| Motor | muscle and effector genes | output filtered to activation; may have outputs too |

Motor neurons for a muscle can be a small pool (1–4 neurons), so force is graded by recruitment as
in real motor units.

---

## 5. Sensors

### 5.1 Sensor catalogue

| Sensor | Attached to | Physical signal | Biological analogue |
|---|---|---|---|
| Touch | node | contact force magnitude | mechanoreceptor |
| Smell | node | food odor concentration at the node (bilinear sample of the diffusion grid) | olfactory receptor |
| Eye | node + a reference edge for direction | light arriving from a sector (field of view, range); 2–3 colour channels | photoreceptor with opsins |
| Proprioception | edge | strain `(L − L₀)/L₀` and its rate | muscle spindle |
| Energy | body | `1 − E/E_max` ("hunger") | interoception |
| Taste | mouth node | sweetness of eaten food (immediate) | gustatory receptor |
| Malaise / pain | body | toxin damage (delayed) and tissue damage | nociceptor, visceral malaise |

**Eyes and colour.** Food colours are points on a hue circle. An eye has 2 or 3 colour channels with
Gaussian spectral tuning (like cone opsins), plus a genetic angular field of view and range. For
each eye we find food items in its sector through the spatial hash; each channel's activation is
`Σ tuning(hue) · intensity / (1 + (d/d₀)²)`. Colour vision is therefore a real, evolvable sensor:
evolution can tune a channel to make the toxic colour easier to discriminate.

**Smell gradients.** A single smell sensor gives concentration, not direction. Direction comes from
comparing sensors (two nodes on either side of the head, as in tropotaxis) or from comparing over
time while moving (klinotaxis, as *C. elegans* does). Both are possible with this design and we do
not hard-wire either.

### 5.2 Encoding into spikes (D8)

The brief offers rate or population coding. **Decision D8:** each sensor drives one or more sensory
neurons by **injecting a receptor current**, and the Izhikevich neuron converts current into a
firing rate itself. This is how real receptors work (a receptor potential, then spikes), it is
deterministic and cheap, and the f–I curve of the neuron type (genetic) becomes part of the
sensory transfer function.

For continuous variables with a wide range (proprioception, energy, eye channels) the sensor uses
**population coding**: `k` neurons (genetic, 1–5) with Gaussian tuning curves tiling the range, so
each neuron responds to part of the range.

Poisson spike generators were the alternative. They need many random draws per millisecond and add
noise that is not physically motivated; I recommend keeping them only as an option for the
paper-replication tests.

Vision and smell sensors are sampled every 10 ms (the neural step remains 1 ms; the receptor current
is held between samples). Real photoreceptors integrate over tens of milliseconds, so nothing is
lost, and it cuts sensing cost tenfold.

---

## 6. Learning

### 6.1 STDP

Pair-based STDP with exponential window (Song, Miller & Abbott 2000; Bi & Poo 1998):

```
Δt = t_post − t_pre_arrival        (spike arrival at the synapse, i.e. after the delay)
STDP(Δt) =  A₊ · exp(−Δt / τ₊)     if Δt > 0   (pre before post: potentiation)
           −A₋ · exp( Δt / τ₋)     if Δt < 0   (post before pre: depression)
```

Implemented with traces: each neuron keeps a presynaptic trace `x_pre` and a postsynaptic trace
`x_post` that jump on spikes and decay exponentially. All-to-all pairing by default, nearest-
neighbour as an option.

### 6.2 Reward-modulated STDP (Izhikevich 2007)

STDP does not change the weight directly. It writes into a per-synapse **eligibility trace** `e`
(a "synaptic tag") that decays slowly:

```
de/dt = −e / τ_e + STDP(Δt) · δ(spike events)       τ_e ≈ 1 s
dw/dt = η · e · M(t)
```

where `M(t)` is the neuromodulator signal. A spike pairing that happened up to ~1–2 s before a
reward still has a non-zero tag when the reward arrives, so the right synapse is credited. That is
Izhikevich's solution to the distal reward problem, and it is the M2 test.

### 6.3 Neuromodulators: reward and punishment (D9, D10)

**Decision D9: two channels.**

```
dD/dt = −(D − D₀)/τ_D + reward input              ("dopamine", τ_D ≈ 0.2 s)
dP/dt = −P/τ_P       + punishment input           ("punishment" channel, τ_P ≈ 0.2 s)
M(t)  = g_D · (D − D₀)  −  g_P · P
```

The brief allows either a single dopamine signal with dips for punishment or something else. Real
brains use dopamine dips for *negative prediction error* but signal aversive events through other
systems too (serotonin, other dopamine subpopulations). Two channels with **separate, evolvable
gains** `g_D` and `g_P` are easier to read in the UI (two traces), and let evolution weigh reward
against punishment independently, which is itself an interesting thing to watch evolve.

**Decision D10: where reward comes from.** A fixed external "reward on eating" makes the reward
function something we impose. A grounded and still simple alternative:

- Reward input = innate **taste pathway**: `reward = g_taste · sweetness` of the eaten item.
- Punishment input = innate **malaise and pain pathway**: `g_malaise · toxin_damage + g_pain · tissue_damage`.
- All gains are genetic. Evolution can make a creature more or less sensitive to sweetness or pain.
- The **clicker** (Training mode) injects directly into the reward channel.

Later (section 14): let modulatory neurons be ordinary network neurons whose inputs are evolvable.
That would allow the evolution of reward prediction and second-order conditioning (a conditioned
cue becomes rewarding), but makes the system harder to read. Not in the first version.

### 6.4 Making it cheap (D11)

The textbook formulation decays every synapse's eligibility trace every millisecond. With 200
creatures × ~6,000 synapses that is over a billion updates per simulated second, most of them on
synapses that did nothing.

**Decision D11:**

- Eligibility traces are updated **lazily**: each synapse stores the time of its last update, and
  the trace is decayed analytically (`e · exp(−Δt/τ_e)`) only when the synapse is touched by a
  spike or by the weight pass.
- The **modulated weight change is applied in a pass every 10 ms**. Between passes `e` and `M`
  decay exponentially, so `∫ e·M dt` over the 10 ms window has a closed form and the result is
  exact, not an approximation. (A reward pulse inside the window is handled by splitting the
  window at the pulse.)
- The pass skips synapses whose `|e|` is below a tiny threshold.

The M2 test compares this against the naive every-millisecond version on the same seed; weights
must agree to within floating-point tolerance.

### 6.5 Evolvable plasticity

Genes, per creature unless noted:

| Gene | Meaning |
|---|---|
| `A₊`, `A₋`, `τ₊`, `τ₋` | STDP window shape (amplitude and width of each side) |
| `τ_e` | eligibility trace duration (how distal a reward can be) |
| `η` | global learning rate |
| `g_D`, `g_P`, `g_taste`, `g_malaise`, `g_pain` | neuromodulator gains and sensitivities |
| per synapse `plastic: bool` | which synapses can learn |
| per neuron `learn_gain` | how strongly synapses onto this neuron respond to the modulator |

Finer granularity (a window per synapse) would enlarge the search space a lot for unclear gain;
per-creature windows with per-synapse switches and per-neuron gains is the usual compromise in the
evolved-plasticity literature (Soltoggio et al. 2008, Niv et al. 2002).

Weights are bounded `[0, w_max]` with soft bounds (changes scale with distance to the bound) to
avoid all weights saturating; the bound type is a configuration choice, tested both ways in M2.

### 6.6 Learning costs

To give assimilation something to act on (section 0):

- Natural costs: toxic bites while learning, time spent before the behavior is right.
- Explicit cost: a metabolic cost per plastic synapse per second (`c_plastic`, configurable,
  default small). Biologically, maintaining plasticity machinery (receptor turnover, protein
  synthesis) is not free.
- Both are reported, so a result can be attributed to one or the other.

### 6.7 Darwinian by default, Lamarckian as a toggle

- **Darwinian**: offspring get the parent's *genetic* initial weights (mutated). What the parent
  learned is lost.
- **Lamarckian**: before reproduction, the parent's learned weights are written back into its
  genome's initial-weight genes, then mutated. Used only as a comparison condition.

---

## 7. Environment

### 7.1 World

- Lab arena: a bounded rectangle (default 10 m × 10 m) with walls, the medium (land or water)
  chosen per experiment.
- Ecosystem world: toroidal, larger (default 40 m × 40 m), may mix land and water regions.

### 7.2 Food, colour and toxicity (D12, D13)

Food items sit in patches. Each item has a hue (colour), an energy value, and a hidden toxicity
determined by the current colour→toxicity mapping.

What a creature can know about a food item, and when:

| Before eating | When eating | After eating |
|---|---|---|
| Smell (same for all food: D12) and colour (eyes) | Taste: sweetness (immediate reward) | Malaise from toxin, delayed 0.5–2 s (punishment) |

**Decision D12:** if toxic food smelled different, a creature could avoid it by smell alone and the
colour-learning problem disappears. Keeping smell identical makes **colour the only cue** that
predicts toxicity, which is the cleanest test of learned versus innate colour preference.

The delay between eating toxic food and malaise mirrors conditioned taste aversion in real animals
(the Garcia effect). It also means the learning problem *is* a distal reward problem, which is
exactly what reward-modulated STDP with eligibility traces is built to solve. M2 and M5 connect.

**Decision D13:** eating requires a **bite** motor neuron to fire while the mouth node touches food.
With automatic eating, avoidance can only show up as steering, which is slow to evolve and harder to
measure. A bite decision makes the behavior crisp: "did it bite the red item?" is a clean assay,
and steering away remains possible on top of it.

Food energy minus toxin damage is net negative for toxic items, so eating toxic food is always a
mistake, but a survivable one (the cost of learning).

### 7.3 Volatility of the colour→toxicity mapping

Configurable per experiment:

| Setting | What changes | Theory's prediction |
|---|---|---|
| `never` | fixed mapping forever | innate avoidance evolves; plasticity may decline |
| `between generations, every k` | mapping flips at the start of every k-th generation | learning favoured, especially for small k |
| `within lifetime, period T` | mapping flips every T seconds of life | learning helps if T ≫ learning time; nothing works if T is short |

Plus a probabilistic variant (flip with probability p per generation), which matches Stephens'
model more closely than a strict period.

### 7.4 Smell field (D16)

**Decision D16:** smell is a coarse diffusion grid (default 128 × 128 cells, ~8–30 cm per cell)
with emission at food items, diffusion and decay, updated every 50 ms. Sensing is a bilinear sample.

The alternative, an analytic sum of kernels around each food item, is cheaper per sample but
cannot represent depletion, flow or anything non-static. The grid costs roughly 16k cell updates
20 times per second, which is negligible, and it opens the door to trails, currents and
pheromones later.

### 7.5 Damage

Damage sources: toxin (delayed, from eating), overstretched springs (strain beyond a limit tears
tissue and costs energy), and in ecosystem mode optional hazard zones. Damage drives the pain input
to the punishment channel.

---

## 8. Genome and data structures

### 8.1 Genome (NEAT-style direct encoding)

Every gene has a global **innovation number** assigned when it first appears in the run, as in NEAT
(Stanley & Miikkulainen 2002). Body and brain genes share the same innovation counter.

```ts
interface Genome {
  id: number;
  parents: number[];            // for the phylogeny
  generation: number;
  bodyNodes:  BodyNodeGene[];   // { innov, mass, radius, friction profile, grip?: {motorPool} }
  bodyEdges:  BodyEdgeGene[];   // { innov, from, to, restLen, k, damping, polarity,
                                //   muscle?: { kappa, Fmax, tauM, motorPool } }
  sensors:    SensorGene[];     // { innov, kind, attachTo, params, sensoryPool }
  neurons:    NeuronGene[];     // { innov, role, sign: exc|inh, a, b, c, d, bias, learnGain }
  synapses:   SynapseGene[];    // { innov, pre, post, weight, delay, plastic, enabled }
  plasticity: PlasticityGenes;  // section 6.5
  metabolism: MetabolismGenes;  // gains, max energy, mouth size...
}
```

Muscles, grips and sensors refer to pools of neurons by innovation number, so body and brain stay
linked through mutation and crossover.

**Mutations** (rates configurable, defaults chosen in M4):

- Perturb a real-valued parameter (Gaussian, scaled to the parameter's range); occasionally reset.
- Add synapse; disable/remove synapse; toggle `plastic`.
- Add neuron (split a synapse, as in NEAT); remove an unconnected hidden neuron.
- Add body node (with springs to two existing nodes, keeping the body connected); remove node.
- Add/remove muscle on an existing edge (with a new motor pool); add/remove sensor.
- Change neuron sign (rare, because it flips all outgoing synapses).

**Crossover**: genes aligned by innovation number; matching genes inherited from either parent at
random; disjoint and excess genes from the fitter parent (standard NEAT). Body and brain cross over
together, which keeps sensors, muscles and their pools consistent.

**Speciation**: NEAT's compatibility distance

```
δ = c₁·E/N + c₂·D/N + c₃·W̄ + c₄·B̄
```

where `E`, `D` are excess and disjoint genes, `W̄` the mean weight difference of matching synapses,
and `B̄` a mean body-parameter difference (new term, so very different bodies are separated). Fitness
sharing within species; the threshold adapts to keep a target number of species. Speciation is used
in Lab mode. In Ecosystem mode it is only *measured* (for the phylogeny view), never enforced:
species there must emerge.

### 8.2 Development: the one door to the phenotype

```ts
develop(genome: Genome, cfg: DevelopConfig): CreatureSpec
```

`CreatureSpec` is flat arrays only: masses, springs, muscles, sensors, neurons and synapses, with
genetic innovation numbers kept beside them so learned weights can be mapped back (Lamarckian toggle,
weight heatmap labels). **Everything after development only sees `CreatureSpec`.** An indirect
encoding later (a CPPN as in HyperNEAT, or a developmental grammar) only has to produce a
`CreatureSpec`; nothing else in the simulation changes.

### 8.3 Runtime state (typed arrays)

Per creature (structure of arrays):

```
Neurons (N):     v, u, a, b, c, d, bias, Iexc, Iinh, xPre, xPost, lastSpike   Float32Array / Int32Array
                 sign, role                                                   Uint8Array
Synapses (S):    CSR by presynaptic neuron, sorted by delay
                 outStart (N+1), post, weight, delay, elig, eligT, plastic     Int32 / Float32 / Uint8
                 inIndex: CSR by postsynaptic neuron (indices into the above), for STDP on post spikes
Delay buffer:    ring of D_max slots × N inputs                               Float32Array(D_max · N)
Modulators:      D, P (scalars)
Physics (K):     x, y, vx, vy, fx, fy, invMass, radius                        Float32Array (Float64 for x, y)
Edges (E):       a, b, restLen, k, damp, μ's, polarity, muscle index          Int32 / Float32
Muscles:         activation, kappa, Fmax, tauM, motorPoolStart/len
Sensors:         kind, target, params, neuronPoolStart/len, held current
Energy:          E, and running totals by category (neural, muscle, basal, plasticity, food, toxin)
```

Positions use Float64 so a creature crossing a 40 m world keeps millimetre precision; everything
else Float32 for cache density.

A spike at time `t` from neuron `i`: for each outgoing synapse `s` (contiguous in memory),
`buffer[(t + delay[s]) mod D_max][post[s]] += sign[i] · weight[s]`. Each step a neuron reads and
clears its slot. This is cheap and cache-friendly.

### 8.4 Population, phylogeny and saves

- `Population`: genomes, species, innovation registry, generation counter, RNG state.
- `PhylogenyRecord`: `{ id, parents, generation, species, fitness, born, died, causeOfDeath }`,
  compact and append-only. The full genome is kept for survivors, species representatives and a
  sampled archive, so the phylogeny can be browsed without storing every genome.
- **Save format** (JSON, versioned):
  - creature: `{ version, genome, learnedWeights?: base64 Float32Array, stats }`
  - population: `{ version, config, rngState, generation, genomes, species, innovations, phylogeny }`
  - experiment: spec + all results, so a run can be reproduced from its file.

---

## 9. Experiments

### 9.1 Fitness in Lab mode

Fitness is the **net energy gained over a fixed lifetime** (food eaten minus metabolic costs,
toxin and damage). This is close to what selection measures in nature (resources turned into
reproduction) and avoids a hand-designed behavioral score. Creatures that die early get the energy
they had at death, minus a penalty. The newborn and learned assays (below) are *measurements*, not
part of fitness.

### 9.2 One creature, one arena (D14)

**Decision D14:** in Lab mode each creature lives alone in its own copy of the arena. All creatures
of a generation see the same arena layout (same seed per generation), and the layout changes each
generation.

- Fair: no luck from where you spawn relative to others.
- No frequency dependence or competition, which would confound the learning-vs-instinct question.
- Embarrassingly parallel: each worker takes a batch of creatures, no communication.

Competition and social effects belong to Ecosystem mode.

### 9.3 Conditions (D15)

Each experiment runs several populations side by side from the same seeds:

| Condition | Plasticity genes | Learning during life | What it controls for |
|---|---|---|---|
| **Learning** | evolve | on | (the treatment) |
| **No-learning** | absent | off | evolution of instinct alone |
| **Frozen plasticity** | present, evolve | off | the effect of carrying plasticity genes and costs without learning |
| **Lamarckian** | evolve | on; learned weights inherited | upper bound: direct inheritance of acquired behavior |
| **Random reward** (new) | evolve | on, but reward/punishment pulses at random times with the same rate | plasticity acting as noise rather than learning |

The brief names the first four. The **random-reward control** is standard in conditioning
experiments: if it does as well as the learning condition, the benefit is not coming from learning
the contingency. I recommend adding it; it costs one more population.

I read "frozen-plasticity" as defined above; the other possible reading is "take an evolved learning
population and freeze it". If Marco meant that, it becomes a one-off assay rather than a condition.

### 9.4 Assays

A standardized assay, run outside the lifetime so it does not affect fitness:

- **Colour choice assay**: the creature starts at a fixed point with N safe and N toxic items
  arranged symmetrically; record approaches and bites over 20 s. Score:
  `preference = (safe bites − toxic bites) / (total bites)`, and also latency to first bite.
- **Locomotion assay**: distance travelled in 20 s with no food (to separate "can't move" from
  "can't choose").

Each assay is run twice per sampled creature: **newborn** (weights at birth, plasticity off) and
**learned** (weights at end of life, plasticity off). The toxic colour used is the one current at
that generation.

### 9.5 Replicates and statistics

- Default 10 replicates per condition; each replicate seed is derived from the experiment seed.
- Per generation: mean and 95% bootstrap confidence interval across replicates.
- Main comparison: generations to reach a criterion (e.g. newborn preference > 0.8), compared
  between conditions with a Mann–Whitney U test; censored runs (never reach it) reported as such.
- Everything is reported, including null and negative results.

### 9.6 CSV export

`generations.csv`, one row per (experiment, condition, replicate, generation):

```
experiment,condition,replicate,generation,seed,toxic_hue,pop_size,species,
fitness_mean,fitness_max,energy_food,energy_toxin,energy_neural,energy_muscle,energy_plasticity,
newborn_pref_mean,newborn_pref_ci_lo,newborn_pref_ci_hi,learned_pref_mean,learned_pref_ci_lo,learned_pref_ci_hi,
locomotion_mean,neurons_mean,synapses_mean,plastic_fraction_mean,eta_mean,A_plus_mean,A_minus_mean,tau_e_mean,gD_mean,gP_mean
```

Plus `creatures.csv` (one row per assayed creature) and `species.csv`. Columns are documented in the
repository.

### 9.7 Validating the framework itself (part of D19)

Before trusting it on spiking creatures, the experiment runner is validated on the **Hinton & Nowlan
(1987)** model: 20-locus genomes with alleles 0, 1, ? and random guessing during life. It runs in
seconds, and its known result (learning population finds the needle, no-learning population does
not; question marks are gradually replaced by correct alleles) checks the statistics, CSV and
plotting pipeline end to end.

---

## 10. Architecture

### 10.1 Layout

```
src/
  core/        rng, clock, config schema, math helpers (no DOM)
  neural/      Izhikevich step, synapses, delay buffer, STDP, eligibility, modulators
  physics/     integrator, springs, muscles, friction, drag, contacts
  body/        sensors, effectors, metabolism
  world/       arena, food, colour mapping, diffusion grid, spatial hash
  genome/      genes, mutation, crossover, innovation registry, develop()
  evolution/   speciation, selection, reproduction, Lab and Ecosystem loops
  experiment/  experiment spec, conditions, assays, statistics, CSV
  sim/         Creature, Simulation (one tick = 1 ms), snapshot builder
  worker/      worker entry points and message protocol
  ui/          canvas views, panels, plots (the only code that touches the DOM)
  main.ts
tests/         Vitest, one folder per src folder, plus science/ for the validation milestones
tools/         Node CLI: headless runs and experiments
```

The simulation (everything outside `ui/`, `worker/`, `main.ts`) runs unchanged in the browser, in
workers, in Node and in tests.

### 10.2 Threads and modes (D20)

- **Real-time mode**: one simulation worker runs the world at 1× (or faster) and posts snapshots to
  the page ~30 times per second: body positions, muscle activations, and for followed creatures the
  spikes, chosen voltage traces, modulator levels and weights. Buffers are transferred, not copied.
- **Headless mode**: a pool of workers (one per core minus one). The coordinator worker owns the
  population and the RNG; each evaluation worker receives `(genome, arena seed, config)` batches and
  returns fitness, assay results and (when needed) learned weights.
- **Node**: the same code runs from `tools/` for long experiments on a computer without a browser
  tab open.

**Decision D20:** no `SharedArrayBuffer`. It requires cross-origin isolation headers that GitHub
Pages cannot set. Lab-mode evaluation is independent per creature, so message passing costs nothing
meaningful.

### 10.3 Determinism (D18)

- One seeded generator (PCG32 or similar, own implementation). Every random stream is derived from
  `(experiment seed, replicate, generation, creature id, purpose)` with a hash, so results do not
  depend on which worker evaluated which creature or in what order.
- No `Math.random`, no real time in the simulation (lint rule, as in the colony project).
- Ordering: always by id; no iteration over object-identity keys.
- **Scope (D18):** bit-identical results on the same JavaScript engine (Chrome and Node share V8).
  Firefox's `Math.exp` can differ in the last bit, which can grow into different trajectories.
  Writing our own `exp`, `tanh`, `sin` would make every engine agree, at some cost and effort. I
  recommend not doing it at first: the experiments are statistical, and a run file records which
  engine produced it. The hot loops use precomputed decay factors anyway, so few transcendental
  calls happen there.
- A determinism test runs the same short simulation twice and compares a hash of the full state.

### 10.4 One millisecond, in order

```
1. sensors (vision and smell every 10 ms; touch, proprioception, energy every step) → receptor currents
2. neurons: read delay buffer, update synaptic currents, step v and u, detect spikes
3. spikes: write into delay buffer; update STDP traces and eligibility (event-driven)
4. motor: filter motor spikes into muscle and grip activation
5. physics: forces, integrate (n substeps)
6. world: bites, food eaten, toxin timers, damage
7. modulators: reward and punishment inputs, decay
8. every 10 ms: modulated weight pass
9. metabolism: charge neural, muscle, basal and plasticity costs; death check
```

### 10.5 Metabolism

```
P_total = N · e_basal_neuron + S · e_basal_synapse + S_plastic · c_plastic
        + spikes · (e_AP + e_syn · out_degree)
        + P_muscles + P_grip + P_body_basal(mass)
```

The per-spike cost scales with out-degree because most of the energy of signalling goes into
synaptic transmission, not the action potential itself (Attwell & Laughlin 2001). This puts real
selective pressure on brain size *and* connectivity *and* activity. Default constants are chosen in
M7 so that a typical brain costs on the order of 10–20% of a resting creature's budget (the human
brain is ~20% of resting metabolism; smaller animals less).

### 10.6 Rendering

Canvas2D, top-down. Bodies drawn as filled soft shapes over their springs; muscles coloured by
activation; sensors as small glyphs (eyes show their field of view when selected). Plots (raster,
traces, heatmap, brain graph) are separate canvases fed from the snapshot stream.

---

## 11. Compute budget (D17)

Rough costs in plain JavaScript on one core, which I will measure in M8 and replace with real
numbers:

- Neuron update ≈ 10–20 ns → a 300-neuron brain is ~5 µs per ms of simulated time.
- Synaptic events at ~5–10 Hz average firing and ~20 synapses per neuron, plus physics and sensing:
  overall roughly **20–40 creature-seconds simulated per core-second** for 300 neurons, and
  ~100–200 for 40 neurons.

One Lab experiment = 5 conditions × 10 replicates × 200 generations × 100 creatures × 60 s of life
= 6 × 10⁸ creature-seconds:

| Brain size | Cores | Time per experiment |
|---|---|---|
| 300 neurons | 8 | ~1–3 weeks |
| 40 neurons | 8 | ~1–3 days |
| 40 neurons, 5 replicates, 100 generations | 8 | ~half a day |

**Decision D17:** the default *lab* configuration uses brains of 20–60 neurons, 60 s lifetimes,
populations of 100 and a ladder of experiment sizes (quick: minutes; standard: overnight; full: days
in Node). The Baldwin and assimilation questions do not need large brains: the classic results were
obtained with tiny ones. Ecosystem and Training modes, where we watch individuals, can use the
larger brains (up to 300 neurons and beyond) because only a few dozen creatures run at once.

This is the most important practical constraint in the whole project, so M8 is not the first time
we look at performance: every milestone records its timing.

---

## 12. Milestones

Every milestone ends with tests green, a short "what you can now see" note, and a commit (one pull
request per milestone, or a few small ones for the larger milestones).

**M0 Skeleton** (new). Repository, Vite, TypeScript, Vitest, lint (no `Math.random`, no `Date` in
the simulation), CI, GitHub Pages deploy, seeded RNG with tests, determinism hash test, Node CLI stub.

**M1 Neurons, synapses, STDP.**
- Izhikevich neuron with the half-step integration; delays and the ring buffer; exponential and
  delta synapses; Dale's law.
- Tests: the seven types in section 4.2 under step current reproduce their characteristic firing
  (checked by measurable features: ISI adaptation ratio for RS, initial burst then tonic for IB,
  burst/interburst structure for CH, high rate without adaptation for FS, rebound for LTS). An f–I
  curve per type. STDP pairing protocol (60 pairings at 1 Hz across Δt from −100 to +100 ms) gives
  a window whose fitted amplitudes and time constants match the configured ones within 5%.
- Visible: a page showing a chosen neuron type's voltage trace for a current you set.

**M2 Reward-modulated STDP.**
- Eligibility traces, the two modulator channels, the lazy implementation and the reference
  implementation side by side.
- Tests: lazy vs reference agree. Distal reward replication of Izhikevich 2007: 1000 neurons
  (800 exc, 200 inh), 10% connectivity; reward after a random 0–1 s delay whenever a chosen synapse's
  pre fires shortly before its post; pass when the chosen synapse reaches ≥ 90% of `w_max` while the
  others stay near their mean, on 3 seeds. This is a slow test (minutes), run on demand and in
  nightly CI; a scaled-down version runs on every push. Also the classical conditioning experiment
  from the same paper (a stimulated group comes to drive the reward).
- Visible: the raster and the chosen synapse's weight climbing.

**M3 Bodies, muscles, sensors; hand-wired CPG.** First playable slice.
- Integrator, springs, muscles, land friction, water drag, sensors, energy accounting.
- Tests: passive body (no damping) keeps energy bounded over 10⁶ steps; with damping, energy never
  rises; wall contacts do not inject energy; scallop theorem in the linear-drag setting (a one-hinge
  flapper has ~zero net displacement per cycle, a two-hinge travelling wave moves).
- Hand-wired **half-center oscillator**: two neurons with tonic bias and mutual inhibition, with
  adaptation from their `d` parameter, drive an antagonistic muscle pair. On land with directional
  friction an **inchworm** crawls. In water, two coupled half-centers with a phase lag drive a
  three-segment **swimmer**.
- Visible: watch the walker and swimmer; raster of the CPG; muscle activation traces.

**M4 Genome, mutation, speciation, evolution without learning; experiment runner.**
- Genome, `develop()`, mutation, crossover, innovation registry, speciation, Lab loop, worker pool,
  Node CLI.
- The experiment runner (conditions, replicates, CSV, plots) is built *here* rather than in M5 (D19),
  and validated by the Hinton & Nowlan replication (section 9.7).
- Initial population may be seeded with the M3 CPG (the brief allows this scaffold), with mutations
  from there. Each run records whether it was seeded.
- First evolution target: locomotion, then foraging with only safe food.
- **Stop rule**: if creatures fail to move or forage after the configured number of generations, I
  stop and report what is happening (with plots and recorded individuals) before changing anything.

**M5 Lifetime learning with evolvable plasticity; full experiment conditions.**
- Plasticity genes, colour and toxicity, assays, the five conditions, volatility settings.
- Main result: learning vs no-learning across volatility regimes, newborn vs learned curves.
  Reported honestly, with proposals if learning does not help.

**M6 Full UI.** Follow a creature; raster, voltage traces, modulator levels; live weight heatmap;
brain graph with activity; lesion tool (silence a neuron, cut a synapse, undo); clicker training;
phylogeny browser; save/load creatures and populations.

**M7 Ecosystem mode.** Continuous world, reproduction when energy allows (asexual first, with an
option for mating by contact), food regrowth, death by starvation or age, species measured but not
enforced. Metabolic constants calibrated here.

**M8 Performance.** Profiling and optimization, including the WebGPU question (only if workers are
the measured bottleneck). Updated compute table.

Training mode arrives with M6 (it needs the clicker and the visualizations), on top of the M5 brain.

---

## 13. Validation checklist

| Claim | Test | Milestone |
|---|---|---|
| Izhikevich 2003 firing patterns | feature tests per type | M1 |
| STDP window | pairing protocol and fit | M1 |
| Lazy eligibility is exact | comparison with reference implementation | M2 |
| Distal reward solved | Izhikevich 2007 replication, 3 seeds | M2 |
| Passive physics is conservative | energy bounded / non-increasing | M3 |
| Medium physics is right | scallop theorem; drag anisotropy needed for swimming | M3 |
| CPG produces locomotion | inchworm and swimmer move ≥ a body length per N cycles | M3 |
| Determinism | same seed, same hash | M0 onwards |
| Experiment framework | Hinton & Nowlan replication | M4 |
| Learning helps evolution in some environments | M5 experiments, reported honestly | M5 |

---

## 14. Deliberately left for later

- Network-internal modulatory neurons (reward prediction, second-order conditioning).
- Indirect encoding (CPPN/HyperNEAT or a developmental grammar), through `develop()`.
- Self-collision inside a body.
- Conductance-based synapses; short-term synaptic depression and facilitation.
- Homeostatic plasticity (synaptic scaling), which often stabilizes STDP networks; it may become
  necessary in M5 if weights run away, in which case I will propose it rather than add it silently.
- Predators, mating displays and social learning in Ecosystem mode.

---

## 15. References

- Attwell D, Laughlin SB (2001). An energy budget for signaling in the grey matter of the brain. *J Cereb Blood Flow Metab*.
- Bi G, Poo M (1998). Synaptic modifications in cultured hippocampal neurons. *J Neurosci*.
- Dunlap AS, Stephens DW (2009). Components of change in the evolution of learning and unlearned preference. *Proc R Soc B*.
- Gray J, Hancock GJ (1955). The propulsion of sea-urchin spermatozoa. *J Exp Biol*.
- Hinton GE, Nowlan SJ (1987). How learning can guide evolution. *Complex Systems*.
- Hu DL, Nirody J, Scott T, Shelley MJ (2009). The mechanics of slithering locomotion. *PNAS*.
- Izhikevich EM (2003). Simple model of spiking neurons. *IEEE Trans Neural Netw*.
- Izhikevich EM (2007). Solving the distal reward problem through linkage of STDP and dopamine signaling. *Cereb Cortex*.
- Mayley G (1997). Landscapes, learning costs, and genetic assimilation. *Evol Comput*.
- Mery F, Kawecki TJ (2002). Experimental evolution of learning ability in fruit flies. *PNAS*.
- Niv Y, Joel D, Meilijson I, Ruppin E (2002). Evolution of reinforcement learning in uncertain environments. *Adaptive Behavior*.
- Purcell EM (1977). Life at low Reynolds number. *Am J Phys*.
- Sims K (1994). Evolving virtual creatures. *SIGGRAPH*.
- Soltoggio A, Bullinaria JA, Mattiussi C, Dürr P, Floreano D (2008). Evolutionary advantages of neuromodulated plasticity in dynamic, reward-based scenarios. *ALIFE XI*.
- Song S, Miller KD, Abbott LF (2000). Competitive Hebbian learning through spike-timing-dependent synaptic plasticity. *Nat Neurosci*.
- Stanley KO, Miikkulainen R (2002). Evolving neural networks through augmenting topologies. *Evol Comput*.
- Stephens DW (1991). Change, regularity, and value in the evolution of animal learning. *Behav Ecol*.
- Waddington CH (1953). Genetic assimilation of an acquired character. *Evolution*.

Citations are from memory; I will check each against the paper before relying on a specific
number from it in a test.
