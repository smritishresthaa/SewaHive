function normalizeRoles(roles = [], primaryRole = "client") {
  const set = new Set();
  const add = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (["client", "provider", "admin"].includes(normalized)) set.add(normalized);
  };

  (Array.isArray(roles) ? roles : [roles]).forEach(add);
  add(primaryRole);

  if (set.has("provider")) {
    set.add("client");
  }

  if (set.has("admin")) {
    return ["admin"];
  }

  if (!set.size) {
    set.add("client");
  }

  const ordered = [];
  if (set.has("client")) ordered.push("client");
  if (set.has("provider")) ordered.push("provider");
  return ordered;
}

function hasRole(userOrRoles, role) {
  const targetRole = String(role || "").trim().toLowerCase();
  if (!["client", "provider", "admin"].includes(targetRole)) return false;

  if (Array.isArray(userOrRoles)) {
    return normalizeRoles(userOrRoles).includes(targetRole);
  }

  if (!userOrRoles) return false;
  return normalizeRoles(userOrRoles.roles, userOrRoles.role).includes(targetRole);
}

function isProviderQuery() {
  return {
    $or: [{ role: "provider" }, { roles: "provider" }],
  };
}

module.exports = {
  normalizeRoles,
  hasRole,
  isProviderQuery,
};