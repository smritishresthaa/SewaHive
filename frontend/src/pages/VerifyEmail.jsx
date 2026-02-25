// src/pages/VerifyEmail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../utils/axios";

export default function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("loading"); // "loading" | "success" | "error"
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function verify() {
      try {
        const res = await api.get(`/auth/verify-email/${token}`);
        setStatus("success");
        setMessage(res.data?.message || "Email verified successfully!");

        // Small delay then go to login
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } catch (err) {
        setStatus("error");
        const msg =
          err?.response?.data?.message ||
          "Verification link is invalid or has expired.";
        setMessage(msg);
      }
    }

    if (token) {
      verify();
    }
  }, [token, navigate]);

  const isLoading = status === "loading";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 text-center">
        {status === "success" && (
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-green-600 text-2xl">✓</span>
          </div>
        )}

        {status === "error" && (
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-red-600 text-2xl">!</span>
          </div>
        )}

        {status === "loading" && (
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center">
            <span className="text-brand-700 text-xl">⏳</span>
          </div>
        )}

        <h1 className="text-2xl font-semibold text-gray-900">
          {status === "success" && "Email Verified 🎉"}
          {status === "error" && "Verification Problem"}
          {status === "loading" && "Verifying your email…"}
        </h1>

        <p className="mt-3 text-sm text-gray-600">
          {isLoading
            ? "Please wait while we confirm your verification link."
            : message}
        </p>

        {!isLoading && (
          <div className="mt-6">
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-brand-700 text-white text-sm hover:bg-brand-800"
            >
              Go to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
