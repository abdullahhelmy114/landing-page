"use client";

import { useState } from "react";

import { Emblem } from "@/components/shukraan/Emblem";
import { api, ApiError } from "./api";

/** The panel's login: one password. */
export function Login({ configured }: { configured: boolean }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("login", { body: { password } });
      window.location.reload();
    } catch (err) {
      const left = err instanceof ApiError ? err.data["attemptsLeft"] : undefined;
      setError(err instanceof Error ? err.message + (typeof left === "number" ? ` المحاولات المتبقية: ${left}.` : "") : "تعذّر تسجيل الدخول.");
      setBusy(false);
    }
  };
  return (
    <main className="admin-root grid min-h-screen place-items-center bg-[#071027] px-4" dir="rtl" lang="ar">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-[#fbf6ea] p-8 shadow-2xl">
        <Emblem className="mx-auto mb-4 h-16 w-auto text-[#071027]" />
        <h1 className="text-center font-arabic text-2xl font-bold text-[#071027]">لوحة التحكم</h1>
        <p className="mt-1 text-center text-sm text-[#071027]/70">أَكاديمِيَّةُ شُكْران إِيدْيُو</p>
        {!configured && <p className="mt-6 rounded-xl bg-red-50 p-3 text-sm text-red-800">لم تُضبط كلمة مرور لوحة التحكم على الخادم. أضِف المتغيّر ADMIN_PASSWORD في Coolify ثم أعِد النشر.</p>}
        <label className="mt-6 block text-sm font-medium text-[#071027]" htmlFor="pw">
          كلمة المرور
        </label>
        <input
          id="pw"
          type="password"
          autoComplete="current-password"
          required
          dir="ltr"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full rounded-xl border border-[#071027]/20 bg-white px-4 py-3 text-[#071027] outline-none focus:border-[#d0a348] focus:ring-2 focus:ring-[#d0a348]/40"
        />
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy || !configured} className="mt-6 w-full rounded-full bg-[#071027] py-3 font-semibold text-[#f3ead7] transition hover:bg-[#0d1936] disabled:opacity-60">
          {busy ? "جارٍ الدخول…" : "دخول"}
        </button>
      </form>
    </main>
  );
}
