import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UtensilsCrossed, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { regNumberToEmail, useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk | Absensi Dining Asrama Unklab" },
      {
        name: "description",
        content:
          "Masuk dengan nomor regis untuk menampilkan QR Code dinamis layanan makan asrama Universitas Klabat.",
      },
      { property: "og:title", content: "Masuk | Absensi Dining Asrama Unklab" },
      {
        property: "og:description",
        content: "Login mahasiswa dan staff dapur untuk sistem absensi makan berbasis QR Code dinamis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [regNumber, setRegNumber] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/beranda", replace: true });
  }, [loading, session, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!regNumber.trim() || password.length < 6) {
      toast.error("Isi nomor regis dan kata sandi minimal 6 karakter.");
      return;
    }
    setBusy(true);
    const email = regNumberToEmail(regNumber);
    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { reg_number: regNumber.trim(), full_name: fullName.trim(), role: "student" },
          },
        });
        if (error) throw error;
        toast.success("Akun dibuat. Selamat datang!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/beranda", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal masuk.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hero-gradient hidden flex-col justify-between p-12 text-primary-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold">
          <UtensilsCrossed className="size-6" /> Dining Unklab
        </Link>
        <div>
          <h1 className="max-w-sm text-4xl font-semibold leading-tight">
            Absensi makan asrama dengan QR Code dinamis.
          </h1>
          <p className="mt-4 max-w-sm text-sm opacity-80">
            Kode berganti tiap beberapa detik, jadi tangkapan layar atau kode pinjaman tidak bisa dipakai.
          </p>
        </div>
        <p className="text-xs opacity-70">Universitas Klabat &middot; Airmadidi</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={handleSubmit} className="surface-card w-full max-w-sm space-y-4 p-7">
          <div>
            <h2 className="font-display text-2xl font-semibold">
              {mode === "login" ? "Masuk" : "Daftar akun"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Gunakan nomor regis mahasiswa Unklab.</p>
          </div>

          {mode === "register" && (
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Nama lengkap</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                placeholder="Nama sesuai data asrama"
              />
            </label>
          )}

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Nomor regis</span>
            <input
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
              placeholder="contoh: S12345678"
              autoCapitalize="characters"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Kata sandi</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
              placeholder="minimal 6 karakter"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {mode === "login" ? "Masuk" : "Daftar"}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {mode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
