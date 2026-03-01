const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Booking = require("../models/Booking");
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

    /* ─── Live Location Tracking ─────────────────────────── */

    // Provider joins tracking room (same as booking room, reusable)
    socket.on("join_tracking", async (payload = {}, ack) => {
      try {
        const { bookingId } = payload;
        if (!bookingId) throw new Error("bookingId required");

        const booking = await Booking.findById(bookingId).lean();
        if (!booking) throw new Error("Booking not found");

        // Both provider and client can join the tracking room
        const userId = socket.user.id;
        const isProvider = String(booking.providerId) === userId;
        const isClient = String(booking.clientId) === userId;

        if (!isProvider && !isClient) {
          throw new Error("Not authorized for this booking");
        }

        const room = `tracking:${booking._id}`;
        socket.join(room);

        if (typeof ack === "function") {
          ack({ ok: true, room });
        }
      } catch (error) {
        const normalized = normalizeError(error);
        if (typeof ack === "function") {
          ack({ ok: false, error: normalized });
        } else {
          socket.emit("tracking_error", normalized);
        }
      }
    });

    // Provider emits their GPS location
    socket.on("provider_location_update", async (payload = {}) => {
      try {
        const { bookingId, lat, lng, heading, speed } = payload;
        if (!bookingId || lat == null || lng == null) return;

        const booking = await Booking.findById(bookingId).select("providerId status").lean();
        if (!booking) return;

        // Only the assigned provider can update location
        if (String(booking.providerId) !== socket.user.id) return;

        // Only broadcast when provider is en route
        if (booking.status !== "provider_en_route") return;

        // Persist latest location (fire-and-forget for speed)
        Booking.updateOne(
          { _id: bookingId },
          {
            $set: {
              "providerLiveLocation.lat": lat,
              "providerLiveLocation.lng": lng,
              "providerLiveLocation.heading": heading || null,
              "providerLiveLocation.speed": speed || null,
              "providerLiveLocation.updatedAt": new Date(),
            },
          }
        ).catch(() => {});

        // Broadcast to client in the tracking room
        const room = `tracking:${booking._id}`;
        socket.to(room).emit("live_location", {
          bookingId: String(booking._id),
          lat,
          lng,
          heading: heading || null,
          speed: speed || null,
          timestamp: Date.now(),
        });
      } catch (_) {
        // Silently ignore location errors to avoid spamming
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
