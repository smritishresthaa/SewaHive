import { io } from "socket.io-client";

function getSocketBaseUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  return apiUrl.replace(/\/api\/?$/, "");
}

export function connectChatSocket(token) {
  return io(getSocketBaseUrl(), {
    auth: { token },
    transports: ["websocket", "polling"],
    withCredentials: true,
  });
}
