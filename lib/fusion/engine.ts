import { speedDropKmh, type TelemetryEvent } from "@/lib/telemetry/types";

export type Clasificacion = "posible_caida" | "ignorado";
export type Confianza = "alta" | "media" | "baja";

export interface FusionResult {
  clasificacion: Clasificacion;
  confianza: Confianza;
}

/** Mismo umbral que el clasificador ingenuo del Technologist: 0.4g. */
const NAIVE_ACCEL_G = 0.4;

const ALTA_ACCEL_G = 0.5;
const ALTA_SPEED_DROP_KMH = 15;
const MEDIA_ACCEL_G = NAIVE_ACCEL_G;
const MEDIA_SPEED_DROP_KMH = 8;

/**
 * Motor de fusión por reglas — no ML. Un pico de aceleración por sí solo
 * (bache, manejo de teléfono) no es suficiente evidencia: necesita venir
 * acompañado de una caída de velocidad GPS real y simultánea para
 * clasificarse como posible caída. Esto es exactamente lo que el umbral
 * ingenuo (solo acelerómetro) no distingue.
 *
 * "Validación en progreso": esta función reduce falsos positivos frente
 * al umbral ingenuo, no los elimina. Ver lib/fusion/report.ts para el
 * número real medido contra los 52 eventos etiquetados de F2.
 */
export function classifyEvent(event: TelemetryEvent): FusionResult {
  const drop = speedDropKmh(event);

  if (event.accelPeakG >= ALTA_ACCEL_G && drop >= ALTA_SPEED_DROP_KMH) {
    return { clasificacion: "posible_caida", confianza: "alta" };
  }
  if (event.accelPeakG >= MEDIA_ACCEL_G && drop >= MEDIA_SPEED_DROP_KMH) {
    return { clasificacion: "posible_caida", confianza: "media" };
  }
  if (event.accelPeakG >= MEDIA_ACCEL_G) {
    // Pico de aceleración sin caída de velocidad correlacionada: probable
    // bache o manejo de teléfono. No dispara SOS, pero se loguea (ver
    // report.ts) para calibración futura — nunca se descarta en silencio.
    return { clasificacion: "ignorado", confianza: "baja" };
  }
  return { clasificacion: "ignorado", confianza: "alta" };
}

/** Umbral ingenuo: solo acelerómetro >= 0.4g, sin fusión con GPS. */
export function classifyNaive(event: TelemetryEvent): FusionResult {
  if (event.accelPeakG >= NAIVE_ACCEL_G) {
    return { clasificacion: "posible_caida", confianza: "media" };
  }
  return { clasificacion: "ignorado", confianza: "alta" };
}
