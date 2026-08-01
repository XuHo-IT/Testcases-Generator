import type { Metadata } from "next";
import { ApiKeysSection } from "@/components/settings/ApiKeysSection";
import { DefaultsSection } from "@/components/settings/DefaultsSection";
import { RulesSection } from "@/components/settings/RulesSection";
import { CustomRulesSection } from "@/components/settings/CustomRulesSection";

export const metadata: Metadata = {
  title: "Cài đặt — TestCaseGenerator",
  description: "Nhập API key của bạn, xem 14 rule ISTQB và thêm rule riêng của đội.",
};

export default function SettingsPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <section className="mb-8 max-w-2xl">
        <h1 className="font-display text-4xl leading-[1.1] tracking-tight text-ink">Cài đặt</h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
          Mọi thiết lập ở đây được lưu trong trình duyệt trên máy này. Không có gì gửi lên máy chủ ngoài
          lúc bạn thực sự bấm sinh test case hoặc kiểm tra kết nối.
        </p>
      </section>

      <div className="space-y-6">
        <ApiKeysSection />
        <DefaultsSection />
        <RulesSection />
        <CustomRulesSection />
      </div>
    </main>
  );
}
