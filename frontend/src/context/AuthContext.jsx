import { createContext, useContext, useEffect, useState } from "react";
import api from "../utils/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* -----------------------------------------------------
     LOGIN (EMAIL + PASSWORD)
  ----------------------------------------------------- */
  async function login(email, password) {
    const res = await api.post("/auth/login", { email, password });

    const token = res.data?.accessToken;
    const loggedInUser = res.data?.user;

    if (!token || !loggedInUser) {
      throw new Error("Invalid server response");
    }

    localStorage.setItem("accessToken", token);
    setUser(loggedInUser);

    return loggedInUser;
  }

  /* -----------------------------------------------------
     GOOGLE LOGIN
  ----------------------------------------------------- */
  async function loginWithGoogle(credential, role = "client") {
    const res = await api.post("/auth/google", { credential, role });

    const token = res.data?.accessToken;
    const loggedInUser = res.data?.user;

    if (!token || !loggedInUser) {
      throw new Error("Error retrieving a token.");
    }

    localStorage.setItem("accessToken", token);
    setUser(loggedInUser);

    return loggedInUser;
  }

  /* -----------------------------------------------------
     FETCH USER (USED ON REFRESH)
     ✅ DEFENSIVE NORMALIZATION
  ----------------------------------------------------- */
  async function fetchUser() {
    try {
      const res = await api.get("/auth/me");

      const user = res.data.user;

      // 🔒 normalize shape (VERY IMPORTANT)
      user.role = user.role || "client";
      user.profile = user.profile || {};
      user.profile.address = user.profile.address || {
        country: "",
        city: "",
        postalCode: "",
        area: "",
      };

      user.location = user.location || { type: "Point", coordinates: [0, 0] };
      if (!Array.isArray(user.location.coordinates)) {
        user.location.coordinates = [0, 0];
      }

      setUser(user);
    } catch (err) {
      localStorage.removeItem("accessToken");
      setUser(null);
    }
  }

  /* -----------------------------------------------------
     UPDATE USER AFTER PROFILE SAVE
     ✅ MERGE (DO NOT REPLACE)
  ----------------------------------------------------- */
  function updateUser(updatedUser) {
    setUser((prev) => ({
      ...prev,
      ...updatedUser,
      profile: {
        ...prev?.profile,
        ...updatedUser?.profile,
      },
    }));
  }

  /* -----------------------------------------------------
     LOGOUT
  ----------------------------------------------------- */
  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // backend logout optional
    }

    localStorage.removeItem("accessToken");
    setUser(null);
  }

  /* -----------------------------------------------------
     RUN ON APP LOAD
  ----------------------------------------------------- */
  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      setLoading(false);
      return;
    }

    fetchUser().finally(() => setLoading(false));
  }, []);

  function getRedirectPath(role) {
    if (role === "provider") return "/provider/dashboard";
    if (role === "admin") return "/admin/dashboard";
    return "/client/dashboard";
  }

  /* -----------------------------------------------------
     CONTEXT VALUE
  ----------------------------------------------------- */
  const value = {
    user,
    setUser,
    updateUser,
    loading,
    login,
    loginWithGoogle,
    logout,
    getRedirectPath,
    fetchUser,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
