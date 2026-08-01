import { GeneratorForm } from "@/components/GeneratorForm";

export default function Home() {
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-6xl items-baseline justify-between gap-6 px-6 py-5">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-2xl leading-none tracking-tight text-accent">
              TestCaseGenerator
            </span>
            <span className="hidden text-xs text-subtle sm:inline">Bộ sinh test case cho tester</span>
          </div>
          <span className="hidden text-xs text-muted md:inline">Chuẩn ISTQB · 14 rule kiểm tra</span>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <section className="mb-9 max-w-2xl">
          <h1 className="font-display text-4xl leading-[1.1] tracking-tight text-ink sm:text-[2.75rem]">
            Sinh test case từ requirement, kiểm tra chất lượng trước khi bàn giao
          </h1>
          <p className="mt-3.5 text-[0.9375rem] leading-relaxed text-muted">
            Nhận đầu vào là mô tả use case, user story, tài liệu requirement hoặc API spec. Chọn model AI
            phù hợp, hệ thống sinh test case rồi tự kiểm tra qua 14 rule ISTQB và xuất ra 6 định dạng.
          </p>
        </section>

        <GeneratorForm />
      </main>

      <footer className="mt-16 border-t border-line bg-surface">
        <div className="mx-auto w-full max-w-6xl px-6 py-6">
          <p className="hint max-w-3xl">
            Test case sinh ra là đặc tả, không phải kết quả chạy thật. Các cột Passed/Failed, Defect ID và
            ngày thực thi luôn để trống cho tester tự điền sau khi chạy.
          </p>
        </div>
      </footer>
    </>
  );
}
