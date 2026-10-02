import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, CameraOff, CheckCircle2, XCircle, Keyboard, HandHelping } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  getStaffDashboard,
  assistStudent,
  manualCheckIn,
  validateScan,
  SESSION_LABEL,
  type MealSession,
} from "@/lib/dining.functions";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [
      { title: "Pemindai Staff Dapur | Absensi Dining Unklab" },
      {
        name: "description",
        content: "Pindai QR Code dinamis mahasiswa dan pantau kehadiran makan secara real-time.",
      },
      { property: "og:title", content: "Pemindai Staff Dapur | Absensi Dining Unklab" },
      {
        property: "og:description",
        content: "Validasi jatah makan mahasiswa lewat QR dinamis dengan fallback nomor regis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScanPage,
});

type Result = { valid: boolean; message: string; name?: string | undefined; reg?: string | undefined };

function ScanPage() {
  const scan = useServerFn(validateScan);
  const manual = useServerFn(manualCheckIn);
  const assist = useServerFn(assistStudent);
  const dash = useServerFn(getStaffDashboard);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [reg, setReg] = useState("");
  const [aReg, setAReg] = useState("");
  const [aSession, setASession] = useState<MealSession>("makan_siang");
  const [aReason, setAReason] = useState("");
  const busyRef = useRef(false);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);

  const dashboard = useQuery({
    queryKey: ["staff-dashboard"],
    queryFn: () => dash(),
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!scanning) return;
    let disposed = false;

    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (disposed) return;
      const instance = new Html5Qrcode("qr-reader");
      scannerRef.current = instance as unknown as { stop: () => Promise<void>; clear: () => void };
      try {
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          async (decoded: string) => {
            if (busyRef.current) return;
            busyRef.current = true;
            try {
              const res = await scan({ data: { token: decoded } });
              setResult({
                valid: res.valid,
                message: res.message,
                name: res.student?.full_name,
                reg: res.student?.reg_number,
              });
              void dashboard.refetch();
            } catch (err) {
              setResult({ valid: false, message: err instanceof Error ? err.message : "Gagal memvalidasi." });
            }
            setTimeout(() => {
              busyRef.current = false;
            }, 1800);
          },
          () => {},
        );
      } catch {
        toast.error("Tidak bisa mengakses kamera. Gunakan input manual nomor regis.");
        setScanning(false);
      }
    })();

    return () => {
      disposed = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) void s.stop().then(() => s.clear()).catch(() => {});
    };
  }, [scanning, scan, dashboard]);

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    if (!reg.trim()) return;
    try {
      const res = await manual({ data: { regNumber: reg } });
      setResult({
        valid: res.valid,
        message: res.message,
        name: res.student?.full_name,
        reg: res.student?.reg_number,
      });
      setReg("");
      void dashboard.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memproses.");
    }
  }

  async function submitAssist(e: React.FormEvent) {
    e.preventDefault();
    if (!aReg.trim() || aReason.trim().length < 3) {
      toast.error("Isi nomor regis dan alasan (min. 3 karakter).");
      return;
    }
    try {
      const res = await assist({ data: { regNumber: aReg, session: aSession, reason: aReason } });
      setResult({ valid: res.valid, message: res.message, name: res.student?.full_name, reg: res.student?.reg_number });
      if (res.valid) {
        setAReg("");
        setAReason("");
      }
      void dashboard.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mencatat bantuan.");
    }
  }

  const session = dashboard.data?.session as MealSession | null | undefined;

  return (
    <AppShell
      subtitle="Staff dapur"
      links={[{ to: "/beranda", label: "Beranda" }, { to: "/menu", label: "Kelola menu" }]}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="surface-card p-6">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-xl font-semibold">Pindai QR mahasiswa</h1>
            <button
              onClick={() => setScanning((s) => !s)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground transition hover:opacity-90"
            >
              {scanning ? <CameraOff className="size-4" /> : <Camera className="size-4" />}
              {scanning ? "Hentikan" : "Mulai kamera"}
            </button>
          </div>

          <div
            id="qr-reader"
            className="mt-4 overflow-hidden rounded-xl border border-border bg-secondary"
            style={{ minHeight: scanning ? 260 : 0 }}
          />
          {!scanning && (
            <p className="mt-4 text-sm text-muted-foreground">
              Nyalakan kamera lalu arahkan ke QR Code di layar mahasiswa.
            </p>
          )}

          {result && (
            <div
              className={`mt-5 flex items-start gap-3 rounded-xl p-4 ${
                result.valid ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
              }`}
            >
              {result.valid ? (
                <CheckCircle2 className="mt-0.5 size-5" />
              ) : (
                <XCircle className="mt-0.5 size-5" />
              )}
              <div>
                <p className="font-semibold">{result.valid ? "Token valid" : "Token tidak valid"}</p>
                <p className="text-sm">{result.message}</p>
                {result.reg && (
                  <p className="mt-1 text-sm">
                    {result.name} · {result.reg}
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={submitManual} className="mt-6 border-t border-border pt-5">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Keyboard className="size-4" /> Fallback manual (nomor regis)
            </p>
            <div className="flex gap-2">
              <input
                value={reg}
                onChange={(e) => setReg(e.target.value)}
                placeholder="Nomor regis mahasiswa"
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button className="rounded-lg border border-border px-4 py-2 text-sm transition hover:bg-secondary">
                Terima
              </button>
            </div>
          </form>

          <form onSubmit={submitAssist} className="mt-6 space-y-2 border-t border-border pt-5">
            <p className="flex items-center gap-2 text-sm font-medium">
              <HandHelping className="size-4" /> Bantuan mahasiswa berhalangan
            </p>
            <p className="text-xs text-muted-foreground">
              Catat jatah makan untuk mahasiswa yang sakit atau tidak dapat mengambilnya sendiri.
            </p>
            <div className="flex gap-2">
              <input
                value={aReg}
                onChange={(e) => setAReg(e.target.value)}
                placeholder="Nomor regis"
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <select
                value={aSession}
                onChange={(e) => setASession(e.target.value as MealSession)}
                className="rounded-lg border border-input bg-background px-2 py-2 text-sm"
              >
                {(Object.keys(SESSION_LABEL) as MealSession[]).map((s) => (
                  <option key={s} value={s}>{SESSION_LABEL[s]}</option>
                ))}
              </select>
            </div>
            <input
              value={aReason}
              onChange={(e) => setAReason(e.target.value)}
              placeholder="Alasan bantuan"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90">
              Catat bantuan
            </button>
          </form>
        </section>

        <section className="space-y-4">
          <div className="surface-card p-6">
            <p className="text-sm text-muted-foreground">
              {session ? `Sesi ${SESSION_LABEL[session]}` : "Di luar jam sesi makan"} ·{" "}
              {dashboard.data?.date}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              <Stat label="Dilayani" value={dashboard.data?.served ?? 0} />
              <Stat label="Manual" value={dashboard.data?.manual ?? 0} />
              <Stat label="Ditolak" value={dashboard.data?.rejected ?? 0} />
              <Stat label="Bantuan hari ini" value={dashboard.data?.assisted ?? 0} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Total mahasiswa terdaftar: {dashboard.data?.totalStudents ?? 0}
            </p>
          </div>

          <div className="surface-card p-6">
            <h2 className="font-display text-lg font-semibold">Aktivitas terbaru</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {(dashboard.data?.recent ?? []).length === 0 && (
                <li className="text-muted-foreground">Belum ada pemindaian hari ini.</li>
              )}
              {(dashboard.data?.recent ?? []).map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{log.reg_number ?? "-"}</p>
                    <p className="text-xs text-muted-foreground">
                      {SESSION_LABEL[log.session as MealSession]} ·{" "}
                      {new Date(log.scanned_at).toLocaleTimeString("id-ID")}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs ${
                      log.status === "rejected"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-success/15 text-success"
                    }`}
                  >
                    {log.status === "rejected"
                      ? "Ditolak"
                      : log.status === "manual"
                        ? "Manual"
                        : log.status === "assisted"
                          ? "Bantuan"
                          : "Diterima"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-secondary px-3 py-4">
      <p className="font-display text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
