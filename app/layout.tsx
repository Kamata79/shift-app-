import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "シフト管理",
  description: "介護事業所向けシフト作成・共有アプリ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
