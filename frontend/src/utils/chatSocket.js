import { io } from "socket.io-client";

function getSocketBaseUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  return apiUrl.replace(/\/api\/?$/, "");
}

let _socket = null;
let _token = null;
let _refCount = 0;

/**
 * Get a shared socket.io connection.
 * Multiple callers share the same underlying socket — reference-counted
 * so it only truly disconnects when all callers release it.
 */
export function connectChatSocket(token) {
  // If token changed or socket is dead, create a new one
  if (!_socket || _token !== token || _socket.disconnected) {
    if (_socket) {
      _socket.disconnect();
    }
    _socket = io(getSocketBaseUrl(), {
      auth: { token },
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
    _token = token;
    _refCount = 0;
  }
  _refCount++;
  return _socket;
}

/**
 * Release a reference to the shared socket.
 * Only disconnects when all callers have released.
 */
export function releaseChatSocket() {
  _refCount = Math.max(0, _refCount - 1);
  if (_refCount === 0 && _socket) {
    _socket.disconnect();
    _socket = null;
    _token = null;
  }
}
