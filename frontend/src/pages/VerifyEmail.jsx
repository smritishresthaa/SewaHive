import React from "react";
import { Link, useNavigate } from "react-router-dom";

export default function VerifyEmail() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center justify-center">
        <div className="w-full rounded-3xl border border-slate-200 bg-white px-6 py-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:px-8 sm:py-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl text-amber-700">
            !
          </div>

          <h1 className="mt-5 text-2xl font-semibold text-slate-900 sm:text-3xl">
            Email verification now uses an OTP code
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
            SewaHive has moved from link-based email verification to a 6-digit one-time code.
            Please return to the verification screen, enter your email address, and submit the
            latest code from your inbox.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate("/verify-info")}
              className="inline-flex min-w-[180px] items-center justify-center rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Go to OTP verification
            </button>

            <Link
              to="/login"
              className="inline-flex min-w-[180px] items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
