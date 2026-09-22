import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function RiderHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  await supabase
    .from("riders")
    .upsert({ rider_id: user.id, display_name: user.email }, { onConflict: "rider_id" });

  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <p className="mb-4 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
        Dato simulado — demostración académica
      </p>

      <h1 className="text-3xl font-bold">Hola, {user.email}</h1>
      <p className="mt-4 text-lg leading-relaxed">
        Tu sesión está activa y solo tú puedes ver tus propios eventos
        (Row Level Security). El botón SOS y el mapa se agregan en las
        siguientes iteraciones del piloto.
      </p>

      <Link
        href="/rider/debug"
        className="mt-6 inline-block text-sm font-semibold text-neutral-700 underline"
      >
        Ver debug de telemetría →
      </Link>
    </main>
  );
}
