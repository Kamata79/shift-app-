"use client";

import { createContext, useContext } from "react";
import { LOCAL_STAFF_ID_KEY } from "@/lib/constants";

export function getLocalStaffId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LOCAL_STAFF_ID_KEY);
}

export function setLocalStaffId(id: string) {
  window.localStorage.setItem(LOCAL_STAFF_ID_KEY, id);
}

export function clearLocalStaffId() {
  window.localStorage.removeItem(LOCAL_STAFF_ID_KEY);
}

export interface StaffIdentity {
  staffId: string;
  staffName: string;
}

export const StaffIdentityContext = createContext<StaffIdentity | null>(null);

// 職員用画面のページから「今どの職員として使っているか」を取得するフック。
// StaffIdentityGate配下でのみ使用可能（未設定なら例外を投げる）。
export function useStaffIdentity(): StaffIdentity {
  const ctx = useContext(StaffIdentityContext);
  if (!ctx) {
    throw new Error("useStaffIdentity は StaffIdentityGate の内側でのみ使用できます");
  }
  return ctx;
}
