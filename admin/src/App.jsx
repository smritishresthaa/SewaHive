import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AdminLayout from "./layouts/AdminLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Leaderboard from "./pages/Leaderboard";
import Users from "./pages/Users";
import Services from "./pages/Services";
import Bookings from "./pages/Bookings";
import Reviews from "./pages/Reviews";
import Payments from "./pages/Payments";
import Settings from "./pages/Settings";
import Verification from "./pages/Verification";
import Categories from "./pages/Categories";
import CategoryRequests from "./pages/CategoryRequests";
import Disputes from "./pages/Disputes";
import DisputeDetail from "./pages/DisputeDetail";
import SkillReviews from "./pages/SkillReviews";

import AdminProtectedRoute from "./components/AdminProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Login - No Layout */}
          <Route path="/login" element={<Login />} />

          {/* All other routes with Admin Layout */}
          <Route
            element={
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/verification" element={<Verification />} />
            <Route path="/skill-reviews" element={<SkillReviews />} />
            <Route path="/users" element={<Users />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/category-requests" element={<CategoryRequests />} />
            <Route path="/services" element={<Services />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/disputes" element={<Disputes />} />
            <Route path="/disputes/:id" element={<DisputeDetail />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
