import "./globals.css";
import type { ReactNode } from "react";
import { LocaleProvider } from "../src/lib/i18n/locale-context";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}