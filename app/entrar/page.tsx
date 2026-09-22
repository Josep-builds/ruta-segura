"use client";

import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function EntrarInner() {
  const params = useSearchParams();
  const error = params.get("e");

  const entrar = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <h1 className="text-3xl font-bold">Ruta Segura</h1>

      <p className="mt-5 text-lg leading-relaxed">
        Entra con tu correo de Google para activar tu sensor. No necesitas
        registrar placa ni ruta — solo inicias sesión y ya puedes usar SOS.
      </p>

      <p className="mt-3 text-sm text-neutral-500">
        Esta no es la app de reparto. Nadie en Rappi o Uber Eats ve esta
        cuenta ni estos datos.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          No se pudo iniciar sesión: {decodeURIComponent(error)}
        </p>
      )}

      <button
        onClick={entrar}
        className="mt-8 w-full rounded-xl border-2 border-neutral-800 bg-white px-6 py-5 text-xl font-semibold"
      >
        Entrar con Google
      </button>
    </main>
  );
}

export default function Entrar() {
  return (
    <Suspense fallback={null}>
      <EntrarInner />
    </Suspense>
  );
}
