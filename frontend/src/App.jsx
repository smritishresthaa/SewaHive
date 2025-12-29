import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import BookingWizard from "./pages/BookingWizard";

import ClientDashboard from "./pages/client/ClientDashboard";
import ProviderDashboard from "./pages/provider/Dashboard";
import ProviderVerification from "./pages/provider/VerificationUpload";
import ProviderEmergency from "./pages/provider/Emergency";

// ⭐ CLIENT PROFILE
import ClientProfile from "./pages/client/ClientProfile";

// ⭐ EDIT PROFILE
import EditProfile from "./pages/shared/EditProfile";

import ProtectedRoute from "./components/ProtectedRoute";

// ⭐ LAYOUTS (STEP-1.5 FIX)
import ClientLayout from "./layouts/ClientLayout";
import ProviderLayout from "./layouts/ProviderLayout";

// ⭐ Email verification
import VerifyEmail from "./pages/VerifyEmail";
import VerifyInfo from "./pages/VerifyInfo";

// ⭐ Forgot password workflow
import ForgotPassword from "./pages/ForgotPassword";
import VerifyOtp from "./pages/VerifyOtp";
import ResetPassword from "./pages/ResetPassword";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ================= PUBLIC ================= */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* ============== EMAIL VERIFICATION ============== */}
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/verify-info" element={<VerifyInfo />} />

        {/* ============== PASSWORD RESET ============== */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ================= PROFILE ================= */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ClientProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile/edit"
          element={
            <ProtectedRoute>
              <EditProfile />
            </ProtectedRoute>
          }
        />

        {/* ================= CLIENT ================= */}

        {/* 🔁 Redirect legacy route */}
        <Route path="/client" element={<Navigate to="/client/dashboard" />} />

        {/* ✅ CLIENT DASHBOARD (WITH LAYOUT) */}
        <Route
          path="/client/dashboard"
          element={
            <ProtectedRoute role="client">
              <ClientLayout>
                <ClientDashboard />
              </ClientLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/booking/:serviceId"
          element={
            <ProtectedRoute>
              <BookingWizard />
            </ProtectedRoute>
          }
        />

        {/* ================= PROVIDER ================= */}

        {/* 🔁 Redirect legacy route */}
        <Route path="/provider" element={<Navigate to="/provider/dashboard" />} />

        {/* ✅ PROVIDER DASHBOARD (WITH LAYOUT) */}
        <Route
          path="/provider/dashboard"
          element={
            <ProtectedRoute role="provider">
              <ProviderLayout>
                <ProviderDashboard />
              </ProviderLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/provider/verification"
          element={
            <ProtectedRoute role="provider">
              <ProviderVerification />
            </ProtectedRoute>
          }
        />

        <Route
          path="/provider/emergency"
          element={
            <ProtectedRoute role="provider">
              <ProviderEmergency />
            </ProtectedRoute>
          }
        />

        {/* ================= FALLBACK ================= */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </BrowserRouter>
  );
}
