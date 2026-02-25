// utils/notificationStream.js
const clients = new Map(); // userId -> Set(res)
const roles = new Map(); // userId -> role

function addClient(userId, role, res) {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId).add(res);
  if (role) roles.set(userId, role);
}

function removeClient(userId, res) {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) {
    clients.delete(userId);
    roles.delete(userId);
  }
}

function send(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function emitToUser(userId, payload) {
  const set = clients.get(userId);
  if (!set) return;
  set.forEach((res) => {
    send(res, payload);
  });
}

function broadcastToRole(role, payload) {
  roles.forEach((userRole, userId) => {
    if (userRole === role) {
      emitToUser(userId, payload);
    }
  });
}

module.exports = {
  addClient,
  removeClient,
  emitToUser,
  broadcastToRole,
};
