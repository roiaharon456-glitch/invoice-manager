import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SessionProvider } from "./providers";

const discovery = localFont({
  src: [
    { path: "../public/fonts/Discovery_Fs-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/Discovery_Fs-Demibold.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/Discovery_Fs-Black.woff2",   weight: "900", style: "normal" },
  ],
  variable: "--font-discovery",
  display: "swap",
});

export const metadata: Metadata = {
  title: "מנהל מסמכים",
  description: "מערכת לניהול חשבוניות ותלושי משכורת מהמייל",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "מנהל מסמכים",
  },
  icons: { apple: "/icon-192.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className={discovery.className}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
