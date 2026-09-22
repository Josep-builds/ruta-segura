import type { TelemetryEvent } from "@/lib/telemetry/types";
import { speedDropKmh } from "@/lib/telemetry/types";
import { classifyEvent, classifyNaive, type FusionResult } from "./engine";

export interface FusionLogRow {
  event: TelemetryEvent;
  naive: FusionResult;
  fusion: FusionResult;
}

export interface FalsePositiveReport {
  total: number;
  nonCaidaTotal: number;
  naiveFalsePositives: number;
  naiveFalsePositiveRate: number;
  fusionFalsePositives: number;
  fusionFalsePositiveRate: number;
  rows: FusionLogRow[];
}

/**
 * Corre ambos clasificadores sobre un lote de eventos y calcula la tasa
 * de falsos positivos de cada uno contra la etiqueta real (category).
 * Un "falso positivo" es un evento que NO es frenado_real pero que el
 * clasificador marca como posible_caida.
 *
 * Ningún evento se descarta en silencio: cada fila queda logueada
 * (consola) para calibración futura, sin importar el resultado.
 */
export function runFusionReport(events: TelemetryEvent[]): FalsePositiveReport {
  const rows: FusionLogRow[] = events.map((event) => ({
    event,
    naive: classifyNaive(event),
    fusion: classifyEvent(event),
  }));

  for (const row of rows) {
    console.log(
      `[fusion] ${row.event.category} | drop=${speedDropKmh(row.event).toFixed(1)}km/h ` +
        `accel=${row.event.accelPeakG}g -> ingenuo=${row.naive.clasificacion} ` +
        `fusion=${row.fusion.clasificacion}/${row.fusion.confianza}`
    );
  }

  const nonCaida = rows.filter((r) => r.event.category !== "frenado_real");
  const naiveFalsePositives = nonCaida.filter(
    (r) => r.naive.clasificacion === "posible_caida"
  ).length;
  const fusionFalsePositives = nonCaida.filter(
    (r) => r.fusion.clasificacion === "posible_caida"
  ).length;

  return {
    total: rows.length,
    nonCaidaTotal: nonCaida.length,
    naiveFalsePositives,
    naiveFalsePositiveRate: naiveFalsePositives / nonCaida.length,
    fusionFalsePositives,
    fusionFalsePositiveRate: fusionFalsePositives / nonCaida.length,
    rows,
  };
}
