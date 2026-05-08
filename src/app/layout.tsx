import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wee 관리자",
  description: "Wee 학원 조교 근태·급여 관리",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
