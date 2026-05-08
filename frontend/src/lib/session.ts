"use client";

import type { AuthResponse, CurrentUser } from "@/types/domain";

const ACCESS_TOKEN_KEY = "devhire.accessToken";
const REFRESH_TOKEN_KEY = "devhire.refreshToken";
const USER_KEY = "devhire.user";

const reviewSessions: Record<string, CurrentUser> = {
  admin: { id: "review-admin", email: "admin@devhire.local", role: "ADMIN" },
  employer: { id: "review-employer", email: "employer@devhire.local", role: "EMPLOYER" },
  candidate: { id: "review-candidate", email: "candidate@devhire.local", role: "CANDIDATE" }
};

export type Session = {
  accessToken: string;
  refreshToken: string;
  user: CurrentUser;
};

type JwtPayload = {
  sub?: string;
  email?: string;
  role?: string;
  exp?: number;
};

export function getSession(): Session | null {
  if (typeof window === "undefined") {
    return null;
  }
  const accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);
  const rawUser = window.localStorage.getItem(USER_KEY);
  if (!accessToken || !refreshToken) {
    return null;
  }
  try {
    const storedUser = rawUser ? JSON.parse(rawUser) as CurrentUser : null;
    const trustedUser = trustedUserFromTokens(accessToken, refreshToken, storedUser);
    if (!trustedUser) {
      clearSession();
      return null;
    }
    return {
      accessToken,
      refreshToken,
      user: trustedUser
    };
  } catch {
    clearSession();
    return null;
  }
}

export function saveSession(response: AuthResponse) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify({
    id: response.userId,
    email: response.email,
    role: response.role
  }));
}

export function clearSession() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

function trustedUserFromTokens(accessToken: string, refreshToken: string, storedUser: CurrentUser | null): CurrentUser | null {
  const reviewUser = trustedReviewUser(accessToken, refreshToken);
  if (reviewUser) {
    return reviewUser;
  }
  const payload = decodeJwtPayload(accessToken);
  const role = normalizeRole(payload?.role);
  const id = typeof payload?.sub === "string" ? payload.sub : "";
  const email = typeof payload?.email === "string" ? payload.email : "";
  if (!payload || !role || !id || !email || isExpired(payload.exp)) {
    return null;
  }
  if (storedUser && storedUser.email !== email) {
    return null;
  }
  return { id, email, role };
}

function trustedReviewUser(accessToken: string, refreshToken: string): CurrentUser | null {
  const match = /^review-access-(admin|employer|candidate)$/.exec(accessToken);
  if (!match || refreshToken !== `review-refresh-${match[1]}`) {
    return null;
  }
  return reviewSessions[match[1]];
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const payload = token.split(".")[1];
  if (!payload) {
    return null;
  }
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

function normalizeRole(role?: string): CurrentUser["role"] | null {
  if (role === "ADMIN" || role === "EMPLOYER" || role === "CANDIDATE") {
    return role;
  }
  return null;
}

function isExpired(exp?: number) {
  return typeof exp !== "number" || exp * 1000 <= Date.now();
}
