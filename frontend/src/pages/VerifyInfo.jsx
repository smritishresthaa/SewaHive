// src/pages/VerifyInfo.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../utils/axios";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function VerifyInfo() {
  const query = useQuery();
  const email = query.get("email") || "";

  async function handleResend() {
    try {
      await api.post("/auth/resend-verification", { email });
      alert("Verification email sent again. Please check your inbox.");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Could not resend verification email.";
      alert(msg);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Verify your email
        </h1>

        <p className="mt-3 text-sm text-gray-600">
          We’ve sent a verification link to{" "}
          <span className="font-medium text-gray-900">{email}</span>. <br />
          Please check your inbox (and spam folder) and click the button in the
          email to activate your SewaHive account.
        </p>

        <div className="mt-6 space-y-3">
          <button
            onClick={handleResend}
            className="w-full py-2 rounded-full bg-brand-700 text-white text-sm hover:bg-brand-800"
          >
            Resend verification email
          </button>

          <a
            href="https://mail.google.com"
            target="_blank"
            rel="noreferrer"
            className="w-full inline-flex justify-center py-2 rounded-full border text-sm text-brand-700 border-brand-200 hover:bg-brand-50"
          >
            Open Gmail
          </a>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          Wrong email?{" "}
          <Link to="/signup" className="text-brand-700">
            Sign up again with a different address.
          </Link>
        </div>
      </div>
    </div>
  );
}
