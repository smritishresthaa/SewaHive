// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, role }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // -------------------------------
  // 1. Wait while auth restores
  // -------------------------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // -------------------------------
  // 2. Not logged in → login page
  // -------------------------------
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // -------------------------------
  // 3. Role protection
  // -------------------------------
  if (role && user?.role !== role) {
    const redirectByRole =
      user?.role === "client"
        ? "/client/dashboard"
        : user?.role === "provider"
        ? "/provider/dashboard"
        : "/";

    return <Navigate to={redirectByRole} replace />;
  }

  // -------------------------------
  // 4. Access granted
  // -------------------------------
  return children;
}
