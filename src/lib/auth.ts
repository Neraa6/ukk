import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "drghotel_super_secret_jwt_key_2026";

export interface JWTPayload {
  id: number;
  email: string;
  role: "guest" | "admin" | "management";
  name: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

export interface ResetPasswordPayload {
  id: number;
  email: string;
  role: "guest" | "admin" | "management";
  passwordHash: string;
  purpose: "password-reset";
}

export function signResetToken(payload: Omit<ResetPasswordPayload, "purpose">): string {
  return jwt.sign({ ...payload, purpose: "password-reset" }, JWT_SECRET, { expiresIn: "1h" });
}

export function verifyResetToken(token: string): ResetPasswordPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as ResetPasswordPayload;
    if (decoded.purpose !== "password-reset") return null;
    return decoded;
  } catch (error) {
    return null;
  }
}

// Get user from request cookies (helper for API routes / middleware)
export function getAuthUser(): JWTPayload | null {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

// Set auth cookie
export function setAuthCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });
}

// Delete auth cookie
export function deleteAuthCookie() {
  const cookieStore = cookies();
  cookieStore.delete("auth_token");
}

// Verify Google reCAPTCHA
export async function verifyRecaptcha(token?: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey || secretKey === "SET_YOUR_RECAPTCHA_SECRET_KEY" || !token || token === "mock-token") {
    // If not configured or mock token used, allow
    console.log("[MOCK RECAPTCHA] Bypassing verification");
    return true;
  }

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });
    const data = await res.json();
    return data.success && (data.score === undefined || data.score >= 0.5);
  } catch (error) {
    console.error("reCAPTCHA validation failed, falling back to false:", error);
    return false;
  }
}
