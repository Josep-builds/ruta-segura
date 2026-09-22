export type EventCategory =
  | "frenado_real"
  | "bache"
  | "manejo_telefono"
  | "parada_normal";

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  frenado_real: "Frenado real / posible caída",
  bache: "Bache",
  manejo_telefono: "Manejo de teléfono",
  parada_normal: "Parada normal",
};

export interface TelemetryEvent {
  timestamp: number;
  /** Velocidad (km/h) justo antes de la ventana del evento — GPS. */
  speedBeforeKmh: number;
  /** Velocidad (km/h) justo después de la ventana del evento — GPS. */
  speedAfterKmh: number;
  /** Pico de aceleración durante el evento, en g. */
  accelPeakG: number;
  /** Categoría real del evento (etiqueta de verdad para medir falsos positivos). */
  category: EventCategory;
  /** true si el evento viene del generador sintético, no de sensores reales. */
  simulated: boolean;
}

export function speedDropKmh(e: TelemetryEvent): number {
  return Math.max(0, e.speedBeforeKmh - e.speedAfterKmh);
}
