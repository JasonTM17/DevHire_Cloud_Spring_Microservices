"use client";

import type { AuthResponse, CurrentUser } from "@/types/domain";

const ACCESS_TOKEN_KEY = "devhire.accessToken";
const REFRESH_TOKEN_KEY = "devhire.refreshToken";
const USER_KEY = "devhire.user";

export type Session = {
  accessToken: string;
  refreshToken: string;
  user: CurrentUser;
};

export function getSession(): Session | null {
  if (typeof window === "undefined") {
    return null;
  }
  const accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);
  const rawUser = window.localStorage.getItem(USER_KEY);
  if (!accessToken || !refreshToken || !rawUser) {
    return null;
  }
  return {
    accessToken,
    refreshToken,
    user: JSON.parse(rawUser) as CurrentUser
  };
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
