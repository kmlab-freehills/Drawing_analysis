import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "図面 表面積計算アプリ",
  description: "図面(PDF/画像)をGeminiで解析し、メッキに必要な表面積を推定します。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
