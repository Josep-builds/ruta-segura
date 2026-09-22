import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface DashboardMetrics {
  sensores_activos: number;
  alertas_totales: number;
  alertas_activadas: number;
  tiempo_respuesta_prom_seg: number | null;
  dueno_institucional: string;
  ultima_actualizacion: string;
}

function formatSeconds(seconds: number | null) {
  if (seconds === null) return "Sin datos todavía";
  if (seconds < 60) return `${seconds} s`;
  return `${Math.round(seconds / 60)} min`;
}

export default async function DashboardPublico() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dashboard_public_metrics")
    .select("*")
    .single<DashboardMetrics>();

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/" className="text-sm text-neutral-500">
        ← Ruta Segura
      </Link>

      <h1 className="mt-2 text-3xl font-bold">Dashboard público</h1>
      <p className="mt-2 text-neutral-600">
        Solo agregados. Nunca se muestra un evento identificable de un
        rider individual — esta consulta corre contra una vista agregada
        separada, no un filtro sobre los datos crudos.
      </p>

      {error && (
        <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          No se pudo cargar el dashboard: {error.message}
        </p>
      )}

      {data && (
        <>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 p-5">
              <p className="text-3xl font-bold">{data.sensores_activos}</p>
              <p className="mt-1 text-sm text-neutral-500">
                Sensores activos (últimos 2 min)
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 p-5">
              <p className="text-3xl font-bold">{data.alertas_totales}</p>
              <p className="mt-1 text-sm text-neutral-500">
                Alertas disparadas ({data.alertas_activadas} activadas)
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 p-5">
              <p className="text-3xl font-bold">
                {formatSeconds(data.tiempo_respuesta_prom_seg)}
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                Tiempo de confirmación promedio
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-xl bg-neutral-50 p-5">
            <p className="text-sm text-neutral-500">Dueño institucional</p>
            <p className="text-lg font-semibold">
              {data.dueno_institucional}
            </p>
            <p className="mt-2 text-xs text-neutral-400">
              Última actualización:{" "}
              {new Date(data.ultima_actualizacion).toLocaleString("es-MX")}
            </p>
          </div>
        </>
      )}

      <section
        id="confianza"
        className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5"
      >
        <p className="font-semibold text-amber-900">
          Límites de validación
        </p>
        <p className="mt-2 text-sm text-amber-900">
          Validado en: frenados y caídas con caída de velocidad GPS ≥ 15
          km/h y GPS estable. <strong>No validado</strong> en: túneles o
          pasos a desnivel con pérdida de señal GPS, velocidades menores a
          10 km/h, o caídas sin frenado brusco (por ejemplo, resbalones a
          baja velocidad). Este sistema no detecta todos los choques.
        </p>
      </section>
    </main>
  );
}
