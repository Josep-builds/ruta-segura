import { createClient } from "@/lib/supabase/client";
import type { Confianza } from "@/lib/fusion/engine";

export type TriggerType = "manual" | "auto";
export type ConnectivityMode = "normal" | "limitada";
export type SosStatus = "pendiente_confirmacion" | "activada" | "cancelada";

export interface SosEventRow {
  id: string;
  rider_id: string;
  trigger_type: TriggerType;
  source_confidence: Confianza | null;
  status: SosStatus;
  connectivity_mode: ConnectivityMode;
  created_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
}

/**
 * Crea un evento SOS. `autoActivate` es true para el botón manual — la
 * pulsación del rider YA es la confirmación, no hay ventana de espera.
 * Los eventos auto-detectados por el motor de fusión (F3) se crean como
 * "pendiente_confirmacion" y pasan por la ventana de 15s en la UI.
 */
export async function createSosEvent(params: {
  triggerType: TriggerType;
  sourceConfidence?: Confianza;
  connectivityMode: ConnectivityMode;
  autoActivate: boolean;
}): Promise<SosEventRow> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa");

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("sos_events")
    .insert({
      rider_id: user.id,
      trigger_type: params.triggerType,
      source_confidence: params.sourceConfidence ?? null,
      connectivity_mode: params.connectivityMode,
      status: params.autoActivate ? "activada" : "pendiente_confirmacion",
      confirmed_at: params.autoActivate ? now : null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as SosEventRow;
}

/** Confirma o deja pasar el timeout: el evento pasa a "activada". */
export async function confirmSosEvent(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("sos_events")
    .update({ status: "activada", confirmed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Cancela: el evento se conserva como falso positivo, nunca se borra. */
export async function cancelSosEvent(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("sos_events")
    .update({ status: "cancelada", cancelled_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Heartbeat de sesión de sensor — alimenta el conteo público de F5. */
export async function touchSensorSession(mode: "real" | "simulado"): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("sensor_sessions").upsert(
    { rider_id: user.id, last_heartbeat_at: new Date().toISOString(), mode },
    { onConflict: "rider_id" }
  );
}
