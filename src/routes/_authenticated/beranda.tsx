import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle2, Clock, RefreshCw, QrCode, Soup } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getMyStatus, issueQrToken, SESSION_LABEL, type MealSession } from "@/lib/dining.functions";

export const Route = createFileRoute("/_authenticated/beranda")({
  head: () => ({
    meta: [
      { title: "QR Makan Saya | Absensi Dining Unklab" },
      {
        name: "description",
        content: "Tampilkan QR Code dinamis untuk mengambil jatah makan di dining hall asrama Unklab.",
      },
      { property: "og:title", content: "QR Makan Saya | Absensi Dining Unklab" },
      { property: "og:description", content: "QR Code dinamis mahasiswa untuk layanan makan asrama." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentHome,
});

function StudentHome() {
  const navigate = useNavigate();
  const fetchStatus = useServerFn(getMyStatus);
  const issue = useServerFn(issueQrToken);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [showQr, setShowQr] = useState(false);

  const status = useQuery({
    queryKey: ["my-status"],
    queryFn: () => fetchStatus(),
    refetchInterval: 15000,
  });

  const isStaff = (status.data?.roles ?? []).some((r) => r === "staff" || r === "admin");

  const rotate = useCallback(async () => {
    const res = await issue();
    if (canvasRef.current) {
      await QRCode.toCanvas(canvasRef.current, res.token, {
        width: 260,
        margin: 1,
        color: { dark: "#1b2f25", light: "#ffffff" },
      });
    }
    setCountdown(res.ttl);
  }, [issue]);

  useEffect(() => {
    if (!showQr) return;
    let cancelled = false;
    const run = () => {
      if (!cancelled) void rotate();
    };
    run();
    const rotator = setInterval(run, 10000);
    const ticker = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => {
      cancelled = true;
      clearInterval(rotator);
      clearInterval(ticker);
    };
  }, [showQr, rotate]);

  useEffect(() => {
    if (isStaff) navigate({ to: "/scan", replace: true });
  }, [isStaff, navigate]);

  const session = status.data?.session as MealSession | null | undefined;
  const taken = status.data?.todayTaken;

  if (isStaff) {
    return (
      <AppShell subtitle="Staff dapur">
        <section className="surface-card p-6 text-center">
          <h1 className="font-display text-xl font-semibold">Mode staff dapur</h1>
          <p className="mt-2 text-sm text-muted-foreground">Membuka pemindai QR...</p>
          <button
            onClick={() => navigate({ to: "/scan" })}
            className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Buka pemindai
          </button>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell
      subtitle={status.isLoading ? "Memuat akun..." : "Mahasiswa"}
      links={[]}
    >
      <div className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
        <section className="surface-card p-6 md:col-span-2 md:order-first">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Soup className="size-5" /> Daftar makanan hari ini
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {(["sarapan", "makan_siang", "makan_malam"] as MealSession[]).map((meal) => {
              const items = (status.data?.menu ?? []).filter((item) => item.session === meal);
              return (
                <div
                  key={meal}
                  className={`rounded-xl border p-4 ${
                    session === meal ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <p className="text-sm font-semibold">{SESSION_LABEL[meal]}</p>
                  {items.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">Menu belum diatur.</p>
                  ) : (
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {items.map((item) => (
                        <li key={item.id}>
                          <span className="font-medium">{item.name}</span>
                          {item.description ? (
                            <span className="block text-xs text-muted-foreground">{item.description}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        <section className="surface-card p-6">
          <p className="text-sm text-muted-foreground">Halo,</p>
          <h1 className="font-display text-2xl font-semibold">
            {status.data?.profile?.full_name || status.data?.profile?.reg_number || "Mahasiswa"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Nomor regis: {status.data?.profile?.reg_number ?? "-"}
          </p>

          <div className="mt-5 flex items-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm">
            <Clock className="size-4" />
            {session ? (
              <span>
                Sesi berjalan: <strong>{SESSION_LABEL[session]}</strong>
              </span>
            ) : (
              <span>Di luar jam sesi makan (06–08, 12–14, 18–20 WITA).</span>
            )}
          </div>

          {taken && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-success/15 px-4 py-3 text-sm text-success">
              <CheckCircle2 className="size-4" /> Jatah makan hari ini sudah diterima.
            </div>
          )}

          <div className="mt-6 flex flex-col items-center">
            {showQr ? (
              <>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <canvas ref={canvasRef} className="size-65" />
                </div>
                <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="size-4" /> Kode berganti otomatis · kedaluwarsa {countdown}s
                </p>
              </>
            ) : (
              <button
                onClick={() => setShowQr(true)}
                disabled={!session || taken}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                <QrCode className="size-5" /> Tampilkan QR Code
              </button>
            )}
            {!session && <p className="mt-3 text-xs text-muted-foreground">QR aktif saat sesi makan dibuka.</p>}
          </div>
        </section>

        <section className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold">Riwayat absensi</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {(status.data?.logs ?? []).length === 0 && (
              <li className="text-muted-foreground">Belum ada riwayat.</li>
            )}
            {(status.data?.logs ?? []).map((log) => (
              <li
                key={log.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <div>
                  <p className="font-medium">{SESSION_LABEL[log.session as MealSession]}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.session_date} · {new Date(log.scanned_at).toLocaleTimeString("id-ID")}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    log.status === "rejected"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-success/15 text-success"
                  }`}
                >
                  {log.status === "rejected" ? "Ditolak" : log.status === "manual" ? "Manual" : "Diterima"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
