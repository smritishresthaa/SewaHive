import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// PUBLIC
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import BrowseServices from "./pages/BrowseServices";
import AllReviews from "./pages/AllReviews";
import PublicProviderProfile from "./pages/PublicProviderProfile";

// ✅ PROVIDER SIGNUP (NEW)
import ProviderSignup from "./pages/provider/ProviderSignup";

// NOTIFICATIONS
import NotificationsPage from "./pages/NotificationsPage";

// BOOKING
import BookingWizard from "./pages/BookingWizard";

// CLIENT
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientProfile from "./pages/client/ClientProfile";
import EditProfile from "./pages/client/EditProfile";
import ClientBookingHistory from "./pages/client/ClientBookingHistory";
import ClientBookingDetail from "./pages/client/ClientBookingDetail";
import ClientTransactions from "./pages/client/ClientTransactions";
import ClientLeaderboard from "./pages/client/ClientLeaderboard";
import PaymentSuccess from "./pages/client/PaymentSuccess";
import PaymentFailure from "./pages/client/PaymentFailure";
import PaymentConfirmation from "./pages/client/PaymentConfirmation";
import PaymentProcessing from "./pages/client/PaymentProcessing";
import BookingChat from "./pages/chat/BookingChat";
import ConversationsList from "./pages/chat/ConversationsList";

// PROVIDER
import ProviderDashboard from "./pages/provider/Dashboard";
import ProviderProfile from "./pages/provider/ProviderProfile";
import SkillProofs from "./pages/provider/SkillProofs";
import ProviderSettings from "./pages/provider/ProviderSettings";
import ProviderVerification from "./pages/provider/VerificationUpload";
import ProviderEmergency from "./pages/provider/EmergencyToggle";
import MyServices from "./pages/provider/MyServices";
import ServiceForm from "./pages/provider/ServiceForm";
import ProviderBookings from "./pages/provider/Bookings";
import ProviderBookingDetail from "./pages/provider/ProviderBookingDetail";
import ProviderReviews from "./pages/provider/ProviderReviews";
import CategoryRequests from "./pages/provider/CategoryRequests";
import ProviderEarnings from "./pages/provider/ProviderEarnings";
import ProviderLeaderboard from "./pages/provider/ProviderLeaderboard";

// AUTH
import VerifyEmail from "./pages/VerifyEmail";
import VerifyInfo from "./pages/VerifyInfo";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyOtp from "./pages/VerifyOtp";
import ResetPassword from "./pages/ResetPassword";

// PROTECTION
import ProtectedRoute from "./components/ProtectedRoute";
import HelpCenter from "./pages/shared/HelpCenter";

export default function App() {
  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Routes>

        {/* ================= PUBLIC ================= */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/services" element={<BrowseServices />} />
        <Route path="/browse" element={<BrowseServices />} />
        <Route path="/reviews" element={<AllReviews />} />
        <Route path="/provider/:providerId" element={<PublicProviderProfile />} />

        {/* ✅ PROVIDER SIGNUP (PUBLIC) */}
        <Route path="/provider/signup" element={<ProviderSignup />} />

        {/* ================= AUTH ================= */}
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/verify-info" element={<VerifyInfo />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ================= HELP ================= */}
        <Route path="/help" element={<HelpCenter />} />

        {/* ================= CLIENT ================= */}}
        <Route
          path="/client/dashboard"
          element={
            <ProtectedRoute role="client">
              <ClientDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/client/profile"
          element={
            <ProtectedRoute role="client">
              <ClientProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/client/profile/edit"
          element={
            <ProtectedRoute role="client">
              <EditProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/client/bookings"
          element={
            <ProtectedRoute role="client">
              <ClientBookingHistory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/client/bookings/:bookingId"
          element={
            <ProtectedRoute role="client">
              <ClientBookingDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/client/transactions"
          element={
            <ProtectedRoute role="client">
              <ClientTransactions />
            </ProtectedRoute>
          }
        />

        <Route
          path="/client/leaderboard"
          element={
            <ProtectedRoute role="client">
              <ClientLeaderboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/client/messages"
          element={
            <ProtectedRoute role="client">
              <ConversationsList />
            </ProtectedRoute>
          }
        />

        {/* ================= PAYMENT ================= */}
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/failure" element={<PaymentFailure />} />
        <Route 
          path="/payment/confirm/:bookingId" 
          element={
            <ProtectedRoute role="client">
              <PaymentConfirmation />
            </ProtectedRoute>
          } 
        />
        <Route path="/payment/processing/:bookingId" element={<PaymentProcessing />} />

        {/* ================= PROVIDER ================= */}
        <Route
          path="/provider"
          element={<Navigate to="/provider/dashboard" replace />}
        />

        <Route
          path="/provider/dashboard"
          element={
            <ProtectedRoute role="provider">
              <ProviderDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/provider/profile"
          element={
            <ProtectedRoute role="provider">
              <ProviderProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/provider/skills"
          element={
            <ProtectedRoute role="provider">
              <SkillProofs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/provider/settings"
          element={
            <ProtectedRoute role="provider">
              <ProviderSettings />
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

        <Route
          path="/provider/services"
          element={
            <ProtectedRoute role="provider">
              <MyServices />
            </ProtectedRoute>
          }
        />

        <Route
          path="/provider/services/create"
          element={
            <ProtectedRoute role="provider">
              <ServiceForm />
            </ProtectedRoute>
          }
        />

        <Route
          path="/provider/services/edit/:id"
          element={
            <ProtectedRoute role="provider">
              <ServiceForm />
            </ProtectedRoute>
          }
        />

        <Route
          path="/provider/category-requests"
          element={
            <ProtectedRoute role="provider">
              <CategoryRequests />
            </ProtectedRoute>
          }
        />

        <Route
          path="/provider/bookings"
          element={
            <ProtectedRoute role="provider">
              <ProviderBookings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/provider/bookings/:bookingId"
          element={
            <ProtectedRoute role="provider">
              <ProviderBookingDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/provider/reviews"
          element={
            <ProtectedRoute role="provider">
              <ProviderReviews />
            </ProtectedRoute>
          }
        />

        <Route
          path="/provider/earnings"
          element={
            <ProtectedRoute role="provider">
              <ProviderEarnings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/provider/leaderboard"
          element={
            <ProtectedRoute role="provider">
              <ProviderLeaderboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/provider/help"
          element={
            <ProtectedRoute role="provider">
              <HelpCenter />
            </ProtectedRoute>
          }
        />

        <Route
          path="/provider/messages"
          element={
            <ProtectedRoute role="provider">
              <ConversationsList />
            </ProtectedRoute>
          }
        />

        {/* ================= NOTIFICATIONS ================= */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        {/* ================= BOOKING ================= */}
        <Route
          path="/booking/:serviceId"
          element={
            <ProtectedRoute role="client">
              <BookingWizard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat/booking/:bookingId"
          element={
            <ProtectedRoute>
              <BookingChat />
            </ProtectedRoute>
          }
        />

        {/* ================= CHAT - ROLE-SPECIFIC ================= */}
        <Route
          path="/client/bookings/:bookingId/chat"
          element={
            <ProtectedRoute role="client">
              <BookingChat />
            </ProtectedRoute>
          }
        />

        <Route
          path="/provider/bookings/:bookingId/chat"
          element={
            <ProtectedRoute role="provider">
              <BookingChat />
            </ProtectedRoute>
          }
        />

        {/* ================= FALLBACK ================= */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
