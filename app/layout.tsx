import type { Metadata } from "next";
import { Be_Vietnam_Pro, Geist_Mono, Lora } from "next/font/google";
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
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Bỏ qua, đến nội dung chính
        </a>
        {children}
      </body>
    </html>
  );
}
