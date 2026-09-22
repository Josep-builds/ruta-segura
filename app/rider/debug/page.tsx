"use client";

import { useLiveTelemetry } from "@/lib/telemetry/useLiveTelemetry";
import { CATEGORY_LABELS } from "@/lib/telemetry/types";
import Link from "next/link";

const MODE_LABEL: Record<string, string> = {
  inactivo: "Inactivo",
  real: "Sensor real (GPS + acelerómetro)",
  simulado: "Simulador (dato simulado)",
};

export default function DebugTelemetria() {
  const { mode, events, start, stop } = useLiveTelemetry();

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/rider" className="text-sm text-neutral-500">
        ← Volver
      </Link>

      <h1 className="mt-2 text-2xl font-bold">Debug de telemetría</h1>
      <p className="mt-2 text-neutral-600">
        Vista técnica del feed de sensor. Usa GPS + acelerómetro reales
        cuando el navegador lo permite; si no, cae automáticamente al
        generador sintético.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium">
          Estado: {MODE_LABEL[mode]}
        </span>
        {mode === "inactivo" ? (
          <button
            onClick={start}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Encender sensor
          </button>
        ) : (
          <button
            onClick={stop}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold"
          >
            Apagar
          </button>
        )}
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-neutral-500">
              <th className="py-2 pr-3">Hora</th>
              <th className="py-2 pr-3">Vel. antes</th>
              <th className="py-2 pr-3">Vel. después</th>
              <th className="py-2 pr-3">Pico accel.</th>
              <th className="py-2 pr-3">Categoría</th>
              <th className="py-2">Fuente</th>
            </tr>
          </thead>
          <tbody>
            {[...events].reverse().map((e, i) => (
              <tr key={i} className="border-b border-neutral-100">
                <td className="py-2 pr-3">
                  {new Date(e.timestamp).toLocaleTimeString()}
                </td>
                <td className="py-2 pr-3">{e.speedBeforeKmh} km/h</td>
                <td className="py-2 pr-3">{e.speedAfterKmh} km/h</td>
                <td className="py-2 pr-3">{e.accelPeakG} g</td>
                <td className="py-2 pr-3">{CATEGORY_LABELS[e.category]}</td>
                <td className="py-2">
                  {e.simulated ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      Dato simulado
                    </span>
                  ) : (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                      Sensor real
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && (
          <p className="mt-4 text-sm text-neutral-500">
            Sin eventos todavía — enciende el sensor.
          </p>
        )}
      </div>
    </main>
  );
}
