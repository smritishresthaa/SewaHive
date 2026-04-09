// // const { refundEscrowForBooking } = require("../utils/refundEscrowForBooking");
// // const express = require("express");
// // const {
// //   authGuard,
// //   roleGuard,
// //   requireVerifiedProvider,
// // } = require("../middleware/auth");
// // const Booking = require("../models/Booking");
// // const Service = require("../models/Service");
// // const User = require("../models/User");
// // const { haversineDistance } = require("../utils/geo");
// // const { createNotification } = require("../utils/createNotification");
// // const { resolveProviderKycStatus, isKycApproved } = require("../utils/kyc");
// // const {
// //   getEmergencyRequestEligibility,
// // } = require("../middleware/emergencyEligibility");
// // const quoteAdjustmentUpload = require("../middleware/quoteAdjustmentUpload");
// // const { generateICS, generateICSFilename } = require("../utils/icsGenerator");
// // const {
// //   PRICING_TYPES,
// //   resolvePricingType,
// //   getStatusesForTab,
// //   isQuotePricing,
// //   isRangePricing,
// // } = require("../utils/bookingWorkflow");
// // const {
// //   DEFAULT_STALE_GRACE_HOURS,
// //   isActionBlockedByStaleness,
// //   shouldAutoExpireUnstartedBooking,
// // } = require("../utils/bookingStaleness");
// // const { getIO } = require("../utils/socket");

// // const router = express.Router();

// // function startOfDay(date) {
// //   const d = new Date(date);
// //   d.setHours(0, 0, 0, 0);
// //   return d;
// // }

// // function addDays(date, days) {
// //   const d = new Date(date);
// //   d.setDate(d.getDate() + days);
// //   return d;
// // }

// // function getRangeBounds(range, from, to) {
// //   const now = new Date();

// //   if (range === "today") {
// //     const start = startOfDay(now);
// //     const end = addDays(start, 1);
// //     return { start, end };
// //   }

// //   if (range === "week") {
// //     const current = startOfDay(now);
// //     const day = current.getDay();
// //     const diffToMonday = day === 0 ? 6 : day - 1;
// //     const start = addDays(current, -diffToMonday);
// //     const end = addDays(start, 7);
// //     return { start, end };
// //   }

// //   if (range === "month") {
// //     const start = new Date(now.getFullYear(), now.getMonth(), 1);
// //     const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
// //     return { start, end };
// //   }

// //   if (range === "year") {
// //     const start = new Date(now.getFullYear(), 0, 1);
// //     const end = new Date(now.getFullYear() + 1, 0, 1);
// //     return { start, end };
// //   }

// //   if (range === "custom" && from && to) {
// //     const start = startOfDay(new Date(from));
// //     const end = addDays(startOfDay(new Date(to)), 1);

// //     if (
// //       Number.isNaN(start.getTime()) ||
// //       Number.isNaN(end.getTime()) ||
// //       start >= end
// //     ) {
// //       return null;
// //     }

// //     return { start, end };
// //   }

// //   return null;
// // }

// // function isWithinBounds(value, bounds) {
// //   if (!bounds) return true;
// //   if (!value) return false;

// //   const date = new Date(value);
// //   if (Number.isNaN(date.getTime())) return false;

// //   return date >= bounds.start && date < bounds.end;
// // }

// // function getUpcomingRelevantDate(booking) {
// //   return (
// //     booking?.scheduledAt ||
// //     booking?.schedule?.date ||
// //     booking?.createdAt ||
// //     null
// //   );
// // }

// // function getPastRelevantDate(booking) {
// //   return (
// //     booking?.completedAt ||
// //     booking?.cancelledAt ||
// //     booking?.providerCompletedAt ||
// //     booking?.scheduledAt ||
// //     booking?.schedule?.date ||
// //     booking?.createdAt ||
// //     null
// //   );
// // }

// // function getProviderBookingRelevantDate(booking) {
// //   const normalizedStatus = String(booking?.status || "");

// //   const terminalStatuses = [
// //     "completed",
// //     "cancelled",
// //     "rejected",
// //     "no-show",
// //     "resolved_refunded",
// //   ];

// //   if (terminalStatuses.includes(normalizedStatus)) {
// //     return getPastRelevantDate(booking);
// //   }

// //   return getUpcomingRelevantDate(booking);
// // }

// // function computeEstimatedExtraTimeCost(
// //   totalSeconds = 0,
// //   includedHours = 0,
// //   hourlyRate = 0
// // ) {
// //   const included = Math.max(0, Number(includedHours || 0));
// //   const rate = Math.max(0, Number(hourlyRate || 0));
// //   if (included <= 0 || rate <= 0) {
// //     return 0;
// //   }
// //   const workedHours = Math.max(0, Number(totalSeconds || 0) / 3600);
// //   const extraHours = Math.max(0, workedHours - included);
// //   return Number((extraHours * rate).toFixed(2));
// // }

// // function resolveAgreedAmount(booking) {
// //   return Number(
// //     booking?.pricing?.finalApprovedPrice ||
// //       booking?.pricing?.finalPrice ||
// //       booking?.totalAmount ||
// //       0
// //   );
// // }

// // function hasSufficientEscrowForBooking(booking) {
// //   const agreedAmount = resolveAgreedAmount(booking);
// //   const heldAmount = Number(booking?.pricing?.escrowHeldAmount || 0);
// //   return heldAmount >= agreedAmount && agreedAmount > 0;
// // }

// // function normalizeServicePriceMode(raw = "fixed") {
// //   const value = String(raw || "fixed").trim().toLowerCase();

// //   if (
// //     value === "quote_required" ||
// //     value === "quote" ||
// //     value === "quote_based" ||
// //     value === "quotebased"
// //   ) {
// //     return "quote_required";
// //   }

// //   if (value === "range") return "range";
// //   return "fixed";
// // }

// // function resolveEmergencyMeta(service) {
// //   const emergencyPrice = Math.max(0, Number(service?.emergencyPrice || 0));
// //   const category = service?.categoryId;
// //   const priceMode = normalizeServicePriceMode(service?.priceMode);
// //   const supportsEmergencyPricing =
// //     priceMode === "fixed" || priceMode === "range";

// //   const categoryAllowsEmergency =
// //     category?.emergencyServiceAllowed === true &&
// //     (category?.status ? category.status === "active" : true);

// //   const serviceAvailable =
// //     service?.isActive !== false && service?.adminDisabled !== true;

// //   const canRequestEmergency =
// //     serviceAvailable &&
// //     categoryAllowsEmergency &&
// //     supportsEmergencyPricing &&
// //     emergencyPrice > 0;

// //   let blockingReason = null;

// //   if (!serviceAvailable) {
// //     blockingReason =
// //       "This service is currently unavailable for emergency booking";
// //   } else if (!supportsEmergencyPricing) {
// //     blockingReason =
// //       "Emergency booking is only supported for fixed and range services";
// //   } else if (!categoryAllowsEmergency) {
// //     blockingReason =
// //       "Emergency booking is not enabled for this service category";
// //   } else if (emergencyPrice <= 0) {
// //     blockingReason = "Emergency booking is not configured for this service";
// //   }

// //   return {
// //     emergencyPrice,
// //     priceMode,
// //     supportsEmergencyPricing,
// //     categoryAllowsEmergency,
// //     allowedByCategory: categoryAllowsEmergency,
// //     serviceAvailable,
// //     canRequestEmergency,
// //     blockingReason,
// //   };
// // }

// // function resolveBookingPricing(service, type = "normal") {
// //   const emergencyMeta = resolveEmergencyMeta(service);

// //   const emergencyFee =
// //     type === "emergency" && emergencyMeta.canRequestEmergency
// //       ? emergencyMeta.emergencyPrice
// //       : 0;

// //   const mode = resolvePricingType(service.priceMode || "fixed");
// //   const includedHours = Number(service.includedHours || 0);
// //   const hourlyRate = Number(service.hourlyRate || 0);
// //   const isHourlyService = hourlyRate > 0 && includedHours <= 0;

// //   if (mode === PRICING_TYPES.QUOTE) {
// //     return {
// //       status: "quote_requested",
// //       quote: {
// //         status: "requested",
// //         createdAt: new Date(),
// //       },
// //       price: 0,
// //       emergencyFee,
// //       totalAmount: emergencyFee,
// //       pricing: {
// //         mode,
// //         priceLabel: "Estimated Price — Final after inspection",
// //         basePrice: 0,
// //         basePriceAtBooking: 0,
// //         includedHours,
// //         hourlyRate,
// //         extraTimeCost: 0,
// //         approvedExtraTimeCost: 0,
// //         approvedAdjustmentsTotal: 0,
// //         rangeMin: 0,
// //         rangeMax: 0,
// //         finalApprovedPrice: emergencyFee,
// //         finalPrice: emergencyFee,
// //         escrowHeldAmount: 0,
// //         additionalEscrowRequired: 0,
// //       },
// //     };
// //   }

// //   if (mode === PRICING_TYPES.RANGE) {
// //     const min = Number(service.priceRange?.min || service.basePrice || 0);
// //     const max = Number(service.priceRange?.max || min);
// //     const rangeIncludedHours = 0;

// //     return {
// //       status: type === "emergency" ? "requested" : "pending_payment",
// //       quote: { status: "none" },
// //       price: min,
// //       emergencyFee,
// //       totalAmount: min + emergencyFee,
// //       pricing: {
// //         mode,
// //         priceLabel: "Estimated Range",
// //         basePrice: min,
// //         basePriceAtBooking: min,
// //         includedHours: rangeIncludedHours,
// //         hourlyRate,
// //         extraTimeCost: 0,
// //         approvedExtraTimeCost: 0,
// //         approvedAdjustmentsTotal: 0,
// //         rangeMin: min,
// //         rangeMax: max,
// //         finalApprovedPrice: min + emergencyFee,
// //         finalPrice: min + emergencyFee,
// //         escrowHeldAmount: 0,
// //         additionalEscrowRequired: 0,
// //       },
// //     };
// //   }

// //   const fixed = Number(service.basePrice || 0);

// //   return {
// //     status: type === "emergency" ? "requested" : "pending_payment",
// //     quote: { status: "none" },
// //     price: fixed,
// //     emergencyFee,
// //     totalAmount: fixed + emergencyFee,
// //     pricing: {
// //       mode: PRICING_TYPES.FIXED,
// //       priceLabel: isHourlyService
// //         ? "Minimum Service Charge"
// //         : "Fixed Service Price",
// //       basePrice: fixed,
// //       basePriceAtBooking: fixed,
// //       includedHours,
// //       hourlyRate,
// //       extraTimeCost: 0,
// //       approvedExtraTimeCost: 0,
// //       approvedAdjustmentsTotal: 0,
// //       rangeMin: 0,
// //       rangeMax: 0,
// //       finalApprovedPrice: fixed + emergencyFee,
// //       finalPrice: fixed + emergencyFee,
// //       escrowHeldAmount: 0,
// //       additionalEscrowRequired: 0,
// //     },
// //   };
// // }

// // /**
// //  * Create a normal booking
// //  */
// // router.post(
// //   "/create",
// //   authGuard,
// //   roleGuard(["client"]),
// //   async (req, res, next) => {
// //     try {
// //       if (req.user.role !== "client") {
// //         return res
// //           .status(403)
// //           .json({ message: "Only clients can create bookings" });
// //       }

// //       const { serviceId, location, schedule, addressText, landmark, notes } =
// //         req.body;

// //       if (!serviceId) {
// //         return res.status(400).json({ message: "Service ID is required" });
// //       }

// //       if (schedule && schedule.date) {
// //         const scheduledDate = new Date(schedule.date);
// //         const now = new Date();

// //         const today = new Date(
// //           now.getFullYear(),
// //           now.getMonth(),
// //           now.getDate()
// //         );
// //         const bookingDate = new Date(
// //           scheduledDate.getFullYear(),
// //           scheduledDate.getMonth(),
// //           scheduledDate.getDate()
// //         );

// //         if (bookingDate < today) {
// //           return res.status(400).json({
// //             message: "Cannot book a service for a past date",
// //             reason: "Please select a date today or in the future",
// //           });
// //         }
// //       }

// //       const service = await Service.findById(serviceId).select(
// //         "providerId categoryId priceMode basePrice emergencyPrice priceRange quoteDescription visitFee includedHours hourlyRate"
// //       );

// //       if (!service) {
// //         return res.status(404).json({ message: "Service not found" });
// //       }

// //       const providerId = String(service.providerId);

// //       const provider = await User.findById(providerId);
// //       if (!provider) {
// //         return res.status(400).json({ message: "Provider not found" });
// //       }

// //       const kycStatus = await resolveProviderKycStatus({
// //         user: provider,
// //         providerId,
// //       });

// //       if (!isKycApproved(kycStatus)) {
// //         return res.status(403).json({
// //           message: "Provider is not KYC approved",
// //           reason: "You can only book providers who are KYC approved.",
// //           kycStatus,
// //         });
// //       }

// //       const isCategoryApproved =
// //         provider.providerDetails?.approvedCategories?.some(
// //           (id) => id.toString() === service.categoryId.toString()
// //         );

// //       if (!isCategoryApproved) {
// //         return res.status(403).json({
// //           message: "Provider not approved for this category",
// //           reason:
// //             "This provider has not yet been approved to offer services in this category.",
// //         });
// //       }

// //       let distanceKm = null;
// //       if (provider?.location?.coordinates && location?.coordinates) {
// //         distanceKm = haversineDistance(
// //           provider.location.coordinates,
// //           location.coordinates
// //         );
// //         distanceKm = Math.round(distanceKm * 100) / 100;
// //       }

// //       const pricingResolved = resolveBookingPricing(service, "normal");

// //       const payload = {
// //         clientId: req.user.id,
// //         providerId,
// //         serviceId,
// //         status: pricingResolved.status,
// //         type: "normal",
// //         requestedAt: new Date(),
// //         distanceKm,
// //         location,
// //         schedule,
// //         addressText: addressText || "",
// //         landmark: landmark || "",
// //         notes: notes || "",
// //         quote: pricingResolved.quote,
// //         price: pricingResolved.price,
// //         emergencyFee: pricingResolved.emergencyFee,
// //         totalAmount: pricingResolved.totalAmount,
// //         pricing: pricingResolved.pricing,
// //         paymentStatus: "pending",
// //       };

// //       const booking = await Booking.create(payload);

// //       console.log(
// //         `[BOOKING CREATE] SUCCESS - Booking ${booking._id} created with status: ${booking.status}, clientId: ${booking.clientId}`
// //       );

// //       if (booking.status === "quote_requested") {
// //         await createNotification({
// //           userId: providerId,
// //           type: "quote_requested",
// //           title: "New Quote Request",
// //           message: `A client requested a quote before payment`,
// //           category: "booking",
// //           bookingId: booking._id,
// //           fromUserId: req.user.id,
// //         });
// //       }

// //       if (booking.status === "requested") {
// //         await createNotification({
// //           userId: providerId,
// //           type: "booking_request",
// //           title: "New Booking Request",
// //           message: `You have a new booking request from ${
// //             req.user.profile?.name || "a client"
// //           }`,
// //           category: "booking",
// //           bookingId: booking._id,
// //           fromUserId: req.user.id,
// //           sendEmail: true,
// //         });
// //       }

// //       res.json({ booking, id: booking._id });
// //     } catch (e) {
// //       next(e);
// //     }
// //   }
// // );

// // /**
// //  * Emergency request
// //  */
// // router.post(
// //   "/emergency-request",
// //   authGuard,
// //   roleGuard(["client"]),
// //   async (req, res, next) => {
// //     try {
// //       if (req.user.role !== "client") {
// //         return res
// //           .status(403)
// //           .json({ message: "Only clients can create emergency bookings" });
// //       }

// //       const { serviceId, location, addressText, landmark, notes } = req.body;

// //       if (!serviceId) {
// //         return res.status(400).json({ message: "Service ID is required" });
// //       }

// //       const service = await Service.findById(serviceId)
// //         .select(
// //           "providerId categoryId isActive adminDisabled priceMode basePrice emergencyPrice priceRange quoteDescription visitFee includedHours hourlyRate"
// //         )
// //         .populate("categoryId", "name status emergencyServiceAllowed");

// //       if (!service) {
// //         return res.status(404).json({ message: "Service not found" });
// //       }

// //       const emergencyMeta = resolveEmergencyMeta(service);

// //       if (!emergencyMeta.serviceAvailable) {
// //         return res.status(400).json({
// //           message: "This service is currently unavailable for emergency booking",
// //         });
// //       }

// //       if (!emergencyMeta.supportsEmergencyPricing) {
// //         return res.status(400).json({
// //           message:
// //             "Emergency booking is only supported for fixed and range services",
// //           reason:
// //             "Quote-based services must go through the quote workflow and cannot use emergency booking.",
// //         });
// //       }

// //       if (!emergencyMeta.categoryAllowsEmergency) {
// //         return res.status(400).json({
// //           message: "Emergency booking is not enabled for this service category",
// //           reason: "This category does not currently allow emergency services.",
// //         });
// //       }

// //       if (emergencyMeta.emergencyPrice <= 0) {
// //         return res.status(400).json({
// //           message: "Emergency booking is not configured for this service",
// //           reason: "This service needs an emergency price greater than 0.",
// //         });
// //       }

// //       const providerId = String(service.providerId);

// //       const provider = await User.findById(providerId);
// //       if (!provider) {
// //         return res.status(400).json({ message: "Provider not found" });
// //       }

// //       const isCategoryApproved =
// //         provider.providerDetails?.approvedCategories?.some(
// //           (id) =>
// //             id.toString() ===
// //             (service.categoryId?._id || service.categoryId).toString()
// //         );

// //       if (!isCategoryApproved) {
// //         return res.status(403).json({
// //           message: "Provider not approved for this category",
// //           reason:
// //             "This provider has not yet been approved to offer services in this category.",
// //         });
// //       }

// //       const eligibility = await getEmergencyRequestEligibility({
// //         providerId,
// //         serviceId,
// //         location,
// //       });

// //       if (!eligibility.ok) {
// //         if (eligibility.kycStatus && !isKycApproved(eligibility.kycStatus)) {
// //           return res.status(403).json({
// //             message: "Provider is not KYC approved",
// //             reason:
// //               "You can only request emergency services from KYC approved providers.",
// //             kycStatus: eligibility.kycStatus,
// //           });
// //         }

// //         return res.status(400).json({
// //           message: "Emergency booking not eligible",
// //           errors: eligibility.errors,
// //         });
// //       }

// //       const distanceKm = eligibility.distanceKm;

// //       const pricingResolved = resolveBookingPricing(service, "emergency");

// //       const payload = {
// //         clientId: req.user.id,
// //         type: "emergency",
// //         providerId,
// //         serviceId,
// //         status: pricingResolved.status,
// //         requestedAt: new Date(),
// //         distanceKm,
// //         location,
// //         addressText: addressText || "",
// //         landmark: landmark || "",
// //         notes: notes || "",
// //         quote: pricingResolved.quote,
// //         price: pricingResolved.price,
// //         emergencyFee: pricingResolved.emergencyFee,
// //         totalAmount: pricingResolved.totalAmount,
// //         pricing: pricingResolved.pricing,
// //         paymentStatus: "pending",
// //       };

// //       const booking = await Booking.create(payload);

// //       await createNotification({
// //         userId: req.user.id,
// //         type: "system_message",
// //         title: "Emergency Request Created",
// //         message:
// //           booking.status === "quote_requested"
// //             ? "Your emergency request has been created and a provider quote has been requested."
// //             : "Your emergency request has been created. Providers are being alerted.",
// //         category: "booking",
// //         bookingId: booking._id,
// //         fromUserId: req.user.id,
// //         metadata: { isEmergency: true, distance: distanceKm },
// //         sendEmail: false,
// //         sendSMS: false,
// //       });

// //       if (booking.status === "quote_requested") {
// //         await createNotification({
// //           userId: providerId,
// //           type: "quote_requested",
// //           title: "Emergency Quote Request",
// //           message: `Client requested an emergency quote before payment`,
// //           category: "booking",
// //           bookingId: booking._id,
// //           fromUserId: req.user.id,
// //           metadata: { isEmergency: true, distance: distanceKm },
// //           sendSMS: false,
// //         });
// //       }

// //       if (booking.status === "requested") {
// //         await createNotification({
// //           userId: providerId,
// //           type: "booking_request",
// //           title: "Emergency Booking Request",
// //           message: `Urgent emergency service request from ${
// //             req.user.profile?.name || "a client"
// //           } - ${distanceKm}km away`,
// //           category: "booking",
// //           bookingId: booking._id,
// //           fromUserId: req.user.id,
// //           metadata: { isEmergency: true, distance: distanceKm },
// //           sendEmail: true,
// //           sendSMS: false,
// //         });
// //       }

// //       res.json({ booking, id: booking._id, message: "Emergency request sent!" });
// //     } catch (e) {
// //       next(e);
// //     }
// //   }
// // );

// // /**
// //  * Provider accepts an emergency booking
// //  */
// // router.post(
// //   "/provider-accept/:id",
// //   authGuard,
// //   roleGuard(["provider"]),
// //   requireVerifiedProvider,
// //   async (req, res, next) => {
// //     try {
// //       const { id } = req.params;

// //       const booking = await Booking.findById(id);
// //       if (!booking)
// //         return res.status(404).json({ message: "Booking not found" });

// //       if (booking.type !== "emergency")
// //         return res.status(400).json({ message: "Not an emergency booking" });

// //       if (String(booking.providerId) !== req.user.id)
// //         return res.status(403).json({ message: "Not your booking" });

// //       if (booking.status !== "requested")
// //         return res.status(400).json({ message: "Emergency already handled" });

// //       booking.status = hasSufficientEscrowForBooking(booking)
// //         ? "confirmed"
// //         : "accepted";
// //       booking.acceptedAt = new Date();
// //       booking.emergency = booking.emergency || {};
// //       booking.emergency.acceptedBy = req.user.id;

// //       booking.emergency.respondedProviders =
// //         booking.emergency.respondedProviders || [];
// //       booking.emergency.respondedProviders.push(req.user.id);

// //       await booking.save();

// //       await createNotification({
// //         userId: booking.clientId,
// //         type: "booking_accepted",
// //         title: "Emergency Booking Accepted",
// //         message: "Your emergency booking has been accepted by the provider.",
// //         category: "booking",
// //         bookingId: booking._id,
// //         fromUserId: req.user.id,
// //         metadata: { isEmergency: true },
// //         sendEmail: true,
// //         sendSMS: false,
// //       });

// //       res.json({ ok: true });
// //     } catch (e) {
// //       next(e);
// //     }
// //   }
// // );

// // /**
// //  * Provider rejects emergency request
// //  */
// // router.post(
// //   "/provider-reject/:id",
// //   authGuard,
// //   roleGuard(["provider"]),
// //   requireVerifiedProvider,
// //   async (req, res, next) => {
// //     try {
// //       const { id } = req.params;

// //       const booking = await Booking.findById(id);
// //       if (!booking) {
// //         return res.status(404).json({ message: "Booking not found" });
// //       }

// //       if (booking.type !== "emergency") {
// //         return res.status(400).json({ message: "Not an emergency booking" });
// //       }

// //       if (String(booking.providerId) !== req.user.id) {
// //         return res.status(403).json({ message: "Not your booking" });
// //       }

// //       if (booking.status !== "requested") {
// //         return res.status(400).json({ message: "Emergency already handled" });
// //       }

// //       booking.status = "rejected";
// //       booking.cancelledAt = new Date();

// //       booking.emergency = booking.emergency || {};
// //       booking.emergency.respondedProviders =
// //         booking.emergency.respondedProviders || [];

// //       if (
// //         !booking.emergency.respondedProviders.some(
// //           (providerId) => String(providerId) === req.user.id
// //         )
// //       ) {
// //         booking.emergency.respondedProviders.push(req.user.id);
// //       }

// //       await booking.save();

// //       try {
// //         await refundEscrowForBooking(booking, "provider_rejected_emergency");
// //       } catch (err) {
// //         console.error("Refund failed:", err.message);
// //       }

// //       await createNotification({
// //         userId: booking.clientId,
// //         type: "payment_refunded",
// //         title: "Refund Issued",
// //         message: "Your payment has been refunded after provider rejection.",
// //         category: "payment",
// //         bookingId: booking._id,
// //       });

// //       await createNotification({
// //         userId: booking.clientId,
// //         type: "booking_cancelled",
// //         title: "Emergency Request Declined",
// //         message: "The provider declined your emergency booking request.",
// //         category: "booking",
// //         bookingId: booking._id,
// //         fromUserId: req.user.id,
// //         metadata: { isEmergency: true },
// //         sendEmail: false,
// //         sendSMS: false,
// //       });

// //       res.json({ ok: true, booking });
// //     } catch (e) {
// //       next(e);
// //     }
// //   }
// // );

// // /**
// //  * Provider accepts normal booking
// //  */
// // router.post(
// //   "/accept/:id",
// //   authGuard,
// //   roleGuard(["provider"]),
// //   requireVerifiedProvider,
// //   async (req, res, next) => {
// //     try {
// //       const { id } = req.params;

// //       const booking = await Booking.findById(id);
// //       if (!booking)
// //         return res.status(404).json({ message: "Booking not found" });

// //       if (String(booking.providerId) !== req.user.id)
// //         return res.status(403).json({ message: "Not your booking" });

// //       if (booking.status !== "requested")
// //         return res.status(400).json({ message: "Booking already handled" });

// //       booking.status = hasSufficientEscrowForBooking(booking)
// //         ? "confirmed"
// //         : "accepted";
// //       booking.acceptedAt = new Date();

// //       await booking.save();

// //       await createNotification({
// //         userId: booking.clientId,
// //         type: "booking_accepted",
// //         title: "Booking Accepted",
// //         message: `Your booking has been accepted by the provider`,
// //         category: "booking",
// //         bookingId: booking._id,
// //         fromUserId: req.user.id,
// //         sendEmail: true,
// //       });

// //       res.json({ ok: true });
// //     } catch (e) {
// //       next(e);
// //     }
// //   }
// // );

// // /**
// //  * Provider rejects normal booking
// //  */
// // router.post(
// //   "/reject/:id",
// //   authGuard,
// //   roleGuard(["provider"]),
// //   requireVerifiedProvider,
// //   async (req, res, next) => {
// //     try {
// //       const { id } = req.params;

// //       const booking = await Booking.findById(id);
// //       if (!booking)
// //         return res.status(404).json({ message: "Booking not found" });

// //       if (String(booking.providerId) !== req.user.id)
// //         return res.status(403).json({ message: "Not your booking" });

// //       if (booking.status !== "requested")
// //         return res.status(400).json({ message: "Booking already handled" });

// //       booking.status = "rejected";
// //       booking.cancelledAt = new Date();

// //       await booking.save();

// //       try {
// //         await refundEscrowForBooking(booking, "provider_rejected_normal");
// //       } catch (err) {
// //         console.error("Refund failed:", err.message);
// //       }

// //       await createNotification({
// //         userId: booking.clientId,
// //         type: "payment_refunded",
// //         title: "Refund Issued",
// //         message: "Your payment has been refunded after provider rejection.",
// //         category: "payment",
// //         bookingId: booking._id,
// //       });

// //       res.json({ ok: true });
// //     } catch (e) {
// //       next(e);
// //     }
// //   }
// // );

// // /**
// //  * PROVIDER: Mark job as complete (awaits client confirmation)
// //  */
// // router.post(
// //   "/complete/:id",
// //   authGuard,
// //   roleGuard(["provider"]),
// //   async (req, res, next) => {
// //     try {
// //       const { id } = req.params;

// //       const booking = await Booking.findById(id);
// //       if (!booking) return res.status(404).json({ message: "Not found" });

// //       if (String(booking.providerId) !== req.user.id)
// //         return res.status(403).json({ message: "Not your booking" });

// //       if (booking.disputeId || booking.status === "disputed") {
// //         const Dispute = require("../models/Dispute");
// //         const dispute = booking.disputeId
// //           ? await Dispute.findById(booking.disputeId).select("status")
// //           : null;

// //         if (
// //           !dispute ||
// //           !["resolved", "closed", "rejected"].includes(dispute.status)
// //         ) {
// //           return res.status(400).json({
// //             message: "Booking is in dispute and cannot be completed",
// //           });
// //         }
// //       }

// //       if (booking.status !== "in-progress")
// //         return res.status(400).json({
// //           message: "Job must be in-progress to mark as complete",
// //         });

// //       if (booking.pricing?.adjustment?.status === "pending_client_approval") {
// //         return res.status(400).json({
// //           message:
// //             "Cannot complete: waiting for client approval for additional charges.",
// //         });
// //       }

// //       if (Number(booking.pricing?.additionalEscrowRequired || 0) > 0) {
// //         return res.status(400).json({
// //           message: "Additional escrow payment is required before completion",
// //         });
// //       }

// //       const agreedAmount = resolveAgreedAmount(booking);
// //       const escrowHeldAmount = Number(booking.pricing?.escrowHeldAmount || 0);
// //       if (escrowHeldAmount < agreedAmount) {
// //         return res.status(400).json({
// //           message: "Escrow is insufficient for the agreed amount",
// //           additionalEscrowRequired: Number(
// //             (agreedAmount - escrowHeldAmount).toFixed(2)
// //           ),
// //         });
// //       }

// //       booking.status = "pending-completion";
// //       booking.providerCompletedAt = new Date();

// //       await booking.save();

// //       await createNotification({
// //         userId: booking.clientId,
// //         type: "booking_completed",
// //         title: "Job Completed - Confirmation Needed",
// //         message: `Provider has marked your booking as complete. Please confirm if you're satisfied with the service.`,
// //         category: "booking",
// //         bookingId: booking._id,
// //         fromUserId: req.user.id,
// //         sendEmail: true,
// //       });

// //       res.json({ ok: true, message: "Awaiting client confirmation" });
// //     } catch (e) {
// //       next(e);
// //     }
// //   }
// // );

// // /**
// //  * CLIENT: Confirm completion (final step)
// //  */
// // router.post(
// //   "/confirm-completion/:id",
// //   authGuard,
// //   roleGuard(["client"]),
// //   async (req, res, next) => {
// //     try {
// //       const { id } = req.params;

// //       const booking = await Booking.findById(id);
// //       if (!booking) return res.status(404).json({ message: "Not found" });

// //       if (String(booking.clientId) !== req.user.id)
// //         return res.status(403).json({ message: "Not your booking" });

// //       let dispute = null;
// //       if (booking.disputeId) {
// //         const Dispute = require("../models/Dispute");
// //         dispute = await Dispute.findById(booking.disputeId).select("status");
// //       }

// //       if (
// //         dispute &&
// //         !["resolved", "closed", "rejected"].includes(dispute.status)
// //       ) {
// //         return res.status(400).json({
// //           message: "Booking is in dispute and cannot be completed",
// //         });
// //       }

// //       const canCompleteDisputed =
// //         booking.status === "disputed" &&
// //         booking.providerCompletedAt &&
// //         dispute &&
// //         ["resolved", "closed", "rejected"].includes(dispute.status);

// //       if (booking.status !== "pending-completion" && !canCompleteDisputed)
// //         return res
// //           .status(400)
// //           .json({ message: "Booking not ready for completion" });

// //       if (booking.pricing?.adjustment?.status === "pending_client_approval") {
// //         return res
// //           .status(400)
// //           .json({ message: "Resolve adjusted quote before completion" });
// //       }

// //       if (Number(booking.pricing?.additionalEscrowRequired || 0) > 0) {
// //         return res.status(400).json({
// //           message: "Additional escrow payment is pending",
// //         });
// //       }

// //       const agreedAmount = resolveAgreedAmount(booking);
// //       const escrowHeldAmount = Number(booking.pricing?.escrowHeldAmount || 0);
// //       if (escrowHeldAmount < agreedAmount) {
// //         return res.status(400).json({
// //           message: "Escrow is insufficient for final agreed amount",
// //           additionalEscrowRequired: Number(
// //             (agreedAmount - escrowHeldAmount).toFixed(2)
// //           ),
// //         });
// //       }

// //       booking.status = "completed";
// //       booking.completedAt = new Date();
// //       booking.clientConfirmedAt = new Date();
// //       booking.paymentStatus = "released";
// //       await booking.save();

// //       const Payment = require("../models/Payment");
// //       const ProviderWallet = require("../models/ProviderWallet");

// //       const heldPayments = await Payment.find({
// //         bookingId: booking._id,
// //         status: "FUNDS_HELD",
// //       });
// //       const totalHeldAmount = heldPayments.reduce(
// //         (sum, entry) => sum + Number(entry.amount || 0),
// //         0
// //       );

// //       for (const payment of heldPayments) {
// //         payment.status = "RELEASED";
// //         payment.releasedAt = new Date();
// //         payment.clientConfirmedAt = new Date();
// //         await payment.save();
// //       }

// //       if (totalHeldAmount > 0) {
// //         const wallet = await ProviderWallet.findOne({
// //           providerId: booking.providerId,
// //         });
// //         if (wallet) {
// //           wallet.pendingBalance = Math.max(
// //             0,
// //             Number(wallet.pendingBalance || 0) - totalHeldAmount
// //           );
// //           wallet.availableBalance =
// //             Number(wallet.availableBalance || 0) + totalHeldAmount;
// //           wallet.totalEarned =
// //             Number(wallet.totalEarned || 0) + totalHeldAmount;
// //           await wallet.save();
// //         }
// //       }

// //       booking.pricing.escrowHeldAmount = Math.max(
// //         0,
// //         Number(booking.pricing?.escrowHeldAmount || 0) - totalHeldAmount
// //       );
// //       booking.pricing.additionalEscrowRequired = 0;
// //       await booking.save();

// //       await createNotification({
// //         userId: booking.providerId,
// //         type: "payment_released",
// //         title: "Payment Released!",
// //         message: `Client confirmed completion. NPR ${
// //           totalHeldAmount || booking.totalAmount
// //         } has been released to your wallet.`,
// //         category: "payment",
// //         bookingId: booking._id,
// //         fromUserId: req.user.id,
// //         sendEmail: true,
// //       });

// //       res.json({ ok: true, message: "Payment released to provider!" });
// //     } catch (e) {
// //       next(e);
// //     }
// //   }
// // );

// // /**
// //  * Get upcoming bookings
// //  */
// // router.get("/upcoming", authGuard, async (req, res, next) => {
// //   try {
// //     const userId = req.user.id;
// //     const userRole = req.user.role;
// //     const { range, from, to } = req.query;

// //     console.log(
// //       `\n[BOOKINGS /upcoming] START - User ${userId} (role: ${userRole})`
// //     );

// //     const q =
// //       userRole === "provider" ? { providerId: userId } : { clientId: userId };

// //     const providerActiveStatuses = [
// //       "requested",
// //       "pending_payment",
// //       "quote_requested",
// //       "quote_sent",
// //       "quote_pending_admin_review",
// //       "quote_accepted",
// //       "accepted",
// //       "confirmed",
// //       "provider_en_route",
// //       "in-progress",
// //       "pending-completion",
// //       "provider_completed",
// //       "awaiting_client_confirmation",
// //       "disputed",
// //     ];

// //     const terminalStatuses = [
// //       "completed",
// //       "cancelled",
// //       "rejected",
// //       "no-show",
// //       "resolved_refunded",
// //     ];

// //     const statusFilter =
// //       userRole === "provider"
// //         ? { $in: providerActiveStatuses }
// //         : { $nin: terminalStatuses };

// //     const bounds = getRangeBounds(range, from, to);

// //     console.log(`[BOOKINGS /upcoming] Query filter:`, JSON.stringify(q));
// //     console.log(
// //       `[BOOKINGS /upcoming] Status filter:`,
// //       userRole === "provider"
// //         ? `Include: ${providerActiveStatuses.join(", ")}`
// //         : `Exclude: ${terminalStatuses.join(", ")}`
// //     );
// //     console.log(`[BOOKINGS /upcoming] Range filter:`, {
// //       range: range || null,
// //       from: from || null,
// //       to: to || null,
// //       bounds,
// //     });

// //     const bookings = await Booking.find({
// //       ...q,
// //       status: statusFilter,
// //     })
// //       .populate("serviceId", "title category")
// //       .populate("providerId", "profile phone providerDetails")
// //       .populate("clientId", "profile email phone")
// //       .sort({ createdAt: -1, schedule: 1 });

// //     console.log(`[BOOKINGS /upcoming] Found ${bookings.length} bookings`);

// //     const activeBookings = bookings.filter(
// //       (booking) => !shouldAutoExpireUnstartedBooking(booking)
// //     );

// //     const rangedBookings = bounds
// //       ? activeBookings.filter((booking) =>
// //           isWithinBounds(getUpcomingRelevantDate(booking), bounds)
// //         )
// //       : activeBookings;

// //     if (rangedBookings.length > 0) {
// //       const summary = rangedBookings.slice(0, 5).map((b) => ({
// //         id: b._id.toString().slice(-6),
// //         status: b.status,
// //         clientId: String(b.clientId?._id || b.clientId).slice(-6),
// //         providerId: String(b.providerId?._id || b.providerId).slice(-6),
// //         serviceTitle: b.serviceId?.title,
// //         relevantDate: getUpcomingRelevantDate(b),
// //         paymentStatus: b.paymentStatus,
// //       }));
// //       console.log(
// //         `[BOOKINGS /upcoming] Sample filtered bookings:`,
// //         JSON.stringify(summary, null, 2)
// //       );
// //     }

// //     console.log(
// //       `[BOOKINGS /upcoming] Returning ${rangedBookings.length} bookings after range filtering`
// //     );
// //     console.log(`[BOOKINGS /upcoming] END\n`);

// //     res.json({ bookings: rangedBookings });
// //   } catch (e) {
// //     console.error(`[BOOKINGS /upcoming] ERROR:`, e.message);
// //     next(e);
// //   }
// // });

// // /**
// //  * Past bookings
// //  */
// // router.get("/past", authGuard, async (req, res, next) => {
// //   try {
// //     const { range, from, to, limit } = req.query;

// //     const q =
// //       req.user.role === "provider"
// //         ? { providerId: req.user.id }
// //         : { clientId: req.user.id };

// //     const bounds = getRangeBounds(range, from, to);

// //     const bookings = await Booking.find({
// //       ...q,
// //       status: {
// //         $in: [
// //           "completed",
// //           "cancelled",
// //           "rejected",
// //           "no-show",
// //           "resolved_refunded",
// //         ],
// //       },
// //     })
// //       .populate("serviceId", "title category")
// //       .populate("providerId", "profile phone providerDetails")
// //       .populate("clientId", "profile email phone")
// //       .sort({ completedAt: -1, cancelledAt: -1, createdAt: -1 });

// //     let filteredBookings = bounds
// //       ? bookings.filter((booking) =>
// //           isWithinBounds(getPastRelevantDate(booking), bounds)
// //         )
// //       : bookings;

// //     const numericLimit = Number(limit || 0);
// //     if (numericLimit > 0) {
// //       filteredBookings = filteredBookings.slice(0, numericLimit);
// //     }

// //     res.json({ bookings: filteredBookings });
// //   } catch (e) {
// //     next(e);
// //   }
// // });

// // /**
// //  * Get provider bookings with filters
// //  * UPDATED: now supports range/from/to from frontend
// //  */
// // router.get(
// //   "/provider-bookings",
// //   authGuard,
// //   roleGuard(["provider"]),
// //   async (req, res, next) => {
// //     try {
// //       const { limit = 10, status, range, from, to } = req.query;

// //       if (req.user.role !== "provider") {
// //         return res
// //           .status(403)
// //           .json({ message: "Only providers can access provider bookings" });
// //       }

// //       const query = { providerId: req.user.id };

// //       if (status) {
// //         if (status === "all") {
// //           delete query.status;
// //         } else {
// //           const mappedStatuses = getStatusesForTab(status);
// //           if (mappedStatuses.length > 0) {
// //             query.status = { $in: mappedStatuses };
// //           } else if (status === "pending-completion") {
// //             query.status = { $in: getStatusesForTab("completion_pending") };
// //           } else {
// //             query.status = status;
// //           }
// //         }
// //       }

// //       const bounds = getRangeBounds(range, from, to);

// //       const bookings = await Booking.find(query)
// //         .populate("clientId", "profile email")
// //         .populate("serviceId", "title category")
// //         .sort({ createdAt: -1 })
// //         .limit(Number(limit));

// //       const activeBookings = bookings.filter(
// //         (booking) => !shouldAutoExpireUnstartedBooking(booking)
// //       );

// //       const filteredBookings = bounds
// //         ? activeBookings.filter((booking) =>
// //             isWithinBounds(getProviderBookingRelevantDate(booking), bounds)
// //           )
// //         : activeBookings;

// //       res.json({ bookings: filteredBookings });
// //     } catch (e) {
// //       next(e);
// //     }
// //   }
// // );

// // /**
// //  * GET /api/bookings/:id
// //  * Fetch a single booking by ID
// //  */
// // router.get("/:id", authGuard, async (req, res, next) => {
// //   try {
// //     const { id } = req.params;

// //     const booking = await Booking.findById(id)
// //       .populate("clientId", "profile email phone")
// //       .populate("providerId", "profile email phone kycStatus providerDetails")
// //       .populate(
// //         "serviceId",
// //         "title description categoryId basePrice emergencyPrice priceMode priceRange quoteDescription visitFee includedHours hourlyRate"
// //       );

// //     if (!booking) {
// //       return res.status(404).json({ message: "Booking not found" });
// //     }

// //     const userId = req.user.id;
// //     const isClient = String(booking.clientId._id) === userId;
// //     const isProvider = String(booking.providerId._id) === userId;
// //     const isAdmin = req.user.role === "admin";

// //     if (!isClient && !isProvider && !isAdmin) {
// //       return res.status(403).json({ message: "Access denied" });
// //     }

// //     res.json({ booking });
// //   } catch (e) {
// //     next(e);
// //   }
// // });

// // /**
// //  * CLIENT: Confirm booking (accepted -> confirmed)
// //  */
// // router.patch(
// //   "/:id/confirm",
// //   authGuard,
// //   roleGuard(["client"]),
// //   async (req, res, next) => {
// //     try {
// //       const { id } = req.params;
// //       const { scheduledAt } = req.body;

// //       const booking = await Booking.findById(id);
// //       if (!booking) {
// //         return res.status(404).json({ message: "Booking not found" });
// //       }

// //       if (String(booking.clientId) !== req.user.id) {
// //         return res.status(403).json({ message: "Not your booking" });
// //       }

// //       if (booking.status !== "accepted") {
// //         return res.status(400).json({
// //           message: `Cannot confirm booking with status: ${booking.status}`,
// //         });
// //       }

// //       if (!hasSufficientEscrowForBooking(booking)) {
// //         return res.status(400).json({
// //           message: "Payment has not been fully secured yet",
// //         });
// //       }

// //       if (booking.type !== "normal") {
// //         return res.status(400).json({
// //           message: "Emergency bookings skip confirmation",
// //         });
// //       }

// //       booking.status = "confirmed";
// //       booking.confirmedAt = new Date();
// //       if (scheduledAt) booking.scheduledAt = new Date(scheduledAt);

// //       await booking.save();

// //       await createNotification({
// //         userId: booking.providerId,
// //         type: "booking_confirmed",
// //         title: "Booking Confirmed",
// //         message: `Client has confirmed the booking`,
// //         category: "booking",
// //         bookingId: booking._id,
// //         fromUserId: req.user.id,
// //         sendEmail: true,
// //       });

// //       res.json({ ok: true, booking });
// //     } catch (e) {
// //       next(e);
// //     }
// //   }
// // );

// // /**
// //  * PROVIDER: Mark "On The Way" (confirmed/accepted -> provider_en_route)
// //  */
// // router.patch(
// //   "/:id/en-route",
// //   authGuard,
// //   roleGuard(["provider"]),
// //   async (req, res, next) => {
// //     try {
// //       const { id } = req.params;

// //       const booking = await Booking.findById(id);
// //       if (!booking) {
// //         return res.status(404).json({ message: "Booking not found" });
// //       }

// //       if (String(booking.providerId) !== req.user.id) {
// //         return res.status(403).json({ message: "Not your booking" });
// //       }

// //       if (isActionBlockedByStaleness(booking)) {
// //         if (shouldAutoExpireUnstartedBooking(booking)) {
// //           booking.status = "no-show";
// //           booking.cancelledAt = new Date();
// //           booking.cancellation = {
// //             ...(booking.cancellation || {}),
// //             reason:
// //               "Auto-marked as no-show when provider attempted action after stale window",
// //             cancelledAt: new Date(),
// //           };
// //           await booking.save();
// //         }

// //         return res.status(400).json({
// //           message: `Booking window expired. This booking is older than ${DEFAULT_STALE_GRACE_HOURS} hours past schedule.`,
// //         });
// //       }

// //       if (!["confirmed", "accepted"].includes(booking.status)) {
// //         if (booking.status === "provider_en_route") {
// //           return res.json({ message: "Already en route", booking });
// //         }
// //         return res.status(400).json({
// //           message: `Cannot mark en route from status: ${booking.status}`,
// //         });
// //       }

// //       booking.status = "provider_en_route";
// //       booking.enRouteAt = new Date();

// //       await booking.save();

// //       await createNotification({
// //         userId: booking.clientId,
// //         type: "provider_en_route",
// //         title: "Provider On The Way!",
// //         message: `Your provider is on the way to your location`,
// //         category: "booking",
// //         bookingId: booking._id,
// //         fromUserId: req.user.id,
// //         metadata: { isEmergency: booking.type === "emergency" },
// //         sendEmail: false,
// //         sendSMS: false,
// //       });

// //       const io = getIO();
// //       if (io) {
// //         const room = `tracking:${booking._id}`;
// //         io.to(room).emit("booking_status_changed", {
// //           bookingId: String(booking._id),
// //           status: "provider_en_route",
// //         });
// //       }

// //       res.json({ ok: true, booking });
// //     } catch (e) {
// //       next(e);
// //     }
// //   }
// // );

// // /**
// //  * PROVIDER: Start job (confirmed/accepted/provider_en_route -> in-progress)
// //  */
// // router.patch(
// //   "/:id/start",
// //   authGuard,
// //   roleGuard(["provider"]),
// //   async (req, res, next) => {
// //     try {
// //       const { id } = req.params;

// //       const booking = await Booking.findById(id);
// //       if (!booking) {
// //         return res.status(404).json({ message: "Booking not found" });
// //       }

// //       if (String(booking.providerId) !== req.user.id) {
// //         return res.status(403).json({ message: "Not your booking" });
// //       }

// //       if (isActionBlockedByStaleness(booking)) {
// //         if (shouldAutoExpireUnstartedBooking(booking)) {
// //           booking.status = "no-show";
// //           booking.cancelledAt = new Date();
// //           booking.cancellation = {
// //             ...(booking.cancellation || {}),
// //             reason:
// //               "Auto-marked as no-show when provider attempted action after stale window",
// //             cancelledAt: new Date(),
// //           };
// //           await booking.save();
// //         }

// //         return res.status(400).json({
// //           message: `Booking window expired. This booking is older than ${DEFAULT_STALE_GRACE_HOURS} hours past schedule.`,
// //         });
// //       }

// //       if (
// //         !["confirmed", "accepted", "provider_en_route"].includes(booking.status)
// //       ) {
// //         return res.status(400).json({
// //           message: `Cannot start booking with status: ${booking.status}`,
// //         });
// //       }

// //       booking.status = "in-progress";
// //       booking.startedAt = new Date();
// //       booking.providerLiveLocation = {
// //         lat: null,
// //         lng: null,
// //         heading: null,
// //         speed: null,
// //         updatedAt: null,
// //       };

// //       await booking.save();

// //       const io = getIO();
// //       if (io) {
// //         const room = `tracking:${booking._id}`;
// //         io.to(room).emit("booking_status_changed", {
// //           bookingId: String(booking._id),
// //           status: "in-progress",
// //         });
// //       }

// //       await createNotification({
// //         userId: booking.clientId,
// //         type: "booking_started",
// //         title: "Job Started",
// //         message: `Provider has started working on your booking`,
// //         category: "booking",
// //         bookingId: booking._id,
// //         fromUserId: req.user.id,
// //         sendEmail: true,
// //       });

// //       res.json({ ok: true, booking });
// //     } catch (e) {
// //       next(e);
// //     }
// //   }
// // );

// // /**
// //  * CLIENT: Cancel booking
// //  */
// // router.patch(
// //   "/:id/cancel",
// //   authGuard,
// //   roleGuard(["client"]),
// //   async (req, res, next) => {
// //     try {
// //       const { id } = req.params;
// //       const { reason } = req.body;

// //       const booking = await Booking.findById(id);
// //       if (!booking) {
// //         return res.status(404).json({ message: "Booking not found" });
// //       }

// //       if (String(booking.clientId) !== req.user.id) {
// //         return res.status(403).json({ message: "Not your booking" });
// //       }

// //       const cancellableStatuses = [
// //         "pending_payment",
// //         "requested",
// //         "accepted",
// //         "confirmed",
// //         "quote_requested",
// //         "quote_sent",
// //         "quote_pending_admin_review",
// //         "quote_accepted",
// //         "pending_quote_approval",
// //       ];
// //       if (!cancellableStatuses.includes(booking.status)) {
// //         return res.status(400).json({
// //           message: `Cannot cancel booking with status: ${booking.status}`,
// //         });
// //       }

// //       booking.status = "cancelled";
// //       booking.cancelledAt = new Date();
// //       booking.cancellation = {
// //         cancelledBy: req.user.id,
// //         reason: reason || "Cancelled by client",
// //         cancelledAt: new Date(),
// //       };

// //       await booking.save();

// //       await createNotification({
// //         userId: booking.providerId,
// //         type: "booking_cancelled",
// //         title:
// //           booking.type === "emergency"
// //             ? "Emergency Booking Cancelled"
// //             : "Booking Cancelled",
// //         message: `Client has cancelled the booking. Reason: ${
// //           reason || "Not specified"
// //         }`,
// //         category: "booking",
// //         bookingId: booking._id,
// //         fromUserId: req.user.id,
// //         metadata: { isEmergency: booking.type === "emergency" },
// //         sendEmail: true,
// //         sendSMS: false,
// //       });

// //       res.json({ ok: true, booking });
// //     } catch (e) {
// //       next(e);
// //     }
// //   }
// // );

// // /**
// //  * START TIMER
// //  */
// // router.post(
// //   "/:id/timer/start",
// //   authGuard,
// //   roleGuard(["provider"]),
// //   async (req, res, next) => {
// //     try {
// //       const { id } = req.params;

// //       const booking = await Booking.findById(id);
// //       if (!booking) {
// //         return res.status(404).json({ message: "Booking not found" });
// //       }

// //       if (String(booking.providerId) !== req.user.id) {
// //         return res.status(403).json({ message: "Not your booking" });
// //       }

// //       if (booking.status !== "in-progress") {
// //         return res
// //           .status(400)
// //           .json({ message: "Job must be in-progress to start timer" });
// //       }

// //       booking.timeTracking.isTimerRunning = true;
// //       booking.timeTracking.timerStartedAt = new Date();

// //       await booking.save();

// //       res.json({
// //         ok: true,
// //         timeTracking: booking.timeTracking,
// //         message: "Timer started",
// //       });
// //     } catch (e) {
// //       next(e);
// //     }
// //   }
// // );

// // /**
// //  * PAUSE TIMER
// //  */
// // router.post(
// //   "/:id/timer/pause",
// //   authGuard,
// //   roleGuard(["provider"]),
// //   async (req, res, next) => {
// //     try {
// //       const { id } = req.params;
// //       const { totalMinutes } = req.body;

// //       const booking = await Booking.findById(id);
// //       if (!booking) {
// //         return res.status(404).json({ message: "Booking not found" });
// //       }

// //       if (String(booking.providerId) !== req.user.id) {
// //         return res.status(403).json({ message: "Not your booking" });
// //       }

// //       if (!booking.timeTracking.isTimerRunning) {
// //         return res.status(400).json({ message: "Timer is not running" });
// //       }

// //       const sessionDurationSeconds = Math.max(
// //         1,
// //         Math.round((new Date() - booking.timeTracking.timerStartedAt) / 1000)
// //       );

// //       booking.timeTracking.timerSessions.push({
// //         startedAt: booking.timeTracking.timerStartedAt,
// //         pausedAt: new Date(),
// //         durationSeconds: sessionDurationSeconds,
// //       });

// //       booking.timeTracking.totalSeconds += sessionDurationSeconds;
// //       booking.timeTracking.isTimerRunning = false;
// //       booking.timeTracking.timerStartedAt = null;

// //       booking.pricing = booking.pricing || {};
// //       booking.pricing.extraTimeCost = computeEstimatedExtraTimeCost(
// //         booking.timeTracking.totalSeconds,
// //         booking.pricing?.includedHours,
// //         booking.pricing?.hourlyRate
// //       );

// //       await booking.save();

// //       res.json({
// //         ok: true,
// //         timeTracking: booking.timeTracking,
// //         estimatedExtraCost: Number(booking.pricing?.extraTimeCost || 0),
// //         message: "Timer paused",
// //       });
// //     } catch (e) {
// //       next(e);
// //     }
// //   }
// // );

// // /**
// //  * RESET TIMER
// //  */
// // router.post(
// //   "/:id/timer/reset",
// //   authGuard,
// //   roleGuard(["provider"]),
// //   async (req, res, next) => {
// //     try {
// //       const { id } = req.params;

// //       const booking = await Booking.findById(id);
// //       if (!booking) {
// //         return res.status(404).json({ message: "Booking not found" });
// //       }

// //       if (String(booking.providerId) !== req.user.id) {
// //         return res.status(403).json({ message: "Not your booking" });
// //       }

// //       booking.timeTracking = {
// //         totalSeconds: 0,
// //         isTimerRunning: false,
// //         timerStartedAt: null,
// //         timerSessions: [],
// //       };
// //       booking.pricing = booking.pricing || {};
// //       booking.pricing.extraTimeCost = 0;

// //       await booking.save();

// //       res.json({
// //         ok: true,
// //         timeTracking: booking.timeTracking,
// //         message: "Timer reset",
// //       });
// //     } catch (e) {
// //       next(e);
// //     }
// //   }
// // );

// // /**
// //  * DOWNLOAD CALENDAR (.ics)
// //  */
// // router.get("/:id/calendar", authGuard, async (req, res, next) => {
// //   try {
// //     const { id } = req.params;

// //     const booking = await Booking.findById(id)
// //       .populate("serviceId", "title")
// //       .populate("providerId", "profile.name email phone")
// //       .populate("clientId", "profile.name email phone");

// //     if (!booking) {
// //       return res.status(404).json({ message: "Booking not found" });
// //     }

// //     const userId = req.user.id;
// //     const isClient = String(booking.clientId._id) === userId;
// //     const isProvider = String(booking.providerId._id) === userId;
// //     const isAdmin = req.user.role === "admin";

// //     if (!isClient && !isProvider && !isAdmin) {
// //       return res.status(403).json({ message: "Access denied" });
// //     }

// //     const validStatuses = [
// //       "confirmed",
// //       "accepted",
// //       "in-progress",
// //       "pending-completion",
// //       "completed",
// //     ];
// //     if (!validStatuses.includes(booking.status)) {
// //       return res.status(400).json({
// //         message: "Calendar not available for this booking status",
// //         status: booking.status,
// //       });
// //     }

// //     const icsContent = generateICS(booking);
// //     const filename = generateICSFilename(booking);

// //     res.setHeader("Content-Type", "text/calendar; charset=utf-8");
// //     res.setHeader(
// //       "Content-Disposition",
// //       `attachment; filename="${filename}"`
// //     );
// //     res.send(icsContent);
// //   } catch (e) {
// //     next(e);
// //   }
// // });

// // // ========================
// // // QUOTE WORKFLOW
// // // ========================

// // router.get(
// //   "/quotes/pending",
// //   authGuard,
// //   roleGuard(["admin"]),
// //   async (req, res, next) => {
// //     try {
// //       const pendingQuotes = await Booking.find({
// //         "quote.status": "pending_admin_review",
// //       })
// //         .populate("clientId", "profile.name email")
// //         .populate("providerId", "profile.name email")
// //         .populate("serviceId", "title")
// //         .sort({ "quote.sentAt": -1 })
// //         .limit(50);

// //       res.json({
// //         quotes: pendingQuotes,
// //         count: pendingQuotes.length,
// //       });
// //     } catch (e) {
// //       next(e);
// //     }
// //   }
// // );

// // router.post(
// //   "/:id/request-quote",
// //   authGuard,
// //   roleGuard(["client"]),
// //   async (req, res, next) => {
// //     try {
// //       const { id } = req.params;
// //       const { message } = req.body;

// //       const booking = await Booking.findById(id);
// //       if (!booking) {
// //         return res.status(404).json({ message: "Booking not found" });
// //       }

// //       if (String(booking.clientId) !== req.user.id) {
// //         return res.status(403).json({ message: "Access denied" });
// //       }

// //       const pricingType = resolvePricingType(booking);
// //       if (pricingType !== PRICING_TYPES.QUOTE) {
// //         return res.status(400).json({
// //           message:
// //             "Quote requests are only supported for quote-based services",
// //         });
// //       }

// //       if (
// //         !["requested", "pending_payment", "quote_rejected"].includes(
// //           booking.status
// //         )
// //       ) {
// //         return res.status(400).json({
// //           message: "Cannot request quote for this booking status",
// //           currentStatus: booking.status,
// //         });
// //       }

// //       if (
// //         booking.quote &&
// //         ["sent", "pending_admin_review", "approved", "accepted"].includes(
// //           booking.quote.status
// //         )
// //       ) {
// //         return res.status(400).json({
// //           message: "A quote is already pending or approved for this booking",
// //           quoteStatus: booking.quote.status,
// //           suggestion:
// //             "Wait for current quote response before requesting another quote.",
// //         });
// //       }

// //       booking.status = "quote_requested";
// //       booking.quote = {
// //         status: "requested",
// //         quoteMessage: message || "",
// //         createdAt: new Date(),
// //       };

// //       await booking.save();

// //       await createNotification({
// //         userId: booking.providerId,
// //         type: "quote_requested",
// //         title: "New Quote Request",
// //         message: `Client has requested a quote for your service`,
// //         category: "booking",
// //         bookingId: booking._id,
// //         targetRoute: "/provider/bookings/:bookingId",
// //         targetRouteParams: { bookingId: String(booking._id) },
// //         metadata: { bookingId: booking._id },
// //       });

// //       res.json({
// //         message: "Quote request sent successfully",
// //         booking,
// //       });
// //     } catch (e) {
// //       console.error("[Quote Request Error]", {
// //         bookingId: req.params.id,
// //         userId: req.user?.id,
// //         error: e.message,
// //         stack: e.stack,
// //       });
// //       next(e);
// //     }
// //   }
// // );

// // router.post(
// //   "/:id/send-quote",
// //   authGuard,
// //   roleGuard(["provider"]),
// //   requireVerifiedProvider,
// //   async (req, res, next) => {
// //     try {
// //       const { id } = req.params;
// //       const { quotedPrice, quoteMessage } = req.body;

// //       if (!quotedPrice || quotedPrice <= 0) {
// //         return res
// //           .status(400)
// //           .json({ message: "Valid quoted price is required" });
// //       }

// //       const booking = await Booking.findById(id);
// //       if (!booking) {
// //         return res.status(404).json({ message: "Booking not found" });
// //       }

// //       if (String(booking.providerId) !== req.user.id) {
// //         return res.status(403).json({ message: "Access denied" });
// //       }

// //       const pricingType = resolvePricingType(booking);
// //       if (pricingType !== PRICING_TYPES.QUOTE) {
// //         return res.status(400).json({
// //           message: "Quotes are not available for fixed-price bookings",
// //         });
// //       }

// //       if (booking.status !== "quote_requested") {
// //         return res.status(400).json({
// //           message: "No quote has been requested for this booking",
// //           currentStatus: booking.status,
// //         });
// //       }

// //       const invalidStatuses = ["cancelled", "completed", "no-show"];
// //       if (invalidStatuses.includes(booking.status)) {
// //         return res.status(400).json({
// //           message: "Cannot submit quote for cancelled or completed bookings",
// //           currentStatus: booking.status,
// //         });
// //       }

// //       const rangeMax = Number(booking.pricing?.rangeMax || 0);
// //       const isAboveRangeMax = false;

// //       booking.status = isAboveRangeMax
// //         ? "quote_pending_admin_review"
// //         : "quote_sent";
// //       booking.quote.status = isAboveRangeMax
// //         ? "pending_admin_review"
// //         : "sent";
// //       booking.quote.quotedPrice = quotedPrice;
// //       booking.quote.quoteMessage = quoteMessage || "";
// //       booking.quote.sentAt = new Date();
// //       booking.pricing.finalPrice = Number(quotedPrice);
// //       booking.pricing.maxRangeExceeded = !!isAboveRangeMax;
// //       booking.pricing.requiresAdminReview = !!isAboveRangeMax;
// //       booking.pricing.adminReviewReason = isAboveRangeMax
// //         ? `Quoted price NPR ${quotedPrice} exceeds declared maximum NPR ${rangeMax}`
// //         : "";

// //       await booking.save();

// //       if (isAboveRangeMax) {
// //         const admins = await User.find({ role: "admin" }).select("_id");
// //         for (const admin of admins) {
// //           await createNotification({
// //             userId: admin._id,
// //             type: "quote_pending_review",
// //             title: "Range Quote Above Max",
// //             message: `Quote NPR ${quotedPrice} is above configured max NPR ${rangeMax}. Review recommended.`,
// //             category: "booking",
// //             bookingId: booking._id,
// //           });
// //         }
// //       }

// //       if (isAboveRangeMax) {
// //         await createNotification({
// //           userId: booking.clientId,
// //           type: "quote_pending_review",
// //           title: "Quote Under Review",
// //           message: `Provider submitted NPR ${quotedPrice}, which is above published range. Admin review is in progress.`,
// //           category: "booking",
// //           metadata: { bookingId: booking._id },
// //         });
// //       } else {
// //         await createNotification({
// //           userId: booking.clientId,
// //           type: "quote_sent",
// //           title: "Quote Received",
// //           message: `Provider has sent a quote. Review and accept to proceed with payment.`,
// //           category: "booking",
// //           bookingId: booking._id,
// //           targetRoute: "/client/bookings/:bookingId",
// //           targetRouteParams: { bookingId: String(booking._id) },
// //           metadata: { bookingId: booking._id },
// //         });
// //       }

// //       res.json({
// //         message: isAboveRangeMax
// //           ? "Quote submitted and flagged for admin review"
// //           : "Quote sent to client",
// //         booking,
// //       });
// //     } catch (e) {
// //       console.error("[Quote Submission Error]", {
// //         bookingId: req.params.id,
// //         providerId: req.user?.id,
// //         quotedPrice: req.body.quotedPrice,
// //         error: e.message,
// //         stack: e.stack,
// //       });
// //       next(e);
// //     }
// //   }
// // );

// // router.post(
// //   "/:id/approve-quote",
// //   authGuard,
// //   roleGuard(["admin"]),
// //   async (req, res, next) => {
// //     try {
// //       const { id } = req.params;
// //       const { approvedPrice, adminComment } = req.body;

// //       const booking = await Booking.findById(id);
// //       if (!booking) {
// //         return res.status(404).json({ message: "Booking not found" });
// //       }

// //       if (booking.quote?.status !== "pending_admin_review") {
// //         return res.status(400).json({
// //           message: "Quote is not pending review",
// //           currentStatus: booking.quote?.status,
// //         });
// //       }

// //       const finalPrice = approvedPrice || booking.quote.quotedPrice;

// //       booking.status = "quote_accepted";
// //       booking.quote.status = "approved";
// //       booking.quote.approvedPrice = finalPrice;
// //       booking.quote.adminComment = adminComment || "";
// //       booking.quote.approvedAt = new Date();
// //       booking.price = finalPrice;
// //       booking.totalAmount = finalPrice;

// //       await booking.save();

// //       await createNotification({
// //         userId: booking.clientId,
// //         type: "quote_approved",
// //         title: "Quote Approved",
// //         message: `Your quote has been approved at NPR ${finalPrice}. Please proceed with payment.`,
// //         category: "booking",
// //         bookingId: booking._id,
// //         targetRoute: "/client/bookings/:bookingId",
// //         targetRouteParams: { bookingId: String(booking._id) },
// //         metadata: { bookingId: booking._id },
// //       });

// //       await createNotification({
// //         userId: booking.providerId,
// //         type: "quote_approved",
// //         title: "Quote Approved",
// //         message: `Admin has approved your quote at NPR ${finalPrice}`,
// //         category: "booking",
// //         metadata: { bookingId: booking._id },
// //       });

// //       res.json({
// //         message: "Quote approved successfully",
// //         booking,
// //       });
// //     } catch (e) {
// //       console.error("[Quote Approval Error]", {
// //         bookingId: req.params.id,
// //         adminId: req.user?.id,
// //         error: e.message,
// //         stack: e.stack,
// //       });
// //       next(e);
// //     }
// //   }
// // );

// // router.post(
// //   "/:id/reject-quote",
// //   authGuard,
// //   roleGuard(["admin"]),
// //   async (req, res, next) => {
// //     try {
// //       const { id } = req.params;
// //       const { rejectionReason } = req.body;

// //       if (!rejectionReason) {
// //         return res
// //           .status(400)
// //           .json({ message: "Rejection reason is required" });
// //       }

// //       const booking = await Booking.findById(id);
// //       if (!booking) {
// //         return res.status(404).json({ message: "Booking not found" });
// //       }

// //       if (booking.quote?.status !== "pending_admin_review") {
// //         return res.status(400).json({
// //           message: "Quote is not pending review",
// //           currentStatus: booking.quote?.status,
// //         });
// //       }

// //       booking.status = "quote_rejected";
// //       booking.quote.status = "rejected";
// //       booking.quote.rejectionReason = rejectionReason;
// //       booking.quote.rejectedAt = new Date();

// //       await booking.save();

// //       await createNotification({
// //         userId: booking.providerId,
// //         type: "quote_rejected",
// //         title: "Quote Rejected",
// //         message: `Admin rejected your quote. Reason: ${rejectionReason}`,
// //         category: "booking",
// //         metadata: { bookingId: booking._id },
// //       });

// //       await createNotification({
// //         userId: booking.clientId,
// //         type: "quote_rejected",
// //         title: "Quote Rejected",
// //         message: `The quote for this booking was rejected. You may request a new quote.`,
// //         category: "booking",
// //         bookingId: booking._id,
// //         targetRoute: "/client/bookings/:bookingId",
// //         targetRouteParams: { bookingId: String(booking._id) },
// //         metadata: { bookingId: booking._id },
// //       });

// //       res.json({
// //         message: "Quote rejected",
// //         booking,
// //       });
// //     } catch (e) {
// //       console.error("[Quote Rejection Error]", {
// //         bookingId: req.params.id,
// //         adminId: req.user?.id,
// //         error: e.message,
// //         stack: e.stack,
// //       });
// //       next(e);
// //     }
// //   }
// // );

// // router.post(
// //   "/:id/accept-quote",
// //   authGuard,
// //   roleGuard(["client"]),
// //   async (req, res, next) => {
// //     try {
// //       const { id } = req.params;

// //       const booking = await Booking.findById(id);
// //       if (!booking) {
// //         return res.status(404).json({ message: "Booking not found" });
// //       }

// //       if (String(booking.clientId) !== req.user.id) {
// //         return res.status(403).json({ message: "Access denied" });
// //       }

// //       if (!isQuotePricing(booking)) {
// //         return res.status(400).json({
// //           message:
// //             "Quote acceptance is only available for quote-based bookings",
// //         });
// //       }

// //       if (!["sent", "approved"].includes(booking.quote?.status)) {
// //         return res.status(400).json({
// //           message: "Quote is not ready for acceptance",
// //           currentStatus: booking.quote?.status,
// //         });
// //       }

// //       const finalPrice = Number(
// //         booking.quote.approvedPrice || booking.quote.quotedPrice || 0
// //       );
// //       if (finalPrice <= 0) {
// //         return res.status(400).json({ message: "Invalid quote price" });
// //       }

// //       const held = Number(booking.pricing?.escrowHeldAmount || 0);
// //       const additional = Math.max(0, finalPrice - held);

// //       booking.status = "pending_payment";
// //       booking.quote.status = "accepted";
// //       booking.quote.approvedPrice = finalPrice;
// //       booking.price = Math.max(
// //         0,
// //         finalPrice - Number(booking.emergencyFee || 0)
// //       );
// //       booking.totalAmount = finalPrice;
// //       booking.pricing.basePrice = Number(
// //         booking.pricing?.basePrice ||
// //           booking.pricing?.basePriceAtBooking ||
// //           booking.price ||
// //           0
// //       );
// //       booking.pricing.approvedAdjustmentsTotal = Math.max(
// //         0,
// //         finalPrice - Number(booking.pricing.basePrice || 0)
// //       );
// //       booking.pricing.approvedExtraTimeCost = Number(
// //         booking.pricing?.approvedExtraTimeCost || 0
// //       );
// //       booking.pricing.finalApprovedPrice = finalPrice;
// //       booking.pricing.finalPrice = finalPrice;
// //       booking.pricing.additionalEscrowRequired = additional;

// //       await booking.save();

// //       await createNotification({
// //         userId: booking.providerId,
// //         type: "quote_accepted",
// //         title: "Quote Accepted",
// //         message: `Client has accepted the quote and will proceed with payment`,
// //         category: "booking",
// //         bookingId: booking._id,
// //         targetRoute: "/provider/bookings/:bookingId",
// //         targetRouteParams: { bookingId: String(booking._id) },
// //         metadata: { bookingId: booking._id },
// //       });

// //       res.json({
// //         message: "Quote accepted. Please proceed with payment.",
// //         booking,
// //         paymentAmount:
// //           additional > 0 ? additional : booking.quote.approvedPrice,
// //       });
// //     } catch (e) {
// //       console.error("[Quote Acceptance Error]", {
// //         bookingId: req.params.id,
// //         clientId: req.user?.id,
// //         error: e.message,
// //         stack: e.stack,
// //       });
// //       next(e);
// //     }
// //   }
// // );

// // router.post(
// //   "/:id/propose-adjusted-quote",
// //   authGuard,
// //   roleGuard(["provider"]),
// //   quoteAdjustmentUpload.array("attachments", 5),
// //   async (req, res, next) => {
// //     try {
// //       const { id } = req.params;
// //       const { proposedPrice, reason } = req.body;

// //       const booking = await Booking.findById(id);
// //       if (!booking)
// //         return res.status(404).json({ message: "Booking not found" });

// //       if (String(booking.providerId) !== req.user.id) {
// //         return res.status(403).json({ message: "Access denied" });
// //       }

// //       if (!isRangePricing(booking)) {
// //         return res.status(400).json({
// //           message:
// //             "Additional charge requests are only available for range pricing",
// //         });
// //       }

// //       if (booking.status !== "in-progress") {
// //         return res.status(400).json({
// //           message:
// //             "Adjusted quote can only be proposed while booking is in-progress",
// //         });
// //       }

// //       const nextPrice = Number(proposedPrice);
// //       if (!nextPrice || nextPrice <= 0) {
// //         return res
// //           .status(400)
// //           .json({ message: "Valid proposedPrice is required" });
// //       }

// //       if (!String(reason || "").trim()) {
// //         return res.status(400).json({
// //           message: "Reason is required for adjusted quote",
// //         });
// //       }

// //       const attachments = (req.files || []).map((file) => ({
// //         url: file.path,
// //         originalName: file.originalname,
// //         size: file.size,
// //         mimeType: file.mimetype,
// //       }));

// //       const max = Number(booking.pricing?.rangeMax || 0);
// //       const isRange = booking.pricing?.mode === "range";
// //       const aboveMax = isRange && max > 0 && nextPrice > max;
// //       const basePrice = Number(
// //         booking.pricing?.basePrice || booking.pricing?.basePriceAtBooking || 0
// //       );
// //       const extraTimeCost = Number(booking.pricing?.extraTimeCost || 0);

// //       booking.pricing.adjustment = {
// //         status: "pending_client_approval",
// //         proposedPrice: nextPrice,
// //         basePrice,
// //         extraTimeCost,
// //         adjustedQuoteReason: reason.trim(),
// //         reason: reason.trim(),
// //         attachments,
// //         proposedBy: req.user.id,
// //         proposedAt: new Date(),
// //       };

// //       booking.pricing.adjustmentHistory =
// //         booking.pricing.adjustmentHistory || [];
// //       booking.pricing.adjustmentHistory.push({
// //         proposedPrice: nextPrice,
// //         basePrice,
// //         extraTimeCost,
// //         adjustedQuoteReason: reason.trim(),
// //         reason: reason.trim(),
// //         attachments,
// //         proposedBy: req.user.id,
// //         proposedAt: new Date(),
// //         status: "pending_client_approval",
// //       });

// //       booking.pricing.maxRangeExceeded = !!aboveMax;
// //       booking.pricing.requiresAdminReview = !!aboveMax;
// //       booking.pricing.adminReviewReason = aboveMax
// //         ? `Adjusted quote NPR ${nextPrice} exceeds range max NPR ${max}`
// //         : "";

// //       await booking.save();

// //       await createNotification({
// //         userId: booking.clientId,
// //         type: "adjusted_quote_proposed",
// //         title: "Adjusted Quote Proposed",
// //         message: aboveMax
// //           ? `Provider proposed NPR ${nextPrice} (above range max NPR ${max}). Your approval is required.`
// //           : `Provider proposed a new price of NPR ${nextPrice}. Your approval is required.`,
// //         category: "booking",
// //         bookingId: booking._id,
// //       });

// //       if (aboveMax) {
// //         const admins = await User.find({ role: "admin" }).select("_id");
// //         for (const admin of admins) {
// //           await createNotification({
// //             userId: admin._id,
// //             type: "quote_pending_review",
// //             title: "Adjusted Quote Above Max",
// //             message: `Booking ${booking._id
// //               .toString()
// //               .slice(-6)} adjusted quote exceeded range max.`,
// //             category: "admin",
// //             bookingId: booking._id,
// //           });
// //         }
// //       }

// //       res.json({
// //         message: aboveMax
// //           ? "Adjusted quote sent to client and flagged for admin review"
// //           : "Adjusted quote sent to client",
// //         booking,
// //         breakdown: {
// //           basePrice,
// //           extraTimeCost,
// //           proposedTotal: nextPrice,
// //         },
// //         warning: aboveMax
// //           ? "Proposed price exceeds configured range max. Admin review recommended."
// //           : null,
// //       });
// //     } catch (e) {
// //       next(e);
// //     }
// //   }
// // );

// // router.post(
// //   "/:id/respond-adjusted-quote",
// //   authGuard,
// //   roleGuard(["client"]),
// //   async (req, res, next) => {
// //     try {
// //       const { id } = req.params;
// //       const { action } = req.body;

// //       if (!["accept", "reject"].includes(action)) {
// //         return res
// //           .status(400)
// //           .json({ message: "action must be accept or reject" });
// //       }

// //       const booking = await Booking.findById(id);
// //       if (!booking)
// //         return res.status(404).json({ message: "Booking not found" });

// //       if (String(booking.clientId) !== req.user.id) {
// //         return res.status(403).json({ message: "Access denied" });
// //       }

// //       if (booking.pricing?.adjustment?.status !== "pending_client_approval") {
// //         return res.status(400).json({ message: "No pending adjusted quote" });
// //       }

// //       const adjustment = booking.pricing.adjustment;

// //       if (action === "accept") {
// //         const approvedTotal = Number(adjustment.proposedPrice || 0);
// //         const held = Number(booking.pricing?.escrowHeldAmount || 0);
// //         const additional = Math.max(0, approvedTotal - held);
// //         const basePrice = Number(
// //           booking.pricing?.basePrice || booking.pricing?.basePriceAtBooking || 0
// //         );
// //         const approvedExtraTimeCost = Number(
// //           adjustment.extraTimeCost || booking.pricing?.extraTimeCost || 0
// //         );
// //         const approvedAdjustmentsTotal = Math.max(
// //           0,
// //           approvedTotal - basePrice
// //         );

// //         booking.totalAmount = approvedTotal;
// //         booking.price = Math.max(
// //           0,
// //           approvedTotal - Number(booking.emergencyFee || 0)
// //         );
// //         booking.pricing.basePrice = basePrice;
// //         booking.pricing.approvedExtraTimeCost = approvedExtraTimeCost;
// //         booking.pricing.approvedAdjustmentsTotal = approvedAdjustmentsTotal;
// //         booking.pricing.finalApprovedPrice = approvedTotal;
// //         booking.pricing.finalPrice = approvedTotal;
// //         booking.pricing.additionalEscrowRequired = additional;
// //         booking.pricing.adjustment.status = "accepted";
// //         booking.pricing.adjustment.clientDecisionAt = new Date();

// //         const lastHistory =
// //           booking.pricing.adjustmentHistory?.[
// //             booking.pricing.adjustmentHistory.length - 1
// //           ];
// //         if (lastHistory && lastHistory.status === "pending_client_approval") {
// //           lastHistory.status = "accepted";
// //           lastHistory.decidedAt = new Date();
// //         }

// //         await booking.save();

// //         await createNotification({
// //           userId: booking.providerId,
// //           type: "adjusted_quote_accepted",
// //           title: "Adjusted Quote Accepted",
// //           message:
// //             additional > 0
// //               ? `Client accepted the adjusted quote. Additional NPR ${additional} escrow payment is pending.`
// //               : `Client accepted the adjusted quote.`,
// //           category: "booking",
// //           bookingId: booking._id,
// //         });

// //         return res.json({
// //           message:
// //             additional > 0
// //               ? "Adjusted quote accepted. Please complete additional escrow payment before completion."
// //               : "Adjusted quote accepted",
// //           booking,
// //           amountDue: additional,
// //           breakdown: {
// //             basePrice,
// //             approvedExtraTimeCost,
// //             approvedAdjustmentsTotal,
// //             finalApprovedPrice: approvedTotal,
// //           },
// //         });
// //       }

// //       booking.pricing.adjustment.status = "rejected";
// //       booking.pricing.adjustment.clientDecisionAt = new Date();
// //       const lastHistory =
// //         booking.pricing.adjustmentHistory?.[
// //           booking.pricing.adjustmentHistory.length - 1
// //         ];
// //       if (lastHistory && lastHistory.status === "pending_client_approval") {
// //         lastHistory.status = "rejected";
// //         lastHistory.decidedAt = new Date();
// //       }
// //       await booking.save();

// //       await createNotification({
// //         userId: booking.providerId,
// //         type: "adjusted_quote_rejected",
// //         title: "Adjusted Quote Rejected",
// //         message: "Client rejected the adjusted quote.",
// //         category: "booking",
// //         bookingId: booking._id,
// //       });

// //       res.json({ message: "Adjusted quote rejected", booking });
// //     } catch (e) {
// //       next(e);
// //     }
// //   }
// // );

// // /**
// //  * DIAGNOSTIC ENDPOINT
// //  */
// // router.get("/debug/my-bookings-check", authGuard, async (req, res, next) => {
// //   try {
// //     const userId = req.user.id;
// //     const userRole = req.user.role;

// //     const clientBookings = await Booking.find({ clientId: userId });
// //     const providerBookings = await Booking.find({ providerId: userId });

// //     const q =
// //       userRole === "provider"
// //         ? { providerId: userId }
// //         : { clientId: userId };
// //     const upcomingBookings = await Booking.find({
// //       ...q,
// //       status: {
// //         $in: [
// //           "requested",
// //           "pending_payment",
// //           "quote_requested",
// //           "quote_sent",
// //           "quote_pending_admin_review",
// //           "quote_accepted",
// //           "accepted",
// //           "confirmed",
// //           "provider_en_route",
// //           "in-progress",
// //           "pending-completion",
// //           "provider_completed",
// //           "awaiting_client_confirmation",
// //           "disputed",
// //         ],
// //       },
// //     });

// //     res.json({
// //       debug: {
// //         authenticatedUserId: userId,
// //         authenticatedUserRole: userRole,
// //         totalClientBookings: clientBookings.length,
// //         totalProviderBookings: providerBookings.length,
// //         upcomingBookingsMatchingQuery: upcomingBookings.length,
// //       },
// //       clientBookings: clientBookings.map((b) => ({
// //         _id: b._id,
// //         clientId: b.clientId,
// //         providerId: b.providerId,
// //         status: b.status,
// //         schedule: b.schedule,
// //       })),
// //       providerBookings: providerBookings.map((b) => ({
// //         _id: b._id,
// //         clientId: b.clientId,
// //         providerId: b.providerId,
// //         status: b.status,
// //         schedule: b.schedule,
// //       })),
// //       upcomingBookings: upcomingBookings.map((b) => ({
// //         _id: b._id,
// //         clientId: b.clientId,
// //         providerId: b.providerId,
// //         status: b.status,
// //         schedule: b.schedule,
// //       })),
// //     });
// //   } catch (e) {
// //     next(e);
// //   }
// // });

// // module.exports = router;

// const { refundEscrowForBooking } = require("../utils/refundEscrowForBooking");
// const express = require("express");
// const {
//   authGuard,
//   roleGuard,
//   requireVerifiedProvider,
// } = require("../middleware/auth");
// const Booking = require("../models/Booking");
// const Service = require("../models/Service");
// const User = require("../models/User");
// const { haversineDistance } = require("../utils/geo");
// const { createNotification } = require("../utils/createNotification");
// const { resolveProviderKycStatus, isKycApproved } = require("../utils/kyc");
// const {
//   getEmergencyRequestEligibility,
// } = require("../middleware/emergencyEligibility");
// const quoteAdjustmentUpload = require("../middleware/quoteAdjustmentUpload");
// const { generateICS, generateICSFilename } = require("../utils/icsGenerator");
// const {
//   PRICING_TYPES,
//   resolvePricingType,
//   getStatusesForTab,
//   isQuotePricing,
//   isRangePricing,
// } = require("../utils/bookingWorkflow");
// const {
//   DEFAULT_STALE_GRACE_HOURS,
//   resolveScheduledStartAt,
//   isActionBlockedByStaleness,
//   shouldExpireUnansweredRequest,
//   shouldAutoExpireUnstartedBooking,
// } = require("../utils/bookingStaleness");
// const { getIO } = require("../utils/socket");
// const { recalculateProviderTrust } = require("../utils/trustScoring");

// const router = express.Router();

// function toAmount(value) {
//   const num = Number(value || 0);
//   return Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
// }

// async function markBookingAsNoShowAndRefund(
//   booking,
//   reason = "provider_no_show"
// ) {
//   booking.status = "no-show";
//   booking.cancelledAt = new Date();
//   booking.cancellation = {
//     ...(booking.cancellation || {}),
//     reason,
//     cancelledAt: new Date(),
//   };

//   await booking.save();

//   const refundedAmount = await refundEscrowForBooking(booking, reason);

//   await Promise.allSettled([
//     createNotification({
//       userId: booking.clientId,
//       type: "booking_no_show",
//       title: "Booking Expired - Provider No Show",
//       message:
//         refundedAmount > 0
//           ? `The provider did not arrive/start on time. Your booking was marked as expired and NPR ${toAmount(
//               refundedAmount
//             ).toLocaleString()} has been refunded.`
//           : "The provider did not arrive/start on time. Your booking was marked as expired.",
//       category: "booking",
//       bookingId: booking._id,
//       metadata: { refundedAmount: toAmount(refundedAmount), reason },
//     }),
//     createNotification({
//       userId: booking.providerId,
//       type: "booking_no_show",
//       title: "Booking Expired - No Show Recorded",
//       message:
//         refundedAmount > 0
//           ? `This booking is now marked as no-show. Client refund issued: NPR ${toAmount(
//               refundedAmount
//             ).toLocaleString()}. Your trust score may decrease.`
//           : "This booking is now marked as no-show. Your trust score may decrease.",
//       category: "booking",
//       bookingId: booking._id,
//       metadata: { refundedAmount: toAmount(refundedAmount), reason },
//     }),
//     refundedAmount > 0
//       ? createNotification({
//           userId: booking.clientId,
//           type: "payment_refunded",
//           title: "Refund Issued",
//           message: `NPR ${toAmount(refundedAmount).toLocaleString()} has been refunded for this booking.`,
//           category: "payment",
//           bookingId: booking._id,
//           metadata: { refundedAmount: toAmount(refundedAmount), reason },
//         })
//       : Promise.resolve(null),
//   ]);

//   if (booking.providerId) {
//     await recalculateProviderTrust(booking.providerId);
//   }

//   return { booking, refundedAmount };
// }

// async function expireUnansweredRequestAndRefund(
//   booking,
//   reason = "provider_no_response_before_schedule"
// ) {
//   booking.status = "expired";
//   booking.cancelledAt = new Date();
//   booking.cancellation = {
//     ...(booking.cancellation || {}),
//     reason,
//     cancelledAt: new Date(),
//   };

//   await booking.save();

//   const refundedAmount = await refundEscrowForBooking(booking, reason);

//   await Promise.allSettled([
//     createNotification({
//       userId: booking.clientId,
//       type: "booking_cancelled",
//       title: "Booking Request Expired",
//       message:
//         refundedAmount > 0
//           ? `Your booking request expired because the provider did not respond before the scheduled service time. NPR ${toAmount(
//               refundedAmount
//             ).toLocaleString()} has been refunded.`
//           : "Your booking request expired because the provider did not respond before the scheduled service time.",
//       category: "booking",
//       bookingId: booking._id,
//       metadata: { refundedAmount: toAmount(refundedAmount), reason },
//     }),
//     createNotification({
//       userId: booking.providerId,
//       type: "booking_cancelled",
//       title: "Booking Request Expired",
//       message:
//         "This booking request expired because no action was taken before the scheduled service time.",
//       category: "booking",
//       bookingId: booking._id,
//       metadata: { refundedAmount: toAmount(refundedAmount), reason },
//     }),
//     refundedAmount > 0
//       ? createNotification({
//           userId: booking.clientId,
//           type: "payment_refunded",
//           title: "Refund Issued",
//           message: `NPR ${toAmount(refundedAmount).toLocaleString()} has been refunded for this expired booking request.`,
//           category: "payment",
//           bookingId: booking._id,
//           metadata: { refundedAmount: toAmount(refundedAmount), reason },
//         })
//       : Promise.resolve(null),
//   ]);

//   if (booking.providerId) {
//     await recalculateProviderTrust(booking.providerId);
//   }

//   return { booking, refundedAmount };
// }

// async function processBookingLifecycleTimeouts(booking) {
//   if (!booking) return booking;

//   if (shouldExpireUnansweredRequest(booking)) {
//     await expireUnansweredRequestAndRefund(
//       booking,
//       "provider_no_response_before_schedule"
//     );
//     return booking;
//   }

//   if (shouldAutoExpireUnstartedBooking(booking)) {
//     await markBookingAsNoShowAndRefund(
//       booking,
//       "provider_no_show_after_stale_action"
//     );
//     return booking;
//   }

//   return booking;
// }

// function startOfDay(date) {
//   const d = new Date(date);
//   d.setHours(0, 0, 0, 0);
//   return d;
// }

// function addDays(date, days) {
//   const d = new Date(date);
//   d.setDate(d.getDate() + days);
//   return d;
// }

// function getRangeBounds(range, from, to) {
//   const now = new Date();

//   if (range === "today") {
//     const start = startOfDay(now);
//     const end = addDays(start, 1);
//     return { start, end };
//   }

//   if (range === "week") {
//     const current = startOfDay(now);
//     const day = current.getDay();
//     const diffToMonday = day === 0 ? 6 : day - 1;
//     const start = addDays(current, -diffToMonday);
//     const end = addDays(start, 7);
//     return { start, end };
//   }

//   if (range === "month") {
//     const start = new Date(now.getFullYear(), now.getMonth(), 1);
//     const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
//     return { start, end };
//   }

//   if (range === "year") {
//     const start = new Date(now.getFullYear(), 0, 1);
//     const end = new Date(now.getFullYear() + 1, 0, 1);
//     return { start, end };
//   }

//   if (range === "custom" && from && to) {
//     const start = startOfDay(new Date(from));
//     const end = addDays(startOfDay(new Date(to)), 1);

//     if (
//       Number.isNaN(start.getTime()) ||
//       Number.isNaN(end.getTime()) ||
//       start >= end
//     ) {
//       return null;
//     }

//     return { start, end };
//   }

//   return null;
// }

// function isWithinBounds(value, bounds) {
//   if (!bounds) return true;
//   if (!value) return false;

//   const date = new Date(value);
//   if (Number.isNaN(date.getTime())) return false;

//   return date >= bounds.start && date < bounds.end;
// }

// function getRequestedRelevantDate(booking) {
//   return booking?.requestedAt || booking?.createdAt || null;
// }

// function getScheduledRelevantDate(booking) {
//   return (
//     booking?.scheduledAt ||
//     booking?.schedule?.date ||
//     booking?.requestedAt ||
//     booking?.createdAt ||
//     null
//   );
// }

// function getUpcomingRelevantDate(booking) {
//   return getBookingStatusTransitionDate(booking);
// }

// function getPastRelevantDate(booking) {
//   return (
//     booking?.completedAt ||
//     booking?.cancelledAt ||
//     booking?.providerCompletedAt ||
//     booking?.scheduledAt ||
//     booking?.schedule?.date ||
//     booking?.requestedAt ||
//     booking?.createdAt ||
//     null
//   );
// }

// function getProviderBookingRelevantDate(booking) {
//   return getBookingStatusTransitionDate(booking);
// }

// function getBookingStatusTransitionDate(booking) {
//   const status = String(booking?.status || "").trim().toLowerCase();

//   const fallbackRequested = booking?.requestedAt || booking?.createdAt || null;
//   const fallbackScheduled =
//     resolveScheduledStartAt(booking) ||
//     booking?.scheduledAt ||
//     booking?.schedule?.date ||
//     null;
//   const fallbackClosed =
//     booking?.completedAt ||
//     booking?.cancelledAt ||
//     booking?.providerCompletedAt ||
//     booking?.updatedAt ||
//     fallbackScheduled ||
//     fallbackRequested;

//   switch (status) {
//     case "pending_payment":
//     case "requested":
//       return fallbackRequested;

//     case "quote_requested":
//       return booking?.quote?.createdAt || fallbackRequested;

//     case "quote_sent":
//     case "quote_pending_admin_review":
//       return booking?.quote?.sentAt || booking?.quote?.createdAt || booking?.updatedAt || fallbackRequested;

//     case "quote_rejected":
//       return booking?.quote?.rejectedAt || booking?.updatedAt || fallbackRequested;

//     case "quote_accepted":
//       return booking?.quote?.approvedAt || booking?.updatedAt || fallbackRequested;

//     case "accepted":
//       return booking?.acceptedAt || booking?.confirmedAt || booking?.updatedAt || fallbackRequested;

//     case "confirmed":
//       return booking?.confirmedAt || booking?.acceptedAt || booking?.updatedAt || fallbackScheduled || fallbackRequested;

//     case "provider_en_route":
//       return booking?.enRouteAt || booking?.updatedAt || fallbackScheduled || fallbackRequested;

//     case "in-progress":
//     case "in_progress":
//       return booking?.startedAt || booking?.updatedAt || fallbackScheduled || fallbackRequested;

//     case "provider_completed":
//     case "awaiting_client_confirmation":
//     case "pending-completion":
//     case "pending_completion":
//     case "completion_pending":
//       return booking?.providerCompletedAt || booking?.updatedAt || fallbackScheduled || fallbackRequested;

//     case "disputed":
//       return booking?.updatedAt || booking?.providerCompletedAt || fallbackScheduled || fallbackRequested;

//     case "completed":
//     case "resolved_refunded":
//       return booking?.completedAt || booking?.updatedAt || fallbackClosed;

//     case "cancelled":
//     case "rejected":
//     case "expired":
//     case "no-show":
//     case "no_show":
//       return booking?.cancelledAt || booking?.updatedAt || fallbackClosed;

//     default:
//       return booking?.updatedAt || fallbackScheduled || fallbackRequested;
//   }
// }

// function getDashboardRangeRelevantDate(booking) {
//   return getBookingStatusTransitionDate(booking);
// }

// function computeEstimatedExtraTimeCost(
//   totalSeconds = 0,
//   includedHours = 0,
//   hourlyRate = 0
// ) {
//   const included = Math.max(0, Number(includedHours || 0));
//   const rate = Math.max(0, Number(hourlyRate || 0));
//   if (included <= 0 || rate <= 0) {
//     return 0;
//   }
//   const workedHours = Math.max(0, Number(totalSeconds || 0) / 3600);
//   const extraHours = Math.max(0, workedHours - included);
//   return Number((extraHours * rate).toFixed(2));
// }

// function resolveAgreedAmount(booking) {
//   return Number(
//     booking?.pricing?.finalApprovedPrice ||
//       booking?.pricing?.finalPrice ||
//       booking?.totalAmount ||
//       0
//   );
// }

// function hasSufficientEscrowForBooking(booking) {
//   const agreedAmount = resolveAgreedAmount(booking);
//   const heldAmount = Number(booking?.pricing?.escrowHeldAmount || 0);
//   return heldAmount >= agreedAmount && agreedAmount > 0;
// }

// function normalizeServicePriceMode(raw = "fixed") {
//   const value = String(raw || "fixed").trim().toLowerCase();

//   if (
//     value === "quote_required" ||
//     value === "quote" ||
//     value === "quote_based" ||
//     value === "quotebased"
//   ) {
//     return "quote_required";
//   }

//   if (value === "range") return "range";
//   return "fixed";
// }

// function resolveEmergencyMeta(service) {
//   const emergencyPrice = Math.max(0, Number(service?.emergencyPrice || 0));
//   const category = service?.categoryId;
//   const priceMode = normalizeServicePriceMode(service?.priceMode);
//   const supportsEmergencyPricing =
//     priceMode === "fixed" || priceMode === "range";

//   const categoryAllowsEmergency =
//     category?.emergencyServiceAllowed === true &&
//     (category?.status ? category.status === "active" : true);

//   const serviceAvailable =
//     service?.isActive !== false && service?.adminDisabled !== true;

//   const canRequestEmergency =
//     serviceAvailable &&
//     categoryAllowsEmergency &&
//     supportsEmergencyPricing &&
//     emergencyPrice > 0;

//   let blockingReason = null;

//   if (!serviceAvailable) {
//     blockingReason =
//       "This service is currently unavailable for emergency booking";
//   } else if (!supportsEmergencyPricing) {
//     blockingReason =
//       "Emergency booking is only supported for fixed and range services";
//   } else if (!categoryAllowsEmergency) {
//     blockingReason =
//       "Emergency booking is not enabled for this service category";
//   } else if (emergencyPrice <= 0) {
//     blockingReason = "Emergency booking is not configured for this service";
//   }

//   return {
//     emergencyPrice,
//     priceMode,
//     supportsEmergencyPricing,
//     categoryAllowsEmergency,
//     allowedByCategory: categoryAllowsEmergency,
//     serviceAvailable,
//     canRequestEmergency,
//     blockingReason,
//   };
// }

// function resolveBookingPricing(service, type = "normal") {
//   const emergencyMeta = resolveEmergencyMeta(service);

//   const emergencyFee =
//     type === "emergency" && emergencyMeta.canRequestEmergency
//       ? emergencyMeta.emergencyPrice
//       : 0;

//   const mode = resolvePricingType(service.priceMode || "fixed");
//   const includedHours = Number(service.includedHours || 0);
//   const hourlyRate = Number(service.hourlyRate || 0);
//   const isHourlyService = hourlyRate > 0 && includedHours <= 0;

//   if (mode === PRICING_TYPES.QUOTE) {
//     return {
//       status: "quote_requested",
//       quote: {
//         status: "requested",
//         createdAt: new Date(),
//       },
//       price: 0,
//       emergencyFee,
//       totalAmount: emergencyFee,
//       pricing: {
//         mode,
//         priceLabel: "Estimated Price — Final after inspection",
//         basePrice: 0,
//         basePriceAtBooking: 0,
//         includedHours,
//         hourlyRate,
//         extraTimeCost: 0,
//         approvedExtraTimeCost: 0,
//         approvedAdjustmentsTotal: 0,
//         rangeMin: 0,
//         rangeMax: 0,
//         finalApprovedPrice: emergencyFee,
//         finalPrice: emergencyFee,
//         escrowHeldAmount: 0,
//         additionalEscrowRequired: 0,
//       },
//     };
//   }

//   if (mode === PRICING_TYPES.RANGE) {
//     const min = Number(service.priceRange?.min || service.basePrice || 0);
//     const max = Number(service.priceRange?.max || min);
//     const rangeIncludedHours = 0;

//     return {
//       status: type === "emergency" ? "requested" : "pending_payment",
//       quote: { status: "none" },
//       price: min,
//       emergencyFee,
//       totalAmount: min + emergencyFee,
//       pricing: {
//         mode,
//         priceLabel: "Estimated Range",
//         basePrice: min,
//         basePriceAtBooking: min,
//         includedHours: rangeIncludedHours,
//         hourlyRate,
//         extraTimeCost: 0,
//         approvedExtraTimeCost: 0,
//         approvedAdjustmentsTotal: 0,
//         rangeMin: min,
//         rangeMax: max,
//         finalApprovedPrice: min + emergencyFee,
//         finalPrice: min + emergencyFee,
//         escrowHeldAmount: 0,
//         additionalEscrowRequired: 0,
//       },
//     };
//   }

//   const fixed = Number(service.basePrice || 0);

//   return {
//     status: type === "emergency" ? "requested" : "pending_payment",
//     quote: { status: "none" },
//     price: fixed,
//     emergencyFee,
//     totalAmount: fixed + emergencyFee,
//     pricing: {
//       mode: PRICING_TYPES.FIXED,
//       priceLabel: isHourlyService
//         ? "Minimum Service Charge"
//         : "Fixed Service Price",
//       basePrice: fixed,
//       basePriceAtBooking: fixed,
//       includedHours,
//       hourlyRate,
//       extraTimeCost: 0,
//       approvedExtraTimeCost: 0,
//       approvedAdjustmentsTotal: 0,
//       rangeMin: 0,
//       rangeMax: 0,
//       finalApprovedPrice: fixed + emergencyFee,
//       finalPrice: fixed + emergencyFee,
//       escrowHeldAmount: 0,
//       additionalEscrowRequired: 0,
//     },
//   };
// }

// /**
//  * Create a normal booking
//  */
// router.post(
//   "/create",
//   authGuard,
//   roleGuard(["client"]),
//   async (req, res, next) => {
//     try {
//       if (req.user.role !== "client") {
//         return res
//           .status(403)
//           .json({ message: "Only clients can create bookings" });
//       }

//       const { serviceId, location, schedule, addressText, landmark, notes } =
//         req.body;

//       if (!serviceId) {
//         return res.status(400).json({ message: "Service ID is required" });
//       }

//       if (schedule && schedule.date) {
//         const scheduledDate = new Date(schedule.date);
//         const now = new Date();

//         const today = new Date(
//           now.getFullYear(),
//           now.getMonth(),
//           now.getDate()
//         );
//         const bookingDate = new Date(
//           scheduledDate.getFullYear(),
//           scheduledDate.getMonth(),
//           scheduledDate.getDate()
//         );

//         if (bookingDate < today) {
//           return res.status(400).json({
//             message: "Cannot book a service for a past date",
//             reason: "Please select a date today or in the future",
//           });
//         }
//       }

//       const service = await Service.findById(serviceId).select(
//         "providerId categoryId priceMode basePrice emergencyPrice priceRange quoteDescription visitFee includedHours hourlyRate"
//       );

//       if (!service) {
//         return res.status(404).json({ message: "Service not found" });
//       }

//       const providerId = String(service.providerId);

//       const provider = await User.findById(providerId);
//       if (!provider) {
//         return res.status(400).json({ message: "Provider not found" });
//       }

//       const kycStatus = await resolveProviderKycStatus({
//         user: provider,
//         providerId,
//       });

//       if (!isKycApproved(kycStatus)) {
//         return res.status(403).json({
//           message: "Provider is not KYC approved",
//           reason: "You can only book providers who are KYC approved.",
//           kycStatus,
//         });
//       }

//       const isCategoryApproved =
//         provider.providerDetails?.approvedCategories?.some(
//           (id) => id.toString() === service.categoryId.toString()
//         );

//       if (!isCategoryApproved) {
//         return res.status(403).json({
//           message: "Provider not approved for this category",
//           reason:
//             "This provider has not yet been approved to offer services in this category.",
//         });
//       }

//       let distanceKm = null;
//       if (provider?.location?.coordinates && location?.coordinates) {
//         distanceKm = haversineDistance(
//           provider.location.coordinates,
//           location.coordinates
//         );
//         distanceKm = Math.round(distanceKm * 100) / 100;
//       }

//       const pricingResolved = resolveBookingPricing(service, "normal");

//       const payload = {
//         clientId: req.user.id,
//         providerId,
//         serviceId,
//         status: pricingResolved.status,
//         type: "normal",
//         requestedAt: new Date(),
//         distanceKm,
//         location,
//         schedule,
//         addressText: addressText || "",
//         landmark: landmark || "",
//         notes: notes || "",
//         quote: pricingResolved.quote,
//         price: pricingResolved.price,
//         emergencyFee: pricingResolved.emergencyFee,
//         totalAmount: pricingResolved.totalAmount,
//         pricing: pricingResolved.pricing,
//         paymentStatus: "pending",
//       };

//       const booking = await Booking.create(payload);

//       console.log(
//         `[BOOKING CREATE] SUCCESS - Booking ${booking._id} created with status: ${booking.status}, clientId: ${booking.clientId}`
//       );

//       if (booking.status === "quote_requested") {
//         await createNotification({
//           userId: providerId,
//           type: "quote_requested",
//           title: "New Quote Request",
//           message: `A client requested a quote before payment`,
//           category: "booking",
//           bookingId: booking._id,
//           fromUserId: req.user.id,
//         });
//       }

//       if (booking.status === "requested") {
//         await createNotification({
//           userId: providerId,
//           type: "booking_request",
//           title: "New Booking Request",
//           message: `You have a new booking request from ${
//             req.user.profile?.name || "a client"
//           }`,
//           category: "booking",
//           bookingId: booking._id,
//           fromUserId: req.user.id,
//           sendEmail: true,
//         });
//       }

//       res.json({ booking, id: booking._id });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

// /**
//  * Emergency request
//  */
// router.post(
//   "/emergency-request",
//   authGuard,
//   roleGuard(["client"]),
//   async (req, res, next) => {
//     try {
//       if (req.user.role !== "client") {
//         return res
//           .status(403)
//           .json({ message: "Only clients can create emergency bookings" });
//       }

//       const { serviceId, location, addressText, landmark, notes } = req.body;

//       if (!serviceId) {
//         return res.status(400).json({ message: "Service ID is required" });
//       }

//       const service = await Service.findById(serviceId)
//         .select(
//           "providerId categoryId isActive adminDisabled priceMode basePrice emergencyPrice priceRange quoteDescription visitFee includedHours hourlyRate"
//         )
//         .populate("categoryId", "name status emergencyServiceAllowed");

//       if (!service) {
//         return res.status(404).json({ message: "Service not found" });
//       }

//       const emergencyMeta = resolveEmergencyMeta(service);

//       if (!emergencyMeta.serviceAvailable) {
//         return res.status(400).json({
//           message: "This service is currently unavailable for emergency booking",
//         });
//       }

//       if (!emergencyMeta.supportsEmergencyPricing) {
//         return res.status(400).json({
//           message:
//             "Emergency booking is only supported for fixed and range services",
//           reason:
//             "Quote-based services must go through the quote workflow and cannot use emergency booking.",
//         });
//       }

//       if (!emergencyMeta.categoryAllowsEmergency) {
//         return res.status(400).json({
//           message: "Emergency booking is not enabled for this service category",
//           reason: "This category does not currently allow emergency services.",
//         });
//       }

//       if (emergencyMeta.emergencyPrice <= 0) {
//         return res.status(400).json({
//           message: "Emergency booking is not configured for this service",
//           reason: "This service needs an emergency price greater than 0.",
//         });
//       }

//       const providerId = String(service.providerId);

//       const provider = await User.findById(providerId);
//       if (!provider) {
//         return res.status(400).json({ message: "Provider not found" });
//       }

//       const isCategoryApproved =
//         provider.providerDetails?.approvedCategories?.some(
//           (id) =>
//             id.toString() ===
//             (service.categoryId?._id || service.categoryId).toString()
//         );

//       if (!isCategoryApproved) {
//         return res.status(403).json({
//           message: "Provider not approved for this category",
//           reason:
//             "This provider has not yet been approved to offer services in this category.",
//         });
//       }

//       const eligibility = await getEmergencyRequestEligibility({
//         providerId,
//         serviceId,
//         location,
//       });

//       if (!eligibility.ok) {
//         if (eligibility.kycStatus && !isKycApproved(eligibility.kycStatus)) {
//           return res.status(403).json({
//             message: "Provider is not KYC approved",
//             reason:
//               "You can only request emergency services from KYC approved providers.",
//             kycStatus: eligibility.kycStatus,
//           });
//         }

//         return res.status(400).json({
//           message: "Emergency booking not eligible",
//           errors: eligibility.errors,
//         });
//       }

//       const distanceKm = eligibility.distanceKm;

//       const pricingResolved = resolveBookingPricing(service, "emergency");

//       const payload = {
//         clientId: req.user.id,
//         type: "emergency",
//         providerId,
//         serviceId,
//         status: pricingResolved.status,
//         requestedAt: new Date(),
//         distanceKm,
//         location,
//         addressText: addressText || "",
//         landmark: landmark || "",
//         notes: notes || "",
//         quote: pricingResolved.quote,
//         price: pricingResolved.price,
//         emergencyFee: pricingResolved.emergencyFee,
//         totalAmount: pricingResolved.totalAmount,
//         pricing: pricingResolved.pricing,
//         paymentStatus: "pending",
//       };

//       const booking = await Booking.create(payload);

//       await createNotification({
//         userId: req.user.id,
//         type: "system_message",
//         title: "Emergency Request Created",
//         message:
//           booking.status === "quote_requested"
//             ? "Your emergency request has been created and a provider quote has been requested."
//             : "Your emergency request has been created. Providers are being alerted.",
//         category: "booking",
//         bookingId: booking._id,
//         fromUserId: req.user.id,
//         metadata: { isEmergency: true, distance: distanceKm },
//         sendEmail: false,
//         sendSMS: false,
//       });

//       if (booking.status === "quote_requested") {
//         await createNotification({
//           userId: providerId,
//           type: "quote_requested",
//           title: "Emergency Quote Request",
//           message: `Client requested an emergency quote before payment`,
//           category: "booking",
//           bookingId: booking._id,
//           fromUserId: req.user.id,
//           metadata: { isEmergency: true, distance: distanceKm },
//           sendSMS: false,
//         });
//       }

//       if (booking.status === "requested") {
//         await createNotification({
//           userId: providerId,
//           type: "booking_request",
//           title: "Emergency Booking Request",
//           message: `Urgent emergency service request from ${
//             req.user.profile?.name || "a client"
//           } - ${distanceKm}km away`,
//           category: "booking",
//           bookingId: booking._id,
//           fromUserId: req.user.id,
//           metadata: { isEmergency: true, distance: distanceKm },
//           sendEmail: true,
//           sendSMS: false,
//         });
//       }

//       res.json({ booking, id: booking._id, message: "Emergency request sent!" });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

// /**
//  * Provider accepts an emergency booking
//  */
// router.post(
//   "/provider-accept/:id",
//   authGuard,
//   roleGuard(["provider"]),
//   requireVerifiedProvider,
//   async (req, res, next) => {
//     try {
//       const { id } = req.params;

//       const booking = await Booking.findById(id);
//       if (!booking)
//         return res.status(404).json({ message: "Booking not found" });

//       if (booking.type !== "emergency")
//         return res.status(400).json({ message: "Not an emergency booking" });

//       if (String(booking.providerId) !== req.user.id)
//         return res.status(403).json({ message: "Not your booking" });

//       if (booking.status !== "requested")
//         return res.status(400).json({ message: "Emergency already handled" });

//       booking.status = hasSufficientEscrowForBooking(booking)
//         ? "confirmed"
//         : "accepted";
//       booking.acceptedAt = new Date();
//       booking.emergency = booking.emergency || {};
//       booking.emergency.acceptedBy = req.user.id;

//       booking.emergency.respondedProviders =
//         booking.emergency.respondedProviders || [];
//       booking.emergency.respondedProviders.push(req.user.id);

//       await booking.save();

//       await createNotification({
//         userId: booking.clientId,
//         type: "booking_accepted",
//         title: "Emergency Booking Accepted",
//         message: "Your emergency booking has been accepted by the provider.",
//         category: "booking",
//         bookingId: booking._id,
//         fromUserId: req.user.id,
//         metadata: { isEmergency: true },
//         sendEmail: true,
//         sendSMS: false,
//       });

//       res.json({ ok: true });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

// /**
//  * Provider rejects emergency request
//  */
// router.post(
//   "/provider-reject/:id",
//   authGuard,
//   roleGuard(["provider"]),
//   requireVerifiedProvider,
//   async (req, res, next) => {
//     try {
//       const { id } = req.params;

//       const booking = await Booking.findById(id);
//       if (!booking) {
//         return res.status(404).json({ message: "Booking not found" });
//       }

//       if (booking.type !== "emergency") {
//         return res.status(400).json({ message: "Not an emergency booking" });
//       }

//       if (String(booking.providerId) !== req.user.id) {
//         return res.status(403).json({ message: "Not your booking" });
//       }

//       if (booking.status !== "requested") {
//         return res.status(400).json({ message: "Emergency already handled" });
//       }

//       booking.status = "rejected";
//       booking.cancelledAt = new Date();
//       booking.cancellation = {
//         ...(booking.cancellation || {}),
//         cancelledBy: req.user.id,
//         reason: "Provider rejected emergency booking",
//         cancelledAt: new Date(),
//       };

//       booking.emergency = booking.emergency || {};
//       booking.emergency.respondedProviders =
//         booking.emergency.respondedProviders || [];

//       if (
//         !booking.emergency.respondedProviders.some(
//           (providerId) => String(providerId) === req.user.id
//         )
//       ) {
//         booking.emergency.respondedProviders.push(req.user.id);
//       }

//       await booking.save();

//       let refundedAmount = 0;
//       try {
//         refundedAmount = await refundEscrowForBooking(
//           booking,
//           "provider_rejected_emergency"
//         );
//       } catch (err) {
//         console.error("Refund failed:", err.message);
//       }

//       await createNotification({
//         userId: booking.clientId,
//         type: "payment_refunded",
//         title: "Refund Issued",
//         message:
//           refundedAmount > 0
//             ? `Your payment of NPR ${toAmount(refundedAmount).toLocaleString()} has been refunded because the provider rejected the emergency booking.`
//             : "Your payment has been refunded after provider rejection.",
//         category: "payment",
//         bookingId: booking._id,
//         metadata: {
//           refundedAmount: toAmount(refundedAmount),
//           reason: "provider_rejected_emergency",
//         },
//       });

//       await createNotification({
//         userId: booking.clientId,
//         type: "booking_cancelled",
//         title: "Emergency Request Declined",
//         message:
//           refundedAmount > 0
//             ? `The provider declined your emergency booking request. NPR ${toAmount(refundedAmount).toLocaleString()} has been refunded.`
//             : "The provider declined your emergency booking request.",
//         category: "booking",
//         bookingId: booking._id,
//         fromUserId: req.user.id,
//         metadata: {
//           isEmergency: true,
//           refundedAmount: toAmount(refundedAmount),
//         },
//         sendEmail: false,
//         sendSMS: false,
//       });

//       await recalculateProviderTrust(req.user.id);

//       res.json({ ok: true, booking, refundedAmount: toAmount(refundedAmount) });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

// /**
//  * Provider accepts normal booking
//  */
// router.post(
//   "/accept/:id",
//   authGuard,
//   roleGuard(["provider"]),
//   requireVerifiedProvider,
//   async (req, res, next) => {
//     try {
//       const { id } = req.params;

//       const booking = await Booking.findById(id);
//       if (!booking)
//         return res.status(404).json({ message: "Booking not found" });

//       if (String(booking.providerId) !== req.user.id)
//         return res.status(403).json({ message: "Not your booking" });

//       await processBookingLifecycleTimeouts(booking);

//       if (booking.status === "expired") {
//         return res.status(400).json({
//           message:
//             "Booking request expired because the scheduled time already passed.",
//         });
//       }

//       if (booking.status !== "requested")
//         return res.status(400).json({ message: "Booking already handled" });

//       booking.status = hasSufficientEscrowForBooking(booking)
//         ? "confirmed"
//         : "accepted";
//       booking.acceptedAt = new Date();

//       await booking.save();

//       await createNotification({
//         userId: booking.clientId,
//         type: "booking_accepted",
//         title: "Booking Accepted",
//         message: `Your booking has been accepted by the provider`,
//         category: "booking",
//         bookingId: booking._id,
//         fromUserId: req.user.id,
//         sendEmail: true,
//       });

//       res.json({ ok: true });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

// /**
//  * Provider rejects normal booking
//  */
// router.post(
//   "/reject/:id",
//   authGuard,
//   roleGuard(["provider"]),
//   requireVerifiedProvider,
//   async (req, res, next) => {
//     try {
//       const { id } = req.params;

//       const booking = await Booking.findById(id);
//       if (!booking)
//         return res.status(404).json({ message: "Booking not found" });

//       if (String(booking.providerId) !== req.user.id)
//         return res.status(403).json({ message: "Not your booking" });

//       await processBookingLifecycleTimeouts(booking);

//       if (booking.status === "expired") {
//         return res.status(400).json({
//           message:
//             "Booking request already expired because the scheduled time passed.",
//         });
//       }

//       if (booking.status !== "requested")
//         return res.status(400).json({ message: "Booking already handled" });

//       booking.status = "rejected";
//       booking.cancelledAt = new Date();
//       booking.cancellation = {
//         ...(booking.cancellation || {}),
//         cancelledBy: req.user.id,
//         reason: "Provider rejected booking",
//         cancelledAt: new Date(),
//       };

//       await booking.save();

//       let refundedAmount = 0;
//       try {
//         refundedAmount = await refundEscrowForBooking(
//           booking,
//           "provider_rejected_normal"
//         );
//       } catch (err) {
//         console.error("Refund failed:", err.message);
//       }

//       await createNotification({
//         userId: booking.clientId,
//         type: "payment_refunded",
//         title: "Refund Issued",
//         message:
//           refundedAmount > 0
//             ? `Your payment of NPR ${toAmount(refundedAmount).toLocaleString()} has been refunded because the provider rejected the booking.`
//             : "Your payment has been refunded after provider rejection.",
//         category: "payment",
//         bookingId: booking._id,
//         metadata: {
//           refundedAmount: toAmount(refundedAmount),
//           reason: "provider_rejected_normal",
//         },
//       });

//       await createNotification({
//         userId: booking.clientId,
//         type: "booking_cancelled",
//         title: "Booking Rejected",
//         message:
//           refundedAmount > 0
//             ? `The provider rejected your booking. NPR ${toAmount(refundedAmount).toLocaleString()} has been refunded.`
//             : "The provider rejected your booking.",
//         category: "booking",
//         bookingId: booking._id,
//         fromUserId: req.user.id,
//         metadata: { refundedAmount: toAmount(refundedAmount) },
//       });

//       await recalculateProviderTrust(req.user.id);

//       res.json({ ok: true, refundedAmount: toAmount(refundedAmount) });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

// /**
//  * PROVIDER: Mark job as complete (awaits client confirmation)
//  */
// router.post(
//   "/complete/:id",
//   authGuard,
//   roleGuard(["provider"]),
//   async (req, res, next) => {
//     try {
//       const { id } = req.params;

//       const booking = await Booking.findById(id);
//       if (!booking) return res.status(404).json({ message: "Not found" });

//       if (String(booking.providerId) !== req.user.id)
//         return res.status(403).json({ message: "Not your booking" });

//       if (booking.disputeId || booking.status === "disputed") {
//         const Dispute = require("../models/Dispute");
//         const dispute = booking.disputeId
//           ? await Dispute.findById(booking.disputeId).select("status")
//           : null;

//         if (
//           !dispute ||
//           !["resolved", "closed", "rejected"].includes(dispute.status)
//         ) {
//           return res.status(400).json({
//             message: "Booking is in dispute and cannot be completed",
//           });
//         }
//       }

//       if (booking.status !== "in-progress")
//         return res.status(400).json({
//           message: "Job must be in-progress to mark as complete",
//         });

//       if (booking.pricing?.adjustment?.status === "pending_client_approval") {
//         return res.status(400).json({
//           message:
//             "Cannot complete: waiting for client approval for additional charges.",
//         });
//       }

//       if (Number(booking.pricing?.additionalEscrowRequired || 0) > 0) {
//         return res.status(400).json({
//           message: "Additional escrow payment is required before completion",
//         });
//       }

//       const agreedAmount = resolveAgreedAmount(booking);
//       const escrowHeldAmount = Number(booking.pricing?.escrowHeldAmount || 0);
//       if (escrowHeldAmount < agreedAmount) {
//         return res.status(400).json({
//           message: "Escrow is insufficient for the agreed amount",
//           additionalEscrowRequired: Number(
//             (agreedAmount - escrowHeldAmount).toFixed(2)
//           ),
//         });
//       }

//       booking.status = "pending-completion";
//       booking.providerCompletedAt = new Date();

//       await booking.save();

//       await createNotification({
//         userId: booking.clientId,
//         type: "booking_completed",
//         title: "Job Completed - Confirmation Needed",
//         message: `Provider has marked your booking as complete. Please confirm if you're satisfied with the service.`,
//         category: "booking",
//         bookingId: booking._id,
//         fromUserId: req.user.id,
//         sendEmail: true,
//       });

//       res.json({ ok: true, message: "Awaiting client confirmation" });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

// /**
//  * CLIENT: Confirm completion (final step)
//  */
// router.post(
//   "/confirm-completion/:id",
//   authGuard,
//   roleGuard(["client"]),
//   async (req, res, next) => {
//     try {
//       const { id } = req.params;

//       const booking = await Booking.findById(id);
//       if (!booking) return res.status(404).json({ message: "Not found" });

//       if (String(booking.clientId) !== req.user.id)
//         return res.status(403).json({ message: "Not your booking" });

//       let dispute = null;
//       if (booking.disputeId) {
//         const Dispute = require("../models/Dispute");
//         dispute = await Dispute.findById(booking.disputeId).select("status");
//       }

//       if (
//         dispute &&
//         !["resolved", "closed", "rejected"].includes(dispute.status)
//       ) {
//         return res.status(400).json({
//           message: "Booking is in dispute and cannot be completed",
//         });
//       }

//       const canCompleteDisputed =
//         booking.status === "disputed" &&
//         booking.providerCompletedAt &&
//         dispute &&
//         ["resolved", "closed", "rejected"].includes(dispute.status);

//       if (booking.status !== "pending-completion" && !canCompleteDisputed)
//         return res
//           .status(400)
//           .json({ message: "Booking not ready for completion" });

//       if (booking.pricing?.adjustment?.status === "pending_client_approval") {
//         return res
//           .status(400)
//           .json({ message: "Resolve adjusted quote before completion" });
//       }

//       if (Number(booking.pricing?.additionalEscrowRequired || 0) > 0) {
//         return res.status(400).json({
//           message: "Additional escrow payment is pending",
//         });
//       }

//       const agreedAmount = resolveAgreedAmount(booking);
//       const escrowHeldAmount = Number(booking.pricing?.escrowHeldAmount || 0);
//       if (escrowHeldAmount < agreedAmount) {
//         return res.status(400).json({
//           message: "Escrow is insufficient for final agreed amount",
//           additionalEscrowRequired: Number(
//             (agreedAmount - escrowHeldAmount).toFixed(2)
//           ),
//         });
//       }

//       booking.status = "completed";
//       booking.completedAt = new Date();
//       booking.clientConfirmedAt = new Date();
//       booking.paymentStatus = "released";
//       await booking.save();

//       const Payment = require("../models/Payment");
//       const ProviderWallet = require("../models/ProviderWallet");

//       const heldPayments = await Payment.find({
//         bookingId: booking._id,
//         status: "FUNDS_HELD",
//       });
//       const totalHeldAmount = heldPayments.reduce(
//         (sum, entry) => sum + Number(entry.amount || 0),
//         0
//       );

//       for (const payment of heldPayments) {
//         payment.status = "RELEASED";
//         payment.releasedAt = new Date();
//         payment.clientConfirmedAt = new Date();
//         await payment.save();
//       }

//       if (totalHeldAmount > 0) {
//         const wallet = await ProviderWallet.findOne({
//           providerId: booking.providerId,
//         });
//         if (wallet) {
//           wallet.pendingBalance = Math.max(
//             0,
//             Number(wallet.pendingBalance || 0) - totalHeldAmount
//           );
//           wallet.availableBalance =
//             Number(wallet.availableBalance || 0) + totalHeldAmount;
//           wallet.totalEarned =
//             Number(wallet.totalEarned || 0) + totalHeldAmount;
//           await wallet.save();
//         }
//       }

//       booking.pricing.escrowHeldAmount = Math.max(
//         0,
//         Number(booking.pricing?.escrowHeldAmount || 0) - totalHeldAmount
//       );
//       booking.pricing.additionalEscrowRequired = 0;
//       await booking.save();

//       await createNotification({
//         userId: booking.providerId,
//         type: "payment_released",
//         title: "Payment Released!",
//         message: `Client confirmed completion. NPR ${
//           totalHeldAmount || booking.totalAmount
//         } has been released to your wallet.`,
//         category: "payment",
//         bookingId: booking._id,
//         fromUserId: req.user.id,
//         sendEmail: true,
//       });

//       res.json({ ok: true, message: "Payment released to provider!" });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

// /**
//  * Get upcoming bookings
//  */
// router.get("/upcoming", authGuard, async (req, res, next) => {
//   try {
//     const userId = req.user.id;
//     const userRole = req.user.role;
//     const { range, from, to } = req.query;

//     console.log(
//       `\n[BOOKINGS /upcoming] START - User ${userId} (role: ${userRole})`
//     );

//     const q =
//       userRole === "provider" ? { providerId: userId } : { clientId: userId };

//     const providerActiveStatuses = [
//       "requested",
//       "pending_payment",
//       "quote_requested",
//       "quote_sent",
//       "quote_pending_admin_review",
//       "quote_accepted",
//       "accepted",
//       "confirmed",
//       "provider_en_route",
//       "in-progress",
//       "pending-completion",
//       "provider_completed",
//       "awaiting_client_confirmation",
//       "disputed",
//     ];

//     const terminalStatuses = [
//       "completed",
//       "cancelled",
//       "rejected",
//       "expired",
//       "no-show",
//       "resolved_refunded",
//     ];

//     const statusFilter =
//       userRole === "provider"
//         ? { $in: providerActiveStatuses }
//         : { $nin: terminalStatuses };

//     const bounds = getRangeBounds(range, from, to);

//     console.log(`[BOOKINGS /upcoming] Query filter:`, JSON.stringify(q));
//     console.log(
//       `[BOOKINGS /upcoming] Status filter:`,
//       userRole === "provider"
//         ? `Include: ${providerActiveStatuses.join(", ")}`
//         : `Exclude: ${terminalStatuses.join(", ")}`
//     );
//     console.log(`[BOOKINGS /upcoming] Range filter:`, {
//       range: range || null,
//       from: from || null,
//       to: to || null,
//       bounds,
//     });

//     const bookings = await Booking.find({
//       ...q,
//       status: statusFilter,
//     })
//       .populate("serviceId", "title category")
//       .populate("providerId", "profile phone providerDetails")
//       .populate("clientId", "profile email phone")
//       .sort({ createdAt: -1, schedule: 1 });

//     console.log(`[BOOKINGS /upcoming] Found ${bookings.length} bookings`);

//     await Promise.allSettled(
//       bookings.map((booking) => processBookingLifecycleTimeouts(booking))
//     );

//     const refreshedBookings = await Booking.find({
//       ...q,
//       status: statusFilter,
//     })
//       .populate("serviceId", "title category")
//       .populate("providerId", "profile phone providerDetails")
//       .populate("clientId", "profile email phone")
//       .sort({ createdAt: -1, schedule: 1 });

//     const rangedBookings = bounds
//       ? refreshedBookings.filter((booking) =>
//           isWithinBounds(getDashboardRangeRelevantDate(booking), bounds)
//         )
//       : refreshedBookings;

//     if (rangedBookings.length > 0) {
//       const summary = rangedBookings.slice(0, 5).map((b) => ({
//         id: b._id.toString().slice(-6),
//         status: b.status,  
//         clientId: String(b.clientId?._id || b.clientId).slice(-6),
//         providerId: String(b.providerId?._id || b.providerId).slice(-6),
//         serviceTitle: b.serviceId?.title,
//         relevantDate: getProviderBookingRelevantDate(b),
//         paymentStatus: b.paymentStatus,
//       }));
//       console.log(
//         `[BOOKINGS /upcoming] Sample filtered bookings:`,
//         JSON.stringify(summary, null, 2)
//       );
//     }

//     console.log(
//       `[BOOKINGS /upcoming] Returning ${rangedBookings.length} bookings after range filtering`
//     );
//     console.log(`[BOOKINGS /upcoming] END\n`);

//     res.json({ bookings: rangedBookings });
//   } catch (e) {
//     console.error(`[BOOKINGS /upcoming] ERROR:`, e.message);
//     next(e);
//   }
// });

// /**
//  * Past bookings
//  */
// router.get("/past", authGuard, async (req, res, next) => {
//   try {
//     const { range, from, to, limit } = req.query;

//     const q =
//       req.user.role === "provider"
//         ? { providerId: req.user.id }
//         : { clientId: req.user.id };

//     const bounds = getRangeBounds(range, from, to);

//     const bookings = await Booking.find({
//       ...q,
//       status: {
//         $in: [
//           "completed",
//           "cancelled",
//           "rejected",
//           "expired",
//           "no-show",
//           "resolved_refunded",
//         ],
//       },
//     })
//       .populate("serviceId", "title category")
//       .populate("providerId", "profile phone providerDetails")
//       .populate("clientId", "profile email phone")
//       .sort({ completedAt: -1, cancelledAt: -1, createdAt: -1 });

//     let filteredBookings = bounds
//       ? bookings.filter((booking) =>
//           isWithinBounds(getDashboardRangeRelevantDate(booking), bounds)
//         )
//       : bookings;

//     const numericLimit = Number(limit || 0);
//     if (numericLimit > 0) {
//       filteredBookings = filteredBookings.slice(0, numericLimit);
//     }

//     res.json({ bookings: filteredBookings });
//   } catch (e) {
//     next(e);
//   }
// });

// /**
//  * Get provider bookings with filters
//  * UPDATED: now supports range/from/to from frontend
//  */
// router.get(
//   "/provider-bookings",
//   authGuard,
//   roleGuard(["provider"]),
//   async (req, res, next) => {
//     try {
//       const { limit = 10, status, range, from, to } = req.query;

//       if (req.user.role !== "provider") {
//         return res
//           .status(403)
//           .json({ message: "Only providers can access provider bookings" });
//       }

//       const query = { providerId: req.user.id };

//       if (status) {
//         if (status === "all") {
//           delete query.status;
//         } else {
//           const mappedStatuses = getStatusesForTab(status);
//           if (mappedStatuses.length > 0) {
//             query.status = { $in: mappedStatuses };
//           } else if (status === "pending-completion") {
//             query.status = { $in: getStatusesForTab("completion_pending") };
//           } else {
//             query.status = status;
//           }
//         }
//       }

//       const bounds = getRangeBounds(range, from, to);

//       const bookings = await Booking.find(query)
//         .populate("clientId", "profile email")
//         .populate("serviceId", "title category")
//         .sort({ createdAt: -1 });

//       await Promise.allSettled(
//         bookings.map((booking) => processBookingLifecycleTimeouts(booking))
//       );

//       const refreshedBookings = await Booking.find(query)
//         .populate("clientId", "profile email")
//         .populate("serviceId", "title category")
//         .sort({ createdAt: -1 });

//       let filteredBookings = bounds
//         ? refreshedBookings.filter((booking) =>
//             isWithinBounds(getDashboardRangeRelevantDate(booking), bounds)
//           )
//         : refreshedBookings;

//       const numericLimit = Number(limit || 0);
//       if (numericLimit > 0) {
//         filteredBookings = filteredBookings.slice(0, numericLimit);
//       }

//       res.json({ bookings: filteredBookings });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

// /**
//  * GET /api/bookings/:id
//  * Fetch a single booking by ID
//  */
// router.get("/:id", authGuard, async (req, res, next) => {
//   try {
//     const { id } = req.params;

//     let booking = await Booking.findById(id)
//       .populate("clientId", "profile email phone")
//       .populate("providerId", "profile email phone kycStatus providerDetails")
//       .populate(
//         "serviceId",
//         "title description categoryId basePrice emergencyPrice priceMode priceRange quoteDescription visitFee includedHours hourlyRate"
//       );

//     if (!booking) {
//       return res.status(404).json({ message: "Booking not found" });
//     }

//     const userId = req.user.id;
//     const isClient = String(booking.clientId._id) === userId;
//     const isProvider = String(booking.providerId._id) === userId;
//     const isAdmin = req.user.role === "admin";

//     if (!isClient && !isProvider && !isAdmin) {
//       return res.status(403).json({ message: "Access denied" });
//     }

//     await processBookingLifecycleTimeouts(booking);

//     booking = await Booking.findById(id)
//       .populate("clientId", "profile email phone")
//       .populate("providerId", "profile email phone kycStatus providerDetails")
//       .populate(
//         "serviceId",
//         "title description categoryId basePrice emergencyPrice priceMode priceRange quoteDescription visitFee includedHours hourlyRate"
//       );

//     res.json({ booking });
//   } catch (e) {
//     next(e);
//   }
// });

// /**
//  * CLIENT: Confirm booking (accepted -> confirmed)
//  */
// router.patch(
//   "/:id/confirm",
//   authGuard,
//   roleGuard(["client"]),
//   async (req, res, next) => {
//     try {
//       const { id } = req.params;
//       const { scheduledAt } = req.body;

//       const booking = await Booking.findById(id);
//       if (!booking) {
//         return res.status(404).json({ message: "Booking not found" });
//       }

//       if (String(booking.clientId) !== req.user.id) {
//         return res.status(403).json({ message: "Not your booking" });
//       }

//       if (booking.status !== "accepted") {
//         return res.status(400).json({
//           message: `Cannot confirm booking with status: ${booking.status}`,
//         });
//       }

//       if (!hasSufficientEscrowForBooking(booking)) {
//         return res.status(400).json({
//           message: "Payment has not been fully secured yet",
//         });
//       }

//       if (booking.type !== "normal") {
//         return res.status(400).json({
//           message: "Emergency bookings skip confirmation",
//         });
//       }

//       booking.status = "confirmed";
//       booking.confirmedAt = new Date();
//       if (scheduledAt) booking.scheduledAt = new Date(scheduledAt);

//       await booking.save();

//       await createNotification({
//         userId: booking.providerId,
//         type: "booking_confirmed",
//         title: "Booking Confirmed",
//         message: `Client has confirmed the booking`,
//         category: "booking",
//         bookingId: booking._id,
//         fromUserId: req.user.id,
//         sendEmail: true,
//       });

//       res.json({ ok: true, booking });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

// /**
//  * PROVIDER: Mark "On The Way" (confirmed/accepted -> provider_en_route)
//  */
// router.patch(
//   "/:id/en-route",
//   authGuard,
//   roleGuard(["provider"]),
//   async (req, res, next) => {
//     try {
//       const { id } = req.params;

//       const booking = await Booking.findById(id);
//       if (!booking) {
//         return res.status(404).json({ message: "Booking not found" });
//       }

//       if (String(booking.providerId) !== req.user.id) {
//         return res.status(403).json({ message: "Not your booking" });
//       }

//       if (isActionBlockedByStaleness(booking)) {
//         if (shouldAutoExpireUnstartedBooking(booking)) {
//           await markBookingAsNoShowAndRefund(
//             booking,
//             "provider_no_show_after_stale_action"
//           );
//         }

//         return res.status(400).json({
//           message: `Booking window expired. This booking is older than ${DEFAULT_STALE_GRACE_HOURS} hours past schedule.`,
//         });
//       }

//       if (!["confirmed", "accepted"].includes(booking.status)) {
//         if (booking.status === "provider_en_route") {
//           return res.json({ message: "Already en route", booking });
//         }
//         return res.status(400).json({
//           message: `Cannot mark en route from status: ${booking.status}`,
//         });
//       }

//       booking.status = "provider_en_route";
//       booking.enRouteAt = new Date();

//       await booking.save();

//       await createNotification({
//         userId: booking.clientId,
//         type: "provider_en_route",
//         title: "Provider On The Way!",
//         message: `Your provider is on the way to your location`,
//         category: "booking",
//         bookingId: booking._id,
//         fromUserId: req.user.id,
//         metadata: { isEmergency: booking.type === "emergency" },
//         sendEmail: false,
//         sendSMS: false,
//       });

//       const io = getIO();
//       if (io) {
//         const room = `tracking:${booking._id}`;
//         io.to(room).emit("booking_status_changed", {
//           bookingId: String(booking._id),
//           status: "provider_en_route",
//         });
//       }

//       res.json({ ok: true, booking });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

// /**
//  * PROVIDER: Start job (confirmed/accepted/provider_en_route -> in-progress)
//  */
// router.patch(
//   "/:id/start",
//   authGuard,
//   roleGuard(["provider"]),
//   async (req, res, next) => {
//     try {
//       const { id } = req.params;

//       const booking = await Booking.findById(id);
//       if (!booking) {
//         return res.status(404).json({ message: "Booking not found" });
//       }

//       if (String(booking.providerId) !== req.user.id) {
//         return res.status(403).json({ message: "Not your booking" });
//       }

//       if (isActionBlockedByStaleness(booking)) {
//         if (shouldAutoExpireUnstartedBooking(booking)) {
//           await markBookingAsNoShowAndRefund(
//             booking,
//             "provider_no_show_after_stale_action"
//           );
//         }

//         return res.status(400).json({
//           message: `Booking window expired. This booking is older than ${DEFAULT_STALE_GRACE_HOURS} hours past schedule.`,
//         });
//       }

//       if (
//         !["confirmed", "accepted", "provider_en_route"].includes(booking.status)
//       ) {
//         return res.status(400).json({
//           message: `Cannot start booking with status: ${booking.status}`,
//         });
//       }

//       booking.status = "in-progress";
//       booking.startedAt = new Date();
//       booking.providerLiveLocation = {
//         lat: null,
//         lng: null,
//         heading: null,
//         speed: null,
//         updatedAt: null,
//       };

//       await booking.save();

//       const io = getIO();
//       if (io) {
//         const room = `tracking:${booking._id}`;
//         io.to(room).emit("booking_status_changed", {
//           bookingId: String(booking._id),
//           status: "in-progress",
//         });
//       }

//       await createNotification({
//         userId: booking.clientId,
//         type: "booking_started",
//         title: "Job Started",
//         message: `Provider has started working on your booking`,
//         category: "booking",
//         bookingId: booking._id,
//         fromUserId: req.user.id,
//         sendEmail: true,
//       });

//       res.json({ ok: true, booking });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

// /**
//  * CLIENT: Cancel booking
//  */
// router.patch(
//   "/:id/cancel",
//   authGuard,
//   roleGuard(["client"]),
//   async (req, res, next) => {
//     try {
//       const { id } = req.params;
//       const { reason } = req.body;

//       const booking = await Booking.findById(id);
//       if (!booking) {
//         return res.status(404).json({ message: "Booking not found" });
//       }

//       if (String(booking.clientId) !== req.user.id) {
//         return res.status(403).json({ message: "Not your booking" });
//       }

//       const cancellableStatuses = [
//         "pending_payment",
//         "requested",
//         "accepted",
//         "confirmed",
//         "quote_requested",
//         "quote_sent",
//         "quote_pending_admin_review",
//         "quote_accepted",
//         "pending_quote_approval",
//       ];
//       if (!cancellableStatuses.includes(booking.status)) {
//         return res.status(400).json({
//           message: `Cannot cancel booking with status: ${booking.status}`,
//         });
//       }

//       booking.status = "cancelled";
//       booking.cancelledAt = new Date();
//       booking.cancellation = {
//         cancelledBy: req.user.id,
//         reason: reason || "Cancelled by client",
//         cancelledAt: new Date(),
//       };

//       await booking.save();

//       await createNotification({
//         userId: booking.providerId,
//         type:
//           booking.type === "emergency" ? "booking_cancelled" : "booking_cancelled",
//         title:
//           booking.type === "emergency"
//             ? "Emergency Booking Cancelled"
//             : "Booking Cancelled",
//         message: `Client has cancelled the booking. Reason: ${
//           reason || "Not specified"
//         }`,
//         category: "booking",
//         bookingId: booking._id,
//         fromUserId: req.user.id,
//         metadata: { isEmergency: booking.type === "emergency" },
//         sendEmail: true,
//         sendSMS: false,
//       });

//       res.json({ ok: true, booking });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

// /**
//  * START TIMER
//  */
// router.post(
//   "/:id/timer/start",
//   authGuard,
//   roleGuard(["provider"]),
//   async (req, res, next) => {
//     try {
//       const { id } = req.params;

//       const booking = await Booking.findById(id);
//       if (!booking) {
//         return res.status(404).json({ message: "Booking not found" });
//       }

//       if (String(booking.providerId) !== req.user.id) {
//         return res.status(403).json({ message: "Not your booking" });
//       }

//       if (booking.status !== "in-progress") {
//         return res
//           .status(400)
//           .json({ message: "Job must be in-progress to start timer" });
//       }

//       booking.timeTracking.isTimerRunning = true;
//       booking.timeTracking.timerStartedAt = new Date();

//       await booking.save();

//       res.json({
//         ok: true,
//         timeTracking: booking.timeTracking,
//         message: "Timer started",
//       });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

// /**
//  * PAUSE TIMER
//  */
// router.post(
//   "/:id/timer/pause",
//   authGuard,
//   roleGuard(["provider"]),
//   async (req, res, next) => {
//     try {
//       const { id } = req.params;
//       const { totalMinutes } = req.body;

//       const booking = await Booking.findById(id);
//       if (!booking) {
//         return res.status(404).json({ message: "Booking not found" });
//       }

//       if (String(booking.providerId) !== req.user.id) {
//         return res.status(403).json({ message: "Not your booking" });
//       }

//       if (!booking.timeTracking.isTimerRunning) {
//         return res.status(400).json({ message: "Timer is not running" });
//       }

//       const sessionDurationSeconds = Math.max(
//         1,
//         Math.round((new Date() - booking.timeTracking.timerStartedAt) / 1000)
//       );

//       booking.timeTracking.timerSessions.push({
//         startedAt: booking.timeTracking.timerStartedAt,
//         pausedAt: new Date(),
//         durationSeconds: sessionDurationSeconds,
//       });

//       booking.timeTracking.totalSeconds += sessionDurationSeconds;
//       booking.timeTracking.isTimerRunning = false;
//       booking.timeTracking.timerStartedAt = null;

//       booking.pricing = booking.pricing || {};
//       booking.pricing.extraTimeCost = computeEstimatedExtraTimeCost(
//         booking.timeTracking.totalSeconds,
//         booking.pricing?.includedHours,
//         booking.pricing?.hourlyRate
//       );

//       await booking.save();

//       res.json({
//         ok: true,
//         timeTracking: booking.timeTracking,
//         estimatedExtraCost: Number(booking.pricing?.extraTimeCost || 0),
//         message: "Timer paused",
//       });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

// /**
//  * RESET TIMER
//  */
// router.post(
//   "/:id/timer/reset",
//   authGuard,
//   roleGuard(["provider"]),
//   async (req, res, next) => {
//     try {
//       const { id } = req.params;

//       const booking = await Booking.findById(id);
//       if (!booking) {
//         return res.status(404).json({ message: "Booking not found" });
//       }

//       if (String(booking.providerId) !== req.user.id) {
//         return res.status(403).json({ message: "Not your booking" });
//       }

//       booking.timeTracking = {
//         totalSeconds: 0,
//         isTimerRunning: false,
//         timerStartedAt: null,
//         timerSessions: [],
//       };
//       booking.pricing = booking.pricing || {};
//       booking.pricing.extraTimeCost = 0;

//       await booking.save();

//       res.json({
//         ok: true,
//         timeTracking: booking.timeTracking,
//         message: "Timer reset",
//       });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

// /**
//  * DOWNLOAD CALENDAR (.ics)
//  */
// router.get("/:id/calendar", authGuard, async (req, res, next) => {
//   try {
//     const { id } = req.params;

//     const booking = await Booking.findById(id)
//       .populate("serviceId", "title")
//       .populate("providerId", "profile.name email phone")
//       .populate("clientId", "profile.name email phone");

//     if (!booking) {
//       return res.status(404).json({ message: "Booking not found" });
//     }

//     const userId = req.user.id;
//     const isClient = String(booking.clientId._id) === userId;
//     const isProvider = String(booking.providerId._id) === userId;
//     const isAdmin = req.user.role === "admin";

//     if (!isClient && !isProvider && !isAdmin) {
//       return res.status(403).json({ message: "Access denied" });
//     }

//     const validStatuses = [
//       "confirmed",
//       "accepted",
//       "in-progress",
//       "pending-completion",
//       "completed",
//     ];
//     if (!validStatuses.includes(booking.status)) {
//       return res.status(400).json({
//         message: "Calendar not available for this booking status",
//         status: booking.status,
//       });
//     }

//     const icsContent = generateICS(booking);
//     const filename = generateICSFilename(booking);

//     res.setHeader("Content-Type", "text/calendar; charset=utf-8");
//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename="${filename}"`
//     );
//     res.send(icsContent);
//   } catch (e) {
//     next(e);
//   }
// });

// // ========================
// // QUOTE WORKFLOW
// // ========================

// router.get(
//   "/quotes/pending",
//   authGuard,
//   roleGuard(["admin"]),
//   async (req, res, next) => {
//     try {
//       const pendingQuotes = await Booking.find({
//         "quote.status": "pending_admin_review",
//       })
//         .populate("clientId", "profile.name email")
//         .populate("providerId", "profile.name email")
//         .populate("serviceId", "title")
//         .sort({ "quote.sentAt": -1 })
//         .limit(50);

//       res.json({
//         quotes: pendingQuotes,
//         count: pendingQuotes.length,
//       });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

// router.post(
//   "/:id/request-quote",
//   authGuard,
//   roleGuard(["client"]),
//   async (req, res, next) => {
//     try {
//       const { id } = req.params;
//       const { message } = req.body;

//       const booking = await Booking.findById(id);
//       if (!booking) {
//         return res.status(404).json({ message: "Booking not found" });
//       }

//       if (String(booking.clientId) !== req.user.id) {
//         return res.status(403).json({ message: "Access denied" });
//       }

//       const pricingType = resolvePricingType(booking);
//       if (pricingType !== PRICING_TYPES.QUOTE) {
//         return res.status(400).json({
//           message:
//             "Quote requests are only supported for quote-based services",
//         });
//       }

//       if (
//         !["requested", "pending_payment", "quote_rejected"].includes(
//           booking.status
//         )
//       ) {
//         return res.status(400).json({
//           message: "Cannot request quote for this booking status",
//           currentStatus: booking.status,
//         });
//       }

//       if (
//         booking.quote &&
//         ["sent", "pending_admin_review", "approved", "accepted"].includes(
//           booking.quote.status
//         )
//       ) {
//         return res.status(400).json({
//           message: "A quote is already pending or approved for this booking",
//           quoteStatus: booking.quote.status,
//           suggestion:
//             "Wait for current quote response before requesting another quote.",
//         });
//       }

//       booking.status = "quote_requested";
//       booking.quote = {
//         status: "requested",
//         quoteMessage: message || "",
//         createdAt: new Date(),
//       };

//       await booking.save();

//       await createNotification({
//         userId: booking.providerId,
//         type: "quote_requested",
//         title: "New Quote Request",
//         message: `Client has requested a quote for your service`,
//         category: "booking",
//         bookingId: booking._id,
//         targetRoute: "/provider/bookings/:bookingId",
//         targetRouteParams: { bookingId: String(booking._id) },
//         metadata: { bookingId: booking._id },
//       });

//       res.json({
//         message: "Quote request sent successfully",
//         booking,
//       });
//     } catch (e) {
//       console.error("[Quote Request Error]", {
//         bookingId: req.params.id,
//         userId: req.user?.id,
//         error: e.message,
//         stack: e.stack,
//       });
//       next(e);
//     }
//   }
// );

// router.post(
//   "/:id/send-quote",
//   authGuard,
//   roleGuard(["provider"]),
//   requireVerifiedProvider,
//   async (req, res, next) => {
//     try {
//       const { id } = req.params;
//       const { quotedPrice, quoteMessage } = req.body;

//       if (!quotedPrice || quotedPrice <= 0) {
//         return res
//           .status(400)
//           .json({ message: "Valid quoted price is required" });
//       }

//       const booking = await Booking.findById(id);
//       if (!booking) {
//         return res.status(404).json({ message: "Booking not found" });
//       }

//       if (String(booking.providerId) !== req.user.id) {
//         return res.status(403).json({ message: "Access denied" });
//       }

//       const pricingType = resolvePricingType(booking);
//       if (pricingType !== PRICING_TYPES.QUOTE) {
//         return res.status(400).json({
//           message: "Quotes are not available for fixed-price bookings",
//         });
//       }

//       if (booking.status !== "quote_requested") {
//         return res.status(400).json({
//           message: "No quote has been requested for this booking",
//           currentStatus: booking.status,
//         });
//       }

//       const invalidStatuses = ["cancelled", "completed", "no-show"];
//       if (invalidStatuses.includes(booking.status)) {
//         return res.status(400).json({
//           message: "Cannot submit quote for cancelled or completed bookings",
//           currentStatus: booking.status,
//         });
//       }

//       const rangeMax = Number(booking.pricing?.rangeMax || 0);
//       const isAboveRangeMax = false;

//       booking.status = isAboveRangeMax
//         ? "quote_pending_admin_review"
//         : "quote_sent";
//       booking.quote.status = isAboveRangeMax
//         ? "pending_admin_review"
//         : "sent";
//       booking.quote.quotedPrice = quotedPrice;
//       booking.quote.quoteMessage = quoteMessage || "";
//       booking.quote.sentAt = new Date();
//       booking.pricing.finalPrice = Number(quotedPrice);
//       booking.pricing.maxRangeExceeded = !!isAboveRangeMax;
//       booking.pricing.requiresAdminReview = !!isAboveRangeMax;
//       booking.pricing.adminReviewReason = isAboveRangeMax
//         ? `Quoted price NPR ${quotedPrice} exceeds declared maximum NPR ${rangeMax}`
//         : "";

//       await booking.save();

//       if (isAboveRangeMax) {
//         const admins = await User.find({ role: "admin" }).select("_id");
//         for (const admin of admins) {
//           await createNotification({
//             userId: admin._id,
//             type: "quote_pending_review",
//             title: "Range Quote Above Max",
//             message: `Quote NPR ${quotedPrice} is above configured max NPR ${rangeMax}. Review recommended.`,
//             category: "booking",
//             bookingId: booking._id,
//           });
//         }
//       }

//       if (isAboveRangeMax) {
//         await createNotification({
//           userId: booking.clientId,
//           type: "quote_pending_review",
//           title: "Quote Under Review",
//           message: `Provider submitted NPR ${quotedPrice}, which is above published range. Admin review is in progress.`,
//           category: "booking",
//           metadata: { bookingId: booking._id },
//         });
//       } else {
//         await createNotification({
//           userId: booking.clientId,
//           type: "quote_sent",
//           title: "Quote Received",
//           message: `Provider has sent a quote. Review and accept to proceed with payment.`,
//           category: "booking",
//           bookingId: booking._id,
//           targetRoute: "/client/bookings/:bookingId",
//           targetRouteParams: { bookingId: String(booking._id) },
//           metadata: { bookingId: booking._id },
//         });
//       }

//       res.json({
//         message: isAboveRangeMax
//           ? "Quote submitted and flagged for admin review"
//           : "Quote sent to client",
//         booking,
//       });
//     } catch (e) {
//       console.error("[Quote Submission Error]", {
//         bookingId: req.params.id,
//         providerId: req.user?.id,
//         quotedPrice: req.body.quotedPrice,
//         error: e.message,
//         stack: e.stack,
//       });
//       next(e);
//     }
//   }
// );

// router.post(
//   "/:id/approve-quote",
//   authGuard,
//   roleGuard(["admin"]),
//   async (req, res, next) => {
//     try {
//       const { id } = req.params;
//       const { approvedPrice, adminComment } = req.body;

//       const booking = await Booking.findById(id);
//       if (!booking) {
//         return res.status(404).json({ message: "Booking not found" });
//       }

//       if (booking.quote?.status !== "pending_admin_review") {
//         return res.status(400).json({
//           message: "Quote is not pending review",
//           currentStatus: booking.quote?.status,
//         });
//       }

//       const finalPrice = approvedPrice || booking.quote.quotedPrice;

//       booking.status = "quote_accepted";
//       booking.quote.status = "approved";
//       booking.quote.approvedPrice = finalPrice;
//       booking.quote.adminComment = adminComment || "";
//       booking.quote.approvedAt = new Date();
//       booking.price = finalPrice;
//       booking.totalAmount = finalPrice;

//       await booking.save();

//       await createNotification({
//         userId: booking.clientId,
//         type: "quote_approved",
//         title: "Quote Approved",
//         message: `Your quote has been approved at NPR ${finalPrice}. Please proceed with payment.`,
//         category: "booking",
//         bookingId: booking._id,
//         targetRoute: "/client/bookings/:bookingId",
//         targetRouteParams: { bookingId: String(booking._id) },
//         metadata: { bookingId: booking._id },
//       });

//       await createNotification({
//         userId: booking.providerId,
//         type: "quote_approved",
//         title: "Quote Approved",
//         message: `Admin has approved your quote at NPR ${finalPrice}`,
//         category: "booking",
//         metadata: { bookingId: booking._id },
//       });

//       res.json({
//         message: "Quote approved successfully",
//         booking,
//       });
//     } catch (e) {
//       console.error("[Quote Approval Error]", {
//         bookingId: req.params.id,
//         adminId: req.user?.id,
//         error: e.message,
//         stack: e.stack,
//       });
//       next(e);
//     }
//   }
// );

// router.post(
//   "/:id/reject-quote",
//   authGuard,
//   roleGuard(["admin"]),
//   async (req, res, next) => {
//     try {
//       const { id } = req.params;
//       const { rejectionReason } = req.body;

//       if (!rejectionReason) {
//         return res
//           .status(400)
//           .json({ message: "Rejection reason is required" });
//       }

//       const booking = await Booking.findById(id);
//       if (!booking) {
//         return res.status(404).json({ message: "Booking not found" });
//       }

//       if (booking.quote?.status !== "pending_admin_review") {
//         return res.status(400).json({
//           message: "Quote is not pending review",
//           currentStatus: booking.quote?.status,
//         });
//       }

//       booking.status = "quote_rejected";
//       booking.quote.status = "rejected";
//       booking.quote.rejectionReason = rejectionReason;
//       booking.quote.rejectedAt = new Date();

//       await booking.save();

//       await createNotification({
//         userId: booking.providerId,
//         type: "quote_rejected",
//         title: "Quote Rejected",
//         message: `Admin rejected your quote. Reason: ${rejectionReason}`,
//         category: "booking",
//         metadata: { bookingId: booking._id },
//       });

//       await createNotification({
//         userId: booking.clientId,
//         type: "quote_rejected",
//         title: "Quote Rejected",
//         message: `The quote for this booking was rejected. You may request a new quote.`,
//         category: "booking",
//         bookingId: booking._id,
//         targetRoute: "/client/bookings/:bookingId",
//         targetRouteParams: { bookingId: String(booking._id) },
//         metadata: { bookingId: booking._id },
//       });

//       res.json({
//         message: "Quote rejected",
//         booking,
//       });
//     } catch (e) {
//       console.error("[Quote Rejection Error]", {
//         bookingId: req.params.id,
//         adminId: req.user?.id,
//         error: e.message,
//         stack: e.stack,
//       });
//       next(e);
//     }
//   }
// );

// router.post(
//   "/:id/accept-quote",
//   authGuard,
//   roleGuard(["client"]),
//   async (req, res, next) => {
//     try {
//       const { id } = req.params;

//       const booking = await Booking.findById(id);
//       if (!booking) {
//         return res.status(404).json({ message: "Booking not found" });
//       }

//       if (String(booking.clientId) !== req.user.id) {
//         return res.status(403).json({ message: "Access denied" });
//       }

//       if (!isQuotePricing(booking)) {
//         return res.status(400).json({
//           message:
//             "Quote acceptance is only available for quote-based bookings",
//         });
//       }

//       if (!["sent", "approved"].includes(booking.quote?.status)) {
//         return res.status(400).json({
//           message: "Quote is not ready for acceptance",
//           currentStatus: booking.quote?.status,
//         });
//       }

//       const finalPrice = Number(
//         booking.quote.approvedPrice || booking.quote.quotedPrice || 0
//       );
//       if (finalPrice <= 0) {
//         return res.status(400).json({ message: "Invalid quote price" });
//       }

//       const held = Number(booking.pricing?.escrowHeldAmount || 0);
//       const additional = Math.max(0, finalPrice - held);

//       booking.status = "pending_payment";
//       booking.quote.status = "accepted";
//       booking.quote.approvedPrice = finalPrice;
//       booking.price = Math.max(
//         0,
//         finalPrice - Number(booking.emergencyFee || 0)
//       );
//       booking.totalAmount = finalPrice;
//       booking.pricing.basePrice = Number(
//         booking.pricing?.basePrice ||
//           booking.pricing?.basePriceAtBooking ||
//           booking.price ||
//           0
//       );
//       booking.pricing.approvedAdjustmentsTotal = Math.max(
//         0,
//         finalPrice - Number(booking.pricing.basePrice || 0)
//       );
//       booking.pricing.approvedExtraTimeCost = Number(
//         booking.pricing?.approvedExtraTimeCost || 0
//       );
//       booking.pricing.finalApprovedPrice = finalPrice;
//       booking.pricing.finalPrice = finalPrice;
//       booking.pricing.additionalEscrowRequired = additional;

//       await booking.save();

//       await createNotification({
//         userId: booking.providerId,
//         type: "quote_accepted",
//         title: "Quote Accepted",
//         message: `Client has accepted the quote and will proceed with payment`,
//         category: "booking",
//         bookingId: booking._id,
//         targetRoute: "/provider/bookings/:bookingId",
//         targetRouteParams: { bookingId: String(booking._id) },
//         metadata: { bookingId: booking._id },
//       });

//       res.json({
//         message: "Quote accepted. Please proceed with payment.",
//         booking,
//         paymentAmount:
//           additional > 0 ? additional : booking.quote.approvedPrice,
//       });
//     } catch (e) {
//       console.error("[Quote Acceptance Error]", {
//         bookingId: req.params.id,
//         clientId: req.user?.id,
//         error: e.message,
//         stack: e.stack,
//       });
//       next(e);
//     }
//   }
// );

// router.post(
//   "/:id/propose-adjusted-quote",
//   authGuard,
//   roleGuard(["provider"]),
//   quoteAdjustmentUpload.array("attachments", 5),
//   async (req, res, next) => {
//     try {
//       const { id } = req.params;
//       const { proposedPrice, reason } = req.body;

//       const booking = await Booking.findById(id);
//       if (!booking)
//         return res.status(404).json({ message: "Booking not found" });

//       if (String(booking.providerId) !== req.user.id) {
//         return res.status(403).json({ message: "Access denied" });
//       }

//       if (!isRangePricing(booking)) {
//         return res.status(400).json({
//           message:
//             "Additional charge requests are only available for range pricing",
//         });
//       }

//       if (booking.status !== "in-progress") {
//         return res.status(400).json({
//           message:
//             "Adjusted quote can only be proposed while booking is in-progress",
//         });
//       }

//       const nextPrice = Number(proposedPrice);
//       if (!nextPrice || nextPrice <= 0) {
//         return res
//           .status(400)
//           .json({ message: "Valid proposedPrice is required" });
//       }

//       if (!String(reason || "").trim()) {
//         return res.status(400).json({
//           message: "Reason is required for adjusted quote",
//         });
//       }

//       const attachments = (req.files || []).map((file) => ({
//         url: file.path,
//         originalName: file.originalname,
//         size: file.size,
//         mimeType: file.mimetype,
//       }));

//       const max = Number(booking.pricing?.rangeMax || 0);
//       const isRange = booking.pricing?.mode === "range";
//       const aboveMax = isRange && max > 0 && nextPrice > max;
//       const basePrice = Number(
//         booking.pricing?.basePrice || booking.pricing?.basePriceAtBooking || 0
//       );
//       const extraTimeCost = Number(booking.pricing?.extraTimeCost || 0);

//       booking.pricing.adjustment = {
//         status: "pending_client_approval",
//         proposedPrice: nextPrice,
//         basePrice,
//         extraTimeCost,
//         adjustedQuoteReason: reason.trim(),
//         reason: reason.trim(),
//         attachments,
//         proposedBy: req.user.id,
//         proposedAt: new Date(),
//       };

//       booking.pricing.adjustmentHistory =
//         booking.pricing.adjustmentHistory || [];
//       booking.pricing.adjustmentHistory.push({
//         proposedPrice: nextPrice,
//         basePrice,
//         extraTimeCost,
//         adjustedQuoteReason: reason.trim(),
//         reason: reason.trim(),
//         attachments,
//         proposedBy: req.user.id,
//         proposedAt: new Date(),
//         status: "pending_client_approval",
//       });

//       booking.pricing.maxRangeExceeded = !!aboveMax;
//       booking.pricing.requiresAdminReview = !!aboveMax;
//       booking.pricing.adminReviewReason = aboveMax
//         ? `Adjusted quote NPR ${nextPrice} exceeds range max NPR ${max}`
//         : "";

//       await booking.save();

//       await createNotification({
//         userId: booking.clientId,
//         type: "adjusted_quote_proposed",
//         title: "Adjusted Quote Proposed",
//         message: aboveMax
//           ? `Provider proposed NPR ${nextPrice} (above range max NPR ${max}). Your approval is required.`
//           : `Provider proposed a new price of NPR ${nextPrice}. Your approval is required.`,
//         category: "booking",
//         bookingId: booking._id,
//       });

//       if (aboveMax) {
//         const admins = await User.find({ role: "admin" }).select("_id");
//         for (const admin of admins) {
//           await createNotification({
//             userId: admin._id,
//             type: "quote_pending_review",
//             title: "Adjusted Quote Above Max",
//             message: `Booking ${booking._id
//               .toString()
//               .slice(-6)} adjusted quote exceeded range max.`,
//             category: "admin",
//             bookingId: booking._id,
//           });
//         }
//       }

//       res.json({
//         message: aboveMax
//           ? "Adjusted quote sent to client and flagged for admin review"
//           : "Adjusted quote sent to client",
//         booking,
//         breakdown: {
//           basePrice,
//           extraTimeCost,
//           proposedTotal: nextPrice,
//         },
//         warning: aboveMax
//           ? "Proposed price exceeds configured range max. Admin review recommended."
//           : null,
//       });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

// router.post(
//   "/:id/respond-adjusted-quote",
//   authGuard,
//   roleGuard(["client"]),
//   async (req, res, next) => {
//     try {
//       const { id } = req.params;
//       const { action } = req.body;

//       if (!["accept", "reject"].includes(action)) {
//         return res
//           .status(400)
//           .json({ message: "action must be accept or reject" });
//       }

//       const booking = await Booking.findById(id);
//       if (!booking)
//         return res.status(404).json({ message: "Booking not found" });

//       if (String(booking.clientId) !== req.user.id) {
//         return res.status(403).json({ message: "Access denied" });
//       }

//       if (booking.pricing?.adjustment?.status !== "pending_client_approval") {
//         return res.status(400).json({ message: "No pending adjusted quote" });
//       }

//       const adjustment = booking.pricing.adjustment;

//       if (action === "accept") {
//         const approvedTotal = Number(adjustment.proposedPrice || 0);
//         const held = Number(booking.pricing?.escrowHeldAmount || 0);
//         const additional = Math.max(0, approvedTotal - held);
//         const basePrice = Number(
//           booking.pricing?.basePrice || booking.pricing?.basePriceAtBooking || 0
//         );
//         const approvedExtraTimeCost = Number(
//           adjustment.extraTimeCost || booking.pricing?.extraTimeCost || 0
//         );
//         const approvedAdjustmentsTotal = Math.max(
//           0,
//           approvedTotal - basePrice
//         );

//         booking.totalAmount = approvedTotal;
//         booking.price = Math.max(
//           0,
//           approvedTotal - Number(booking.emergencyFee || 0)
//         );
//         booking.pricing.basePrice = basePrice;
//         booking.pricing.approvedExtraTimeCost = approvedExtraTimeCost;
//         booking.pricing.approvedAdjustmentsTotal = approvedAdjustmentsTotal;
//         booking.pricing.finalApprovedPrice = approvedTotal;
//         booking.pricing.finalPrice = approvedTotal;
//         booking.pricing.additionalEscrowRequired = additional;
//         booking.pricing.adjustment.status = "accepted";
//         booking.pricing.adjustment.clientDecisionAt = new Date();

//         const lastHistory =
//           booking.pricing.adjustmentHistory?.[
//             booking.pricing.adjustmentHistory.length - 1
//           ];
//         if (lastHistory && lastHistory.status === "pending_client_approval") {
//           lastHistory.status = "accepted";
//           lastHistory.decidedAt = new Date();
//         }

//         await booking.save();

//         await createNotification({
//           userId: booking.providerId,
//           type: "adjusted_quote_accepted",
//           title: "Adjusted Quote Accepted",
//           message:
//             additional > 0
//               ? `Client accepted the adjusted quote. Additional NPR ${additional} escrow payment is pending.`
//               : `Client accepted the adjusted quote.`,
//           category: "booking",
//           bookingId: booking._id,
//         });

//         return res.json({
//           message:
//             additional > 0
//               ? "Adjusted quote accepted. Please complete additional escrow payment before completion."
//               : "Adjusted quote accepted",
//           booking,
//           amountDue: additional,
//           breakdown: {
//             basePrice,
//             approvedExtraTimeCost,
//             approvedAdjustmentsTotal,
//             finalApprovedPrice: approvedTotal,
//           },
//         });
//       }

//       booking.pricing.adjustment.status = "rejected";
//       booking.pricing.adjustment.clientDecisionAt = new Date();
//       const lastHistory =
//         booking.pricing.adjustmentHistory?.[
//           booking.pricing.adjustmentHistory.length - 1
//         ];
//       if (lastHistory && lastHistory.status === "pending_client_approval") {
//         lastHistory.status = "rejected";
//         lastHistory.decidedAt = new Date();
//       }
//       await booking.save();

//       await createNotification({
//         userId: booking.providerId,
//         type: "adjusted_quote_rejected",
//         title: "Adjusted Quote Rejected",
//         message: "Client rejected the adjusted quote.",
//         category: "booking",
//         bookingId: booking._id,
//       });

//       res.json({ message: "Adjusted quote rejected", booking });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

// /**
//  * DIAGNOSTIC ENDPOINT
//  */
// router.get("/debug/my-bookings-check", authGuard, async (req, res, next) => {
//   try {
//     const userId = req.user.id;
//     const userRole = req.user.role;

//     const clientBookings = await Booking.find({ clientId: userId });
//     const providerBookings = await Booking.find({ providerId: userId });

//     const q =
//       userRole === "provider"
//         ? { providerId: userId }
//         : { clientId: userId };
//     const upcomingBookings = await Booking.find({
//       ...q,
//       status: {
//         $in: [
//           "requested",
//           "pending_payment",
//           "quote_requested",
//           "quote_sent",
//           "quote_pending_admin_review",
//           "quote_accepted",
//           "accepted",
//           "confirmed",
//           "provider_en_route",
//           "in-progress",
//           "pending-completion",
//           "provider_completed",
//           "awaiting_client_confirmation",
//           "disputed",
//         ],
//       },
//     });

//     res.json({
//       debug: {
//         authenticatedUserId: userId,
//         authenticatedUserRole: userRole,
//         totalClientBookings: clientBookings.length,
//         totalProviderBookings: providerBookings.length,
//         upcomingBookingsMatchingQuery: upcomingBookings.length,
//       },
//       clientBookings: clientBookings.map((b) => ({
//         _id: b._id,
//         clientId: b.clientId,
//         providerId: b.providerId,
//         status: b.status,
//         schedule: b.schedule,
//       })),
//       providerBookings: providerBookings.map((b) => ({
//         _id: b._id,
//         clientId: b.clientId,
//         providerId: b.providerId,
//         status: b.status,
//         schedule: b.schedule,
//       })),
//       upcomingBookings: upcomingBookings.map((b) => ({
//         _id: b._id,
//         clientId: b.clientId,
//         providerId: b.providerId,
//         status: b.status,
//         schedule: b.schedule,
//       })),
//     });
//   } catch (e) {
//     next(e);
//   }
// });

// module.exports = router;


const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const categoryImageUpload = require('../middleware/categoryImageUpload');
const Category = require('../models/Category');
const Subcategory = require('../models/Subcategory');
const Service = require('../models/Service');
const Review = require('../models/Review');
const AdminServiceConfig = require('../models/AdminServiceConfig');
const { broadcastToRole } = require('../utils/notificationStream');
const ProviderVerification = require('../models/ProviderVerification');
const Dispute = require('../models/Dispute');
const Booking = require('../models/Booking');
const User = require('../models/User');
const CategoryRequest = require('../models/CategoryRequest');
const Conversation = require('../models/Conversation');
const ModerationQueue = require('../models/ModerationQueue');
const sendEmail = require('../utils/sendEmail');
const {
  ensureBookingForChat,
  getBookingChatHistory,
} = require('../utils/chatService');

const router = express.Router();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ============================================
// CATEGORY SKILL REVIEW (Phase 1)
// ============================================

// GET pending skill proofs
router.get('/skills-review', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status = 'pending_review', page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const users = await User.find({
      'providerDetails.skillProofs.status': status
    })
      .select('profile.name email providerDetails.skillProofs')
      .populate('providerDetails.skillProofs.categoryId', 'name')
      .skip(skip)
      .limit(parseInt(limit));

    const items = [];
    users.forEach(user => {
      user.providerDetails.skillProofs.forEach(proof => {
        if (proof.status === status) {
          items.push({
            providerId: user._id,
            providerName: user.profile.name,
            providerEmail: user.email,
            proof
          });
        }
      });
    });

    const total = items.length;

    res.json({
      items,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (e) {
    next(e);
  }
});

// PUT approve/reject/request correction for a skill proof
router.put('/skills-review/:providerId/:categoryId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { providerId, categoryId } = req.params;
    const { status, adminFeedback } = req.body;

    if (!['approved', 'needs_correction', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const user = await User.findById(providerId);
    if (!user) return res.status(404).json({ message: 'Provider not found' });

    const proofIndex = user.providerDetails.skillProofs.findIndex(
      p => p.categoryId.toString() === categoryId
    );

    if (proofIndex === -1) {
      return res.status(404).json({ message: 'Skill proof not found for this category' });
    }

    user.providerDetails.skillProofs[proofIndex].status = status;
    user.providerDetails.skillProofs[proofIndex].adminFeedback = adminFeedback || '';
    user.providerDetails.skillProofs[proofIndex].reviewedAt = new Date();

    if (status === 'approved') {
      const isAlreadyApproved = user.providerDetails.approvedCategories.some(
        id => id.toString() === categoryId
      );
      if (!isAlreadyApproved) {
        user.providerDetails.approvedCategories.push(categoryId);
      }
    } else {
      user.providerDetails.approvedCategories = user.providerDetails.approvedCategories.filter(
        id => id.toString() !== categoryId
      );
    }

    await user.save();

    if (user.email) {
      try {
        const label = status === 'approved' ? 'approved' : status === 'needs_correction' ? 'needs correction' : 'rejected';
        await sendEmail(
          user.email,
          'SewaHive skill verification update',
          `<p>Your skill verification has been <strong>${label}</strong>.</p><p>${adminFeedback || ''}</p>`
        );
      } catch (mailError) {
        console.error('Skill review result email failed:', mailError);
      }
    }

    res.json({
      success: true,
      message: `Skill proof marked as ${status}`,
      skillProof: user.providerDetails.skillProofs[proofIndex]
    });
  } catch (e) {
    next(e);
  }
});

// ============================================
// MODERATION QUEUE (Phase 2)
// ============================================

// GET moderation queue
router.get('/moderation', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status = 'pending', page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const query = { status };

    const items = await ModerationQueue.find(query)
      .populate('providerId', 'profile.name email')
      .populate('flaggedBy', 'profile.name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ModerationQueue.countDocuments(query);

    res.json({
      items,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    next(e);
  }
});

// PUT resolve/dismiss moderation item
router.put('/moderation/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status, adminComment } = req.body;

    if (!['resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const item = await ModerationQueue.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Moderation item not found' });
    }

    item.status = status;
    item.adminComment = adminComment;
    item.reviewedBy = req.user.id;
    item.reviewedAt = new Date();

    await item.save();

    if (status === 'resolved') {
      const provider = await User.findById(item.providerId);
      if (provider) {
        if (item.contentType === 'portfolio') {
          provider.providerDetails.portfolio = provider.providerDetails.portfolio.filter(
            (p) => p._id.toString() !== item.contentId.toString()
          );
        } else if (item.contentType === 'certificate') {
          provider.providerDetails.certificates = provider.providerDetails.certificates.filter(
            (c) => c._id.toString() !== item.contentId.toString()
          );
        }
        await provider.save();
      }
    }

    res.json({ message: `Moderation item ${status}`, item });
  } catch (e) {
    next(e);
  }
});

// ============================================
// DASHBOARD STATISTICS
// ============================================

// GET dashboard statistics
router.get('/dashboard/stats', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const User = require('../models/User');
    const Payment = require('../models/Payment');

    const totalUsers = await User.countDocuments({ role: 'client' });
    const totalProviders = await User.countDocuments({ role: 'provider' });

    const approvedVerificationProviders = await ProviderVerification.distinct('providerId', {
      status: 'approved',
    });

    const approvedKycProviders = await User.find({
      role: 'provider',
      kycStatus: 'approved',
    }).select('_id');

    const verifiedProviderIds = new Set();
    approvedVerificationProviders.forEach(id => verifiedProviderIds.add(String(id)));
    approvedKycProviders.forEach(user => verifiedProviderIds.add(String(user._id)));

    const verifiedProviders = verifiedProviderIds.size;

    const pendingBadgeVerifications = await ProviderVerification.countDocuments({
      status: { $in: ['submitted', 'under_review'] },
    });

    const totalBookings = await Booking.countDocuments();
    const completedBookings = await Booking.countDocuments({ status: 'completed' });
    const ongoingBookings = await Booking.countDocuments({
      status: { $in: ['accepted', 'work_in_progress', 'on_the_way'] },
    });
    const cancelledBookings = await Booking.countDocuments({
      status: { $in: ['cancelled', 'declined'] },
    });

    const totalDisputes = await Dispute.countDocuments();
    const openDisputes = await Dispute.countDocuments({ status: 'open' });
    const resolvedDisputes = await Dispute.countDocuments({ status: 'resolved' });
    const rejectedDisputes = await Dispute.countDocuments({ status: 'rejected' });
    const pendingDisputes = openDisputes;

    const totalVerifications = await ProviderVerification.countDocuments();
    const pendingVerifications = await ProviderVerification.countDocuments({
      status: 'pending',
    });
    const approvedVerifications = await ProviderVerification.countDocuments({
      status: 'approved',
    });
    const rejectedVerifications = await ProviderVerification.countDocuments({
      status: 'rejected',
    });

    const revenueData = await Payment.aggregate([
      { $match: { status: 'RELEASED' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } },
    ]);
    const totalRevenue = revenueData[0]?.totalRevenue || 0;

    const totalTransactions = await Payment.countDocuments();
    const completedTransactions = await Payment.countDocuments({ status: 'RELEASED' });
    const pendingTransactions = await Payment.countDocuments({
      status: { $in: ['INITIATED', 'FUNDS_HELD', 'DISPUTED'] },
    });
    const failedTransactions = await Payment.countDocuments({ status: 'FAILED' });

    const totalCategories = await Category.countDocuments();
    const activeCategories = await Category.countDocuments({ status: 'active' });
    const inactiveCategories = await Category.countDocuments({ status: 'inactive' });

    const totalReviews = await Review.countDocuments();
    const reviewStats = await Review.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$rating' } } },
    ]);
    const averageRating = reviewStats[0]?.avgRating || 0;

    const activeServices = await Service.countDocuments({
      isActive: true,
      $or: [{ adminDisabled: false }, { adminDisabled: { $exists: false } }],
    });

    const pendingServices = await Service.countDocuments({
      isActive: false,
      $or: [{ adminDisabled: false }, { adminDisabled: { $exists: false } }],
    });

    const suspendedServices = await Service.countDocuments({
      adminDisabled: true,
    });

    const recentBookings = await Booking.find()
      .populate('clientId', 'profile.name email')
      .populate('providerId', 'profile.name email')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        users: {
          totalUsers,
          totalProviders,
          verifiedProviders,
          pendingVerifications: pendingBadgeVerifications,
        },
        bookings: {
          totalBookings,
          completedBookings,
          ongoingBookings,
          cancelledBookings,
        },
        services: {
          activeServices,
          pendingServices,
          suspendedServices,
          flaggedServices: 0,
        },
        admin: {
          pendingDisputes,
          pendingVerifications,
        },
        verifications: {
          totalVerifications,
          pendingVerifications,
          approvedVerifications,
          rejectedVerifications,
        },
        payments: {
          totalRevenue,
          totalTransactions,
          completedTransactions,
          pendingTransactions,
          failedTransactions,
        },
        categories: {
          totalCategories,
          activeCategories,
          inactiveCategories,
        },
        reviews: {
          totalReviews,
          averageRating,
        },
        disputes: {
          totalDisputes,
          openDisputes,
          resolvedDisputes,
          rejectedDisputes,
        },
        recentBookings,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============================================
// CATEGORIES CRUD
// ============================================

// GET all categories (with filter options)
router.get('/categories', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status, search } = req.query;

    let filter = { status: { $ne: 'deleted' } };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const categories = await Category.find(filter)
      .populate('createdBy', 'profile.name email')
      .populate('updatedBy', 'profile.name email')
      .sort({ createdAt: -1 });

    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const categoryNameRegex = new RegExp(`^${escapeRegex(category.name)}$`, 'i');
        const serviceFilter = {
          $or: [
            { categoryId: category._id },
            { category: categoryNameRegex }
          ]
        };

        const serviceCount = await Service.countDocuments(serviceFilter);
        const activeServiceCount = await Service.countDocuments({
          ...serviceFilter,
          isActive: true,
          $or: [{ adminDisabled: false }, { adminDisabled: { $exists: false } }]
        });

        const priceAgg = await Service.aggregate([
          { $match: serviceFilter },
          {
            $project: {
              minCandidate: { $ifNull: ['$priceRange.min', '$basePrice'] },
              maxCandidate: { $ifNull: ['$priceRange.max', '$basePrice'] }
            }
          },
          {
            $group: {
              _id: null,
              minPrice: { $min: '$minCandidate' },
              maxPrice: { $max: '$maxCandidate' }
            }
          }
        ]);

        const dynamicPriceRange = priceAgg.length > 0 ? {
          min: priceAgg[0].minPrice || category.recommendedPriceRange?.min || 0,
          max: priceAgg[0].maxPrice || category.recommendedPriceRange?.max || 10000
        } : category.recommendedPriceRange || { min: 0, max: 10000 };

        const providerCount = await Service.distinct('providerId', serviceFilter).then(arr => arr.length);

        const bookingCount = await Booking.aggregate([
          {
            $lookup: {
              from: 'services',
              localField: 'serviceId',
              foreignField: '_id',
              as: 'service'
            }
          },
          { $unwind: '$service' },
          {
            $match: {
              $or: [
                { 'service.categoryId': category._id },
                { 'service.category': categoryNameRegex }
              ]
            }
          },
          { $count: 'total' }
        ]);

        const totalBookings = bookingCount.length > 0 ? bookingCount[0].total : 0;

        const revenueAgg = await Booking.aggregate([
          {
            $lookup: {
              from: 'services',
              localField: 'serviceId',
              foreignField: '_id',
              as: 'service'
            }
          },
          { $unwind: '$service' },
          {
            $match: {
              status: 'completed',
              $or: [
                { 'service.categoryId': category._id },
                { 'service.category': categoryNameRegex }
              ]
            }
          },
          { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
        ]);

        const revenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

        const subcategoriesDetailed = await Subcategory.find({ categoryId: category._id })
          .sort({ sortOrder: 1, name: 1 })
          .select('name description status sortOrder suggestedPriceMode image iconKey');

        let subcategories = subcategoriesDetailed.map((sub) => sub.name);
        if (!subcategories.length) {
          subcategories = await Service.distinct('subcategory', serviceFilter);
          subcategories = subcategories.filter((item) => item && item.trim());
        }

        return {
          ...category.toObject(),
          serviceCount,
          activeServiceCount,
          dynamicPriceRange,
          subcategories,
          subcategoriesDetailed,
          analytics: {
            providerCount,
            totalBookings,
            revenue
          }
        };
      })
    );

    res.json({ success: true, data: categoriesWithCounts });
  } catch (err) {
    next(err);
  }
});

// GET category summary for service catalog manager
router.get('/categories/summary', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const categories = await Category.find({ status: { $ne: 'deleted' } }).sort({ name: 1 });

    let summary = await Promise.all(
      categories.map(async (category) => {
        const categoryNameRegex = new RegExp(`^${escapeRegex(category.name)}$`, 'i');
        const serviceFilter = {
          $or: [{ categoryId: category._id }, { category: categoryNameRegex }],
        };

        const serviceCount = await Service.countDocuments(serviceFilter);
        const activeServiceCount = await Service.countDocuments({
          ...serviceFilter,
          isActive: true,
          $or: [{ adminDisabled: false }, { adminDisabled: { $exists: false } }],
        });

        const providers = await Service.distinct('providerId', serviceFilter);

        let subcategories = await Subcategory.find({ categoryId: category._id })
          .sort({ sortOrder: 1, name: 1 })
          .select('name')
          .then((items) => items.map((item) => item.name));

        if (!subcategories.length) {
          subcategories = await Service.distinct('subcategory', serviceFilter);
          subcategories = subcategories.filter((item) => item && item.trim());
        }

        return {
          _id: category._id,
          name: category.name,
          status: category.status,
          serviceCount,
          activeServiceCount,
          providersCount: providers.length,
          subcategories,
        };
      })
    );

    const serviceCategories = await Service.aggregate([
      {
        $group: {
          _id: '$category',
          serviceCount: { $sum: 1 },
          providerIds: { $addToSet: '$providerId' },
          subcategories: { $addToSet: '$subcategory' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const summaryByName = new Map(summary.map((item) => [item.name?.toLowerCase(), item]));

    serviceCategories
      .filter((item) => item._id)
      .forEach((item) => {
        const key = item._id.toLowerCase();
        if (!summaryByName.has(key)) {
          summary.push({
            _id: null,
            name: item._id,
            status: 'active',
            serviceCount: item.serviceCount,
            activeServiceCount: item.serviceCount,
            providersCount: item.providerIds.length,
            subcategories: (item.subcategories || []).filter((sub) => sub && sub.trim()),
          });
          summaryByName.set(key, true);
        }
      });

    summary.sort((a, b) => a.name.localeCompare(b.name));

    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
});

// GET single category by ID
router.get('/categories/:categoryId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.categoryId)
      .populate('createdBy', 'profile.name email')
      .populate('updatedBy', 'profile.name email');

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
});

// CREATE category
router.post('/categories', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      name,
      description,
      icon,
      image,
      iconKey,
      sortOrder,
      recommendedPriceRange,
      suggestedPriceMode,
      adminNotes,
      subcategories,
      status,
      emergencyServiceAllowed,
      kycVerificationRequired,
    } = req.body;

    if (!name || !description) {
      return res
        .status(400)
        .json({ success: false, message: 'Name and description are required' });
    }

    const existing = await Category.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    const category = new Category({
      name: name.trim(),
      description,
      icon,
      image,
      iconKey,
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
      recommendedPriceRange: recommendedPriceRange || { min: 0, max: 10000 },
      suggestedPriceMode,
      subcategories: Array.isArray(subcategories) ? subcategories : [],
      adminNotes,
      status: status || 'active',
      emergencyServiceAllowed:
        emergencyServiceAllowed === true || emergencyServiceAllowed === 'true',
      kycVerificationRequired:
        kycVerificationRequired === true || kycVerificationRequired === 'true',
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (err) {
    next(err);
  }
});

// UPDATE category
router.put('/categories/:categoryId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      name,
      description,
      icon,
      image,
      iconKey,
      sortOrder,
      recommendedPriceRange,
      suggestedPriceMode,
      adminNotes,
      status,
      subcategories,
      emergencyServiceAllowed,
      kycVerificationRequired,
    } = req.body;

    const category = await Category.findById(req.params.categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (name && name !== category.name) {
      const existing = await Category.findOne({
        name: { $regex: `^${name}$`, $options: 'i' },
        _id: { $ne: req.params.categoryId },
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Category name already exists' });
      }
      category.name = name.trim();
    }

    if (description !== undefined) category.description = description;
    if (icon !== undefined) category.icon = icon;
    if (image !== undefined) category.image = image;
    if (iconKey !== undefined) category.iconKey = iconKey;
    if (sortOrder !== undefined) {
      category.sortOrder = Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0;
    }
    if (recommendedPriceRange) category.recommendedPriceRange = recommendedPriceRange;
    if (suggestedPriceMode !== undefined) category.suggestedPriceMode = suggestedPriceMode;
    if (adminNotes !== undefined) category.adminNotes = adminNotes;
    if (Array.isArray(subcategories)) category.subcategories = subcategories;
    if (status) category.status = status;

    if (emergencyServiceAllowed !== undefined) {
      category.emergencyServiceAllowed =
        emergencyServiceAllowed === true || emergencyServiceAllowed === 'true';
    }

    if (kycVerificationRequired !== undefined) {
      category.kycVerificationRequired =
        kycVerificationRequired === true || kycVerificationRequired === 'true';
    }

    category.updatedBy = req.user._id;

    await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE category (only if no services/bookings)
router.delete('/categories/:categoryId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const services = await Service.find({
      $or: [{ categoryId: category._id }, { category: category.name }],
    }).select('_id');

    if (services.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with active services. Disable it instead.',
      });
    }

    const bookingCount = await Booking.countDocuments({ serviceId: { $in: services } });
    if (bookingCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category linked to bookings. Disable it instead.',
      });
    }

    category.status = 'deleted';
    category.deletedAt = new Date();
    category.deletedBy = req.user._id;
    await category.save();

    await AdminServiceConfig.updateMany(
      {},
      { $pull: { categoryOverrides: { categoryId: category._id } } }
    );

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// UPLOAD category cover image via Cloudinary
router.post('/categories/:categoryId/image', authenticate, requireAdmin, categoryImageUpload.single('image'), async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    category.image = req.file.path;
    category.updatedBy = req.user._id;
    await category.save();

    res.json({
      success: true,
      message: 'Category image uploaded successfully',
      data: { image: category.image, category },
    });
  } catch (err) {
    next(err);
  }
});

// DISABLE/ENABLE category
router.patch('/categories/:categoryId/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const category = await Category.findByIdAndUpdate(
      req.params.categoryId,
      {
        status,
        updatedBy: req.user._id,
      },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({
      success: true,
      message: `Category ${status === 'active' ? 'enabled' : 'disabled'} successfully`,
      data: category,
    });

    broadcastToRole('provider', {
      event: 'admin_update',
      action: 'category_status_changed',
      data: { categoryId: String(category._id), status },
    });
  } catch (err) {
    next(err);
  }
});

// GET services under a specific category
router.get('/categories/:categoryId/services', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const categoryNameRegex = new RegExp(`^${escapeRegex(category.name)}$`, 'i');
    const services = await Service.find({
      $or: [
        { categoryId: category._id },
        { category: categoryNameRegex }
      ]
    })
      .populate('providerId', 'profile.name profile.avatar email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: services });
  } catch (err) {
    next(err);
  }
});

// ============================================
// SUBCATEGORIES CRUD
// ============================================

router.get('/subcategories', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { categoryId, status, search } = req.query;
    const filter = {};

    if (categoryId) filter.categoryId = categoryId;
    if (status) filter.status = status;
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const subcategories = await Subcategory.find(filter)
      .populate('categoryId', 'name status')
      .sort({ sortOrder: 1, name: 1 });

    res.json({ success: true, data: subcategories });
  } catch (err) {
    next(err);
  }
});

// CREATE subcategory
router.post('/subcategories', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      categoryId,
      name,
      description,
      image,
      iconKey,
      status,
      sortOrder,
      suggestedPriceMode
    } = req.body;

    if (!categoryId || !name) {
      return res.status(400).json({ success: false, message: 'Category and name are required' });
    }

    const category = await Category.findById(categoryId);
    if (!category || category.status === 'deleted') {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const existing = await Subcategory.findOne({
      categoryId,
      name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Subcategory already exists' });
    }

    const subcategory = await Subcategory.create({
      categoryId,
      name: name.trim(),
      description: description || '',
      image: image || '',
      iconKey: iconKey || '',
      status: status || 'active',
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
      suggestedPriceMode,
    });

    res.status(201).json({ success: true, data: subcategory });
  } catch (err) {
    next(err);
  }
});

// UPLOAD subcategory image via Cloudinary
router.post('/subcategories/:subcategoryId/image', authenticate, requireAdmin, categoryImageUpload.single('image'), async (req, res, next) => {
  try {
    const subcategory = await Subcategory.findById(req.params.subcategoryId);
    if (!subcategory) {
      return res.status(404).json({ success: false, message: 'Subcategory not found' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    subcategory.image = req.file.path;
    await subcategory.save();

    res.json({
      success: true,
      message: 'Subcategory image uploaded successfully',
      data: { image: subcategory.image, subcategory },
    });
  } catch (err) {
    next(err);
  }
});

// UPDATE subcategory
router.put('/subcategories/:subcategoryId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      name,
      description,
      image,
      iconKey,
      status,
      sortOrder,
      suggestedPriceMode
    } = req.body;

    const subcategory = await Subcategory.findById(req.params.subcategoryId);
    if (!subcategory) {
      return res.status(404).json({ success: false, message: 'Subcategory not found' });
    }

    if (name && name.trim() !== subcategory.name) {
      const duplicate = await Subcategory.findOne({
        categoryId: subcategory.categoryId,
        name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' },
        _id: { $ne: subcategory._id },
      });
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'Subcategory name already exists' });
      }
      subcategory.name = name.trim();
    }

    if (description !== undefined) subcategory.description = description;
    if (image !== undefined) subcategory.image = image;
    if (iconKey !== undefined) subcategory.iconKey = iconKey;
    if (status) subcategory.status = status;
    if (sortOrder !== undefined) {
      subcategory.sortOrder = Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0;
    }
    if (suggestedPriceMode !== undefined) subcategory.suggestedPriceMode = suggestedPriceMode;

    await subcategory.save();

    res.json({ success: true, data: subcategory });
  } catch (err) {
    next(err);
  }
});

// UPDATE subcategory status
router.patch('/subcategories/:subcategoryId/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const subcategory = await Subcategory.findByIdAndUpdate(
      req.params.subcategoryId,
      { status },
      { new: true }
    );

    if (!subcategory) {
      return res.status(404).json({ success: false, message: 'Subcategory not found' });
    }

    res.json({ success: true, data: subcategory });
  } catch (err) {
    next(err);
  }
});

// DELETE subcategory
router.delete('/subcategories/:subcategoryId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const subcategory = await Subcategory.findById(req.params.subcategoryId);
    if (!subcategory) {
      return res.status(404).json({ success: false, message: 'Subcategory not found' });
    }

    const linkedServices = await Service.countDocuments({ subcategoryId: subcategory._id });
    if (linkedServices > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete subcategory with linked services. Disable it instead.',
      });
    }

    await Subcategory.deleteOne({ _id: subcategory._id });

    res.json({ success: true, message: 'Subcategory deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ============================================
// CATEGORY REQUESTS
// ============================================

router.get('/category-requests', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const requests = await CategoryRequest.find(filter)
      .populate('providerId', 'profile.name email')
      .populate('reviewedBy', 'profile.name email')
      .populate('categoryId', 'name status')
      .populate('parentCategoryId', 'name status')
      .populate('subcategoryId', 'name status categoryId')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
});

router.post('/category-requests/:requestId/approve', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const request = await CategoryRequest.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already reviewed' });
    }

    const requestType = request.requestType || 'category';

    if (requestType === 'subcategory') {
      if (!request.parentCategoryId) {
        return res.status(400).json({
          success: false,
          message: 'Parent category is missing for this subcategory request',
        });
      }

      const parentCategory = await Category.findById(request.parentCategoryId);
      if (!parentCategory || parentCategory.status === 'deleted') {
        return res.status(404).json({
          success: false,
          message: 'Parent category not found',
        });
      }

      const existingSubcategory = await Subcategory.findOne({
        categoryId: parentCategory._id,
        name: { $regex: `^${escapeRegex(request.name)}$`, $options: 'i' }
      });

      if (existingSubcategory) {
        request.status = 'rejected';
        request.rejectionReason = `Subcategory already exists under ${parentCategory.name}`;
        request.adminNotes = request.rejectionReason;
        request.reviewedBy = req.user._id;
        request.reviewedAt = new Date();
        await request.save();

        return res.status(400).json({
          success: false,
          message: 'Subcategory already exists under this category',
          subcategory: existingSubcategory
        });
      }

      const subcategory = await Subcategory.create({
        categoryId: parentCategory._id,
        name: request.name,
        description: request.description || '',
        status: 'active',
        sortOrder: 0,
      });

      request.status = 'approved';
      request.categoryId = parentCategory._id;
      request.subcategoryId = subcategory._id;
      request.adminNotes = req.body.adminNotes || 'Approved';
      request.rejectionReason = undefined;
      request.reviewedBy = req.user._id;
      request.reviewedAt = new Date();
      await request.save();

      broadcastToRole('provider', {
        event: 'category_request_approved',
        data: {
          requestId: String(request._id),
          requestType: 'subcategory',
          categoryId: String(parentCategory._id),
          categoryName: parentCategory.name,
          subcategoryId: String(subcategory._id),
          subcategoryName: subcategory.name,
          providerId: String(request.providerId)
        },
      });

      return res.json({
        success: true,
        message: 'Subcategory request approved and subcategory created',
        category: parentCategory,
        subcategory,
      });
    }

    const existingCategory = await Category.findOne({
      name: { $regex: `^${escapeRegex(request.name)}$`, $options: 'i' }
    });

    if (existingCategory) {
      request.status = 'rejected';
      request.rejectionReason = 'Category already exists';
      request.adminNotes = request.rejectionReason;
      request.reviewedBy = req.user._id;
      request.reviewedAt = new Date();
      await request.save();

      return res.status(400).json({
        success: false,
        message: 'Category already exists',
        category: existingCategory
      });
    }

    const category = await Category.create({
      name: request.name,
      description: request.description,
      status: 'active',
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    request.status = 'approved';
    request.categoryId = category._id;
    request.subcategoryId = undefined;
    request.adminNotes = req.body.adminNotes || 'Approved';
    request.rejectionReason = undefined;
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    broadcastToRole('provider', {
      event: 'category_request_approved',
      data: {
        requestId: String(request._id),
        requestType: 'category',
        categoryId: String(category._id),
        categoryName: category.name,
        providerId: String(request.providerId)
      },
    });

    res.json({
      success: true,
      message: 'Category request approved and category created',
      category
    });
  } catch (err) {
    next(err);
  }
});

router.post('/category-requests/:requestId/reject', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const request = await CategoryRequest.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already reviewed' });
    }

    const rejectionReason = req.body.reason || req.body.adminNotes || 'Does not meet platform requirements';

    request.status = 'rejected';
    request.adminNotes = rejectionReason;
    request.rejectionReason = rejectionReason;
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    broadcastToRole('provider', {
      event: 'category_request_rejected',
      data: {
        requestId: String(request._id),
        requestType: request.requestType || 'category',
        reason: rejectionReason,
        providerId: String(request.providerId)
      },
    });

    res.json({
      success: true,
      message: 'Category request rejected'
    });
  } catch (err) {
    next(err);
  }
});

// ============================================
// SERVICE FLAGGING / RESTRICTIONS
// ============================================
router.patch('/services/:serviceId/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status, reason } = req.body;

    if (!['active', 'pending', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Allowed values: active, pending, suspended',
      });
    }

    const service = await Service.findById(req.params.serviceId);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    if (status === 'active') {
      service.isActive = true;
      service.adminDisabled = false;
      service.adminDisabledReason = null;
      service.adminDisabledAt = null;
      service.adminDisabledBy = null;
    }

    if (status === 'pending') {
      service.isActive = false;
      service.adminDisabled = false;
      service.adminDisabledReason = reason || null;
      service.adminDisabledAt = null;
      service.adminDisabledBy = null;
    }

    if (status === 'suspended') {
      service.isActive = false;
      service.adminDisabled = true;
      service.adminDisabledReason = reason || 'Service suspended by admin';
      service.adminDisabledAt = new Date();
      service.adminDisabledBy = req.user._id;
    }

    await service.save();

    const { createNotification } = require('../utils/createNotification');

    let type = 'service_status_updated';
    let title = 'Service Status Updated';
    let message = `Your service "${service.title}" status was updated.`;

    if (status === 'active') {
      type = 'service_restored';
      title = 'Service Activated';
      message = `Your service "${service.title}" is now active.`;
    } else if (status === 'pending') {
      type = 'service_unpublished';
      title = 'Service Moved to Pending';
      message = `Your service "${service.title}" was moved to pending.${reason ? ` Reason: ${reason}` : ''}`;
    } else if (status === 'suspended') {
      type = 'service_suspended';
      title = 'Service Suspended';
      message = `Your service "${service.title}" was suspended by admin.${service.adminDisabledReason ? ` Reason: ${service.adminDisabledReason}` : ''}`;
    }

    await createNotification({
      userId: service.providerId,
      type,
      title,
      message,
      metadata: { serviceId: service._id, status },
    });

    res.json({
      success: true,
      data: {
        _id: service._id,
        title: service.title,
        isActive: service.isActive,
        adminDisabled: service.adminDisabled,
        adminDisabledReason: service.adminDisabledReason,
        status,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============================================
// SERVICE MANAGEMENT
// ============================================

router.get('/services/pricing', authenticate, requireAdmin, async (req, res, next) => {
  try {
    let config = await AdminServiceConfig.findOne()
      .populate('categoryOverrides.categoryId', 'name');

    if (!config) {
      config = await AdminServiceConfig.create({ updatedBy: req.user._id });
    }

    const overrides = config.categoryOverrides.map((override) => ({
      categoryId: override.categoryId?._id || override.categoryId,
      categoryName: override.categoryId?.name || 'Unknown',
      commission: override.commission,
      emergencySurcharge: override.emergencySurcharge,
    }));

    res.json({
      success: true,
      data: {
        platformCommission: config.platformCommission,
        processingFee: config.processingFee,
        emergencySurcharge: config.emergencySurcharge,
        minimumServiceFee: config.minimumServiceFee,
        promoDiscountEnabled: config.promoDiscountEnabled,
        categoryOverrides: overrides,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.put('/services/pricing', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      platformCommission,
      processingFee,
      emergencySurcharge,
      minimumServiceFee,
      promoDiscountEnabled,
      categoryOverrides,
    } = req.body;

    const config = await AdminServiceConfig.findOne();
    const updated = config || new AdminServiceConfig();

    if (platformCommission !== undefined) updated.platformCommission = platformCommission;
    if (processingFee !== undefined) updated.processingFee = processingFee;
    if (emergencySurcharge !== undefined) updated.emergencySurcharge = emergencySurcharge;
    if (minimumServiceFee !== undefined) updated.minimumServiceFee = minimumServiceFee;
    if (promoDiscountEnabled !== undefined) updated.promoDiscountEnabled = promoDiscountEnabled;
    if (Array.isArray(categoryOverrides)) updated.categoryOverrides = categoryOverrides;

    updated.updatedBy = req.user._id;
    await updated.save();

    res.json({ success: true, message: 'Pricing updated successfully' });
  } catch (err) {
    next(err);
  }
});

router.get('/providers/featured', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const scope = req.query.scope || 'featured';
    const filter = { role: 'provider' };
    if (scope === 'featured') {
      filter['providerDetails.featured'] = true;
    }

    const providers = await User.find(filter)
      .select('profile.name providerDetails.categories providerDetails.rating providerDetails.completedBookings providerDetails.featured')
      .sort({ 'providerDetails.rating.average': -1 })
      .limit(50);

    const data = providers.map((provider) => ({
      id: provider._id,
      name: provider.profile?.name || 'Unknown',
      category: provider.providerDetails?.categories?.[0] || 'General',
      rating: provider.providerDetails?.rating?.average || 0,
      featured: Boolean(provider.providerDetails?.featured),
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.patch('/providers/:providerId/featured', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { featured } = req.body;

    const provider = await User.findOne({ _id: req.params.providerId, role: 'provider' });
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    provider.providerDetails = provider.providerDetails || {};
    provider.providerDetails.featured = Boolean(featured);
    await provider.save();

    res.json({ success: true, data: { id: provider._id, featured: provider.providerDetails.featured } });
  } catch (err) {
    next(err);
  }
});

router.get('/services/moderation', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const filter = {};

    if (status === 'active') {
      filter.isActive = true;
      filter.$or = [{ adminDisabled: false }, { adminDisabled: { $exists: false } }];
    }

    if (status === 'pending') {
      filter.isActive = false;
      filter.$or = [{ adminDisabled: false }, { adminDisabled: { $exists: false } }];
    }

    if (status === 'suspended') {
      filter.adminDisabled = true;
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { title: regex },
          { description: regex },
          { category: regex },
          { subcategory: regex },
        ],
      });
    }

    const services = await Service.find(filter)
      .populate('providerId', 'profile.name email')
      .populate('categoryId', 'name')
      .populate('subcategoryId', 'name')
      .sort({ createdAt: -1 })
      .limit(100);

    const queue = services
      .filter((service) => {
        if (!search) return true;

        const searchLower = search.toLowerCase();
        const providerName = service.providerId?.profile?.name?.toLowerCase() || '';
        const categoryName = service.categoryId?.name?.toLowerCase() || service.category?.toLowerCase() || '';
        const subcategoryName = service.subcategoryId?.name?.toLowerCase() || service.subcategory?.toLowerCase() || '';
        const title = service.title?.toLowerCase() || '';
        const description = service.description?.toLowerCase() || '';

        return (
          providerName.includes(searchLower) ||
          categoryName.includes(searchLower) ||
          subcategoryName.includes(searchLower) ||
          title.includes(searchLower) ||
          description.includes(searchLower)
        );
      })
      .map((service) => {
        let derivedStatus = 'pending';
        if (service.adminDisabled) derivedStatus = 'suspended';
        else if (service.isActive) derivedStatus = 'active';

        return {
          id: String(service._id),
          service: service.title,
          provider: service.providerId?.profile?.name || 'Unknown',
          category: service.categoryId?.name || service.category || 'Uncategorized',
          status: derivedStatus,
          flagReason:
            service.adminDisabledReason ||
            (derivedStatus === 'pending' ? 'Awaiting activation / unpublished' : '-'),
          createdAt: service.createdAt,
        };
      });

    res.json({ success: true, data: queue });
  } catch (err) {
    next(err);
  }
});

router.get('/services/analytics', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const topServicesAgg = await Booking.aggregate([
      { $group: { _id: '$serviceId', bookingCount: { $sum: 1 } } },
      { $sort: { bookingCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'services',
          localField: '_id',
          foreignField: '_id',
          as: 'service',
        },
      },
      { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },
    ]);

    const topServices = topServicesAgg.map((item) => ({
      name: item.service?.title || 'Unknown Service',
      bookings: item.bookingCount,
    }));

    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const prev30 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const currentCategories = await Booking.aggregate([
      { $match: { createdAt: { $gte: last30 } } },
      {
        $lookup: {
          from: 'services',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'service',
        },
      },
      { $unwind: '$service' },
      {
        $group: { _id: '$service.category', count: { $sum: 1 } },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const previousCategories = await Booking.aggregate([
      { $match: { createdAt: { $gte: prev30, $lt: last30 } } },
      {
        $lookup: {
          from: 'services',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'service',
        },
      },
      { $unwind: '$service' },
      { $group: { _id: '$service.category', count: { $sum: 1 } } },
    ]);

    const previousMap = previousCategories.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const trendingCategories = currentCategories.map((item) => {
      const previous = previousMap[item._id] || 0;
      const growth = previous === 0
        ? 100
        : Math.round(((item.count - previous) / previous) * 100);

      return {
        name: item._id || 'General',
        growth: `${growth >= 0 ? '+' : ''}${growth}%`,
      };
    });

    const topProvidersAgg = await Booking.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$providerId', completedJobs: { $sum: 1 } } },
      { $sort: { completedJobs: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'provider',
        },
      },
      { $unwind: { path: '$provider', preserveNullAndEmptyArrays: true } },
    ]);

    const topProviders = topProvidersAgg.map((item) => ({
      name: item.provider?.profile?.name || 'Unknown Provider',
      jobs: item.completedJobs,
      rating: item.provider?.providerDetails?.rating?.average || 0,
    }));

    res.json({
      success: true,
      data: {
        topServices,
        trendingCategories,
        topProviders,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/categories/:categoryId/stats', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const servicesCount = await Service.countDocuments({ categoryId: req.params.categoryId });
    const activeServicesCount = await Service.countDocuments({
      categoryId: req.params.categoryId,
      isActive: true,
    });

    res.json({
      success: true,
      data: {
        category,
        servicesCount,
        activeServicesCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============================================
// PRICE REVIEW / QUOTE APPROVAL
// ============================================

router.get('/quotes/pending', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const Booking = require('../models/Booking');

    const pendingQuotes = await Booking.find({
      'quote.status': 'pending_admin_review',
    })
      .populate('clientId', 'profile.name email phone')
      .populate('providerId', 'profile.name email')
      .populate('serviceId', 'title category')
      .sort({ 'quote.createdAt': -1 });

    res.json({ success: true, data: pendingQuotes });
  } catch (err) {
    next(err);
  }
});

router.patch('/quotes/:bookingId/review', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const Booking = require('../models/Booking');
    const { action, approvedPrice, adminComment } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!booking.quote || booking.quote.status !== 'pending_admin_review') {
      return res.status(400).json({ success: false, message: 'No pending quote for this booking' });
    }

    if (action === 'approve') {
      const finalPrice = approvedPrice || booking.quote.quotedPrice;
      booking.quote.status = 'approved';
      booking.quote.approvedPrice = finalPrice;
      booking.quote.approvedAt = new Date();
      booking.quote.adminComment = adminComment;
      booking.price = finalPrice;
      booking.totalAmount = finalPrice + (booking.platformFee || 0) + (booking.emergencyFee || 0);
    } else if (action === 'reject') {
      booking.quote.status = 'rejected';
      booking.quote.rejectionReason = adminComment;
      booking.quote.rejectedAt = new Date();
      booking.status = 'quote_rejected';
    }

    await booking.save();

    const { createNotification } = require('../utils/createNotification');
    await createNotification({
      userId: booking.providerId,
      type: action === 'approve' ? 'quote_approved' : 'quote_rejected',
      title: action === 'approve' ? 'Quote Approved' : 'Quote Rejected',
      message: `Your quote for booking ${booking._id} has been ${action}ed. ${adminComment ? `Comment: ${adminComment}` : ''}`,
      bookingId: booking._id,
      metadata: {
        action,
        approvedPrice: booking.quote.approvedPrice,
        adminComment,
      },
    });

    res.json({
      success: true,
      message: `Quote ${action}ed successfully`,
      data: booking,
    });
  } catch (err) {
    next(err);
  }
});

// ============================================
// PROVIDER VERIFICATION & MANAGEMENT
// ============================================

router.get('/providers', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const User = require('../models/User');
    const { status, search } = req.query;

    let filter = { role: 'provider' };
    if (status) filter['providerDetails.verificationStatus'] = status;
    if (search) {
      filter.$or = [
        { 'profile.name': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const providers = await User.find(filter)
      .select(
        'profile email phone providerDetails.verificationStatus providerDetails.badges providerDetails.completedBookings createdAt'
      )
      .sort({ createdAt: -1 });

    res.json({ success: true, data: providers });
  } catch (err) {
    next(err);
  }
});

router.get('/providers/:providerId/verification', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const User = require('../models/User');

    const provider = await User.findById(req.params.providerId).select('profile providerDetails email');
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    res.json({
      success: true,
      data: {
        provider: {
          _id: provider._id,
          name: provider.profile?.name,
          email: provider.email,
        },
        documents: provider.providerDetails?.verificationDocs || [],
      },
    });
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/providers/:providerId/verification/:docIndex/review',
  authenticate,
  requireAdmin,
  async (req, res, next) => {
    try {
      const User = require('../models/User');
      const { status, adminComment } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }

      const provider = await User.findById(req.params.providerId);
      if (!provider) {
        return res.status(404).json({ success: false, message: 'Provider not found' });
      }

      const docIndex = parseInt(req.params.docIndex);
      if (docIndex < 0 || docIndex >= provider.providerDetails.verificationDocs.length) {
        return res.status(400).json({ success: false, message: 'Invalid document index' });
      }

      provider.providerDetails.verificationDocs[docIndex].status = status;
      provider.providerDetails.verificationDocs[docIndex].adminComment = adminComment;
      provider.providerDetails.verificationDocs[docIndex].reviewedAt = new Date();

      const allApproved = provider.providerDetails.verificationDocs.every(
        (doc) => doc.status === 'approved'
      );
      if (allApproved) {
        const existingBadges = Array.isArray(provider.providerDetails.badges)
          ? provider.providerDetails.badges
          : provider.providerDetails.badges
          ? [provider.providerDetails.badges]
          : [];

        if (!existingBadges.includes('verified')) {
          provider.providerDetails.badges = [...existingBadges, 'verified'];
        }
      }

      await provider.save();

      const ProviderVerification = require('../models/ProviderVerification');
      await ProviderVerification.findOneAndUpdate(
        { providerId: provider._id },
        {
          status,
          adminComment,
          reviewedAt: new Date(),
          reviewedBy: req.user._id,
        },
        { sort: { createdAt: -1 } }
      );

      await User.findByIdAndUpdate(provider._id, {
        kycStatus: status === 'approved' ? 'approved' : 'rejected',
      });

      const { createNotification } = require('../utils/createNotification');
      await createNotification({
        userId: provider._id,
        type: 'verification_' + status,
        title: `Verification ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        message: `Your verification document has been ${status}. ${adminComment ? `Comment: ${adminComment}` : ''}`,
        metadata: { docIndex, adminComment },
      });

      res.json({
        success: true,
        message: `Verification document ${status} successfully`,
        data: provider,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================
// PROVIDER KYC VERIFICATIONS (NEW FLOW)
// ============================================

router.get('/verifications', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status, search } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const query = ProviderVerification.find(filter)
      .populate('providerId', 'profile.name email phone')
      .sort({ createdAt: -1 });

    let records = await query;

    if (search) {
      const searchLower = String(search).toLowerCase();
      records = records.filter((r) => {
        const name = r.providerId?.profile?.name?.toLowerCase() || '';
        const email = r.providerId?.email?.toLowerCase() || '';
        const phone = r.providerId?.phone || '';
        return name.includes(searchLower) || email.includes(searchLower) || phone.includes(searchLower);
      });
    }

    res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
});

router.patch('/verifications/:verificationId/review', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      status,
      adminComment,
      docReviews = [],
      screeningStatus,
      flagReason,
      badge,
    } = req.body;

    console.log('📋 KYC Review Request:', {
      verificationId: req.params.verificationId,
      docReviewsCount: docReviews.length,
      screeningStatus,
      status,
    });

    const allowedStatuses = ['submitted', 'under_review', 'needs_correction', 'approved', 'rejected'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const verification = await ProviderVerification.findById(req.params.verificationId);
    if (!verification) {
      return res.status(404).json({ success: false, message: 'Verification not found' });
    }

    if (Array.isArray(docReviews) && docReviews.length > 0) {
      console.log('Processing doc reviews:', docReviews.length);

      docReviews.forEach((review) => {
        if (!review?.docId) {
          console.warn('⚠️ Review missing docId:', review);
          return;
        }

        console.log('Updating doc:', review.docId, 'with status:', review.status);

        let targetDoc = null;

        if (verification.documents && verification.documents.length > 0) {
          targetDoc = verification.documents.find(d => String(d._id) === String(review.docId));
        }

        if (!targetDoc && verification.addressDocuments && verification.addressDocuments.length > 0) {
          targetDoc = verification.addressDocuments.find(d => String(d._id) === String(review.docId));
        }

        if (targetDoc) {
          if (review.status) targetDoc.status = review.status;
          if (typeof review.adminComment === 'string') targetDoc.adminComment = review.adminComment;
          if (typeof review.rejectionReason === 'string') targetDoc.rejectionReason = review.rejectionReason;
          console.log('✅ Updated doc successfully');
        } else {
          console.warn('⚠️ Document not found:', review.docId);
        }
      });
    }

    const allDocs = [
      ...(verification.documents || []),
      ...(verification.addressDocuments || []),
    ];

    console.log('Total docs to check:', allDocs.length);
    const anyRejected = allDocs.some((doc) => doc.status === 'rejected');
    const allApproved = allDocs.length > 0 && allDocs.every((doc) => doc.status === 'approved');

    let derivedStatus = status || null;
    if (!derivedStatus) {
      if (anyRejected) derivedStatus = 'needs_correction';
      else if (allApproved) derivedStatus = 'approved';
      else if (docReviews.length > 0) derivedStatus = 'under_review';
      else derivedStatus = verification.status || 'submitted';
    }

    console.log('Derived status:', derivedStatus, 'anyRejected:', anyRejected, 'allApproved:', allApproved);

    verification.status = derivedStatus;
    if (typeof adminComment === 'string') {
      verification.adminComment = adminComment || null;
    }
    if (screeningStatus) verification.screeningStatus = screeningStatus;
    if (typeof flagReason === 'string') verification.flagReason = flagReason || null;

    if (derivedStatus === 'approved' && badge) {
      verification.badge = badge;
    }

    verification.reviewedAt = new Date();
    verification.reviewedBy = req.user._id;
    verification.auditLogs = verification.auditLogs || [];
    verification.auditLogs.push({
      action: `review_${derivedStatus}`,
      note: adminComment || null,
      by: req.user._id,
    });

    await verification.save();
    console.log('✅ Verification saved with status:', derivedStatus);

    const User = require('../models/User');
    const { normalizeKycStatus } = require('../utils/kyc');

    if (derivedStatus === 'approved') {
      const nextBadge = badge || 'verified';
      console.log('Approving provider with badge:', nextBadge);

      const user = await User.findById(verification.providerId);
      if (user) {
        if (!Array.isArray(user.providerDetails.badges)) {
          user.providerDetails.badges = [];
        }

        if (!user.providerDetails.badges.includes(nextBadge)) {
          user.providerDetails.badges.push(nextBadge);
        }

        user.kycStatus = normalizeKycStatus(derivedStatus);

        await user.save();
        console.log('✅ Provider updated with approved status and badge:', nextBadge);
      } else {
        console.warn('⚠️ Provider user not found:', verification.providerId);
      }
    } else if (['rejected', 'needs_correction', 'under_review', 'submitted'].includes(derivedStatus)) {
      console.log('Setting provider KYC status to:', derivedStatus);

      await User.findByIdAndUpdate(verification.providerId, {
        kycStatus: normalizeKycStatus(derivedStatus),
      });
      console.log('✅ Provider updated with status:', derivedStatus);
    }

    const { createNotification } = require('../utils/createNotification');
    if (['approved', 'rejected', 'needs_correction'].includes(derivedStatus)) {
      const rejectedDocs = allDocs
        .filter((doc) => doc.status === 'rejected')
        .map((doc) => doc.type)
        .join(', ');

      const baseMessage = adminComment || `Your verification was ${derivedStatus.replace('_', ' ')}.`;
      const message = rejectedDocs
        ? `${baseMessage} Please reupload: ${rejectedDocs}.`
        : baseMessage;

      console.log('Sending notification with message:', message);

      await createNotification({
        userId: verification.providerId,
        type: `verification_${derivedStatus}`,
        title:
          derivedStatus === 'approved'
            ? 'Verification Approved'
            : derivedStatus === 'needs_correction'
            ? 'Verification Needs Correction'
            : 'Verification Rejected',
        message,
        category: 'verification',
        metadata: { verificationId: verification._id },
      });
      console.log('✅ Notification sent to provider');
    }

    console.log('✅ KYC Review completed successfully');
    res.json({ success: true, data: verification });
  } catch (err) {
    console.error('❌ KYC Review Error:', {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });
    next(err);
  }
});

// ============================================
// DISPUTES (ADMIN)
// ============================================
router.get('/chat/booking/:bookingId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { before, limit = 30 } = req.query;

    const { booking } = await ensureBookingForChat({
      bookingId,
      user: { id: req.user.id, role: req.user.role },
      allowAdminRead: true,
      adminDisputeOnly: true,
    });

    const conversation = await Conversation.findOne({ bookingId: booking._id }).lean();
    const history = await getBookingChatHistory({
      bookingId: booking._id,
      before,
      limit,
    });

    res.json({
      booking: {
        _id: booking._id,
        status: booking.status,
        disputeId: booking.disputeId || null,
        clientId: booking.clientId?._id || booking.clientId,
        providerId: booking.providerId?._id || booking.providerId,
      },
      conversation,
      messages: history.messages,
      pagination: {
        hasMore: history.hasMore,
        nextBefore: history.nextBefore,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/disputes', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const disputes = await Dispute.find(filter)
      .populate('bookingId', 'clientId providerId status')
      .populate('openedBy', 'profile.name email role')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: disputes });
  } catch (err) {
    next(err);
  }
});

router.patch('/disputes/:id/resolve', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { adminResolution } = req.body;

    const dispute = await Dispute.findByIdAndUpdate(
      req.params.id,
      {
        adminResolution,
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: req.user._id,
      },
      { new: true }
    );

    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Dispute not found' });
    }

    if (dispute.bookingId) {
      const booking = await Booking.findById(dispute.bookingId).select('clientId providerId status');
      if (booking) {
        const { createNotification } = require('../utils/createNotification');
        const message = adminResolution || 'Your dispute has been resolved by admin.';

        if (booking.clientId) {
          await createNotification({
            userId: booking.clientId,
            type: 'dispute_resolved',
            title: 'Dispute Resolved',
            message,
            disputeId: dispute._id,
            bookingId: dispute.bookingId,
          });
        }

        if (booking.providerId) {
          await createNotification({
            userId: booking.providerId,
            type: 'dispute_resolved',
            title: 'Dispute Resolved',
            message,
            disputeId: dispute._id,
            bookingId: dispute.bookingId,
          });
        }

        if (adminResolution === 'booking_valid') {
          booking.status = 'awaiting_client_confirmation';
        } else if (adminResolution === 'refund_full' || adminResolution === 'refund_partial') {
          booking.status = 'resolved_refunded';
        } else if (adminResolution === 'reservice') {
          booking.status = 'confirmed';
        }

        await booking.save();
      }
    }

    res.json({ success: true, data: dispute });
  } catch (err) {
    next(err);
  }
});

// ============================================
// REVIEWS (ADMIN)
// ============================================

router.get('/reviews', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const reviews = await Review.find()
      .populate('clientId', 'profile.name email')
      .populate('providerId', 'profile.name email')
      .populate('bookingId', '_id')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments();

    res.json({
      success: true,
      data: reviews,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      }
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/reviews/:reviewId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.reviewId);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.json({ success: true, message: 'Review removed successfully' });
  } catch (err) {
    next(err);
  }
});

// ============================================
// PROVIDER STATUS MANAGEMENT
// ============================================

router.get('/providers/status/list', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const User = require('../models/User');
    const { providerStatus, search } = req.query;

    let filter = { role: 'provider' };
    if (providerStatus) filter.providerStatus = providerStatus;
    if (search) {
      filter.$or = [
        { 'profile.name': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const providers = await User.find(filter)
      .select('profile email phone providerStatus providerDetails.badges providerDetails.completedBookings createdAt')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: providers });
  } catch (err) {
    next(err);
  }
});

router.patch('/providers/:providerId/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const User = require('../models/User');
    const { providerStatus, adminComment } = req.body;

    if (!['pending', 'verified', 'rejected'].includes(providerStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid provider status' });
    }

    const provider = await User.findById(req.params.providerId);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    if (provider.role !== 'provider') {
      return res.status(400).json({ success: false, message: 'User is not a provider' });
    }

    const previousStatus = provider.providerStatus;
    provider.providerStatus = providerStatus;

    if (adminComment && provider.admin) {
      provider.admin.notes = adminComment;
    } else if (adminComment) {
      provider.admin = { notes: adminComment };
    }

    await provider.save();

    const message = `Your provider account status has been updated to: ${providerStatus}`;
    broadcastToRole('provider', {
      type: 'provider_status_changed',
      title: 'Provider Status Update',
      message: message,
      providerId: provider._id,
      newStatus: providerStatus,
      previousStatus: previousStatus,
    });

    res.json({
      success: true,
      message: `Provider status updated from ${previousStatus} to ${providerStatus}`,
      data: {
        providerId: provider._id,
        name: provider.profile?.name,
        email: provider.email,
        providerStatus: provider.providerStatus,
        adminComment: provider.admin?.notes || null,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/providers/:providerId/details', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const User = require('../models/User');

    const provider = await User.findById(req.params.providerId).select(
      'profile email phone providerStatus providerDetails admin createdAt'
    );

    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    if (provider.role !== 'provider') {
      return res.status(400).json({ success: false, message: 'User is not a provider' });
    }

    res.json({
      success: true,
      data: {
        _id: provider._id,
        name: provider.profile?.name,
        email: provider.email,
        phone: provider.phone,
        providerStatus: provider.providerStatus,
        categories: provider.providerDetails?.categories || [],
        hourlyRate: provider.providerDetails?.hourlyRate,
        basePrice: provider.providerDetails?.basePrice,
        experienceYears: provider.providerDetails?.experienceYears,
        rating: provider.providerDetails?.rating,
        completedBookings: provider.providerDetails?.completedBookings,
        verificationDocs: provider.providerDetails?.verificationDocs || [],
        adminNotes: provider.admin?.notes || null,
        createdAt: provider.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/users', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const User = require('../models/User');
    const { role, status, search } = req.query;

    let filter = {};
    if (role && role !== 'all') filter.role = role;
    if (status && status !== 'all') {
      if (status === 'suspended') {
        filter.accountStatus = 'suspended';
      } else if (status === 'active') {
        filter.accountStatus = { $ne: 'suspended' };
      }
    }
    if (search) {
      filter.$or = [
        { 'profile.name': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('profile email phone role providerDetails accountStatus createdAt location providerStatus')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
});

router.get('/bookings', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { search, status } = req.query;

    let filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    let bookings = [];

    if (search) {
      const User = require('../models/User');

      const matchingUsers = await User.find({
        $or: [
          { 'profile.name': { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');

      const userIds = matchingUsers.map((u) => u._id);

      filter.$or = [
        { clientId: { $in: userIds } },
        { providerId: { $in: userIds } },
      ];

      if (search.match(/^[0-9a-fA-F]{24}$/)) {
        filter.$or.push({ _id: search });
      }
    }

    bookings = await Booking.find(filter)
      .populate('clientId', 'profile email')
      .populate('providerId', 'profile email')
      .populate('serviceId', 'title')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, data: bookings });
  } catch (err) {
    next(err);
  }
});

router.get('/services', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { search, status } = req.query;

    let filter = {};
    if (status) {
      if (status === 'active') {
        filter.isActive = true;
        filter.adminDisabled = false;
      } else if (status === 'inactive') {
        filter.$or = [{ isActive: false }, { adminDisabled: true }];
      }
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const services = await Service.find(filter)
      .populate('providerId', 'profile email')
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, data: services });
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:id/suspend', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const togglingToActive = user.accountStatus === 'suspended';
    const { reason = '', endsAt = null } = req.body || {};

    user.accountStatus = togglingToActive ? 'active' : 'suspended';
    user.suspension = togglingToActive
      ? { reason: '', startsAt: null, endsAt: null, imposedBy: null }
      : {
          reason: String(reason || 'Suspended by admin').trim(),
          startsAt: new Date(),
          endsAt: endsAt ? new Date(endsAt) : null,
          imposedBy: req.user.id,
        };

    if (!togglingToActive && user.suspension.endsAt && Number.isNaN(user.suspension.endsAt.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid suspension end date' });
    }

    await user.save();

    const createNotification = require('../utils/createNotification');
    await createNotification({
      userId: user._id,
      type: 'account_update',
      title: togglingToActive ? 'Account Reactivated' : 'Account Suspended',
      message: togglingToActive
        ? 'Your account has been reactivated. You can now use all services.'
        : `Your account has been suspended.${user.suspension?.reason ? ` Reason: ${user.suspension.reason}` : ''}${user.suspension?.endsAt ? ` Suspension ends at ${new Date(user.suspension.endsAt).toLocaleString()}.` : ''}`,
      priority: 'high',
    });

    if (user.email) {
      try {
        await sendEmail(
          user.email,
          togglingToActive ? 'SewaHive account reactivated' : 'SewaHive account suspended',
          togglingToActive
            ? '<p>Your account has been reactivated. You can sign in again.</p>'
            : `<p>Your account has been suspended.</p><p>Reason: ${user.suspension?.reason || 'Not specified'}</p><p>${user.suspension?.endsAt ? `Ends at: ${new Date(user.suspension.endsAt).toLocaleString()}` : 'Duration: Until manually reactivated'}</p>`
        );
      } catch (mailError) {
        console.error('Suspension email failed:', mailError);
      }
    }

    res.json({
      success: true,
      message: `User ${togglingToActive ? 'reactivated' : 'suspended'} successfully`,
      data: { accountStatus: user.accountStatus, suspension: user.suspension },
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/users/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.accountStatus = 'deleted';
    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'User account deleted successfully',
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:id/verify', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role !== 'provider') {
      return res.status(400).json({ success: false, message: 'Can only verify provider accounts' });
    }

    user.providerStatus = 'verified';

    if (!user.providerDetails) {
      user.providerDetails = {};
    }
    const currentBadges = Array.isArray(user.providerDetails.badges)
      ? user.providerDetails.badges
      : user.providerDetails.badges
      ? [user.providerDetails.badges]
      : [];

    user.providerDetails.badges = currentBadges.includes('verified')
      ? currentBadges
      : [...currentBadges, 'verified'];

    await user.save();

    const createNotification = require('../utils/createNotification');
    await createNotification({
      userId: user._id,
      type: 'verification_approved',
      title: 'Provider Verification Approved',
      message: 'Congratulations! Your provider account has been verified. You can now offer services.',
      priority: 'high',
    });

    res.json({
      success: true,
      message: 'Provider verified successfully',
      data: {
        providerStatus: user.providerStatus,
        badges: user.providerDetails.badges,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============================================
// PLATFORM SETTINGS
// ============================================

// GET /admin/settings — fetch singleton config (upsert if missing)
router.get('/settings', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const settings = await AdminServiceConfig.findOneAndUpdate(
      {},
      {},
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
});

// PUT /admin/settings — update allowed fields
router.put('/settings', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const allowed = [
      'platformCommission',
      'emergencySurcharge',
      'minimumServiceFee',
      'emailNotificationsEnabled',
      'smsAlertsEnabled',
      'maintenanceMode',
      'registrationOpen',
      'termsAndConditions',
      'termsVersion',
      'termsUpdatedAt',
    ];

    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    update.updatedBy = req.user._id;

    const settings = await AdminServiceConfig.findOneAndUpdate(
      {},
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
});

module.exports = router;