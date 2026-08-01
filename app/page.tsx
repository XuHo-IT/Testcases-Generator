import { GeneratorForm } from "@/components/GeneratorForm";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">TestcaseForge</h1>
        <p className="mt-1 text-sm opacity-70">
          Generate ISTQB-validated test cases from a use case, a user story, a requirement document or an API spec —
          using Claude, GPT, Gemini or a local Ollama model. Every generated case is checked against 14 enterprise
          quality rules before you export it.
        </p>
      </header>

      <GeneratorForm />

      <footer className="mt-12 border-t border-black/10 pt-4 text-xs opacity-60 dark:border-white/15">
        Generated cases are specifications, never execution results — Passed/Failed, defect IDs and execution dates are
        left blank for the tester to fill in.
      </footer>
    </main>
  );
}
