import { Logo } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[#1a2233] p-12 text-white lg:flex lg:flex-col">
        <Logo className="text-white" />
        <div className="relative z-10 mt-auto max-w-md space-y-4">
          <p className="text-sm uppercase tracking-[0.2em] text-white/50">Smart Study Planner</p>
          <h1 className="text-4xl font-semibold leading-tight">
            Plan around your life.
            <span className="block text-white/70">Study what actually matters.</span>
          </h1>
          <p className="text-white/60">
            Upload your materials, set your routine, and get a realistic schedule that never
            invents pages or silently moves your work.
          </p>
        </div>
        <div className="pointer-events-none absolute -bottom-24 -end-16 size-[28rem] rounded-full bg-[#5268E8]/30 blur-3xl" />
        <div className="pointer-events-none absolute top-24 -start-16 size-72 rounded-full bg-[#7957D5]/25 blur-3xl" />
      </div>
      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
