import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type MealSession = "sarapan" | "makan_siang" | "makan_malam";

export const SESSION_LABEL: Record<MealSession, string> = {
  sarapan: "Sarapan",
  makan_siang: "Makan Siang",
  makan_malam: "Makan Malam",
};

const SESSION_WINDOWS: { session: MealSession; start: number; end: number }[] = [
  { session: "sarapan", start: 6 * 60, end: 8 * 60 },
  { session: "makan_siang", start: 12 * 60, end: 14 * 60 },
  { session: "makan_malam", start: 18 * 60, end: 24 * 60 },
];

const TZ = "Asia/Makassar";

function localParts() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return {
    date: `${parts['year']}-${parts['month']}-${parts['day']}`,
    minutes: Number(parts['hour']) * 60 + Number(parts['minute']),
  };
}

function currentSession(): { session: MealSession | null; date: string } {
  const { date, minutes } = localParts();
  const found = SESSION_WINDOWS.find((w) => minutes >= w.start && minutes < w.end);
  return { session: found ? found.session : null, date };
}

const TOKEN_TTL_SECONDS = 15;
const DAILY_MSG = "Sudah mengambil jatah hari ini (maksimal 1x per hari).";

/** Student: issue a fresh short-lived QR token. */
export const issueQrToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const token = crypto.randomUUID().replace(/-/g, "") + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();
    const { date } = currentSession();

    const { data: already } = await supabaseAdmin
      .from("attendance_logs")
      .select("id")
      .eq("student_id", context.userId)
      .eq("session_date", date)
      .neq("status", "rejected")
      .limit(1);
    if ((already ?? []).length > 0) throw new Error(DAILY_MSG);

    const { error } = await supabaseAdmin.from("qr_tokens").insert({
      student_id: context.userId,
      token,
      expires_at: expiresAt,
    });
    if (error) throw new Error(error.message);

    const { session } = currentSession();
    return { token, expiresAt, ttl: TOKEN_TTL_SECONDS, session };
  });

/** Student: own profile + today's status. */
export const getMyStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { session, date } = currentSession();
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("reg_number, full_name")
      .eq("id", context.userId)
      .maybeSingle();

    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    const { data: logs } = await context.supabase
      .from("attendance_logs")
      .select("id, session, session_date, scanned_at, status, reason")
      .eq("student_id", context.userId)
      .order("scanned_at", { ascending: false })
      .limit(15);

    const todayTaken = (logs ?? []).some((l) => l.session_date === date && l.status !== "rejected");

    const { data: menu } = await context.supabase
      .from("menu_items")
      .select("id, session, name, description")
      .eq("menu_date", date)
      .order("created_at");

    return {
      profile: profile ?? null,
      roles: (roles ?? []).map((r) => r.role as string),
      session,
      date,
      todayTaken,
      logs: logs ?? [],
      menu: menu ?? [],
    };
  });

async function assertStaff(context: { supabase: any; userId: string }) {
  const [{ data: isStaff }, { data: isAdmin }] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "staff" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
  ]);
  if (!isStaff && !isAdmin) throw new Error("Akses khusus staff dapur.");
}

type ScanResult = {
  valid: boolean;
  status: "accepted" | "rejected" | "manual" | "assisted";
  message: string;
  student?: { reg_number: string; full_name: string } | null;
  session?: MealSession | null;
};

/** Staff: validate a scanned QR token. */
export const validateScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ token: z.string().min(6).max(200) }).parse(input))
  .handler(async ({ data, context }): Promise<ScanResult> => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { session, date } = currentSession();

    const { data: row } = await supabaseAdmin
      .from("qr_tokens")
      .select("id, student_id, expires_at, used_at")
      .eq("token", data.token.trim())
      .maybeSingle();

    if (!row) {
      return { valid: false, status: "rejected", message: "Token tidak dikenali." };
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("reg_number, full_name")
      .eq("id", row.student_id)
      .maybeSingle();

    const reject = async (message: string): Promise<ScanResult> => {
      if (session) {
        await supabaseAdmin.from("attendance_logs").insert({
          student_id: row.student_id,
          reg_number: profile?.reg_number ?? null,
          session,
          session_date: date,
          status: "rejected",
          reason: message,
          staff_id: context.userId,
        });
      }
      return { valid: false, status: "rejected", message, student: profile, session };
    };

    if (row.used_at) return reject("Token sudah dipakai.");
    if (new Date(row.expires_at).getTime() < Date.now()) return reject("Token kedaluwarsa, minta QR baru.");
    if (!session) {
      return { valid: false, status: "rejected", message: "Di luar jam sesi makan.", student: profile, session };
    }

    const { error: insertError } = await supabaseAdmin.from("attendance_logs").insert({
      student_id: row.student_id,
      reg_number: profile?.reg_number ?? null,
      session,
      session_date: date,
      status: "accepted",
      staff_id: context.userId,
    });

    if (insertError) {
      if (insertError.code === "23505") return reject(DAILY_MSG);
      throw new Error(insertError.message);
    }

    await supabaseAdmin.from("qr_tokens").update({ used_at: new Date().toISOString() }).eq("id", row.id);

    return {
      valid: true,
      status: "accepted",
      message: "Makanan diterima.",
      student: profile,
      session,
    };
  });

/** Staff: manual fallback by registration number. */
export const manualCheckIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ regNumber: z.string().min(3).max(50) }).parse(input))
  .handler(async ({ data, context }): Promise<ScanResult> => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { session, date } = currentSession();
    const reg = data.regNumber.trim();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, reg_number, full_name")
      .eq("reg_number", reg)
      .maybeSingle();

    if (!profile) return { valid: false, status: "rejected", message: "Nomor regis tidak ditemukan." };
    if (!session)
      return { valid: false, status: "rejected", message: "Di luar jam sesi makan.", student: profile };

    const { error } = await supabaseAdmin.from("attendance_logs").insert({
      student_id: profile.id,
      reg_number: profile.reg_number,
      session,
      session_date: date,
      status: "manual",
      reason: "Fallback manual nomor regis",
      staff_id: context.userId,
    });

    if (error) {
      if (error.code === "23505")
        return {
          valid: false,
          status: "rejected",
          message: DAILY_MSG,
          student: profile,
          session,
        };
      throw new Error(error.message);
    }

    return { valid: true, status: "manual", message: "Diterima (manual).", student: profile, session };
  });

/** Staff: live dashboard for the running session. */
export const getStaffDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { session, date } = currentSession();

    const { data: logs } = await supabaseAdmin
      .from("attendance_logs")
      .select("id, reg_number, session, status, scanned_at, reason")
      .eq("session_date", date)
      .order("scanned_at", { ascending: false })
      .limit(50);

    const { count: totalStudents } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true });

    const all = logs ?? [];
    const inSession = session ? all.filter((l) => l.session === session) : [];

    return {
      session,
      date,
      totalStudents: totalStudents ?? 0,
      served: inSession.filter((l) => l.status !== "rejected").length,
      rejected: inSession.filter((l) => l.status === "rejected").length,
      manual: inSession.filter((l) => l.status === "manual").length,
      assisted: all.filter((l) => l.status === "assisted").length,
      recent: all.slice(0, 20),
    };
  });

/** Staff: record a meal prepared for a student who cannot collect it in person. */
export const assistStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        regNumber: z.string().min(3).max(50),
        session: z.enum(["sarapan", "makan_siang", "makan_malam"]),
        reason: z.string().trim().min(3).max(300),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<ScanResult> => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { date } = currentSession();
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, reg_number, full_name")
      .eq("reg_number", data.regNumber.trim())
      .maybeSingle();
    if (!profile) return { valid: false, status: "rejected", message: "Nomor regis tidak ditemukan." };

    const { error } = await supabaseAdmin.from("attendance_logs").insert({
      student_id: profile.id,
      reg_number: profile.reg_number,
      session: data.session,
      session_date: date,
      status: "assisted",
      reason: data.reason,
      staff_id: context.userId,
    });
    if (error) {
      if (error.code === "23505")
        return { valid: false, status: "rejected", message: DAILY_MSG, student: profile, session: data.session };
      throw new Error(error.message);
    }
    return {
      valid: true,
      status: "assisted",
      message: "Bantuan dicatat, jatah disiapkan untuk mahasiswa.",
      student: profile,
      session: data.session,
    };
  });

const menuInput = z.object({
  menu_date: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
  session: z.enum(["sarapan", "makan_siang", "makan_malam"]),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(300).optional().nullable(),
});

/** Signed-in users can read menu items for a date. */
export const listMenu = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ date: z.string().optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const date = data.date || currentSession().date;
    const { data: rows, error } = await context.supabase
      .from("menu_items")
      .select("id, menu_date, session, name, description")
      .eq("menu_date", date)
      .order("created_at");
    if (error) throw new Error(error.message);
    return { date, items: rows ?? [] };
  });

/** Staff/admin can add a menu item. */
export const addMenuItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => menuInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("menu_items")
      .insert({ ...data, description: data.description || null });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Staff/admin can update a menu item. */
export const updateMenuItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => menuInput.extend({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...rest } = data;
    const { error } = await supabaseAdmin
      .from("menu_items")
      .update({ ...rest, description: rest.description || null })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Staff/admin can delete a menu item. */
export const deleteMenuItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("menu_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
