import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../utils/axios";

export default function AdminProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function check() {
      const token = localStorage.getItem("adminAccessToken");
      if (!token) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      try {
        const res = await api.get("/auth/me");
        if (res.data.user.role === "admin") {
          setAllowed(true);
        } else {
          setAllowed(false);
        }
      } catch {
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    }

    check();
  }, []);

  if (loading) return null;
  if (!allowed) return <Navigate to="/login" />;

  return children;
}
