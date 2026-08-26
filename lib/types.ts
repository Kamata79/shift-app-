export interface AdminUser {
  id: string;
  full_name: string;
}

export interface Staff {
  id: string;
  full_name: string;
  employment_type: string | null;
  position: string | null;
  active: boolean;
  created_at: string;
}

export interface Qualification {
  id: string;
  name: string;
}

export interface ShiftType {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  color: string;
  sort_order: number;
  active: boolean;
}

export interface StaffingRule {
  weekday: number; // 0=月 ... 6=日
  shift_type_id: string;
  min_count: number;
}

export interface Shift {
  id: string;
  staff_id: string;
  shift_type_id: string;
  work_date: string; // YYYY-MM-DD
  note: string | null;
}

export type RequestType = "休み希望" | "半休";

export interface ShiftRequest {
  id: string;
  staff_id: string;
  work_date: string;
  type: RequestType;
  note: string | null;
}
