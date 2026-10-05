import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { QrCode, Soup, UtensilsCrossed } from "lucide-react";
import { getPublicMenu, SESSION_LABEL, type MealSession } from "@/lib/dining.functions";

const mealSessions: MealSession[] = ["sarapan", "makan_siang", "makan_malam"];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Absensi Layanan Makan Asrama Unklab | QR Code Dinamis" },
      {
        name: "description",
        content:
          "Absensi layanan makan asrama Universitas Klabat dengan QR Code dinamis dan live menu.",
      },
      { property: "og:title", content: "Absensi Layanan Makan Asrama Unklab" },
      {
        property: "og:description",
        content: "QR Code dinamis dan jadwal menu layanan makan asrama Universitas Klabat.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const fetchMenu = useServerFn(getPublicMenu);
  const menu = useQuery({
    queryKey: ["public-menu"],
    queryFn: () => fetchMenu(),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="hero-gradient text-primary-foreground">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <span className="flex items-center gap-2 font-display text-lg font-semibold">
            <UtensilsCrossed className="size-5" /> Dining Unklab
          </span>
          <Link
            to="/auth"
            className="rounded-lg border border-primary-foreground/30 px-4 py-2 text-sm transition hover:bg-primary-foreground/15"
          >
            Masuk
          </Link>
        </div>
        <div className="mx-auto max-w-5xl px-5 pb-20 pt-10">
          <p className="text-sm uppercase tracking-widest opacity-70">Asrama Universitas Klabat</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight md:text-5xl">
            Absensi layanan makan dengan QR Code dinamis.
          </h1>
          <p className="mt-4 max-w-xl text-base opacity-85">
            Mahasiswa login dengan nomor regis, menampilkan QR yang berganti otomatis, lalu staff
            dapur memindai untuk memvalidasi jatah makan secara real-time.
          </p>
          <Link
            to="/auth"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-medium text-accent-foreground transition hover:opacity-90"
          >
            <QrCode className="size-5" /> Mulai sekarang
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 md:py-14">
        <section className="rounded-3xl border bg-card p-6 shadow-sm sm:p-7">
          <h2 className="flex items-center gap-3 font-display text-xl font-semibold sm:text-2xl">
            <Soup className="size-6 shrink-0" /> Daftar makanan hari ini
          </h2>
          {menu.data?.date && (
            <p className="mt-2 text-sm text-muted-foreground">{menu.data.date}</p>
          )}
          {menu.isError && (
            <div role="alert" className="mt-4 flex items-center justify-between gap-3 text-sm text-destructive">
              <span>Menu gagal dimuat. {menu.error.message}</span>
              <button type="button" onClick={() => void menu.refetch()} className="shrink-0 underline">
                Coba lagi
              </button>
            </div>
          )}
          <div className="mt-6 grid gap-3 sm:grid-cols-3 sm:gap-4">
            {mealSessions.map((session) => {
              const items = (menu.data?.items ?? []).filter((item) => item.session === session);
              return (
                <section
                  key={session}
                  className="min-h-24 rounded-3xl border bg-card px-5 py-4"
                  aria-labelledby={`public-menu-${session}`}
                >
                  <h3 id={`public-menu-${session}`} className="font-display text-base font-medium sm:text-lg">
                    {SESSION_LABEL[session]}
                  </h3>
                  {menu.isPending ? (
                    <p className="mt-2 text-sm text-muted-foreground">Memuat menu...</p>
                  ) : items.length > 0 ? (
                    <ul className="mt-2 space-y-2 text-sm">
                      {items.map((item) => (
                        <li key={item.id}>
                          <p className="font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">Menu belum diatur.</p>
                  )}
                </section>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
