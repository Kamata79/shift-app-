export const EMPLOYMENT_TYPES = ["常勤", "非常勤", "介護助手", "スポットワーク"] as const;

export const POSITIONS = [
  "施設長",
  "副施設長",
  "課長",
  "係長",
  "管理者",
  "主任",
  "副主任",
  "フロアリーダー",
  "フロアサブリーダー",
] as const;

export const QUALIFICATIONS_FIXED = [
  "介護福祉士",
  "看護師",
  "リハビリ職",
  "ケアマネージャー",
  "社会福祉士",
  "事務職",
] as const;

// 0=月, 1=火, 2=水, 3=木, 4=金, 5=土, 6=日
export const WEEKDAYS_MON_FIRST = ["月", "火", "水", "木", "金", "土", "日"];

// JSのDate#getDay()は 0=日始まりなので、月曜始まりindexに変換する
export function weekdayIndexMonFirst(dateStr: string): number {
  const jsDay = new Date(dateStr + "T00:00:00").getDay(); // 0=日..6=土
  return (jsDay + 6) % 7;
}

export const LOCAL_STAFF_ID_KEY = "shift-app:staff-id";
