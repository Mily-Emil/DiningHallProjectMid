import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  addMenuItem,
  deleteMenuItem,
  listMenu,
  updateMenuItem,
  SESSION_LABEL,
  type MealSession,
} from "@/lib/dining.functions";

export const Route = createFileRoute("/_authenticated/menu")({
  head: () => ({ meta: [{ title: "Kelola Menu | Dining Unklab" }] }),
  component: MenuPage,
});

function todayMakassar() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Makassar",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value]),
  );
  return `${parts["year"]}-${parts["month"]}-${parts["day"]}`;
}

const SESSIONS: MealSession[] = ["sarapan", "makan_siang", "makan_malam"];

function MenuPage() {
  const list = useServerFn(listMenu);
  const add = useServerFn(addMenuItem);
  const update = useServerFn(updateMenuItem);
  const remove = useServerFn(deleteMenuItem);
  const [date, setDate] = useState(todayMakassar());
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ session: "sarapan" as MealSession, name: "", description: "" });

  const menu = useQuery({ queryKey: ["menu", date], queryFn: () => list({ data: { date } }) });

  function reset() {
    setEditId(null);
    setForm({ session: form.session, name: "", description: "" });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (form.name.trim().length < 2) {
      toast.error("Nama makanan minimal 2 karakter.");
      return;
    }
    try {
      const payload = {
        menu_date: date,
        session: form.session,
        name: form.name,
        description: form.description,
      };
      if (editId) await update({ data: { id: editId, ...payload } });
      else await add({ data: payload });
      toast.success(editId ? "Menu diperbarui." : "Menu ditambahkan.");
      reset();
      void menu.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan menu.");
    }
  }

  async function removeItem(id: string) {
    if (!confirm("Hapus makanan ini dari daftar?")) return;
    try {
      await remove({ data: { id } });
      void menu.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus menu.");
    }
  }

  const items = menu.data?.items ?? [];

  return (
    <AppShell
      subtitle="Kelola menu"
      links={[
        { to: "/beranda", label: "Beranda" },
        { to: "/scan", label: "Pemindai" },
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <form onSubmit={submit} className="surface-card space-y-3 p-6">
          <h1 className="font-display text-xl font-semibold">{editId ? "Ubah makanan" : "Tambah makanan"}</h1>
          <label className="block text-sm">
            Tanggal
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            Sesi
            <select
              value={form.session}
              onChange={(event) => setForm({ ...form, session: event.target.value as MealSession })}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              {SESSIONS.map((session) => (
                <option key={session} value={session}>{SESSION_LABEL[session]}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Nama makanan
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="mis. Nasi kuning + telur"
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            Keterangan (opsional)
            <input
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="mis. sayur kangkung, buah pisang"
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              <Plus className="size-4" /> {editId ? "Simpan perubahan" : "Tambah"}
            </button>
            {editId && (
              <button type="button" onClick={reset} className="rounded-lg border border-border px-3 py-2 text-sm">
                <X className="size-4" />
              </button>
            )}
          </div>
        </form>

        <section className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold">Daftar makanan · {date}</h2>
          <div className="mt-4 space-y-4">
            {SESSIONS.map((session) => {
              const rows = items.filter((item) => item.session === session);
              return (
                <div key={session}>
                  <p className="text-sm font-semibold">{SESSION_LABEL[session]}</p>
                  {rows.length === 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">Belum ada menu.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {rows.map((item) => (
                        <li key={item.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                          </div>
                          <div className="flex gap-1">
                            <button
                              aria-label="Ubah"
                              onClick={() => {
                                setEditId(item.id);
                                setForm({ session: item.session as MealSession, name: item.name, description: item.description ?? "" });
                              }}
                              className="rounded-md p-1.5 hover:bg-secondary"
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              aria-label="Hapus"
                              onClick={() => void removeItem(item.id)}
                              className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}