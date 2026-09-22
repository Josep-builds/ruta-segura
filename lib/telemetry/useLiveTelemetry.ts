"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { generateLiveSimulatedEvent } from "./simulator";
import type { TelemetryEvent } from "./types";

export type SensorMode = "inactivo" | "real" | "simulado";

interface DeviceMotionEventWithPermission {
  requestPermission?: () => Promise<"granted" | "denied">;
}

const SIM_INTERVAL_MS = 2500;
const REAL_SENSOR_GRACE_MS = 3000;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Enciende GPS (navigator.geolocation) + acelerómetro (DeviceMotionEvent)
 * cuando el navegador lo permite. Si no hay permiso, no hay soporte, o el
 * sensor real no reporta nada en REAL_SENSOR_GRACE_MS, cae automáticamente
 * al generador sintético etiquetado como "dato simulado".
 */
export function useLiveTelemetry() {
  const [mode, setMode] = useState<SensorMode>("inactivo");
  const [lastEvent, setLastEvent] = useState<TelemetryEvent | null>(null);
  const [events, setEvents] = useState<TelemetryEvent[]>([]);

  const watchIdRef = useRef<number | null>(null);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpeedKmhRef = useRef<number | null>(null);
  const accelPeakRef = useRef(0);
  const gotRealSampleRef = useRef(false);
  const activeRef = useRef(false);

  const pushEvent = useCallback((evt: TelemetryEvent) => {
    setLastEvent(evt);
    setEvents((prev) => [...prev.slice(-49), evt]);
  }, []);

  const startSimulator = useCallback(() => {
    if (simIntervalRef.current) return;
    setMode("simulado");
    simIntervalRef.current = setInterval(() => {
      pushEvent(generateLiveSimulatedEvent());
    }, SIM_INTERVAL_MS);
  }, [pushEvent]);

  const stopAll = useCallback(() => {
    activeRef.current = false;
    if (watchIdRef.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    if (graceTimerRef.current) {
      clearTimeout(graceTimerRef.current);
      graceTimerRef.current = null;
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("devicemotion", handleMotionRef.current);
    }
    setMode("inactivo");
  }, []);

  const handleMotionRef = useRef((e: DeviceMotionEvent) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc) return;
    const g =
      Math.sqrt(
        (acc.x ?? 0) ** 2 + (acc.y ?? 0) ** 2 + (acc.z ?? 0) ** 2
      ) / 9.81;
    accelPeakRef.current = Math.max(accelPeakRef.current, g);
    gotRealSampleRef.current = true;
  });

  const start = useCallback(async () => {
    if (activeRef.current) return;
    activeRef.current = true;
    gotRealSampleRef.current = false;
    accelPeakRef.current = 0;
    lastSpeedKmhRef.current = null;

    const hasGeolocation =
      typeof navigator !== "undefined" && "geolocation" in navigator;

    if (!hasGeolocation) {
      startSimulator();
      return;
    }

    // iOS requiere pedir permiso de movimiento con un gesto del usuario.
    const DME = (typeof DeviceMotionEvent !== "undefined"
      ? DeviceMotionEvent
      : undefined) as unknown as DeviceMotionEventWithPermission | undefined;
    if (DME?.requestPermission) {
      try {
        const result = await DME.requestPermission();
        if (result !== "granted") {
          startSimulator();
          return;
        }
      } catch {
        startSimulator();
        return;
      }
    }

    window.addEventListener("devicemotion", handleMotionRef.current);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (!activeRef.current) return;
        gotRealSampleRef.current = true;
        const speedKmh = round2((pos.coords.speed ?? 0) * 3.6);
        const before = lastSpeedKmhRef.current ?? speedKmh;
        lastSpeedKmhRef.current = speedKmh;
        setMode("real");
        pushEvent({
          timestamp: pos.timestamp,
          speedBeforeKmh: before,
          speedAfterKmh: speedKmh,
          accelPeakG: round2(accelPeakRef.current),
          category: "parada_normal",
          simulated: false,
        });
        accelPeakRef.current = 0;
      },
      () => {
        // Permiso negado o GPS no disponible: cae al simulador.
        if (activeRef.current && !gotRealSampleRef.current) startSimulator();
      },
      { enableHighAccuracy: true, maximumAge: 1000 }
    );

    graceTimerRef.current = setTimeout(() => {
      if (activeRef.current && !gotRealSampleRef.current) startSimulator();
    }, REAL_SENSOR_GRACE_MS);
  }, [pushEvent, startSimulator]);

  useEffect(() => stopAll, [stopAll]);

  return { mode, lastEvent, events, start, stop: stopAll };
}
