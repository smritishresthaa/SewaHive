// // routes/disputes.js
// const express = require("express");
// const { authGuard, roleGuard } = require("../middleware/auth");
// const Dispute = require("../models/Dispute");
// const Booking = require("../models/Booking");
// const Payment = require("../models/Payment");
// const ProviderWallet = require("../models/ProviderWallet");
// const disputeUpload = require("../middleware/disputeUpload");
// const {
//   createNotification,
//   notifyAllAdmins,
// } = require("../utils/createNotification");

// const router = express.Router();

// function toAmount(value) {
//   const num = Number(value || 0);
//   return Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
// }

// function clamp(value, min, max) {
//   return Math.min(Math.max(value, min), max);
// }

// function bookingShortCode(bookingId) {
//   return String(bookingId || "").slice(-6).toUpperCase();
// }

// function buildResolutionNotification({
//   resolutionType,
//   reason,
//   role,
//   bookingId,
//   refundAmount,
//   providerAmount,
// }) {
//   const bookingCode = bookingShortCode(bookingId);
//   const trimmedReason = String(reason || "").trim();
//   const reasonText = trimmedReason ? ` Reason: ${trimmedReason}` : "";

//   switch (resolutionType) {
//     case "refund_full":
//       return {
//         title:
//           role === "provider"
//             ? "Dispute resolved - Full refund"
//             : "Dispute resolved - Full refund approved",
//         message:
//           role === "provider"
//             ? `The dispute for Booking #${bookingCode} has been resolved. The client will receive a full refund. No provider payout will be released.${reasonText}`
//             : `Your dispute for Booking #${bookingCode} has been resolved. A full refund has been approved.${reasonText}`,
//       };

//     case "refund_partial":
//       return {
//         title:
//           role === "provider"
//             ? "Dispute resolved - Partial settlement"
//             : "Dispute resolved - Partial refund approved",
//         message:
//           role === "provider"
//             ? `The dispute for Booking #${bookingCode} has been resolved. Client refund: NPR ${toAmount(
//                 refundAmount
//               ).toLocaleString()}. Provider payout: NPR ${toAmount(
//                 providerAmount
//               ).toLocaleString()}.${reasonText}`
//             : `Your dispute for Booking #${bookingCode} has been resolved. A partial refund of NPR ${toAmount(
//                 refundAmount
//               ).toLocaleString()} has been approved.${reasonText}`,
//       };

//     case "booking_valid":
//       return {
//         title: "Dispute resolved",
//         message:
//           role === "provider"
//             ? `The dispute for Booking #${bookingCode} was resolved in your favor. Escrow remains secured and the booking can continue.${reasonText}`
//             : `Your dispute for Booking #${bookingCode} has been resolved. The booking remains valid and escrow stays secured for the booking flow.${reasonText}`,
//       };

//     case "reservice":
//       return {
//         title: "Dispute resolved - Reservice required",
//         message:
//           role === "provider"
//             ? `The dispute for Booking #${bookingCode} has been resolved. You must complete the service again before payment can be released.${reasonText}`
//             : `Your dispute for Booking #${bookingCode} has been resolved. The provider must complete the service again before payment can be released.${reasonText}`,
//       };

//     case "warning":
//       return {
//         title: "Dispute resolved",
//         message:
//           role === "provider"
//             ? `The dispute for Booking #${bookingCode} has been resolved with a warning. Escrow remains secured and booking flow may continue.${reasonText}`
//             : `Your dispute for Booking #${bookingCode} has been resolved with a warning.${reasonText}`,
//       };

//     default:
//       return {
//         title: "Dispute resolved",
//         message: `Your dispute for Booking #${bookingCode} has been resolved.${reasonText}`,
//       };
//   }
// }

// async function getOrCreateProviderWallet(providerId) {
//   let wallet = await ProviderWallet.findOne({ providerId });

//   if (!wallet) {
//     wallet = await ProviderWallet.create({
//       providerId,
//       totalEarned: 0,
//       pendingBalance: 0,
//       availableBalance: 0,
//       totalWithdrawn: 0,
//       totalRefunded: 0,
//       transactions: [],
//     });
//   }

//   return wallet;
// }

// function buildPaymentResolutionSnapshot(payment, extra = {}) {
//   return {
//     ...(payment.receipt || {}),
//     disputeResolution: {
//       ...(payment.receipt?.disputeResolution || {}),
//       ...extra,
//       resolvedAt: new Date(),
//     },
//   };
// }

// async function restorePaymentsToHeld(booking, dispute, adminId, note) {
//   const disputedPayments = await Payment.find({
//     bookingId: booking._id,
//     status: { $in: ["DISPUTED", "FUNDS_HELD"] },
//   }).sort({ createdAt: 1 });

//   let totalHeld = 0;

//   for (const payment of disputedPayments) {
//     payment.status = "FUNDS_HELD";
//     payment.disputeId = dispute._id;
//     payment.disputeReason = dispute.category || dispute.reason || "";
//     payment.receipt = buildPaymentResolutionSnapshot(payment, {
//       action: "restored_to_held",
//       note,
//       adminId,
//     });
//     await payment.save();
//     totalHeld += toAmount(payment.amount);
//   }

//   booking.paymentStatus = "funds_held";
//   booking.pricing = booking.pricing || {};
//   booking.pricing.escrowHeldAmount = totalHeld;
//   booking.pricing.additionalEscrowRequired = Math.max(
//     0,
//     toAmount(
//       booking.pricing?.finalApprovedPrice ||
//         booking.pricing?.finalPrice ||
//         booking.totalAmount
//     ) - totalHeld
//   );

//   booking.pricing.paymentAuditTrail = booking.pricing.paymentAuditTrail || [];
//   booking.pricing.paymentAuditTrail.push({
//     event: "escrow_adjusted",
//     amount: totalHeld,
//     finalPayment: toAmount(
//       booking.pricing?.finalApprovedPrice ||
//         booking.pricing?.finalPrice ||
//         booking.totalAmount
//     ),
//     approvedAdjustmentsTotal: toAmount(
//       booking.pricing?.approvedAdjustmentsTotal || 0
//     ),
//     approvedExtraTimeCost: toAmount(
//       booking.pricing?.approvedExtraTimeCost || 0
//     ),
//     actorId: adminId,
//     at: new Date(),
//     note,
//   });

//   return { disputedPayments, totalHeld };
// }

// async function applyFullRefundResolution({ booking, dispute, adminId, reason }) {
//   const payments = await Payment.find({
//     bookingId: booking._id,
//     status: { $in: ["DISPUTED", "FUNDS_HELD"] },
//   }).sort({ createdAt: 1 });

//   const totalHeld = payments.reduce((sum, p) => sum + toAmount(p.amount), 0);

//   for (const payment of payments) {
//     payment.status = "REFUNDED";
//     payment.refundedAt = new Date();
//     payment.refundRequested = false;
//     payment.disputeId = dispute._id;
//     payment.disputeReason = reason || dispute.category || dispute.reason || "";
//     payment.providerEarnings = 0;
//     payment.receipt = buildPaymentResolutionSnapshot(payment, {
//       action: "full_refund",
//       refundAmount: toAmount(payment.amount),
//       providerPayout: 0,
//       adminId,
//       reason,
//     });
//     await payment.save();
//   }

//   const wallet = await getOrCreateProviderWallet(booking.providerId);

//   if (totalHeld > 0) {
//     const deducted = Math.min(toAmount(wallet.pendingBalance), totalHeld);
//     wallet.pendingBalance = toAmount(wallet.pendingBalance - deducted);
//     wallet.totalRefunded = toAmount(wallet.totalRefunded + totalHeld);

//     wallet.transactions.push({
//       type: "REFUND",
//       amount: totalHeld,
//       description: `Full dispute refund for booking #${bookingShortCode(
//         booking._id
//       )}`,
//       bookingId: booking._id,
//       paymentId: payments[0]?._id,
//       status: "COMPLETED",
//       createdAt: new Date(),
//     });

//     await wallet.save();
//   }

//   booking.status = "resolved_refunded";
//   booking.paymentStatus = "refunded";
//   booking.disputeId = null;

//   booking.pricing = booking.pricing || {};
//   booking.pricing.escrowHeldAmount = 0;
//   booking.pricing.additionalEscrowRequired = 0;
//   booking.pricing.paymentAuditTrail = booking.pricing.paymentAuditTrail || [];
//   booking.pricing.paymentAuditTrail.push({
//     event: "escrow_adjusted",
//     amount: totalHeld,
//     finalPayment: 0,
//     approvedAdjustmentsTotal: toAmount(
//       booking.pricing?.approvedAdjustmentsTotal || 0
//     ),
//     approvedExtraTimeCost: toAmount(
//       booking.pricing?.approvedExtraTimeCost || 0
//     ),
//     actorId: adminId,
//     at: new Date(),
//     note: `Full refund issued via dispute resolution. Reason: ${reason || "N/A"}`,
//   });

//   return {
//     totalHeld,
//     refundAmount: totalHeld,
//     providerAmount: 0,
//   };
// }

// async function applyPartialRefundResolution({
//   booking,
//   dispute,
//   adminId,
//   refundAmount,
//   reason,
// }) {
//   const payments = await Payment.find({
//     bookingId: booking._id,
//     status: { $in: ["DISPUTED", "FUNDS_HELD"] },
//   }).sort({ createdAt: 1 });

//   const totalHeld = payments.reduce((sum, p) => sum + toAmount(p.amount), 0);
//   const safeRefund = clamp(toAmount(refundAmount), 0, totalHeld);
//   const providerAmount = toAmount(totalHeld - safeRefund);

//   let accumulatedRefund = 0;

//   for (let i = 0; i < payments.length; i += 1) {
//     const payment = payments[i];
//     const amount = toAmount(payment.amount);
//     const ratio = totalHeld > 0 ? amount / totalHeld : 0;

//     let paymentRefund = 0;
//     if (i === payments.length - 1) {
//       paymentRefund = toAmount(safeRefund - accumulatedRefund);
//     } else {
//       paymentRefund = toAmount(safeRefund * ratio);
//       accumulatedRefund += paymentRefund;
//     }

//     const paymentProviderPayout = toAmount(amount - paymentRefund);

//     payment.status =
//       paymentRefund > 0 && paymentProviderPayout > 0
//         ? "PARTIALLY_REFUNDED"
//         : paymentRefund > 0
//         ? "REFUNDED"
//         : "RELEASED";

//     payment.refundedAt = paymentRefund > 0 ? new Date() : payment.refundedAt;
//     payment.releasedAt =
//       paymentProviderPayout > 0 ? new Date() : payment.releasedAt;
//     payment.escrowReleasedAt =
//       paymentProviderPayout > 0 ? new Date() : payment.escrowReleasedAt;
//     payment.disputeId = dispute._id;
//     payment.disputeReason = reason || dispute.category || dispute.reason || "";
//     payment.providerEarnings = paymentProviderPayout;
//     payment.refundRequested = false;
//     payment.receipt = buildPaymentResolutionSnapshot(payment, {
//       action: "partial_refund",
//       refundAmount: paymentRefund,
//       providerPayout: paymentProviderPayout,
//       adminId,
//       reason,
//     });

//     await payment.save();
//   }

//   const wallet = await getOrCreateProviderWallet(booking.providerId);

//   if (totalHeld > 0) {
//     const deducted = Math.min(toAmount(wallet.pendingBalance), totalHeld);
//     wallet.pendingBalance = toAmount(wallet.pendingBalance - deducted);

//     if (providerAmount > 0) {
//       wallet.availableBalance = toAmount(
//         wallet.availableBalance + providerAmount
//       );
//       wallet.totalEarned = toAmount(wallet.totalEarned + providerAmount);

//       wallet.transactions.push({
//         type: "DEPOSIT",
//         amount: providerAmount,
//         description: `Partial dispute payout for booking #${bookingShortCode(
//           booking._id
//         )}`,
//         bookingId: booking._id,
//         paymentId: payments[0]?._id,
//         status: "COMPLETED",
//         createdAt: new Date(),
//       });
//     }

//     if (safeRefund > 0) {
//       wallet.totalRefunded = toAmount(wallet.totalRefunded + safeRefund);

//       wallet.transactions.push({
//         type: "REFUND",
//         amount: safeRefund,
//         description: `Partial dispute refund for booking #${bookingShortCode(
//           booking._id
//         )}`,
//         bookingId: booking._id,
//         paymentId: payments[0]?._id,
//         status: "COMPLETED",
//         createdAt: new Date(),
//       });
//     }

//     await wallet.save();
//   }

//   booking.status = "resolved_refunded";
//   booking.paymentStatus = "partially_refunded";
//   booking.disputeId = null;

//   booking.pricing = booking.pricing || {};
//   booking.pricing.escrowHeldAmount = 0;
//   booking.pricing.additionalEscrowRequired = 0;
//   booking.pricing.paymentAuditTrail = booking.pricing.paymentAuditTrail || [];
//   booking.pricing.paymentAuditTrail.push({
//     event: "escrow_adjusted",
//     amount: totalHeld,
//     finalPayment: providerAmount,
//     approvedAdjustmentsTotal: toAmount(
//       booking.pricing?.approvedAdjustmentsTotal || 0
//     ),
//     approvedExtraTimeCost: toAmount(
//       booking.pricing?.approvedExtraTimeCost || 0
//     ),
//     actorId: adminId,
//     at: new Date(),
//     note: `Partial refund via dispute resolution. Client refund: NPR ${safeRefund}. Provider payout: NPR ${providerAmount}. Reason: ${
//       reason || "N/A"
//     }`,
//   });

//   return {
//     totalHeld,
//     refundAmount: safeRefund,
//     providerAmount,
//   };
// }

// async function applyResumeResolution({
//   booking,
//   dispute,
//   adminId,
//   resolutionType,
//   reason,
// }) {
//   const { totalHeld } = await restorePaymentsToHeld(
//     booking,
//     dispute,
//     adminId,
//     resolutionType === "reservice"
//       ? "Escrow restored to held after reservice resolution"
//       : "Escrow restored to held after dispute resolution"
//   );

//   booking.disputeId = null;

//   if (resolutionType === "reservice") {
//     booking.status = "confirmed";
//     booking.providerCompletedAt = null;
//     booking.completedAt = null;
//     booking.clientConfirmedAt = null;
//     booking.paymentStatus = "funds_held";
//   } else if (booking.providerCompletedAt) {
//     booking.status = "pending-completion";
//     booking.paymentStatus = "funds_held";
//   } else {
//     booking.status = "in-progress";
//     booking.paymentStatus = "funds_held";
//   }

//   booking.pricing = booking.pricing || {};
//   booking.pricing.paymentAuditTrail = booking.pricing.paymentAuditTrail || [];
//   booking.pricing.paymentAuditTrail.push({
//     event: "escrow_adjusted",
//     amount: totalHeld,
//     finalPayment: toAmount(
//       booking.pricing?.finalApprovedPrice ||
//         booking.pricing?.finalPrice ||
//         booking.totalAmount
//     ),
//     approvedAdjustmentsTotal: toAmount(
//       booking.pricing?.approvedAdjustmentsTotal || 0
//     ),
//     approvedExtraTimeCost: toAmount(
//       booking.pricing?.approvedExtraTimeCost || 0
//     ),
//     actorId: adminId,
//     at: new Date(),
//     note:
//       resolutionType === "reservice"
//         ? `Booking reset for reservice. Reason: ${reason || "N/A"}`
//         : `Dispute resolved without refund. Booking resumed. Reason: ${
//             reason || "N/A"
//           }`,
//   });

//   return {
//     totalHeld,
//     refundAmount: 0,
//     providerAmount: 0,
//   };
// }

// /**
//  * POST /disputes/open
//  * Client or Provider opens a dispute for a booking
//  */
// router.post(
//   "/open",
//   authGuard,
//   disputeUpload.array("evidence", 5),
//   async (req, res, next) => {
//     try {
//       const { bookingId, category, description } = req.body;
//       const userId = req.user.id;

//       if (!bookingId || !category || !description) {
//         return res.status(400).json({
//           message: "bookingId, category, and description are required",
//         });
//       }

//       const booking = await Booking.findById(bookingId).populate(
//         "clientId providerId"
//       );
//       if (!booking) {
//         return res.status(404).json({ message: "Booking not found" });
//       }

//       if (
//         userId !== String(booking.clientId?._id) &&
//         userId !== String(booking.providerId?._id)
//       ) {
//         return res
//           .status(403)
//           .json({ message: "Only booking parties can open disputes" });
//       }

//       const allowedStatuses = new Set([
//         "in-progress",
//         "pending-completion",
//         "provider_completed",
//         "awaiting_client_confirmation",
//       ]);

//       if (!allowedStatuses.has(booking.status)) {
//         return res.status(400).json({
//           message:
//             "Disputes can only be raised during an active or pending completion booking",
//         });
//       }

//       const raisedByRole =
//         userId === String(booking.clientId?._id) ? "client" : "provider";

//       const evidenceFiles = (req.files || []).map((file) => ({
//         url: file.path,
//         originalName: file.originalname,
//         size: file.size,
//         mimeType: file.mimetype,
//       }));

//       const dispute = new Dispute({
//         bookingId,
//         raisedBy: userId,
//         raisedByRole,
//         clientId: booking.clientId?._id || booking.clientId,
//         providerId: booking.providerId?._id || booking.providerId,
//         category,
//         description,
//         message: description,
//         evidenceFiles,
//         timerSnapshot: {
//           totalSeconds: Number(booking.timeTracking?.totalSeconds || 0),
//           totalHours: Number(
//             (
//               Number(booking.timeTracking?.totalSeconds || 0) / 3600
//             ).toFixed(2)
//           ),
//           includedHours: Number(booking.pricing?.includedHours || 0),
//           hourlyRate: Number(booking.pricing?.hourlyRate || 0),
//           estimatedExtraCost: Number(booking.pricing?.extraTimeCost || 0),
//           sessions: Array.isArray(booking.timeTracking?.timerSessions)
//             ? booking.timeTracking.timerSessions
//             : [],
//           capturedAt: new Date(),
//         },
//         status: "opened",
//         openedAt: new Date(),
//       });

//       await dispute.save();
//       await dispute.populate("raisedBy", "profile.name email");

//       booking.disputeId = dispute._id;

//       const heldPayments = await Payment.find({
//         bookingId,
//         status: "FUNDS_HELD",
//       });

//       for (const payment of heldPayments) {
//         payment.status = "DISPUTED";
//         payment.disputeId = dispute._id;
//         payment.disputeReason = category;
//         payment.receipt = buildPaymentResolutionSnapshot(payment, {
//           action: "dispute_opened",
//           disputeId: dispute._id,
//           actorId: userId,
//           category,
//         });
//         await payment.save();
//       }

//       booking.status = "disputed";
//       booking.pricing = booking.pricing || {};
//       booking.pricing.paymentAuditTrail = booking.pricing.paymentAuditTrail || [];
//       booking.pricing.paymentAuditTrail.push({
//         event: "escrow_frozen_on_dispute",
//         amount: Number(booking.pricing?.escrowHeldAmount || 0),
//         finalPayment: Number(
//           booking.pricing?.finalApprovedPrice || booking.totalAmount || 0
//         ),
//         approvedAdjustmentsTotal: Number(
//           booking.pricing?.approvedAdjustmentsTotal || 0
//         ),
//         approvedExtraTimeCost: Number(
//           booking.pricing?.approvedExtraTimeCost || 0
//         ),
//         actorId: userId,
//         at: new Date(),
//         note: "Dispute opened; escrow frozen pending admin resolution",
//       });

//       await booking.save();

//       const otherPartyId =
//         raisedByRole === "client"
//           ? booking.providerId?._id
//           : booking.clientId?._id;

//       if (otherPartyId) {
//         const targetRoute =
//           raisedByRole === "client"
//             ? "/provider/bookings/:bookingId"
//             : "/client/bookings/:bookingId";

//         await createNotification({
//           userId: otherPartyId,
//           type: "dispute_opened",
//           title: `Dispute opened - Booking #${bookingShortCode(bookingId)}`,
//           message:
//             "A dispute was opened for this booking. We will review it fairly.",
//           category: "dispute",
//           bookingId,
//           disputeId: dispute._id,
//           targetRoute,
//           targetRouteParams: { bookingId },
//         });
//       }

//       await notifyAllAdmins({
//         type: "dispute_opened",
//         title: "New dispute raised",
//         message: `A ${raisedByRole} opened a dispute for booking #${bookingShortCode(
//           bookingId
//         )}.`,
//         category: "dispute",
//         bookingId,
//         disputeId: dispute._id,
//         fromUserId: userId,
//         targetRoute: "/disputes/:id",
//         targetRouteParams: { id: dispute._id },
//       });

//       res.status(201).json({
//         message: "Dispute submitted successfully",
//         dispute,
//       });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

// /**
//  * GET /disputes (Admin Only)
//  */
// router.get("/", authGuard, roleGuard(["admin"]), async (req, res, next) => {
//   try {
//     const { status, category, dateFrom, dateTo } = req.query;

//     const filter = {};
//     if (status) filter.status = status;
//     if (category) filter.category = category;

//     if (dateFrom || dateTo) {
//       filter.createdAt = {};
//       if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
//       if (dateTo) filter.createdAt.$lte = new Date(dateTo);
//     }

//     const disputes = await Dispute.find(filter)
//       .populate("bookingId", "clientId providerId status totalAmount")
//       .populate("raisedBy", "profile.name email")
//       .populate("assignedTo", "profile.name")
//       .sort({ createdAt: -1 })
//       .limit(500);

//     const stats = {
//       totalDisputes: await Dispute.countDocuments(filter),
//       openCount: await Dispute.countDocuments({ ...filter, status: "opened" }),
//       underReviewCount: await Dispute.countDocuments({
//         ...filter,
//         status: "under_review",
//       }),
//       resolvedCount: await Dispute.countDocuments({
//         ...filter,
//         status: "resolved",
//       }),
//     };

//     res.json({ disputes, stats });
//   } catch (e) {
//     next(e);
//   }
// });

// /**
//  * GET /disputes/booking/:bookingId
//  */
// router.get("/booking/:bookingId", authGuard, async (req, res, next) => {
//   try {
//     const { bookingId } = req.params;
//     const userId = req.user.id;

//     const booking = await Booking.findById(bookingId).select(
//       "clientId providerId"
//     );
//     if (!booking) {
//       return res.status(404).json({ message: "Booking not found" });
//     }

//     const isClient = String(booking.clientId) === userId;
//     const isProvider = String(booking.providerId) === userId;
//     const isAdmin = req.user.role === "admin";

//     if (!isClient && !isProvider && !isAdmin) {
//       return res.status(403).json({ message: "Not authorized" });
//     }

//     const dispute = await Dispute.findOne({ bookingId })
//       .sort({ createdAt: -1 })
//       .populate("raisedBy", "profile.name email");

//     res.json({ dispute });
//   } catch (e) {
//     next(e);
//   }
// });

// /**
//  * GET /disputes/list
//  */
// router.get("/list", authGuard, async (req, res, next) => {
//   try {
//     const userId = req.user.id;
//     const { status } = req.query;

//     const bookingIds = await Booking.find({
//       $or: [{ clientId: userId }, { providerId: userId }],
//     }).distinct("_id");

//     const filter = {
//       $or: [{ raisedBy: userId }, { bookingId: { $in: bookingIds } }],
//     };

//     if (status) {
//       filter.status = status;
//     }

//     const disputes = await Dispute.find(filter)
//       .populate("bookingId", "serviceId clientId providerId status")
//       .populate("raisedBy", "profile.name email")
//       .sort({ createdAt: -1 });

//     res.json({ disputes });
//   } catch (e) {
//     next(e);
//   }
// });

// /**
//  * GET /disputes/:id
//  */
// router.get("/:id", authGuard, async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user.id;

//     const dispute = await Dispute.findById(id)
//       .populate("bookingId")
//       .populate("raisedBy", "profile.name email")
//       .populate("assignedTo", "profile.name email");

//     if (!dispute) {
//       return res.status(404).json({ message: "Dispute not found" });
//     }

//     const userRole = req.user.role;
//     if (
//       userRole !== "admin" &&
//       userId !== String(dispute.raisedBy?._id) &&
//       userId !== String(dispute.bookingId?.clientId) &&
//       userId !== String(dispute.bookingId?.providerId)
//     ) {
//       return res.status(403).json({ message: "Not authorized" });
//     }

//     res.json({ dispute });
//   } catch (e) {
//     next(e);
//   }
// });

// /**
//  * PATCH /disputes/:id/request-info
//  */
// router.patch(
//   "/:id/request-info",
//   authGuard,
//   roleGuard(["admin"]),
//   async (req, res, next) => {
//     try {
//       const { id } = req.params;
//       const { fields = [], fromRole } = req.body;

//       const dispute = await Dispute.findById(id).populate("bookingId");
//       if (!dispute) {
//         return res.status(404).json({ message: "Dispute not found" });
//       }

//       const targetRole =
//         fromRole && ["client", "provider"].includes(fromRole)
//           ? fromRole
//           : dispute.raisedByRole || "client";

//       const requestedInfo = (Array.isArray(fields) ? fields : [])
//         .filter(Boolean)
//         .map((field) => ({
//           field,
//           requestedAt: new Date(),
//         }));

//       dispute.requestedInfo = requestedInfo;
//       dispute.status = "under_review";
//       await dispute.save();

//       const targetPartyId =
//         targetRole === "client"
//           ? dispute.bookingId?.clientId
//           : dispute.bookingId?.providerId;

//       if (targetPartyId) {
//         const targetRoute =
//           targetRole === "provider"
//             ? "/provider/bookings/:bookingId"
//             : "/client/bookings/:bookingId";

//         await createNotification({
//           userId: targetPartyId,
//           type: "dispute_info_requested",
//           title: "Dispute update",
//           message: "Admin requested additional info to review your dispute.",
//           category: "dispute",
//           disputeId: id,
//           bookingId: dispute.bookingId?._id || dispute.bookingId,
//           targetRoute,
//           targetRouteParams: {
//             bookingId: dispute.bookingId?._id || dispute.bookingId,
//           },
//         });
//       }

//       res.json({
//         message: "Information request sent",
//         dispute,
//       });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

// /**
//  * PATCH /disputes/:id/respond-info
//  */
// router.patch(
//   "/:id/respond-info",
//   authGuard,
//   disputeUpload.array("evidence", 5),
//   async (req, res, next) => {
//     try {
//       const { id } = req.params;
//       const userId = req.user.id;

//       const dispute = await Dispute.findById(id).populate("bookingId");
//       if (!dispute) {
//         return res.status(404).json({ message: "Dispute not found" });
//       }

//       const booking = dispute.bookingId;
//       const isClient = String(booking?.clientId) === String(userId);
//       const isProvider = String(booking?.providerId) === String(userId);

//       if (!isClient && !isProvider) {
//         return res.status(403).json({ message: "Not authorized" });
//       }

//       if (
//         !Array.isArray(dispute.requestedInfo) ||
//         dispute.requestedInfo.length === 0
//       ) {
//         return res.status(400).json({
//           message: "No information has been requested for this dispute",
//         });
//       }

//       let responses = [];
//       if (typeof req.body.responses === "string") {
//         try {
//           responses = JSON.parse(req.body.responses);
//         } catch (_) {
//           return res.status(400).json({ message: "Invalid responses payload" });
//         }
//       } else if (Array.isArray(req.body.responses)) {
//         responses = req.body.responses;
//       }

//       if (!Array.isArray(responses) || responses.length === 0) {
//         return res
//           .status(400)
//           .json({ message: "Please provide at least one response" });
//       }

//       let hasAnyResponse = false;

//       dispute.requestedInfo.forEach((item, index) => {
//         const value =
//           typeof responses[index] === "string" ? responses[index].trim() : "";
//         if (value) {
//           item.response = value;
//           item.respondedAt = new Date();
//           hasAnyResponse = true;
//         }
//       });

//       if (!hasAnyResponse && (!req.files || req.files.length === 0)) {
//         return res.status(400).json({
//           message: "Please add a response or upload evidence before submitting",
//         });
//       }

//       const newEvidenceFiles = (req.files || []).map((file) => ({
//         url: file.path,
//         originalName: file.originalname,
//         size: file.size,
//         mimeType: file.mimetype,
//       }));

//       dispute.evidenceFiles = [
//         ...(dispute.evidenceFiles || []),
//         ...newEvidenceFiles,
//       ];
//       dispute.status = isClient ? "client_provided" : "provider_responded";
//       await dispute.save();

//       await notifyAllAdmins({
//         type: "dispute_info_requested",
//         title: "Dispute response received",
//         message: `${
//           isClient ? "Client" : "Provider"
//         } submitted additional information for dispute #${String(dispute._id)
//           .slice(-8)
//           .toUpperCase()}.`,
//         category: "dispute",
//         bookingId: booking?._id,
//         disputeId: dispute._id,
//         fromUserId: userId,
//         targetRoute: "/disputes/:id",
//         targetRouteParams: { id: dispute._id },
//       });

//       res.json({
//         message: "Requested information submitted successfully",
//         dispute,
//       });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

// /**
//  * POST /disputes/:id/resolve
//  * Admin resolves dispute and financial settlement
//  */
// router.post(
//   "/:id/resolve",
//   authGuard,
//   roleGuard(["admin"]),
//   async (req, res, next) => {
//     try {
//       const { id } = req.params;
//       const { resolutionType, refundAmount, reason } = req.body;

//       const validTypes = [
//         "refund_full",
//         "refund_partial",
//         "reservice",
//         "booking_valid",
//         "warning",
//       ];

//       if (!validTypes.includes(resolutionType)) {
//         return res.status(400).json({ message: "Invalid resolution type" });
//       }

//       const dispute = await Dispute.findById(id).populate("bookingId");
//       if (!dispute) {
//         return res.status(404).json({ message: "Dispute not found" });
//       }

//       const booking = await Booking.findById(
//         dispute.bookingId?._id || dispute.bookingId
//       );
//       if (!booking) {
//         return res.status(404).json({ message: "Related booking not found" });
//       }

//       let settlement = {
//         totalHeld: 0,
//         refundAmount: 0,
//         providerAmount: 0,
//       };

//       if (resolutionType === "refund_full") {
//         settlement = await applyFullRefundResolution({
//           booking,
//           dispute,
//           adminId: req.user.id,
//           reason,
//         });
//       } else if (resolutionType === "refund_partial") {
//         settlement = await applyPartialRefundResolution({
//           booking,
//           dispute,
//           adminId: req.user.id,
//           refundAmount,
//           reason,
//         });
//       } else {
//         settlement = await applyResumeResolution({
//           booking,
//           dispute,
//           adminId: req.user.id,
//           resolutionType,
//           reason,
//         });
//       }

//       dispute.status = "resolved";
//       dispute.resolutionDetails = {
//         resolutionType,
//         refundAmount: toAmount(settlement.refundAmount),
//         reason: reason || "",
//         resolvedBy: req.user.id,
//         resolvedAt: new Date(),
//       };
//       dispute.resolvedAt = new Date();
//       dispute.resolvedBy = req.user.id;
//       await dispute.save();

//       await booking.save();

//       const clientNotification = buildResolutionNotification({
//         resolutionType,
//         reason,
//         role: "client",
//         bookingId: booking._id,
//         refundAmount: settlement.refundAmount,
//         providerAmount: settlement.providerAmount,
//       });

//       const providerNotification = buildResolutionNotification({
//         resolutionType,
//         reason,
//         role: "provider",
//         bookingId: booking._id,
//         refundAmount: settlement.refundAmount,
//         providerAmount: settlement.providerAmount,
//       });

//       if (booking.clientId) {
//         await createNotification({
//           userId: booking.clientId,
//           type: "dispute_resolved",
//           title: clientNotification.title,
//           message: clientNotification.message,
//           category: "dispute",
//           disputeId: dispute._id,
//           bookingId: booking._id,
//           targetRoute: "/client/bookings/:bookingId",
//           targetRouteParams: { bookingId: booking._id },
//         });

//         if (
//           resolutionType === "refund_full" ||
//           resolutionType === "refund_partial"
//         ) {
//           await createNotification({
//             userId: booking.clientId,
//             type: "payment_refunded",
//             title:
//               resolutionType === "refund_full"
//                 ? "Full refund processed"
//                 : "Partial refund processed",
//             message:
//               resolutionType === "refund_full"
//                 ? `A full refund of NPR ${toAmount(
//                     settlement.refundAmount
//                   ).toLocaleString()} has been processed for Booking #${bookingShortCode(
//                     booking._id
//                   )}.`
//                 : `A partial refund of NPR ${toAmount(
//                     settlement.refundAmount
//                   ).toLocaleString()} has been processed for Booking #${bookingShortCode(
//                     booking._id
//                   )}.`,
//             category: "payment",
//             bookingId: booking._id,
//             disputeId: dispute._id,
//             targetRoute: "/client/bookings/:bookingId",
//             targetRouteParams: { bookingId: booking._id },
//           });
//         }
//       }

//       if (booking.providerId) {
//         await createNotification({
//           userId: booking.providerId,
//           type: "dispute_resolved",
//           title: providerNotification.title,
//           message: providerNotification.message,
//           category: "dispute",
//           disputeId: dispute._id,
//           bookingId: booking._id,
//           targetRoute: "/provider/bookings/:bookingId",
//           targetRouteParams: { bookingId: booking._id },
//         });

//         if (
//           resolutionType === "refund_partial" &&
//           toAmount(settlement.providerAmount) > 0
//         ) {
//           await createNotification({
//             userId: booking.providerId,
//             type: "payment_released",
//             title: "Partial payout released",
//             message: `NPR ${toAmount(
//               settlement.providerAmount
//             ).toLocaleString()} has been released to your wallet after dispute resolution for Booking #${bookingShortCode(
//               booking._id
//             )}.`,
//             category: "payment",
//             bookingId: booking._id,
//             disputeId: dispute._id,
//             targetRoute: "/provider/earnings",
//             targetRouteParams: { bookingId: booking._id },
//           });
//         }
//       }

//       res.json({
//         message: "Dispute resolved",
//         dispute,
//         booking,
//         settlement: {
//           totalHeld: toAmount(settlement.totalHeld),
//           refundAmount: toAmount(settlement.refundAmount),
//           providerAmount: toAmount(settlement.providerAmount),
//           bookingStatus: booking.status,
//           paymentStatus: booking.paymentStatus,
//         },
//       });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

// module.exports = router;

// routes/disputes.js
const express = require("express");
const { authGuard, roleGuard } = require("../middleware/auth");
const Dispute = require("../models/Dispute");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const ProviderWallet = require("../models/ProviderWallet");
const disputeUpload = require("../middleware/disputeUpload");
const {
  createNotification,
  notifyAllAdmins,
} = require("../utils/createNotification");
const { recalculateProviderTrust } = require("../utils/trustScoring");

const router = express.Router();

function toAmount(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function bookingShortCode(bookingId) {
  return String(bookingId || "").slice(-6).toUpperCase();
}

function buildResolutionNotification({
  resolutionType,
  reason,
  role,
  bookingId,
  refundAmount,
  providerAmount,
}) {
  const bookingCode = bookingShortCode(bookingId);
  const trimmedReason = String(reason || "").trim();
  const reasonText = trimmedReason ? ` Reason: ${trimmedReason}` : "";

  switch (resolutionType) {
    case "refund_full":
      return {
        title:
          role === "provider"
            ? "Dispute resolved - Full refund"
            : "Dispute resolved - Full refund approved",
        message:
          role === "provider"
            ? `The dispute for Booking #${bookingCode} has been resolved. The client will receive a full refund. No provider payout will be released.${reasonText}`
            : `Your dispute for Booking #${bookingCode} has been resolved. A full refund has been approved.${reasonText}`,
      };

    case "refund_partial":
      return {
        title:
          role === "provider"
            ? "Dispute resolved - Partial settlement"
            : "Dispute resolved - Partial refund approved",
        message:
          role === "provider"
            ? `The dispute for Booking #${bookingCode} has been resolved. Client refund: NPR ${toAmount(
                refundAmount
              ).toLocaleString()}. Provider payout: NPR ${toAmount(
                providerAmount
              ).toLocaleString()}.${reasonText}`
            : `Your dispute for Booking #${bookingCode} has been resolved. A partial refund of NPR ${toAmount(
                refundAmount
              ).toLocaleString()} has been approved.${reasonText}`,
      };

    case "booking_valid":
      return {
        title: "Dispute resolved",
        message:
          role === "provider"
            ? `The dispute for Booking #${bookingCode} was resolved in your favor. Escrow remains secured and the booking can continue.${reasonText}`
            : `Your dispute for Booking #${bookingCode} has been resolved. The booking remains valid and escrow stays secured for the booking flow.${reasonText}`,
      };

    case "reservice":
      return {
        title: "Dispute resolved - Reservice required",
        message:
          role === "provider"
            ? `The dispute for Booking #${bookingCode} has been resolved. You must complete the service again before payment can be released.${reasonText}`
            : `Your dispute for Booking #${bookingCode} has been resolved. The provider must complete the service again before payment can be released.${reasonText}`,
      };

    case "warning":
      return {
        title: "Dispute resolved",
        message:
          role === "provider"
            ? `The dispute for Booking #${bookingCode} has been resolved with a warning. Escrow remains secured and booking flow may continue.${reasonText}`
            : `Your dispute for Booking #${bookingCode} has been resolved with a warning.${reasonText}`,
      };

    default:
      return {
        title: "Dispute resolved",
        message: `Your dispute for Booking #${bookingCode} has been resolved.${reasonText}`,
      };
  }
}

async function getOrCreateProviderWallet(providerId) {
  let wallet = await ProviderWallet.findOne({ providerId });

  if (!wallet) {
    wallet = await ProviderWallet.create({
      providerId,
      totalEarned: 0,
      pendingBalance: 0,
      availableBalance: 0,
      totalWithdrawn: 0,
      totalRefunded: 0,
      transactions: [],
    });
  }

  return wallet;
}

function buildPaymentResolutionSnapshot(payment, extra = {}) {
  return {
    ...(payment.receipt || {}),
    disputeResolution: {
      ...(payment.receipt?.disputeResolution || {}),
      ...extra,
      resolvedAt: new Date(),
    },
  };
}

async function restorePaymentsToHeld(booking, dispute, adminId, note) {
  const disputedPayments = await Payment.find({
    bookingId: booking._id,
    status: { $in: ["DISPUTED", "FUNDS_HELD"] },
  }).sort({ createdAt: 1 });

  let totalHeld = 0;

  for (const payment of disputedPayments) {
    payment.status = "FUNDS_HELD";
    payment.disputeId = dispute._id;
    payment.disputeReason = dispute.category || dispute.reason || "";
    payment.receipt = buildPaymentResolutionSnapshot(payment, {
      action: "restored_to_held",
      note,
      adminId,
    });
    await payment.save();
    totalHeld += toAmount(payment.amount);
  }

  booking.paymentStatus = "funds_held";
  booking.pricing = booking.pricing || {};
  booking.pricing.escrowHeldAmount = totalHeld;
  booking.pricing.additionalEscrowRequired = Math.max(
    0,
    toAmount(
      booking.pricing?.finalApprovedPrice ||
        booking.pricing?.finalPrice ||
        booking.totalAmount
    ) - totalHeld
  );

  booking.pricing.paymentAuditTrail = booking.pricing.paymentAuditTrail || [];
  booking.pricing.paymentAuditTrail.push({
    event: "escrow_adjusted",
    amount: totalHeld,
    finalPayment: toAmount(
      booking.pricing?.finalApprovedPrice ||
        booking.pricing?.finalPrice ||
        booking.totalAmount
    ),
    approvedAdjustmentsTotal: toAmount(
      booking.pricing?.approvedAdjustmentsTotal || 0
    ),
    approvedExtraTimeCost: toAmount(
      booking.pricing?.approvedExtraTimeCost || 0
    ),
    actorId: adminId,
    at: new Date(),
    note,
  });

  return { disputedPayments, totalHeld };
}

async function applyFullRefundResolution({ booking, dispute, adminId, reason }) {
  const payments = await Payment.find({
    bookingId: booking._id,
    status: { $in: ["DISPUTED", "FUNDS_HELD"] },
  }).sort({ createdAt: 1 });

  const totalHeld = payments.reduce((sum, p) => sum + toAmount(p.amount), 0);

  for (const payment of payments) {
    payment.status = "REFUNDED";
    payment.refundedAt = new Date();
    payment.refundRequested = false;
    payment.disputeId = dispute._id;
    payment.disputeReason = reason || dispute.category || dispute.reason || "";
    payment.providerEarnings = 0;
    payment.receipt = buildPaymentResolutionSnapshot(payment, {
      action: "full_refund",
      refundAmount: toAmount(payment.amount),
      providerPayout: 0,
      adminId,
      reason,
    });
    await payment.save();
  }

  const wallet = await getOrCreateProviderWallet(booking.providerId);

  if (totalHeld > 0) {
    const deducted = Math.min(toAmount(wallet.pendingBalance), totalHeld);
    wallet.pendingBalance = toAmount(wallet.pendingBalance - deducted);
    wallet.totalRefunded = toAmount(wallet.totalRefunded + totalHeld);

    wallet.transactions.push({
      type: "REFUND",
      amount: totalHeld,
      description: `Full dispute refund for booking #${bookingShortCode(
        booking._id
      )}`,
      bookingId: booking._id,
      paymentId: payments[0]?._id,
      status: "COMPLETED",
      createdAt: new Date(),
    });

    await wallet.save();
  }

  booking.status = "resolved_refunded";
  booking.paymentStatus = "refunded";
  booking.disputeId = null;

  booking.pricing = booking.pricing || {};
  booking.pricing.escrowHeldAmount = 0;
  booking.pricing.additionalEscrowRequired = 0;
  booking.pricing.paymentAuditTrail = booking.pricing.paymentAuditTrail || [];
  booking.pricing.paymentAuditTrail.push({
    event: "escrow_adjusted",
    amount: totalHeld,
    finalPayment: 0,
    approvedAdjustmentsTotal: toAmount(
      booking.pricing?.approvedAdjustmentsTotal || 0
    ),
    approvedExtraTimeCost: toAmount(
      booking.pricing?.approvedExtraTimeCost || 0
    ),
    actorId: adminId,
    at: new Date(),
    note: `Full refund issued via dispute resolution. Reason: ${reason || "N/A"}`,
  });

  return {
    totalHeld,
    refundAmount: totalHeld,
    providerAmount: 0,
  };
}

async function applyPartialRefundResolution({
  booking,
  dispute,
  adminId,
  refundAmount,
  reason,
}) {
  const payments = await Payment.find({
    bookingId: booking._id,
    status: { $in: ["DISPUTED", "FUNDS_HELD"] },
  }).sort({ createdAt: 1 });

  const totalHeld = payments.reduce((sum, p) => sum + toAmount(p.amount), 0);
  const safeRefund = clamp(toAmount(refundAmount), 0, totalHeld);
  const providerAmount = toAmount(totalHeld - safeRefund);

  let accumulatedRefund = 0;

  for (let i = 0; i < payments.length; i += 1) {
    const payment = payments[i];
    const amount = toAmount(payment.amount);
    const ratio = totalHeld > 0 ? amount / totalHeld : 0;

    let paymentRefund = 0;
    if (i === payments.length - 1) {
      paymentRefund = toAmount(safeRefund - accumulatedRefund);
    } else {
      paymentRefund = toAmount(safeRefund * ratio);
      accumulatedRefund += paymentRefund;
    }

    const paymentProviderPayout = toAmount(amount - paymentRefund);

    payment.status =
      paymentRefund > 0 && paymentProviderPayout > 0
        ? "PARTIALLY_REFUNDED"
        : paymentRefund > 0
        ? "REFUNDED"
        : "RELEASED";

    payment.refundedAt = paymentRefund > 0 ? new Date() : payment.refundedAt;
    payment.releasedAt =
      paymentProviderPayout > 0 ? new Date() : payment.releasedAt;
    payment.escrowReleasedAt =
      paymentProviderPayout > 0 ? new Date() : payment.escrowReleasedAt;
    payment.disputeId = dispute._id;
    payment.disputeReason = reason || dispute.category || dispute.reason || "";
    payment.providerEarnings = paymentProviderPayout;
    payment.refundRequested = false;
    payment.receipt = buildPaymentResolutionSnapshot(payment, {
      action: "partial_refund",
      refundAmount: paymentRefund,
      providerPayout: paymentProviderPayout,
      adminId,
      reason,
    });

    await payment.save();
  }

  const wallet = await getOrCreateProviderWallet(booking.providerId);

  if (totalHeld > 0) {
    const deducted = Math.min(toAmount(wallet.pendingBalance), totalHeld);
    wallet.pendingBalance = toAmount(wallet.pendingBalance - deducted);

    if (providerAmount > 0) {
      wallet.availableBalance = toAmount(
        wallet.availableBalance + providerAmount
      );
      wallet.totalEarned = toAmount(wallet.totalEarned + providerAmount);

      wallet.transactions.push({
        type: "DEPOSIT",
        amount: providerAmount,
        description: `Partial dispute payout for booking #${bookingShortCode(
          booking._id
        )}`,
        bookingId: booking._id,
        paymentId: payments[0]?._id,
        status: "COMPLETED",
        createdAt: new Date(),
      });
    }

    if (safeRefund > 0) {
      wallet.totalRefunded = toAmount(wallet.totalRefunded + safeRefund);

      wallet.transactions.push({
        type: "REFUND",
        amount: safeRefund,
        description: `Partial dispute refund for booking #${bookingShortCode(
          booking._id
        )}`,
        bookingId: booking._id,
        paymentId: payments[0]?._id,
        status: "COMPLETED",
        createdAt: new Date(),
      });
    }

    await wallet.save();
  }

  booking.status = "resolved_refunded";
  booking.paymentStatus = "partially_refunded";
  booking.disputeId = null;

  booking.pricing = booking.pricing || {};
  booking.pricing.escrowHeldAmount = 0;
  booking.pricing.additionalEscrowRequired = 0;
  booking.pricing.paymentAuditTrail = booking.pricing.paymentAuditTrail || [];
  booking.pricing.paymentAuditTrail.push({
    event: "escrow_adjusted",
    amount: totalHeld,
    finalPayment: providerAmount,
    approvedAdjustmentsTotal: toAmount(
      booking.pricing?.approvedAdjustmentsTotal || 0
    ),
    approvedExtraTimeCost: toAmount(
      booking.pricing?.approvedExtraTimeCost || 0
    ),
    actorId: adminId,
    at: new Date(),
    note: `Partial refund via dispute resolution. Client refund: NPR ${safeRefund}. Provider payout: NPR ${providerAmount}. Reason: ${
      reason || "N/A"
    }`,
  });

  return {
    totalHeld,
    refundAmount: safeRefund,
    providerAmount,
  };
}

async function applyResumeResolution({
  booking,
  dispute,
  adminId,
  resolutionType,
  reason,
}) {
  const { totalHeld } = await restorePaymentsToHeld(
    booking,
    dispute,
    adminId,
    resolutionType === "reservice"
      ? "Escrow restored to held after reservice resolution"
      : "Escrow restored to held after dispute resolution"
  );

  booking.disputeId = null;

  if (resolutionType === "reservice") {
    booking.status = "confirmed";
    booking.providerCompletedAt = null;
    booking.completedAt = null;
    booking.clientConfirmedAt = null;
    booking.paymentStatus = "funds_held";
  } else if (booking.providerCompletedAt) {
    booking.status = "pending-completion";
    booking.paymentStatus = "funds_held";
  } else {
    booking.status = "in-progress";
    booking.paymentStatus = "funds_held";
  }

  booking.pricing = booking.pricing || {};
  booking.pricing.paymentAuditTrail = booking.pricing.paymentAuditTrail || [];
  booking.pricing.paymentAuditTrail.push({
    event: "escrow_adjusted",
    amount: totalHeld,
    finalPayment: toAmount(
      booking.pricing?.finalApprovedPrice ||
        booking.pricing?.finalPrice ||
        booking.totalAmount
    ),
    approvedAdjustmentsTotal: toAmount(
      booking.pricing?.approvedAdjustmentsTotal || 0
    ),
    approvedExtraTimeCost: toAmount(
      booking.pricing?.approvedExtraTimeCost || 0
    ),
    actorId: adminId,
    at: new Date(),
    note:
      resolutionType === "reservice"
        ? `Booking reset for reservice. Reason: ${reason || "N/A"}`
        : `Dispute resolved without refund. Booking resumed. Reason: ${
            reason || "N/A"
          }`,
  });

  return {
    totalHeld,
    refundAmount: 0,
    providerAmount: 0,
  };
}

/**
 * POST /disputes/open
 * Client or Provider opens a dispute for a booking
 */
router.post(
  "/open",
  authGuard,
  disputeUpload.array("evidence", 5),
  async (req, res, next) => {
    try {
      const { bookingId, category, description } = req.body;
      const userId = req.user.id;

      if (!bookingId || !category || !description) {
        return res.status(400).json({
          message: "bookingId, category, and description are required",
        });
      }

      const booking = await Booking.findById(bookingId).populate(
        "clientId providerId"
      );
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (
        userId !== String(booking.clientId?._id) &&
        userId !== String(booking.providerId?._id)
      ) {
        return res
          .status(403)
          .json({ message: "Only booking parties can open disputes" });
      }

      const allowedStatuses = new Set([
        "in-progress",
        "pending-completion",
        "provider_completed",
        "awaiting_client_confirmation",
      ]);

      if (!allowedStatuses.has(booking.status)) {
        return res.status(400).json({
          message:
            "Disputes can only be raised during an active or pending completion booking",
        });
      }

      const raisedByRole =
        userId === String(booking.clientId?._id) ? "client" : "provider";

      const evidenceFiles = (req.files || []).map((file) => ({
        url: file.path,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      }));

      const dispute = new Dispute({
        bookingId,
        raisedBy: userId,
        raisedByRole,
        clientId: booking.clientId?._id || booking.clientId,
        providerId: booking.providerId?._id || booking.providerId,
        category,
        description,
        message: description,
        evidenceFiles,
        timerSnapshot: {
          totalSeconds: Number(booking.timeTracking?.totalSeconds || 0),
          totalHours: Number(
            (
              Number(booking.timeTracking?.totalSeconds || 0) / 3600
            ).toFixed(2)
          ),
          includedHours: Number(booking.pricing?.includedHours || 0),
          hourlyRate: Number(booking.pricing?.hourlyRate || 0),
          estimatedExtraCost: Number(booking.pricing?.extraTimeCost || 0),
          sessions: Array.isArray(booking.timeTracking?.timerSessions)
            ? booking.timeTracking.timerSessions
            : [],
          capturedAt: new Date(),
        },
        status: "opened",
        openedAt: new Date(),
      });

      await dispute.save();
      await dispute.populate("raisedBy", "profile.name email");

      booking.disputeId = dispute._id;

      const heldPayments = await Payment.find({
        bookingId,
        status: "FUNDS_HELD",
      });

      for (const payment of heldPayments) {
        payment.status = "DISPUTED";
        payment.disputeId = dispute._id;
        payment.disputeReason = category;
        payment.receipt = buildPaymentResolutionSnapshot(payment, {
          action: "dispute_opened",
          disputeId: dispute._id,
          actorId: userId,
          category,
        });
        await payment.save();
      }

      booking.status = "disputed";
      booking.pricing = booking.pricing || {};
      booking.pricing.paymentAuditTrail = booking.pricing.paymentAuditTrail || [];
      booking.pricing.paymentAuditTrail.push({
        event: "escrow_frozen_on_dispute",
        amount: Number(booking.pricing?.escrowHeldAmount || 0),
        finalPayment: Number(
          booking.pricing?.finalApprovedPrice || booking.totalAmount || 0
        ),
        approvedAdjustmentsTotal: Number(
          booking.pricing?.approvedAdjustmentsTotal || 0
        ),
        approvedExtraTimeCost: Number(
          booking.pricing?.approvedExtraTimeCost || 0
        ),
        actorId: userId,
        at: new Date(),
        note: "Dispute opened; escrow frozen pending admin resolution",
      });

      await booking.save();

      const otherPartyId =
        raisedByRole === "client"
          ? booking.providerId?._id
          : booking.clientId?._id;

      if (otherPartyId) {
        const targetRoute =
          raisedByRole === "client"
            ? "/provider/bookings/:bookingId"
            : "/client/bookings/:bookingId";

        await createNotification({
          userId: otherPartyId,
          type: "dispute_opened",
          title: `Dispute opened - Booking #${bookingShortCode(bookingId)}`,
          message:
            "A dispute was opened for this booking. We will review it fairly.",
          category: "dispute",
          bookingId,
          disputeId: dispute._id,
          targetRoute,
          targetRouteParams: { bookingId },
        });
      }

      await notifyAllAdmins({
        type: "dispute_opened",
        title: "New dispute raised",
        message: `A ${raisedByRole} opened a dispute for booking #${bookingShortCode(
          bookingId
        )}.`,
        category: "dispute",
        bookingId,
        disputeId: dispute._id,
        fromUserId: userId,
        targetRoute: "/disputes/:id",
        targetRouteParams: { id: dispute._id },
      });

      res.status(201).json({
        message: "Dispute submitted successfully",
        dispute,
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * GET /disputes (Admin Only)
 */
router.get("/", authGuard, roleGuard(["admin"]), async (req, res, next) => {
  try {
    const { status, category, dateFrom, dateTo } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const disputes = await Dispute.find(filter)
      .populate("bookingId", "clientId providerId status totalAmount")
      .populate("raisedBy", "profile.name email")
      .populate("assignedTo", "profile.name")
      .sort({ createdAt: -1 })
      .limit(500);

    const stats = {
      totalDisputes: await Dispute.countDocuments(filter),
      openCount: await Dispute.countDocuments({ ...filter, status: "opened" }),
      underReviewCount: await Dispute.countDocuments({
        ...filter,
        status: "under_review",
      }),
      resolvedCount: await Dispute.countDocuments({
        ...filter,
        status: "resolved",
      }),
    };

    res.json({ disputes, stats });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /disputes/booking/:bookingId
 */
router.get("/booking/:bookingId", authGuard, async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const booking = await Booking.findById(bookingId).select(
      "clientId providerId"
    );
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const isClient = String(booking.clientId) === userId;
    const isProvider = String(booking.providerId) === userId;
    const isAdmin = req.user.role === "admin";

    if (!isClient && !isProvider && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const dispute = await Dispute.findOne({ bookingId })
      .sort({ createdAt: -1 })
      .populate("raisedBy", "profile.name email");

    res.json({ dispute });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /disputes/list
 */
router.get("/list", authGuard, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const bookingIds = await Booking.find({
      $or: [{ clientId: userId }, { providerId: userId }],
    }).distinct("_id");

    const filter = {
      $or: [{ raisedBy: userId }, { bookingId: { $in: bookingIds } }],
    };

    if (status) {
      filter.status = status;
    }

    const disputes = await Dispute.find(filter)
      .populate("bookingId", "serviceId clientId providerId status")
      .populate("raisedBy", "profile.name email")
      .sort({ createdAt: -1 });

    res.json({ disputes });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /disputes/:id
 */
router.get("/:id", authGuard, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const dispute = await Dispute.findById(id)
      .populate("bookingId")
      .populate("raisedBy", "profile.name email")
      .populate("assignedTo", "profile.name email");

    if (!dispute) {
      return res.status(404).json({ message: "Dispute not found" });
    }

    const userRole = req.user.role;
    if (
      userRole !== "admin" &&
      userId !== String(dispute.raisedBy?._id) &&
      userId !== String(dispute.bookingId?.clientId) &&
      userId !== String(dispute.bookingId?.providerId)
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json({ dispute });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /disputes/:id/request-info
 */
router.patch(
  "/:id/request-info",
  authGuard,
  roleGuard(["admin"]),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { fields = [], fromRole } = req.body;

      const dispute = await Dispute.findById(id).populate("bookingId");
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }

      const targetRole =
        fromRole && ["client", "provider"].includes(fromRole)
          ? fromRole
          : dispute.raisedByRole || "client";

      const requestedInfo = (Array.isArray(fields) ? fields : [])
        .filter(Boolean)
        .map((field) => ({
          field,
          requestedAt: new Date(),
        }));

      dispute.requestedInfo = requestedInfo;
      dispute.status = "under_review";
      await dispute.save();

      const targetPartyId =
        targetRole === "client"
          ? dispute.bookingId?.clientId
          : dispute.bookingId?.providerId;

      if (targetPartyId) {
        const targetRoute =
          targetRole === "provider"
            ? "/provider/bookings/:bookingId"
            : "/client/bookings/:bookingId";

        await createNotification({
          userId: targetPartyId,
          type: "dispute_info_requested",
          title: "Dispute update",
          message: "Admin requested additional info to review your dispute.",
          category: "dispute",
          disputeId: id,
          bookingId: dispute.bookingId?._id || dispute.bookingId,
          targetRoute,
          targetRouteParams: {
            bookingId: dispute.bookingId?._id || dispute.bookingId,
          },
        });
      }

      res.json({
        message: "Information request sent",
        dispute,
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * PATCH /disputes/:id/respond-info
 */
router.patch(
  "/:id/respond-info",
  authGuard,
  disputeUpload.array("evidence", 5),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const dispute = await Dispute.findById(id).populate("bookingId");
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }

      const booking = dispute.bookingId;
      const isClient = String(booking?.clientId) === String(userId);
      const isProvider = String(booking?.providerId) === String(userId);

      if (!isClient && !isProvider) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (
        !Array.isArray(dispute.requestedInfo) ||
        dispute.requestedInfo.length === 0
      ) {
        return res.status(400).json({
          message: "No information has been requested for this dispute",
        });
      }

      let responses = [];
      if (typeof req.body.responses === "string") {
        try {
          responses = JSON.parse(req.body.responses);
        } catch (_) {
          return res.status(400).json({ message: "Invalid responses payload" });
        }
      } else if (Array.isArray(req.body.responses)) {
        responses = req.body.responses;
      }

      if (!Array.isArray(responses) || responses.length === 0) {
        return res
          .status(400)
          .json({ message: "Please provide at least one response" });
      }

      let hasAnyResponse = false;

      dispute.requestedInfo.forEach((item, index) => {
        const value =
          typeof responses[index] === "string" ? responses[index].trim() : "";
        if (value) {
          item.response = value;
          item.respondedAt = new Date();
          hasAnyResponse = true;
        }
      });

      if (!hasAnyResponse && (!req.files || req.files.length === 0)) {
        return res.status(400).json({
          message: "Please add a response or upload evidence before submitting",
        });
      }

      const newEvidenceFiles = (req.files || []).map((file) => ({
        url: file.path,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      }));

      dispute.evidenceFiles = [
        ...(dispute.evidenceFiles || []),
        ...newEvidenceFiles,
      ];
      dispute.status = isClient ? "client_provided" : "provider_responded";
      await dispute.save();

      await notifyAllAdmins({
        type: "dispute_info_requested",
        title: "Dispute response received",
        message: `${
          isClient ? "Client" : "Provider"
        } submitted additional information for dispute #${String(dispute._id)
          .slice(-8)
          .toUpperCase()}.`,
        category: "dispute",
        bookingId: booking?._id,
        disputeId: dispute._id,
        fromUserId: userId,
        targetRoute: "/disputes/:id",
        targetRouteParams: { id: dispute._id },
      });

      res.json({
        message: "Requested information submitted successfully",
        dispute,
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * POST /disputes/:id/resolve
 * Admin resolves dispute and financial settlement
 */
router.post(
  "/:id/resolve",
  authGuard,
  roleGuard(["admin"]),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { resolutionType, refundAmount, reason } = req.body;

      const validTypes = [
        "refund_full",
        "refund_partial",
        "reservice",
        "booking_valid",
        "warning",
      ];

      if (!validTypes.includes(resolutionType)) {
        return res.status(400).json({ message: "Invalid resolution type" });
      }

      const dispute = await Dispute.findById(id).populate("bookingId");
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }

      const booking = await Booking.findById(
        dispute.bookingId?._id || dispute.bookingId
      );
      if (!booking) {
        return res.status(404).json({ message: "Related booking not found" });
      }

      let settlement = {
        totalHeld: 0,
        refundAmount: 0,
        providerAmount: 0,
      };

      if (resolutionType === "refund_full") {
        settlement = await applyFullRefundResolution({
          booking,
          dispute,
          adminId: req.user.id,
          reason,
        });
      } else if (resolutionType === "refund_partial") {
        settlement = await applyPartialRefundResolution({
          booking,
          dispute,
          adminId: req.user.id,
          refundAmount,
          reason,
        });
      } else {
        settlement = await applyResumeResolution({
          booking,
          dispute,
          adminId: req.user.id,
          resolutionType,
          reason,
        });
      }

      dispute.status = "resolved";
      dispute.resolutionDetails = {
        resolutionType,
        refundAmount: toAmount(settlement.refundAmount),
        reason: reason || "",
        resolvedBy: req.user.id,
        resolvedAt: new Date(),
      };
      dispute.resolvedAt = new Date();
      dispute.resolvedBy = req.user.id;
      await dispute.save();

      await booking.save();

      const clientNotification = buildResolutionNotification({
        resolutionType,
        reason,
        role: "client",
        bookingId: booking._id,
        refundAmount: settlement.refundAmount,
        providerAmount: settlement.providerAmount,
      });

      const providerNotification = buildResolutionNotification({
        resolutionType,
        reason,
        role: "provider",
        bookingId: booking._id,
        refundAmount: settlement.refundAmount,
        providerAmount: settlement.providerAmount,
      });

      if (booking.clientId) {
        await createNotification({
          userId: booking.clientId,
          type: "dispute_resolved",
          title: clientNotification.title,
          message: clientNotification.message,
          category: "dispute",
          disputeId: dispute._id,
          bookingId: booking._id,
          targetRoute: "/client/bookings/:bookingId",
          targetRouteParams: { bookingId: booking._id },
        });

        if (
          resolutionType === "refund_full" ||
          resolutionType === "refund_partial"
        ) {
          await createNotification({
            userId: booking.clientId,
            type: "payment_refunded",
            title:
              resolutionType === "refund_full"
                ? "Full refund processed"
                : "Partial refund processed",
            message:
              resolutionType === "refund_full"
                ? `A full refund of NPR ${toAmount(
                    settlement.refundAmount
                  ).toLocaleString()} has been processed for Booking #${bookingShortCode(
                    booking._id
                  )}.`
                : `A partial refund of NPR ${toAmount(
                    settlement.refundAmount
                  ).toLocaleString()} has been processed for Booking #${bookingShortCode(
                    booking._id
                  )}.`,
            category: "payment",
            bookingId: booking._id,
            disputeId: dispute._id,
            targetRoute: "/client/bookings/:bookingId",
            targetRouteParams: { bookingId: booking._id },
          });
        }
      }

      if (booking.providerId) {
        await createNotification({
          userId: booking.providerId,
          type: "dispute_resolved",
          title: providerNotification.title,
          message: providerNotification.message,
          category: "dispute",
          disputeId: dispute._id,
          bookingId: booking._id,
          targetRoute: "/provider/bookings/:bookingId",
          targetRouteParams: { bookingId: booking._id },
        });

        if (
          resolutionType === "refund_partial" &&
          toAmount(settlement.providerAmount) > 0
        ) {
          await createNotification({
            userId: booking.providerId,
            type: "payment_released",
            title: "Partial payout released",
            message: `NPR ${toAmount(
              settlement.providerAmount
            ).toLocaleString()} has been released to your wallet after dispute resolution for Booking #${bookingShortCode(
              booking._id
            )}.`,
            category: "payment",
            bookingId: booking._id,
            disputeId: dispute._id,
            targetRoute: "/provider/earnings",
            targetRouteParams: { bookingId: booking._id },
          });
        }
      }

      if (
        booking.providerId &&
        ["refund_full", "refund_partial", "warning"].includes(resolutionType)
      ) {
        await recalculateProviderTrust(booking.providerId);
      }

      res.json({
        message: "Dispute resolved",
        dispute,
        booking,
        settlement: {
          totalHeld: toAmount(settlement.totalHeld),
          refundAmount: toAmount(settlement.refundAmount),
          providerAmount: toAmount(settlement.providerAmount),
          bookingStatus: booking.status,
          paymentStatus: booking.paymentStatus,
        },
      });
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;