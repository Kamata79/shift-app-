export type Role = "admin" | "staff";

export interface Staff {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  role: Role;
  employment_type: string | null;
  desired_work_days_per_week: number | null;
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
  id: string;
  shift_type_id: string;
  min_staff_count: number;
  required_qualification_id: string | null;
  min_qualified_count: number;
}

export interface Shift {
  id: string;
  staff_id: string;
  shift_type_id: string;
  work_date: string; // YYYY-MM-DD
  note: string | null;
}

export type RequestType = "day_off" | "want_shift";

export interface ShiftRequest {
  id: string;
  staff_id: string;
  work_date: string;
  request_type: RequestType;
  shift_type_id: string | null;
  note: string | null;
}
