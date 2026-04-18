// src/components/ProtectedRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { hasRole } from "../utils/roles";

export default function ProtectedRoute({ children, role }) {
  const { user, loading, isAuthenticated, switchRole } = useAuth();
  const location = useLocation();
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function ensureRequiredRole() {
      if (!role || !user || loading || !isAuthenticated) return;
      if (user?.accountStatus === "suspended" || user?.accountStatus === "deleted") return;
      if (user.role === role) return;
      if (!hasRole(user, role)) return;

      setSwitching(true);
      setSwitchError("");

      try {
        await switchRole(role);
      } catch (error) {
        if (!cancelled) {
          setSwitchError(
            error?.response?.data?.message || error?.message || "Unable to switch role"
          );
        }
      } finally {
        if (!cancelled) {
          setSwitching(false);
        }
      }
    }

    ensureRequiredRole();

    return () => {
      cancelled = true;
    };
  }, [role, user, loading, isAuthenticated, switchRole]);

  if (loading || switching) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-10 w-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
          {switching ? (
            <p className="text-sm text-slate-600">Switching account mode…</p>
          ) : null}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user?.accountStatus === "suspended" || user?.accountStatus === "deleted") {
    return <Navigate to="/" replace state={{ accountNotice: user?.suspension || {} }} />;
  }

  if (role && user?.role !== role) {
    if (hasRole(user, role)) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-5 text-center shadow-sm">
            <p className="text-sm font-medium text-red-700">
              {switchError || "We couldn’t switch your account mode automatically."}
            </p>
          </div>
        </div>
      );
    }

    const redirectByRole =
      user?.role === "provider"
        ? "/provider/dashboard"
        : user?.role === "admin"
        ? "/admin/dashboard"
        : "/client/dashboard";

    return <Navigate to={redirectByRole} replace />;
  }

  return children;
}
