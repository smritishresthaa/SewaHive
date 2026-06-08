import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../utils/axios";
import { normalizeRoles, hasRole } from "../utils/roles";

const AuthContext = createContext(null);
const ACCOUNT_NOTICE_KEY = "sewahiveAccountNotice";

function buildDefaultNotifications(role = "client", roles = []) {
  return {
    bookingUpdates: true,
    messages: true,
    reviews: true,
    email: true,
    emergencyAlerts: hasRole({ role, roles }, "provider"),
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

  user.roles = normalizeRoles(user.roles, user.role || "client");
  user.role = hasRole(user, user.role) ? user.role : user.roles[0] || "client";
  user.profile = user.profile || {};
  user.profile.address = user.profile.address || { ...defaultAddress };
  user.location = user.location || { type: "Point", coordinates: [0, 0] };
  if (!Array.isArray(user.location.coordinates)) {
    user.location.coordinates = [0, 0];
  }

  user.providerDetails = user.providerDetails || {};
  user.settings = user.settings || {};
  user.settings.notifications = {
    ...buildDefaultNotifications(user.role, user.roles),
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

  async function login(email, password, role = null) {
    try {
      const res = await api.post("/auth/login", { email, password, role });
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
            ...buildDefaultNotifications(updatedUser?.role || prev?.role || "client", updatedUser?.roles || prev?.roles || []),
            ...prev?.settings?.notifications,
            ...updatedUser?.settings?.notifications,
          },
        },
      })
    );
  }


  async function switchRole(role) {
    const normalizedRole = String(role || "").trim().toLowerCase();
    const currentUser = normalizeUserShape(user || {});

    if (!normalizedRole || !hasRole(currentUser, normalizedRole)) {
      throw new Error("Requested role is not enabled for this account");
    }

    if (currentUser.role === normalizedRole) {
      return currentUser;
    }

    const res = await api.post("/auth/switch-role", { role: normalizedRole });
    const token = res.data?.accessToken;
    const switchedUser = normalizeUserShape(res.data?.user);

    if (!token || !switchedUser) {
      throw new Error("Invalid server response");
    }

    localStorage.setItem("accessToken", token);
    persistAccountNotice(null);
    setUser(switchedUser);
    return switchedUser;
  }

  async function enableProviderCapability() {
    const res = await api.post("/auth/enable-provider");
    const token = res.data?.accessToken;
    const upgradedUser = normalizeUserShape(res.data?.user);

    if (!token || !upgradedUser) {
      throw new Error("Invalid server response");
    }

    localStorage.setItem("accessToken", token);
    persistAccountNotice(null);
    setUser(upgradedUser);
    return upgradedUser;
  }

  const markWalkthroughStatus = useCallback(async (role, status) => {
    const normalizedRole = String(role || user?.role || "client").trim().toLowerCase();
    const normalizedStatus = String(status || "").trim().toLowerCase();

    if (!["client", "provider"].includes(normalizedRole)) {
      throw new Error("Invalid onboarding role");
    }

    if (!["completed", "skipped"].includes(normalizedStatus)) {
      throw new Error("Invalid onboarding status");
    }

    const res = await api.post("/auth/onboarding/walkthrough", {
      role: normalizedRole,
      status: normalizedStatus,
    });

    const updatedUser = normalizeUserShape(res.data?.user);
    setUser(updatedUser);
    return updatedUser;
  }, [user]);

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
    const resolvedRole = String(role || currentUser.role || "client").trim().toLowerCase();

    if (currentUser.accountStatus === "suspended" || currentUser.accountStatus === "deleted") {
      return "/";
    }

    if (resolvedRole === "provider") return "/provider/dashboard";
    if (resolvedRole === "admin") return "/admin/dashboard";
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
        switchRole,
        enableProviderCapability,
        markWalkthroughStatus,
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
