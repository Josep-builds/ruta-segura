import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <p className="mb-4 inline-block w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
        Piloto académico — todos los datos de riders son simulados
      </p>

      <h1 className="text-4xl font-bold">Ruta Segura</h1>
      <p className="mt-4 text-lg leading-relaxed text-neutral-700">
        Instrumentación de seguridad para repartidores en motocicleta en
        Ciudad de México. No es una app de reparto ni de ride-hailing.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/entrar"
          className="rounded-xl border-2 border-neutral-800 bg-neutral-900 px-6 py-4 text-center text-lg font-semibold text-white"
        >
          Entrar como rider
        </Link>
        <Link
          href="/dashboard"
          className="rounded-xl border-2 border-neutral-300 px-6 py-4 text-center text-lg font-semibold text-neutral-800"
        >
          Ver dashboard público
        </Link>
      </div>
    </main>
  );
}
