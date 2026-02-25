const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  ensureBookingForChat,
  sendBookingMessage,
  markBookingAsRead,
} = require("./chatService");

let ioInstance = null;

function normalizeError(error) {
  return {
    message: error?.message || "Chat action failed",
    status: error?.status || 500,
  };
}

function initSocket(server, corsOrigins = []) {
  if (ioInstance) {
    return ioInstance;
  }

  ioInstance = new Server(server, {
    cors: {
      origin: corsOrigins,
      methods: ["GET", "POST", "PATCH"],
      credentials: true,
    },
  });

  ioInstance.use(async (socket, next) => {
    try {
      const rawAuthHeader = socket.handshake.headers?.authorization || "";
      const bearerToken = rawAuthHeader.startsWith("Bearer ")
        ? rawAuthHeader.slice(7)
        : null;
      const token = socket.handshake.auth?.token || bearerToken;

      if (!token) {
        return next(new Error("Unauthorized: missing token"));
      }

      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(payload.sub);

      if (!user || user.isDeleted || user.isBlocked) {
        return next(new Error("Unauthorized user"));
      }

      socket.user = {
        id: String(user._id),
        role: user.role,
      };

      return next();
    } catch (error) {
      return next(new Error("Unauthorized: invalid token"));
    }
  });

  ioInstance.on("connection", (socket) => {
    socket.on("join_booking_chat", async (payload = {}, ack) => {
      try {
        const bookingId = payload.bookingId;
        const { booking } = await ensureBookingForChat({
          bookingId,
          user: socket.user,
        });

        const room = `booking:${booking._id}`;
        socket.join(room);

        if (typeof ack === "function") {
          ack({ ok: true, room });
        }
      } catch (error) {
        const normalized = normalizeError(error);
        if (typeof ack === "function") {
          ack({ ok: false, error: normalized });
        } else {
          socket.emit("chat_error", normalized);
        }
      }
    });

    socket.on("send_message", async (payload = {}, ack) => {
      try {
        const bookingId = payload.bookingId;
        const text = payload.text;

        const { booking } = await ensureBookingForChat({
          bookingId,
          user: socket.user,
        });

        const { message } = await sendBookingMessage({
          booking,
          senderId: socket.user.id,
          text,
        });

        const room = `booking:${booking._id}`;
        socket.to(room).emit("new_message", message);

        if (typeof ack === "function") {
          ack({ ok: true, message });
        }
      } catch (error) {
        const normalized = normalizeError(error);
        if (typeof ack === "function") {
          ack({ ok: false, error: normalized });
        } else {
          socket.emit("chat_error", normalized);
        }
      }
    });

    socket.on("mark_read", async (payload = {}, ack) => {
      try {
        const bookingId = payload.bookingId;
        const { booking, participantRole } = await ensureBookingForChat({
          bookingId,
          user: socket.user,
        });

        await markBookingAsRead({
          booking,
          userId: socket.user.id,
          participantRole,
        });

        const room = `booking:${booking._id}`;
        const data = {
          bookingId: String(booking._id),
          userId: String(socket.user.id),
          readAt: new Date().toISOString(),
        };

        ioInstance.to(room).emit("messages_read", data);

        if (typeof ack === "function") {
          ack({ ok: true, ...data });
        }
      } catch (error) {
        const normalized = normalizeError(error);
        if (typeof ack === "function") {
          ack({ ok: false, error: normalized });
        } else {
          socket.emit("chat_error", normalized);
        }
      }
    });
  });

  return ioInstance;
}

function getIO() {
  return ioInstance;
}

module.exports = {
  initSocket,
  getIO,
};
