import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Калькулятор амортизаторов УАЗ Патриот 2008",
  description: "Расчёт параметров амортизаторов для УАЗ Патриот 2008 с учётом лифта подвески, типа рессор и режима эксплуатации.",
  keywords: ["УАЗ Патриот", "амортизаторы", "лифт подвески", "рессоры", "расчёт", "калькулятор", "подвеска"],
  authors: [{ name: "Z.ai" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Калькулятор амортизаторов УАЗ Патриот 2008",
    description: "Расчёт параметров амортизаторов с учётом лифта и типа подвески",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
