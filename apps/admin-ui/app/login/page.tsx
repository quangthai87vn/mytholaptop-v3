import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirect || "/workspace";

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[58%] bg-gradient-to-br from-[#E60012] via-[#c40010] to-[#8b0009] relative overflow-hidden flex-col justify-between p-10">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"/>
              </svg>
            </div>
            <span className="text-white text-xl font-bold tracking-tight">Mỹ Tho Laptop</span>
          </div>
          <p className="text-white/60 text-sm">Admin Dashboard v3</p>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
            </svg>
          </div>
          <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
            Hệ thống quản trị<br />nội bộ MTL Commerce
          </h1>
          <p className="text-white/70 text-base max-w-sm leading-relaxed">
            Quản lý dự án, chiến dịch, thực tập sinh và nội dung marketing một cách hiệu quả.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-white/40 text-xs">
            © 2026 Mỹ Tho Laptop. Hệ thống nội bộ — không chia sẻ thông tin đăng nhập.
          </p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 lg:px-16 bg-white relative">
        {/* Mobile logo */}
        <div className="absolute top-6 left-6 flex items-center gap-2 lg:hidden">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
              <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"/>
            </svg>
          </div>
          <span className="text-gray-900 font-bold text-sm">Mỹ Tho Laptop</span>
        </div>

        <Suspense
          fallback={
            <div className="w-full max-w-sm flex items-center justify-center py-20">
              <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          }
        >
          <LoginForm redirectTo={redirectTo} />
        </Suspense>
      </div>
    </div>
  );
}
