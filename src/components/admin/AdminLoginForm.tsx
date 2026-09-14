"use client";

import { useActionState, useState } from "react";
import { adminLoginAction, type AdminLoginState } from "@/lib/actions/admin-auth";
import { Eye, EyeOff, Lock, User, ArrowRight, Loader2 } from "lucide-react";

export default function AdminLoginForm() {
  const [state, formAction, isPending] = useActionState<AdminLoginState, FormData>(
    adminLoginAction,
    {},
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-950/40 p-3.5 text-xs text-red-200 backdrop-blur-sm"
        >
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="identifier"
          className="block text-xs font-medium uppercase tracking-widest text-neutral-300"
        >
          Username or Email
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-500">
            <User className="h-4 w-4" />
          </div>
          <input
            id="identifier"
            name="identifier"
            type="text"
            required
            autoComplete="username"
            placeholder="admin"
            className="w-full rounded-md border border-neutral-800 bg-neutral-900/90 py-3 pl-10 pr-4 text-sm text-white placeholder-neutral-500 outline-none transition-all duration-200 focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-xs font-medium uppercase tracking-widest text-neutral-300"
        >
          Security Password
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-500">
            <Lock className="h-4 w-4" />
          </div>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="••••••••••••"
            className="w-full rounded-md border border-neutral-800 bg-neutral-900/90 py-3 pl-10 pr-11 text-sm text-white placeholder-neutral-500 outline-none transition-all duration-200 focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="group relative flex w-full items-center justify-center gap-2 rounded-md bg-white py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-950 transition-all duration-300 hover:bg-neutral-200 disabled:opacity-50 cursor-pointer shadow-lg active:scale-[0.99]"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Authenticating…</span>
          </>
        ) : (
          <>
            <span>Authenticate</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </>
        )}
      </button>
    </form>
  );
}

