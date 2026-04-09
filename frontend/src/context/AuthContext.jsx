import { createContext, useContext, useEffect, useState } from "react";
import api from "../utils/axios";

const AuthContext = createContext(null);
const ACCOUNT_NOTICE_KEY = "sewahiveAccountNotice";

function buildDefaultNotifications(role = "client") {
  return {
    bookingUpdates: true,
    messages: true,
    reviews: true,
    email: true,
    emergencyAlerts: role === "provider",
  };
}

const defaultAddress = {
  country: "",
  city: "",
  postalCode: "",
  area: "",
};

function normalizeUserShape(userFromServer) {
  const user = { ...(userFromServer || {}) };

  user.role = user.role || "client";
  user.profile = user.profile || {};
  user.profile.address = user.profile.address || { ...defaultAddress };
  user.location = user.location || { type: "Point", coordinates: [0, 0] };
  if (!Array.isArray(user.location.coordinates)) {
    user.location.coordinates = [0, 0];
  }

  user.providerDetails = user.providerDetails || {};
  user.settings = user.settings || {};
  user.settings.notifications = {
    ...buildDefaultNotifications(user.role),
    ...(user.settings.notifications || {}),
  };
  user.accountStatus = user.accountStatus || "active";
  user.suspension = user.suspension || {};
  user.onboarding = user.onboarding || {};

  return user;
}

function persistAccountNotice(payload) {
  if (!payload) {
    localStorage.removeItem(ACCOUNT_NOTICE_KEY);
    return;
  }
  localStorage.setItem(ACCOUNT_NOTICE_KEY, JSON.stringify(payload));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function login(email, password) {
    try {
      const res = await api.post("/auth/login", { email, password });
      const token = res.data?.accessToken;
      const loggedInUser = normalizeUserShape(res.data?.user);
      if (!token || !loggedInUser) throw new Error("Invalid server response");
      localStorage.setItem("accessToken", token);
      persistAccountNotice(null);
      setUser(loggedInUser);
      return loggedInUser;
    } catch (err) {
      const meta = err?.response?.data?.meta;
      if (meta) persistAccountNotice(meta);
      throw err;
    }
  }

  async function loginWithGoogle(credential, role = "client") {
    try {
      const res = await api.post("/auth/google", { credential, role });
      const token = res.data?.accessToken;
      const loggedInUser = normalizeUserShape(res.data?.user);
      if (!token || !loggedInUser) throw new Error("Error retrieving a token.");
      localStorage.setItem("accessToken", token);
      persistAccountNotice(null);
      setUser(loggedInUser);
      return loggedInUser;
    } catch (err) {
      const meta = err?.response?.data?.meta;
      if (meta) persistAccountNotice(meta);
      throw err;
    }
  }

  async function fetchUser() {
    try {
      const res = await api.get("/auth/me");
      const normalized = normalizeUserShape(res.data.user);
      persistAccountNotice(null);
      setUser(normalized);
      return normalized;
    } catch (err) {
      const meta = err?.response?.data?.meta;
      if (meta) persistAccountNotice(meta);
      localStorage.removeItem("accessToken");
      setUser(null);
      throw err;
    }
  }

  function updateUser(updatedUser) {
    setUser((prev) =>
      normalizeUserShape({
        ...prev,
        ...updatedUser,
        profile: { ...prev?.profile, ...updatedUser?.profile },
        providerDetails: { ...prev?.providerDetails, ...updatedUser?.providerDetails },
        settings: {
          ...prev?.settings,
          ...updatedUser?.settings,
          notifications: {
            ...buildDefaultNotifications(updatedUser?.role || prev?.role || "client"),
            ...prev?.settings?.notifications,
            ...updatedUser?.settings?.notifications,
          },
        },
      })
    );
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {}
    localStorage.removeItem("accessToken");
    setUser(null);
  }

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setLoading(false);
      return;
    }
    fetchUser().finally(() => setLoading(false));
  }, []);

  function getRedirectPath(role, accountUser = user) {
    const currentUser = normalizeUserShape(accountUser || { role });
    if (currentUser.accountStatus === "suspended" || currentUser.accountStatus === "deleted") {
      return "/";
    }
    if (currentUser.onboarding?.nextStep) return currentUser.onboarding.nextStep;
    if (role === "provider") return "/provider/dashboard";
    if (role === "admin") return "/admin/dashboard";
    return "/client/dashboard";
  }

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
