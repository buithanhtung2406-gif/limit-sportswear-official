import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb, getRuntimeEnv } from "@/db";
import { adminCredentials } from "@/db/schema";

type AuthRecord = {
  passwordHash: string;
  salt: string;
  sessionVersion: number;
  updatedAt: string;
};

const encoder = new TextEncoder();
const CREDENTIALS_KEY = "admin";
// Cloudflare Workers supports PBKDF2 up to 100,000 iterations.
const PBKDF2_ITERATIONS = 100_000;
const PAST_MONTH_COOKIE = "ls_past_month";
const PAST_MONTH_UNLOCK_SECONDS = 60 * 60 * 4;

async function derivePasswordHash(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const saltBuffer = Uint8Array.from(salt).buffer;
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: saltBuffer, iterations: PBKDF2_ITERATIONS }, material, 256);
  return Buffer.from(bits).toString("base64");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= a[index] ^ b[index];
  return difference === 0;
}

async function readAuthRecord() {
  return await getDb().query.adminCredentials.findFirst({
    where: eq(adminCredentials.key, CREDENTIALS_KEY),
  }) as AuthRecord | null;
}

export async function verifyAdminPassword(password: string) {
  const record = await readAuthRecord();
  if (record) {
    const actual = await derivePasswordHash(password, Buffer.from(record.salt, "base64"));
    return safeEqual(actual, record.passwordHash);
  }
  const initialPassword = getRuntimeEnv().ADMIN_PASSWORD;
  return Boolean(initialPassword && safeEqual(password, initialPassword));
}

async function expectedSessionValue() {
  const token = getRuntimeEnv().ADMIN_SESSION_TOKEN;
  if (!token) return null;
  const record = await readAuthRecord();
  return `${token}.${record?.sessionVersion ?? 1}`;
}

function currentMonthInVietnam() {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return year && month ? `${year}-${month}` : new Date().toISOString().slice(0, 7);
}

async function signPastMonthPayload(payload: string) {
  const token = getRuntimeEnv().ADMIN_SESSION_TOKEN;
  if (!token) return null;
  const key = await crypto.subtle.importKey("raw", encoder.encode(token), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Buffer.from(signature).toString("base64url");
}

export function isPastMonth(month: string) {
  return /^\d{4}-\d{2}$/.test(month) && month < currentMonthInVietnam();
}

export async function createPastMonthUnlockValue(month: string) {
  if (!isPastMonth(month)) return null;
  const record = await readAuthRecord();
  const expiresAt = Date.now() + PAST_MONTH_UNLOCK_SECONDS * 1000;
  const payload = `${month}.${expiresAt}.${record?.sessionVersion ?? 1}`;
  const signature = await signPastMonthPayload(payload);
  return signature ? { value: `${payload}.${signature}`, maxAge: PAST_MONTH_UNLOCK_SECONDS } : null;
}

export async function isPastMonthUnlocked(month: string) {
  if (!isPastMonth(month)) return true;
  const value = (await cookies()).get(PAST_MONTH_COOKIE)?.value;
  if (!value) return false;
  const pieces = value.split(".");
  if (pieces.length !== 4) return false;
  const [unlockedMonth, expiresText, versionText, actualSignature] = pieces;
  const expiresAt = Number(expiresText);
  const record = await readAuthRecord();
  if (unlockedMonth !== month || !Number.isFinite(expiresAt) || expiresAt <= Date.now() || Number(versionText) !== (record?.sessionVersion ?? 1)) return false;
  const payload = `${unlockedMonth}.${expiresText}.${versionText}`;
  const expectedSignature = await signPastMonthPayload(payload);
  return Boolean(expectedSignature && safeEqual(actualSignature, expectedSignature));
}

export const pastMonthCookieName = PAST_MONTH_COOKIE;

export async function isAdminSession() {
  const expected = await expectedSessionValue();
  const actual = (await cookies()).get("ls_admin")?.value;
  return Boolean(expected && actual && safeEqual(actual, expected));
}

export async function createAdminSessionValue() {
  return await expectedSessionValue();
}

export async function updateAdminPassword(password: string) {
  const current = await readAuthRecord();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const record: AuthRecord = {
    passwordHash: await derivePasswordHash(password, salt),
    salt: Buffer.from(salt).toString("base64"),
    sessionVersion: (current?.sessionVersion ?? 1) + 1,
    updatedAt: new Date().toISOString(),
  };
  await getDb().insert(adminCredentials).values({ key: CREDENTIALS_KEY, ...record }).onConflictDoUpdate({
    target: adminCredentials.key,
    set: record,
  });
  const token = getRuntimeEnv().ADMIN_SESSION_TOKEN;
  return token ? `${token}.${record.sessionVersion}` : null;
}
