import type { Metadata } from "next";
import Link from "next/link";
import { Be_Vietnam_Pro, Geist_Mono, Lora } from "next/font/google";
import { SettingsProvider } from "@/components/SettingsProvider";
import { SiteNav } from "@/components/SiteNav";
import "./globals.css";

// UI face — purpose-built for Vietnamese diacritics, so accented text stays
// even and legible at small sizes.
const uiSans = Be_Vietnam_Pro({
  variable: "--font-ui",
  weight: ["400", "500", "600"],
  subsets: ["latin", "vietnamese"],
});

// Data face — IDs, field values, step numbers.
const dataMono = Geist_Mono({
  variable: "--font-data",
  subsets: ["latin"],
});

// Display face for headings — the academic register the palette aims for.
const displaySerif = Lora({
  variable: "--font-display-serif",
  weight: ["400", "500"],
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "TestCaseGenerator — sinh test case chuẩn ISTQB",
  description:
    "Sinh test case cho tester từ requirement, user story, tài liệu hoặc API spec bằng Claude, GPT, Gemini hoặc model Ollama chạy nội bộ. Mọi test case được kiểm tra qua 14 rule chất lượng ISTQB.",
  openGraph: {
    title: "TestCaseGenerator",
    description: "Sinh test case chuẩn ISTQB từ requirement, với nhiều model AI cấu hình được.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${uiSans.variable} ${dataMono.variable} ${displaySerif.variable} h-full antialiased`}
    >
      {/*
        suppressHydrationWarning: password managers and privacy extensions
        (Bitdefender's `bis_register`, Colorzilla's `cz-shortcut-listen`, …)
        add attributes to <body> before React hydrates. It only silences
        attribute mismatches on this one element, so real mismatches deeper in
        the tree still surface.
      */}
      <body className="flex min-h-dvh flex-col" suppressHydrationWarning>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Bỏ qua, đến nội dung chính
        </a>

        <SettingsProvider>
          <header className="border-b border-line bg-surface">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-4">
              <Link href="/" className="flex items-baseline gap-3">
                <span className="font-display text-2xl leading-none tracking-tight text-accent">
                  TestCaseGenerator
                </span>
                <span className="hidden text-xs text-subtle sm:inline">Bộ sinh test case cho tester</span>
              </Link>
              <SiteNav />
            </div>
          </header>

          {children}

          <footer className="mt-16 border-t border-line bg-surface">
            <div className="mx-auto w-full max-w-6xl px-6 py-6">
              <p className="hint max-w-3xl">
                Test case sinh ra là đặc tả, không phải kết quả chạy thật. Các cột Passed/Failed, Defect ID
                và ngày thực thi luôn để trống cho tester tự điền sau khi chạy.
              </p>
            </div>
          </footer>
        </SettingsProvider>
      </body>
    </html>
  );
}
