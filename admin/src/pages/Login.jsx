import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/axios";
import toast from "react-hot-toast";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@sewahive.com");
  const [password, setPassword] = useState("Admin@1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });

      const { accessToken, user } = res.data;

      if (user.role !== "admin") {
        throw new Error("Access denied: Not an admin account");
      }

      localStorage.setItem("adminAccessToken", accessToken);
      toast.success("Admin logged in successfully!");
      navigate("/dashboard");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err.message ||
        "Admin login failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-600 to-brand-700 bg-clip-text text-transparent">SewaHive</h1>
          </div>
          <p className="text-brand-700 font-semibold text-lg">Admin Control Center</p>
          <p className="text-gray-600 text-sm mt-1">Manage your platform with power and precision</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-brand-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Login</h2>
          <p className="text-gray-600 text-sm mb-6">Enter your credentials to access the admin panel</p>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Email Address
              </label>
              <input
                type="email"
                placeholder="admin@sewahive.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg py-3 px-4 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg py-3 px-4 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition"
                required
              />
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-700 text-white font-bold py-3 rounded-lg hover:from-brand-700 hover:to-brand-800 transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? "Logging in..." : "Login as Admin"}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 bg-brand-50 border border-brand-200 rounded-lg">
            <p className="text-xs font-semibold text-brand-700 uppercase mb-3">Demo Credentials</p>
            <div className="space-y-2 text-sm">
              <p className="text-gray-700"><span className="font-semibold">Email:</span> admin@sewahive.com</p>
              <p className="text-gray-700"><span className="font-semibold">Password:</span> Admin@1234</p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-600 mt-6">
            This is a secure admin panel. Credentials are required to proceed.
          </p>
        </div>
      </div>
    </div>
  );
}

