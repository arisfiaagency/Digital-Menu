import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-stone-100 to-stone-50 p-6">
      <div className="max-w-lg space-y-5 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">Digital Menu</p>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
          Multilingual cafe menus for every location
        </h1>
        <p className="text-stone-600">
          Guests browse at <span className="font-medium text-stone-800">/your-cafe</span>. Staff manage the same menu at{" "}
          <span className="font-medium text-stone-800">/your-cafe/admin</span>.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/demo"
            className="inline-flex h-11 items-center rounded-full bg-stone-900 px-5 text-sm font-medium text-white hover:bg-stone-800"
          >
            Preview demo menu
          </Link>
          <Link
            href="/admin"
            className="inline-flex h-11 items-center rounded-full border border-stone-300 bg-white px-5 text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            Platform admin
          </Link>
        </div>
      </div>
    </main>
  );
}
