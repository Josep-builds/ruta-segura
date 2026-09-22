"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLiveTelemetry } from "@/lib/telemetry/useLiveTelemetry";
import { classifyEvent } from "@/lib/fusion/engine";
import {
  cancelSosEvent,
  confirmSosEvent,
  createSosEvent,
  touchSensorSession,
  type ConnectivityMode,
} from "@/lib/sos/api";

const INSTITUTIONAL_OWNER = "Unidad Piloto de Movilidad Segura (simulado)";
const CONFIRM_WINDOW_SECONDS = 15;

const MODE_LABEL: Record<string, string> = {
  inactivo: "Sensor apagado",
  real: "Sensor real activo (GPS + acelerómetro)",
  simulado: "Sensor activo — dato simulado",
};

interface PendingAlert {
  id: string;
  secondsLeft: number;
}

interface SosResult {
  status: "activada";
  connectivityMode: ConnectivityMode;
}

export default function RiderScreen({ email }: { email: string }) {
  const { mode, lastEvent, start } = useLiveTelemetry();
  const [connectivityLimitada, setConnectivityLimitada] = useState(false);
  const [pendingAlert, setPendingAlert] = useState<PendingAlert | null>(null);
  const [sosResult, setSosResult] = useState<SosResult | null>(null);
  const [falsoPositivoAviso, setFalsoPositivoAviso] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastProcessedTimestamp = useRef<number | null>(null);
  const connectivityMode: ConnectivityMode = connectivityLimitada
    ? "limitada"
    : "normal";

  // Heartbeat de sesión de sensor mientras esté encendido — alimenta el
  // conteo público "sensores activos" de F5 en vez de un número inventado.
  useEffect(() => {
    if (mode === "inactivo") return;
    touchSensorSession(mode).catch(() => {});
    const id = setInterval(() => {
      touchSensorSession(mode).catch(() => {});
    }, 15000);
    return () => clearInterval(id);
  }, [mode]);

  // Flujo automático: un evento de ALTA confianza del motor de fusión
  // abre la ventana de 15s. No dispara SOS directo — el rider confirma
  // o cancela primero.
  useEffect(() => {
    if (!lastEvent || pendingAlert) return;
    if (lastEvent.timestamp === lastProcessedTimestamp.current) return;
    lastProcessedTimestamp.current = lastEvent.timestamp;

    const result = classifyEvent(lastEvent);
    if (result.clasificacion === "posible_caida" && result.confianza === "alta") {
      createSosEvent({
        triggerType: "auto",
        sourceConfidence: result.confianza,
        connectivityMode,
        autoActivate: false,
      })
        .then((row) => setPendingAlert({ id: row.id, secondsLeft: CONFIRM_WINDOW_SECONDS }))
        .catch((e) => setError(e instanceof Error ? e.message : "Error al crear alerta"));
    }
  }, [lastEvent, pendingAlert, connectivityMode]);

  // Cuenta regresiva de 15s: confirma o cancela.
  useEffect(() => {
    if (!pendingAlert) return;

    if (pendingAlert.secondsLeft <= 0) {
      confirmSosEvent(pendingAlert.id)
        .then(() => {
          setSosResult({ status: "activada", connectivityMode });
          setPendingAlert(null);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Error al confirmar"));
      return;
    }

    const timer = setTimeout(() => {
      setPendingAlert((p) => (p ? { ...p, secondsLeft: p.secondsLeft - 1 } : p));
    }, 1000);
    return () => clearTimeout(timer);
  }, [pendingAlert, connectivityMode]);

  async function handleManualSos() {
    setError(null);
    try {
      const row = await createSosEvent({
        triggerType: "manual",
        connectivityMode,
        autoActivate: true,
      });
      setSosResult({ status: "activada", connectivityMode: row.connectivity_mode });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al activar SOS");
    }
  }

  async function handleConfirm() {
    if (!pendingAlert) return;
    try {
      await confirmSosEvent(pendingAlert.id);
      setSosResult({ status: "activada", connectivityMode });
      setPendingAlert(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al confirmar");
    }
  }

  async function handleCancel() {
    if (!pendingAlert) return;
    try {
      await cancelSosEvent(pendingAlert.id);
      setPendingAlert(null);
      setFalsoPositivoAviso(true);
      setTimeout(() => setFalsoPositivoAviso(false), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cancelar");
    }
  }

  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <p className="mb-4 inline-block w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
        Dato simulado — demostración académica
      </p>

      <h1 className="text-3xl font-bold">Hola, {email}</h1>

      <section className="mt-6 rounded-xl border border-neutral-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{MODE_LABEL[mode]}</p>
            <p className="mt-1 text-sm text-neutral-500">
              Confianza del sistema:{" "}
              <span className="font-semibold text-neutral-700">Media</span> —
              no cubre todos los casos.{" "}
              <Link href="#confianza" className="underline">
                Ver límites
              </Link>
            </p>
          </div>
          {mode === "inactivo" && (
            <button
              onClick={start}
              className="shrink-0 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Encender sensor
            </button>
          )}
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            checked={connectivityLimitada}
            onChange={(e) => setConnectivityLimitada(e.target.checked)}
          />
          Simular conectividad limitada (dato simulado)
        </label>
      </section>

      <button
        onClick={handleManualSos}
        disabled={!!pendingAlert}
        className="mt-8 w-full rounded-2xl bg-red-600 py-8 text-2xl font-bold text-white disabled:opacity-50"
      >
        SOS
      </button>
      <p className="mt-2 text-center text-xs text-neutral-500">
        Sin registro de placa ni ruta. Un toque activa la alerta.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {falsoPositivoAviso && (
        <p className="mt-4 rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-700">
          Cancelada. Se registró como falso positivo para calibrar el
          sistema — no se borró.
        </p>
      )}

      {sosResult && (
        <div className="mt-4 rounded-xl border border-green-300 bg-green-50 p-4">
          <p className="font-semibold text-green-800">Alerta activada</p>
          {sosResult.connectivityMode === "limitada" ? (
            <p className="mt-1 text-sm text-green-800">
              Sin datos — enviando alerta por SMS (simulado) a tu contacto de
              emergencia y a {INSTITUTIONAL_OWNER}.
            </p>
          ) : (
            <p className="mt-1 text-sm text-green-800">
              Notificado tu contacto de emergencia y {INSTITUTIONAL_OWNER}.
            </p>
          )}
          <button
            onClick={() => setSosResult(null)}
            className="mt-2 text-sm font-semibold text-green-800 underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {pendingAlert && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 px-5">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center">
            <p className="text-lg font-semibold">
              Detectamos posible caída o frenado brusco
            </p>
            <p className="mt-2 text-5xl font-bold tabular-nums">
              {pendingAlert.secondsLeft}s
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              Si no respondes, se activa la alerta automáticamente.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 rounded-xl border-2 border-neutral-300 py-3 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 rounded-xl bg-red-600 py-3 font-semibold text-white"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <Link
        href="/rider/debug"
        className="mt-8 block text-sm font-semibold text-neutral-700 underline"
      >
        Ver debug de telemetría →
      </Link>

      <footer className="mt-10 border-t border-neutral-200 pt-4 text-sm text-neutral-500">
        <p>Dueño institucional: {INSTITUTIONAL_OWNER}</p>
        <Link href="/dashboard" className="underline">
          Ver dashboard público →
        </Link>
      </footer>
    </main>
  );
}
