import { OcrCompletionNotifier } from "@/features/ocr/components/ocr-completion-notifier";
import type { Metadata } from "next";

import { Providers } from "@/app/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "QuanLyKhoLuuTru",
  description: "Hệ thống quản lý kho lưu trữ hồ sơ và tài liệu số hóa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>
        <Providers>
          {children}
        </Providers>
              <OcrCompletionNotifier />
      </body>
    </html>
  );
}