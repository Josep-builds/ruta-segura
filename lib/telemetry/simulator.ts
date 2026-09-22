import type { EventCategory, TelemetryEvent } from "./types";

/**
 * Perfiles calibrados para que el umbral ingenuo de solo-acelerómetro
 * (>= 0.4g) dispare en "bache" y "manejo_telefono" tanto como en
 * "frenado_real" — ese es exactamente el problema que el motor de
 * fusión (F3) existe para reducir. Los rangos no son un dataset real
 * de choques; son una simulación etiquetada para medir el efecto de
 * combinar caída de velocidad + pico de aceleración.
 */
const CATEGORY_PROFILES: Record<
  EventCategory,
  {
    speedBeforeKmh: [number, number];
    speedDropKmh: [number, number];
    accelPeakG: [number, number];
  }
> = {
  frenado_real: {
    speedBeforeKmh: [25, 60],
    speedDropKmh: [16, 45],
    accelPeakG: [0.45, 1.3],
  },
  bache: {
    speedBeforeKmh: [15, 45],
    speedDropKmh: [0, 9],
    accelPeakG: [0.4, 0.95],
  },
  manejo_telefono: {
    speedBeforeKmh: [10, 35],
    speedDropKmh: [0, 5],
    accelPeakG: [0.35, 0.7],
  },
  parada_normal: {
    speedBeforeKmh: [15, 45],
    speedDropKmh: [10, 40],
    accelPeakG: [0.1, 0.45],
  },
};

const CATEGORIES = Object.keys(CATEGORY_PROFILES) as EventCategory[];

function mulberry32(seed: number) {
  let state = seed | 0;
  return function random() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randRange(rng: () => number, [min, max]: [number, number]) {
  return min + rng() * (max - min);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Genera eventos sintéticos etiquetados con su categoría real, en orden
 * mezclado, usando un PRNG con semilla fija para que la tasa de falsos
 * positivos medida en F3 sea reproducible entre corridas.
 */
export function generateLabeledEvents(
  count = 52,
  seed = 42
): TelemetryEvent[] {
  const rng = mulberry32(seed);

  const labels: EventCategory[] = [];
  for (let i = 0; i < count; i++) labels.push(CATEGORIES[i % CATEGORIES.length]);
  for (let i = labels.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [labels[i], labels[j]] = [labels[j], labels[i]];
  }

  const startTime = Date.now();

  return labels.map((category, i) => {
    const profile = CATEGORY_PROFILES[category];
    const speedBeforeKmh = randRange(rng, profile.speedBeforeKmh);
    const drop = randRange(rng, profile.speedDropKmh);
    const speedAfterKmh = Math.max(0, speedBeforeKmh - drop);
    const accelPeakG = randRange(rng, profile.accelPeakG);

    return {
      timestamp: startTime + i * 1000,
      speedBeforeKmh: round2(speedBeforeKmh),
      speedAfterKmh: round2(speedAfterKmh),
      accelPeakG: round2(accelPeakG),
      category,
      simulated: true,
    } satisfies TelemetryEvent;
  });
}

/** Un solo evento simulado "en vivo", para el feed de la pantalla de debug. */
export function generateLiveSimulatedEvent(
  weights: Partial<Record<EventCategory, number>> = {
    parada_normal: 0.55,
    bache: 0.2,
    manejo_telefono: 0.15,
    frenado_real: 0.1,
  }
): TelemetryEvent {
  const entries = CATEGORIES.map((c) => [c, weights[c] ?? 0] as const);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  let category: EventCategory = entries[0][0];
  for (const [c, w] of entries) {
    r -= w;
    if (r <= 0) {
      category = c;
      break;
    }
  }

  const profile = CATEGORY_PROFILES[category];
  const speedBeforeKmh = randRange(Math.random, profile.speedBeforeKmh);
  const drop = randRange(Math.random, profile.speedDropKmh);
  const speedAfterKmh = Math.max(0, speedBeforeKmh - drop);
  const accelPeakG = randRange(Math.random, profile.accelPeakG);

  return {
    timestamp: Date.now(),
    speedBeforeKmh: round2(speedBeforeKmh),
    speedAfterKmh: round2(speedAfterKmh),
    accelPeakG: round2(accelPeakG),
    category,
    simulated: true,
  };
}
