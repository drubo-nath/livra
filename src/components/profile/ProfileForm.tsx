"use client";

import { useState, useTransition } from "react";
import { Lock, Check, Loader2, Save } from "lucide-react";
import { updateProfileAction } from "@/lib/actions/profile";
import { formatPhone } from "@/lib/phone";

interface ProfileFormProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
  };
}

export default function ProfileForm({ user }: ProfileFormProps) {
  const [name, setName] = useState(user.name && user.name !== "Guest" ? user.name : "");
  const [email, setEmail] = useState(
    user.email && !user.email.endsWith("@sms.liora.bd") ? user.email : ""
  );
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok?: boolean; msg?: string } | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);

    const fd = new FormData();
    fd.set("name", name);
    fd.set("email", email);

    startTransition(async () => {
      const res = await updateProfileAction(fd);
      if (res.ok) {
        setFeedback({ ok: true, msg: "Profile updated successfully." });
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setFeedback({ ok: false, msg: res.error });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Mobile Phone Number (Locked & Unique) ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink/80">
            Mobile Number
          </label>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-medium tracking-wide text-emerald-700 border border-emerald-200">
            <Lock className="h-3 w-3" /> Unique Account ID
          </span>
        </div>
        <div className="relative">
          <input
            type="text"
            disabled
            value={formatPhone(user.phoneNumber)}
            className="font-numeric w-full rounded-md border border-line bg-neutral-100/80 px-4 py-3 text-sm text-ink/70 cursor-not-allowed select-none font-medium"
          />
        </div>
        <p className="text-[11px] leading-relaxed text-taupe">
          Your mobile number is your verified unique identity at LIVRA and cannot be changed.
        </p>
      </div>

      {/* ── Full Name (Editable) ── */}
      <div className="space-y-2">
        <label
          htmlFor="name"
          className="block text-xs font-semibold uppercase tracking-wider text-ink/80"
        >
          Full Name
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ayesha Rahman"
          className="w-full rounded-md border border-line bg-white px-4 py-3 text-sm text-ink placeholder-taupe/60 outline-none transition-colors focus:border-ink focus:ring-1 focus:ring-ink"
        />
      </div>

      {/* ── Email Address (Editable) ── */}
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-xs font-semibold uppercase tracking-wider text-ink/80"
        >
          Email Address <span className="text-[11px] font-normal text-taupe">(Optional)</span>
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ayesha@example.com"
          className="w-full rounded-md border border-line bg-white px-4 py-3 text-sm text-ink placeholder-taupe/60 outline-none transition-colors focus:border-ink focus:ring-1 focus:ring-ink"
        />
        <p className="text-[11px] text-taupe">
          Used to send order invoices and delivery receipts.
        </p>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-md p-3 text-xs flex items-center gap-2 ${
            feedback.ok
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {feedback.ok ? <Check className="h-4 w-4" /> : null}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Save Button */}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-7 py-3 text-xs font-semibold tracking-widest uppercase text-cream transition-all duration-300 hover:bg-clay hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Saving Changes…</span>
          </>
        ) : (
          <>
            <Save className="h-3.5 w-3.5" />
            <span>Save Profile</span>
          </>
        )}
      </button>
    </form>
  );
}

