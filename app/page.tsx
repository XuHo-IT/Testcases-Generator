import { GeneratorForm } from "@/components/GeneratorForm";

export default function Home() {
  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <section className="mb-9 max-w-2xl">
        <h1 className="font-display text-4xl leading-[1.1] tracking-tight text-ink sm:text-[2.75rem]">
          Sinh test case từ requirement, kiểm tra chất lượng trước khi bàn giao
        </h1>
        <p className="mt-3.5 text-[0.9375rem] leading-relaxed text-muted">
          Nhận đầu vào là mô tả use case, user story, tài liệu requirement hoặc API spec. Chọn model AI phù
          hợp, hệ thống sinh test case rồi tự kiểm tra qua 14 rule ISTQB và xuất ra 6 định dạng.
        </p>
      </section>

      <GeneratorForm />
    </main>
  );
}
