import { isDiscount, type Discount } from "@/lib/discount";
import { registrationSchema, type RegistrationPayload } from "@/lib/registration-schema";
import type { CourseType, Gender } from "./data";

/** The form's steps: group, details, payment, WhatsApp. */
export const PAY_STEP = 2;
export const DONE_STEP = 3;

/** The form's answers (steps 1–2), and the discount code a paid registration used ("" for none). */
export type Answers = {
  course: CourseType;
  gender: Gender | "";
  group: string;
  level: string;
  availability: string;
  name: string;
  phone: string;
  email: string;
  goal: string;
  code: string;
};

export const EMPTY_ANSWERS: Answers = {
  course: "intensive",
  gender: "",
  group: "",
  level: "",
  availability: "",
  name: "",
  phone: "",
  email: "",
  goal: "",
  code: "",
};

const ENDPOINT = "/api/public/shukraan-register";

/** The registration exactly as the form has always sent it to the API. */
function toPayload(a: Answers): Record<keyof RegistrationPayload, string> {
  return {
    gender: a.gender,
    group_id: a.group === "new" ? `${a.gender} new${a.course === "intensive" ? "+" : ""}` : a.group,
    level: a.level,
    availability: a.availability,
    full_name: a.name,
    whatsapp: a.phone,
    email: a.email,
    goal: a.goal,
    // The column that held the Dâd answer now holds the discount code used ("" without one).
    eligibility: a.code,
  };
}

const FIELD_STEP: Record<keyof RegistrationPayload, number> = {
  gender: 0,
  group_id: 0,
  level: 0,
  availability: 0,
  full_name: 1,
  whatsapp: 1,
  email: 1,
  goal: 1,
  // The discount code is entered in the payment step.
  eligibility: PAY_STEP,
};

/** The first step holding an answer the API would refuse, or null if the API would accept them all. */
export function refusedStep(a: Answers): number | null {
  const result = registrationSchema.safeParse(toPayload(a));
  if (result.success) return null;
  const key = result.error.issues[0]?.path[0];
  return typeof key === "string" && key in FIELD_STEP ? FIELD_STEP[key as keyof RegistrationPayload] : 0;
}

// ── Session storage ──────────────────────────────────────────────────────────────────────────
// PAYING: the answers and step while the payment step is open, so a return from Whop resumes.
// PAID: paid registrations not saved yet. Both are emptied once the registration is saved.
const PAYING_KEY = "shukraan.registration.paying";
const PAID_KEY = "shukraan.registration.paid";

function read(key: string): unknown {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode quota): the in-page flow still works.
  }
}
function remove(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {}
}
const asAnswers = (v: unknown): Answers | null =>
  v && typeof v === "object" ? { ...EMPTY_ANSWERS, ...(v as Partial<Answers>) } : null;
const readPaid = (): Answers[] => {
  const v = read(PAID_KEY);
  return Array.isArray(v) ? v.map(asAnswers).filter((a): a is Answers => a !== null) : [];
};

export function rememberPayingStep(a: Answers, discount: Discount | null) {
  write(PAYING_KEY, { answers: a, step: PAY_STEP, discount });
}
export function forgetPayingStep() {
  remove(PAYING_KEY);
}

/** Whop reported the payment complete: queue the registration for saving. */
export function markPaid(a: Answers) {
  write(PAID_KEY, [...readPaid(), a]);
  remove(PAYING_KEY);
}

/**
 * Where this visit resumes the form, if anywhere: a return to returnUrl with status=succeeded
 * (or a reload after paying) opens the WhatsApp step; any other return during payment reopens the
 * payment step.
 */
export function resumePoint(
  status: string | null,
): { answers: Answers; step: typeof PAY_STEP | typeof DONE_STEP; discount: Discount | null } | null {
  const kept = read(PAYING_KEY) as { answers?: unknown; discount?: unknown } | null;
  const paying = asAnswers(kept?.answers);
  if (paying) {
    const discount = isDiscount(kept?.discount) ? kept.discount : null;
    if (status !== "succeeded") return { answers: paying, step: PAY_STEP, discount };
    markPaid({ ...paying, code: discount?.code ?? "" });
    return { answers: paying, step: DONE_STEP, discount };
  }
  const paid = readPaid().at(-1);
  return paid ? { answers: paid, step: DONE_STEP, discount: null } : null;
}

// ── Saving ───────────────────────────────────────────────────────────────────────────────────
let timer: ReturnType<typeof setTimeout> | undefined;
let inFlight = false;
let attempt = 0;

/**
 * Saves every paid registration through the existing API, oldest first, exactly once each,
 * retrying failures with backoff for as long as the page is open (and again on the next visit
 * in this tab, since they stay in session storage until saved).
 */
export function saveRegistrations(delayMs = 0) {
  if (inFlight || timer !== undefined) return;
  timer = setTimeout(run, delayMs);
}

async function run() {
  timer = undefined;
  const next = readPaid()[0];
  if (!next) return;
  inFlight = true;
  let saved = false;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(next)),
      keepalive: true,
    });
    saved = res.ok;
  } catch {
    // Network error: retried below.
  }
  inFlight = false;
  if (saved) {
    const rest = readPaid().slice(1);
    if (rest.length) write(PAID_KEY, rest);
    else remove(PAID_KEY);
    attempt = 0;
    saveRegistrations();
  } else {
    attempt += 1;
    saveRegistrations(Math.min(30_000, 1_000 * 2 ** attempt));
  }
}

if (typeof window !== "undefined") {
  // Whop sends the tab to returnUrl right after onComplete. A save that has not started yet is
  // left to the page the tab lands on, so one payment is not saved twice by two pages.
  window.addEventListener("beforeunload", () => {
    if (timer === undefined || inFlight) return;
    clearTimeout(timer);
    timer = setTimeout(run, 10_000);
  });
}
