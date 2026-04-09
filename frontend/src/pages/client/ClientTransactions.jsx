// import { useEffect, useMemo, useState } from "react";
// import toast from "react-hot-toast";
// import ClientLayout from "../../layouts/ClientLayout";
// import api from "../../utils/axios";
// import {
//   HiBanknotes,
//   HiClock,
//   HiCheckCircle,
//   HiInformationCircle,
//   HiArrowUturnLeft,
// } from "react-icons/hi2";

// /* ─── helpers ────────────────────────────────────────────────────────────── */
// const fmt = (n) =>
//   Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

// const fmtDate = (d) =>
//   d
//     ? new Date(d).toLocaleDateString("en-US", {
//         month: "short",
//         day: "numeric",
//         year: "numeric",
//       })
//     : "—";

// const DASHBOARD_RANGES = [
//   { value: "today", label: "Today" },
//   { value: "week", label: "This Week" },
//   { value: "month", label: "This Month" },
//   { value: "year", label: "This Year" },
//   { value: "custom", label: "Custom Range" },
// ];

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

// function getResolution(payment) {
//   return payment?.receipt?.disputeResolution || {};
// }

// function getRefundAmount(payment) {
//   const resolution = getResolution(payment);

//   if (Number.isFinite(Number(resolution.refundAmount))) {
//     return Number(resolution.refundAmount);
//   }

//   if (payment?.status === "REFUNDED") {
//     return Number(payment?.amount || 0);
//   }

//   return 0;
// }

// function getProviderPayout(payment) {
//   const resolution = getResolution(payment);

//   if (Number.isFinite(Number(payment?.providerEarnings))) {
//     return Number(payment.providerEarnings);
//   }

//   if (Number.isFinite(Number(resolution.providerPayout))) {
//     return Number(resolution.providerPayout);
//   }

//   if (payment?.status === "REFUNDED") return 0;

//   if (
//     ["RELEASED", "FUNDS_HELD", "DISPUTED", "PARTIALLY_REFUNDED"].includes(
//       payment?.status
//     )
//   ) {
//     return Number((Number(payment?.amount || 0) * 0.85).toFixed(2));
//   }

//   return 0;
// }

// function getPlatformFee(payment) {
//   const gross = Number(payment?.amount || 0);
//   const refund = Number(getRefundAmount(payment) || 0);
//   const providerPayout = Number(getProviderPayout(payment) || 0);
//   return Number(Math.max(0, gross - refund - providerPayout).toFixed(2));
// }

// /* ─── status chip ─────────────────────────────────────────────────────────── */
// function StatusChip({ status }) {
//   const MAP = {
//     RELEASED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
//     FUNDS_HELD: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
//     INITIATED: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
//     FAILED: "bg-red-50 text-red-700 ring-1 ring-red-200",
//     DISPUTED: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
//     REFUNDED: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
//     PARTIALLY_REFUNDED: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
//   };

//   const LABELS = {
//     RELEASED: "Released",
//     FUNDS_HELD: "Funds Held",
//     INITIATED: "Initiated",
//     FAILED: "Failed",
//     DISPUTED: "Disputed",
//     REFUNDED: "Refunded",
//     PARTIALLY_REFUNDED: "Partial Refund",
//   };

//   return (
//     <span
//       className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${
//         MAP[status] || "bg-gray-100 text-gray-500 ring-1 ring-gray-200"
//       }`}
//     >
//       {LABELS[status] || status || "Unknown"}
//     </span>
//   );
// }

// /* ─── inline refund confirmation ─────────────────────────────────────────── */
// function InlineRefundConfirm({ paymentId, onCancel, onDone }) {
//   const [loading, setLoading] = useState(false);

//   const handleConfirm = async () => {
//     setLoading(true);
//     try {
//       await api.post(`/payment/client/refund-request/${paymentId}`);
//       toast.success("Refund request submitted. Our team will review it shortly.");
//       onDone();
//     } catch (err) {
//       toast.error(
//         err?.response?.data?.message || "Failed to submit refund request"
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="mt-2 rounded-xl bg-amber-50 p-3 text-xs">
//       <p className="mb-2 text-amber-800">
//         Are you sure? This will notify our team to review your refund request.
//       </p>
//       <div className="flex gap-2">
//         <button
//           onClick={handleConfirm}
//           disabled={loading}
//           className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs text-white transition hover:bg-amber-700 disabled:opacity-60"
//         >
//           {loading ? "Submitting..." : "Confirm"}
//         </button>
//         <button
//           onClick={onCancel}
//           className="rounded-lg px-3 py-1.5 text-xs text-gray-600 transition hover:bg-gray-100"
//         >
//           Cancel
//         </button>
//       </div>
//     </div>
//   );
// }

// /* ─── mobile card ─────────────────────────────────────────────────────────── */
// function MobileCard({ payment, showRefundFor, setShowRefundFor, onRefundDone }) {
//   const amt = Number(payment.amount || 0);
//   const refundAmount = getRefundAmount(payment);
//   const providerPayout = getProviderPayout(payment);

//   const providerName = payment.providerId?.profile?.name || "Provider";
//   const serviceTitle =
//     payment.bookingId?.serviceTitle ||
//     payment.bookingId?.serviceId?.title ||
//     "Service";
//   const initials = providerName.slice(0, 2).toUpperCase();
//   const isHeld = payment.status === "FUNDS_HELD";

//   return (
//     <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
//       <div className="mb-2 flex items-start justify-between">
//         <span className="text-sm font-semibold leading-tight text-gray-900">
//           {serviceTitle}
//         </span>
//         <StatusChip status={payment.status} />
//       </div>

//       <div className="mb-2 flex items-center gap-2">
//         <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
//           <span className="text-[10px] font-bold text-emerald-700">
//             {initials}
//           </span>
//         </div>
//         <span className="text-xs text-gray-600">{providerName}</span>
//       </div>

//       <div className="space-y-1">
//         <div className="flex items-center justify-between">
//           <div>
//             <span className="font-mono text-sm font-semibold text-gray-900">
//               NPR {fmt(amt)}
//             </span>
//             <span className="ml-2 text-[10px] text-gray-400">
//               {fmtDate(getPaymentRelevantDate(payment))}
//             </span>
//           </div>

//           {isHeld && !payment.refundRequested && (
//             <button
//               onClick={() =>
//                 setShowRefundFor(showRefundFor === payment._id ? null : payment._id)
//               }
//               className="flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-1.5 text-xs text-amber-700 transition hover:bg-amber-50"
//             >
//               <HiArrowUturnLeft className="h-3.5 w-3.5" />
//               Request Refund
//             </button>
//           )}

//           {isHeld && payment.refundRequested && (
//             <span className="text-[11px] font-medium text-amber-600">
//               Refund requested
//             </span>
//           )}
//         </div>

//         {providerPayout > 0 && (
//           <p className="text-[11px] text-gray-500">
//             Provider payout:{" "}
//             <span className="font-medium text-emerald-700">
//               NPR {fmt(providerPayout)}
//             </span>
//           </p>
//         )}

//         {refundAmount > 0 && (
//           <p className="text-[11px] text-gray-500">
//             Refunded to you:{" "}
//             <span className="font-medium text-gray-900">
//               NPR {fmt(refundAmount)}
//             </span>
//           </p>
//         )}
//       </div>

//       {showRefundFor === payment._id && (
//         <InlineRefundConfirm
//           paymentId={payment._id}
//           onCancel={() => setShowRefundFor(null)}
//           onDone={() => {
//             setShowRefundFor(null);
//             onRefundDone();
//           }}
//         />
//       )}
//     </div>
//   );
// }

// /* ─── main ────────────────────────────────────────────────────────────────── */
// export default function ClientTransactions() {
//   const [payments, setPayments] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [statusFilter, setStatusFilter] = useState("all");
//   const [search, setSearch] = useState("");
//   const [showRefundFor, setShowRefundFor] = useState(null);

//   const [selectedRange, setSelectedRange] = useState("month");
//   const [appliedRange, setAppliedRange] = useState("month");
//   const [customFrom, setCustomFrom] = useState("");
//   const [customTo, setCustomTo] = useState("");
//   const [appliedCustomFrom, setAppliedCustomFrom] = useState("");
//   const [appliedCustomTo, setAppliedCustomTo] = useState("");

//   const fetchTransactions = async () => {
//     try {
//       setLoading(true);
//       const res = await api.get("/payment/transactions/client?limit=200");
//       setPayments(res.data?.payments || []);
//     } catch (err) {
//       console.error("Failed to load transactions", err);
//       toast.error("Failed to load transactions");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (selectedRange !== "custom") {
//       setAppliedRange(selectedRange);
//     }
//   }, [selectedRange]);

//   useEffect(() => {
//     fetchTransactions();
//     const iv = setInterval(() => {
//       if (!document.hidden) fetchTransactions();
//     }, 30000);
//     const vis = () => {
//       if (!document.hidden) fetchTransactions();
//     };
//     document.addEventListener("visibilitychange", vis);
//     return () => {
//       clearInterval(iv);
//       document.removeEventListener("visibilitychange", vis);
//     };
//   }, []);

//   function handleRangeSelect(rangeValue) {
//     setSelectedRange(rangeValue);

//     if (rangeValue !== "custom") {
//       setAppliedRange(rangeValue);
//     }
//   }

//   function handleApplyCustomRange() {
//     if (!customFrom || !customTo) return;
//     if (customFrom > customTo) return;

//     setAppliedCustomFrom(customFrom);
//     setAppliedCustomTo(customTo);
//     setAppliedRange("custom");
//   }

//   function handleResetCustomRange() {
//     setCustomFrom("");
//     setCustomTo("");
//     setAppliedCustomFrom("");
//     setAppliedCustomTo("");
//     setSelectedRange("month");
//     setAppliedRange("month");
//   }

//   const rangeFilteredPayments = useMemo(() => {
//     const bounds = getRangeBounds(
//       appliedRange,
//       appliedCustomFrom,
//       appliedCustomTo
//     );

//     return payments.filter((payment) =>
//       isWithinBounds(payment.createdAt, bounds)
//     );
//   }, [payments, appliedRange, appliedCustomFrom, appliedCustomTo]);

//   const summary = useMemo(() => {
//     let totalSpent = 0;
//     let pending = 0;
//     let completed = 0;

//     rangeFilteredPayments.forEach((p) => {
//       const gross = Number(p.amount || 0);
//       const refund = getRefundAmount(p);
//       const netSpent = Math.max(0, gross - refund);

//       if (["RELEASED", "PARTIALLY_REFUNDED"].includes(p.status)) {
//         totalSpent += netSpent;
//         completed += 1;
//       }

//       if (p.status === "FUNDS_HELD") {
//         pending += gross;
//       }
//     });

//     return { totalSpent, pending, completed };
//   }, [rangeFilteredPayments]);

//   const hasHeld = rangeFilteredPayments.some((p) => p.status === "FUNDS_HELD");

//   const filtered = useMemo(() => {
//     const q = search.trim().toLowerCase();

//     return rangeFilteredPayments.filter((p) => {
//       if (statusFilter !== "all" && p.status !== statusFilter) return false;
//       if (!q) return true;

//       const provider = p.providerId?.profile?.name || "";
//       const service =
//         p.bookingId?.serviceTitle || p.bookingId?.serviceId?.title || "";

//       return [provider, service, String(p._id)]
//         .join(" ")
//         .toLowerCase()
//         .includes(q);
//     });
//   }, [rangeFilteredPayments, statusFilter, search]);

//   const kpis = [
//     {
//       label: "Total Spent",
//       value: `NPR ${fmt(summary.totalSpent)}`,
//       Icon: HiBanknotes,
//       color: "text-emerald-700",
//       bg: "bg-emerald-100",
//       border: "border-l-emerald-500",
//     },
//     {
//       label: "Pending (Escrow)",
//       value: `NPR ${fmt(summary.pending)}`,
//       Icon: HiClock,
//       color: "text-amber-700",
//       bg: "bg-amber-100",
//       border: "border-l-amber-500",
//     },
//     {
//       label: "Completed Bookings",
//       value: summary.completed,
//       Icon: HiCheckCircle,
//       color: "text-green-700",
//       bg: "bg-green-100",
//       border: "border-l-green-500",
//     },
//   ];

//   return (
//     <ClientLayout>
//       <div
//         className="mx-auto max-w-6xl space-y-4"
//         style={{ backgroundColor: "#f8fafc" }}
//       >
//         <div className="flex flex-col gap-3">
//           <div className="flex flex-wrap items-center gap-2">
//             {DASHBOARD_RANGES.map((item) => {
//               const active = selectedRange === item.value;

//               return (
//                 <button
//                   key={item.value}
//                   type="button"
//                   onClick={() => handleRangeSelect(item.value)}
//                   className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
//                     active
//                       ? "bg-emerald-600 text-white shadow-sm"
//                       : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
//                   }`}
//                 >
//                   {item.label}
//                 </button>
//               );
//             })}
//           </div>

//           {selectedRange === "custom" && (
//             <div className="flex w-full flex-col gap-2 rounded-2xl border bg-white p-3 shadow-sm sm:flex-row sm:items-end lg:w-auto">
//               <div className="flex flex-col">
//                 <label className="mb-1 text-xs font-medium text-gray-600">
//                   From
//                 </label>
//                 <input
//                   type="date"
//                   value={customFrom}
//                   onChange={(e) => setCustomFrom(e.target.value)}
//                   className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
//                 />
//               </div>

//               <div className="flex flex-col">
//                 <label className="mb-1 text-xs font-medium text-gray-600">
//                   To
//                 </label>
//                 <input
//                   type="date"
//                   value={customTo}
//                   onChange={(e) => setCustomTo(e.target.value)}
//                   className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
//                 />
//               </div>

//               <div className="flex gap-2">
//                 <button
//                   type="button"
//                   onClick={handleApplyCustomRange}
//                   disabled={!customFrom || !customTo || customFrom > customTo}
//                   className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
//                 >
//                   Apply
//                 </button>

//                 <button
//                   type="button"
//                   onClick={handleResetCustomRange}
//                   className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
//                 >
//                   Reset
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>

//         <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
//           {kpis.map((k) => (
//             <div
//               key={k.label}
//               className={`flex items-center gap-3 rounded-2xl border border-gray-100 border-l-4 bg-white p-4 shadow-sm ${k.border}`}
//             >
//               <div
//                 className={`${k.bg} flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl`}
//               >
//                 <k.Icon className={`h-5 w-5 ${k.color}`} />
//               </div>
//               <div>
//                 <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-500">
//                   {k.label}
//                 </p>
//                 <p className="font-mono text-xl font-bold leading-none text-gray-900">
//                   {k.value}
//                 </p>
//               </div>
//             </div>
//           ))}
//         </div>

//         {hasHeld && (
//           <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
//             <HiInformationCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
//             <p className="text-xs leading-relaxed text-amber-800">
//               Your payment is securely held in escrow. Funds are released to your
//               provider only after service completion. You can request a refund if
//               the service is not delivered.
//             </p>
//           </div>
//         )}

//         <div className="flex flex-wrap items-center gap-2">
//           <input
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             placeholder="Search provider or service..."
//             className="w-56 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100"
//           />
//           <select
//             value={statusFilter}
//             onChange={(e) => setStatusFilter(e.target.value)}
//             className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100"
//           >
//             <option value="all">All Statuses</option>
//             <option value="RELEASED">Released</option>
//             <option value="FUNDS_HELD">Funds Held</option>
//             <option value="INITIATED">Initiated</option>
//             <option value="DISPUTED">Disputed</option>
//             <option value="FAILED">Failed</option>
//             <option value="REFUNDED">Refunded</option>
//             <option value="PARTIALLY_REFUNDED">Partial Refund</option>
//           </select>
//         </div>

//         {loading ? (
//           <div className="flex justify-center py-16">
//             <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
//           </div>
//         ) : filtered.length === 0 ? (
//           <div className="py-16 text-center text-sm text-gray-400">
//             No transactions found.
//           </div>
//         ) : (
//           <>
//             <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm md:block">
//               <div className="overflow-x-auto">
//                 <table className="w-full text-sm">
//                   <thead>
//                     <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-widest text-gray-400">
//                       <th className="px-4 py-2.5 text-left">Service</th>
//                       <th className="px-4 py-2.5 text-left">Provider</th>
//                       <th className="px-4 py-2.5 text-left">Amount</th>
//                       <th className="px-4 py-2.5 text-left">Refund / Fee</th>
//                       <th className="px-4 py-2.5 text-left">Status</th>
//                       <th className="px-4 py-2.5 text-left">Date</th>
//                       <th className="px-4 py-2.5 text-left">Action</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {filtered.map((p) => {
//                       const amt = Number(p.amount || 0);
//                       const refundAmount = getRefundAmount(p);
//                       const providerAmt = getProviderPayout(p);
//                       const fee = getPlatformFee(p);
//                       const isHeld = p.status === "FUNDS_HELD";

//                       return (
//                         <>
//                           <tr
//                             key={p._id}
//                             className="border-b border-gray-50 transition hover:bg-emerald-50/20"
//                           >
//                             <td className="px-4 py-2.5 font-medium text-gray-800">
//                               {p.bookingId?.serviceTitle ||
//                                 p.bookingId?.serviceId?.title ||
//                                 "—"}
//                             </td>
//                             <td className="px-4 py-2.5 text-gray-600">
//                               {p.providerId?.profile?.name || "—"}
//                             </td>
//                             <td className="px-4 py-2.5">
//                               <span className="font-mono font-semibold text-gray-900">
//                                 NPR {fmt(amt)}
//                               </span>

//                               {providerAmt > 0 && (
//                                 <div className="font-mono text-[10px] text-gray-400">
//                                   Provider payout: NPR {fmt(providerAmt)}
//                                 </div>
//                               )}

//                               {refundAmount > 0 && (
//                                 <div className="font-mono text-[10px] text-gray-500">
//                                   Refunded to you: NPR {fmt(refundAmount)}
//                                 </div>
//                               )}
//                             </td>

//                             <td className="px-4 py-2.5 font-mono text-xs text-gray-400">
//                               {refundAmount > 0 ? (
//                                 <span className="text-gray-700">
//                                   NPR {fmt(refundAmount)}
//                                 </span>
//                               ) : (
//                                 <span>NPR {fmt(fee)}</span>
//                               )}
//                             </td>

//                             <td className="px-4 py-2.5">
//                               <StatusChip status={p.status} />
//                             </td>
//                             <td className="whitespace-nowrap px-4 py-2.5 text-gray-500">
//                               {fmtDate(getPaymentRelevantDate(p))}
//                             </td>
//                             <td className="px-4 py-2.5">
//                               {isHeld && !p.refundRequested && (
//                                 <button
//                                   onClick={() =>
//                                     setShowRefundFor(
//                                       showRefundFor === p._id ? null : p._id
//                                     )
//                                   }
//                                   className="flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-1.5 text-xs text-amber-700 transition hover:bg-amber-50"
//                                 >
//                                   <HiArrowUturnLeft className="h-3.5 w-3.5" />
//                                   Request Refund
//                                 </button>
//                               )}
//                               {isHeld && p.refundRequested && (
//                                 <span className="text-[11px] font-medium text-amber-600">
//                                   Refund requested
//                                 </span>
//                               )}
//                             </td>
//                           </tr>

//                           {showRefundFor === p._id && (
//                             <tr
//                               key={`${p._id}-refund`}
//                               className="bg-amber-50/30"
//                             >
//                               <td colSpan={7} className="px-4 pb-3">
//                                 <InlineRefundConfirm
//                                   paymentId={p._id}
//                                   onCancel={() => setShowRefundFor(null)}
//                                   onDone={() => {
//                                     setShowRefundFor(null);
//                                     fetchTransactions();
//                                   }}
//                                 />
//                               </td>
//                             </tr>
//                           )}
//                         </>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             </div>

//             <div className="space-y-3 md:hidden">
//               {filtered.map((p) => (
//                 <MobileCard
//                   key={p._id}
//                   payment={p}
//                   showRefundFor={showRefundFor}
//                   setShowRefundFor={setShowRefundFor}
//                   onRefundDone={fetchTransactions}
//                 />
//               ))}
//             </div>
//           </>
//         )}
//       </div>
//     </ClientLayout>
//   );
// }

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import ClientLayout from "../../layouts/ClientLayout";
import api from "../../utils/axios";
import {
  HiBanknotes,
  HiClock,
  HiCheckCircle,
  HiInformationCircle,
  HiArrowUturnLeft,
} from "react-icons/hi2";

/* ─── helpers ────────────────────────────────────────────────────────────── */
const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

const DASHBOARD_RANGES = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "custom", label: "Custom Range" },
];

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getRangeBounds(range, from, to) {
  const now = new Date();

  if (range === "today") {
    const start = startOfDay(now);
    const end = addDays(start, 1);
    return { start, end };
  }

  if (range === "week") {
    const current = startOfDay(now);
    const day = current.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const start = addDays(current, -diffToMonday);
    const end = addDays(start, 7);
    return { start, end };
  }

  if (range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, end };
  }

  if (range === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear() + 1, 0, 1);
    return { start, end };
  }

  if (range === "custom" && from && to) {
    const start = startOfDay(new Date(from));
    const end = addDays(startOfDay(new Date(to)), 1);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start >= end
    ) {
      return null;
    }

    return { start, end };
  }

  return null;
}

function isWithinBounds(value, bounds) {
  if (!bounds) return true;
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  return date >= bounds.start && date < bounds.end;
}

function getResolution(payment) {
  return payment?.receipt?.disputeResolution || {};
}

function getRefundAmount(payment) {
  const resolution = getResolution(payment);

  if (Number.isFinite(Number(resolution.refundAmount))) {
    return Number(resolution.refundAmount);
  }

  if (payment?.status === "REFUNDED") {
    return Number(payment?.amount || 0);
  }

  return 0;
}

function getProviderPayout(payment) {
  const resolution = getResolution(payment);

  if (Number.isFinite(Number(payment?.providerEarnings))) {
    return Number(payment.providerEarnings);
  }

  if (Number.isFinite(Number(resolution.providerPayout))) {
    return Number(resolution.providerPayout);
  }

  if (payment?.status === "REFUNDED") return 0;

  if (
    ["RELEASED", "FUNDS_HELD", "DISPUTED", "PARTIALLY_REFUNDED"].includes(
      payment?.status
    )
  ) {
    return Number((Number(payment?.amount || 0) * 0.85).toFixed(2));
  }

  return 0;
}

function getPlatformFee(payment) {
  const gross = Number(payment?.amount || 0);
  const refund = Number(getRefundAmount(payment) || 0);
  const providerPayout = Number(getProviderPayout(payment) || 0);
  return Number(Math.max(0, gross - refund - providerPayout).toFixed(2));
}

function getPaymentRelevantDate(payment) {
  if (payment?.status === "RELEASED") {
    return (
      payment?.releasedAt ||
      payment?.escrowReleasedAt ||
      payment?.clientConfirmedAt ||
      payment?.updatedAt ||
      payment?.createdAt ||
      null
    );
  }

  if (payment?.status === "REFUNDED") {
    return payment?.refundedAt || payment?.updatedAt || payment?.createdAt || null;
  }

  if (payment?.status === "PARTIALLY_REFUNDED") {
    return (
      payment?.refundedAt ||
      payment?.releasedAt ||
      payment?.escrowReleasedAt ||
      payment?.updatedAt ||
      payment?.createdAt ||
      null
    );
  }

  if (payment?.status === "DISPUTED") {
    return payment?.updatedAt || payment?.createdAt || null;
  }

  if (payment?.status === "FUNDS_HELD") {
    return payment?.verifiedAt || payment?.createdAt || null;
  }

  return payment?.createdAt || payment?.updatedAt || null;
}


function getPaymentNarrative(payment) {
  const resolution = getResolution(payment);
  const bookingStatus = payment?.bookingId?.status;
  const refundAmount = getRefundAmount(payment);
  const providerPayout = getProviderPayout(payment);

  if (payment?.status === "PARTIALLY_REFUNDED") {
    return {
      label: "Partial dispute settlement",
      detail: `You received NPR ${fmt(refundAmount)} back and NPR ${fmt(providerPayout)} was released to the provider.`,
      tone: "text-amber-700",
    };
  }

  if (payment?.status === "REFUNDED") {
    if (bookingStatus === "no-show") {
      return {
        label: "Refunded due to provider no-show",
        detail: `Your payment of NPR ${fmt(refundAmount)} was returned because the provider did not start the job in time.`,
        tone: "text-red-600",
      };
    }

    if (bookingStatus === "rejected") {
      return {
        label: "Refunded after provider rejection",
        detail: `Your payment of NPR ${fmt(refundAmount)} was refunded because the provider rejected the booking.`,
        tone: "text-red-600",
      };
    }

    if (resolution?.resolutionType === "refund_full") {
      return {
        label: "Full dispute refund",
        detail: `The admin approved a full refund of NPR ${fmt(refundAmount)} for this booking.`,
        tone: "text-red-600",
      };
    }

    return {
      label: "Refund completed",
      detail: `NPR ${fmt(refundAmount)} has been returned to you.`,
      tone: "text-gray-700",
    };
  }

  if (payment?.status === "FUNDS_HELD") {
    return {
      label: "Funds protected in escrow",
      detail: `NPR ${fmt(payment?.amount || 0)} is being held securely until the booking is completed or resolved.`,
      tone: "text-amber-700",
    };
  }

  if (payment?.status === "RELEASED") {
    return {
      label: "Payment released",
      detail: `This booking was completed and payment was released successfully.`,
      tone: "text-emerald-700",
    };
  }

  if (payment?.status === "DISPUTED") {
    return {
      label: "Payment under dispute review",
      detail: `Funds are on hold while the dispute is being reviewed.`,
      tone: "text-orange-700",
    };
  }

  return {
    label: "Payment record",
    detail: `Transaction recorded on ${fmtDate(payment?.createdAt)}.`,
    tone: "text-gray-600",
  };
}

/* ─── status chip ─────────────────────────────────────────────────────────── */
function StatusChip({ status }) {
  const MAP = {
    RELEASED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    FUNDS_HELD: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    INITIATED: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    FAILED: "bg-red-50 text-red-700 ring-1 ring-red-200",
    DISPUTED: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    REFUNDED: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
    PARTIALLY_REFUNDED: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  };

  const LABELS = {
    RELEASED: "Released",
    FUNDS_HELD: "Funds Held",
    INITIATED: "Initiated",
    FAILED: "Failed",
    DISPUTED: "Disputed",
    REFUNDED: "Refunded",
    PARTIALLY_REFUNDED: "Partial Refund",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        MAP[status] || "bg-gray-100 text-gray-500 ring-1 ring-gray-200"
      }`}
    >
      {LABELS[status] || status || "Unknown"}
    </span>
  );
}

/* ─── inline refund confirmation ─────────────────────────────────────────── */
function InlineRefundConfirm({ paymentId, onCancel, onDone }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await api.post(`/payment/client/refund-request/${paymentId}`);
      toast.success("Refund request submitted. Our team will review it shortly.");
      onDone();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to submit refund request"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 rounded-xl bg-amber-50 p-3 text-xs">
      <p className="mb-2 text-amber-800">
        Are you sure? This will notify our team to review your refund request.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs text-white transition hover:bg-amber-700 disabled:opacity-60"
        >
          {loading ? "Submitting..." : "Confirm"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-xs text-gray-600 transition hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ─── mobile card ─────────────────────────────────────────────────────────── */
function MobileCard({ payment, showRefundFor, setShowRefundFor, onRefundDone }) {
  const amt = Number(payment.amount || 0);
  const refundAmount = getRefundAmount(payment);
  const providerPayout = getProviderPayout(payment);

  const providerName = payment.providerId?.profile?.name || "Provider";
  const serviceTitle =
    payment.bookingId?.serviceTitle ||
    payment.bookingId?.serviceId?.title ||
    "Service";
  const initials = providerName.slice(0, 2).toUpperCase();
  const isHeld = payment.status === "FUNDS_HELD";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between">
        <span className="text-sm font-semibold leading-tight text-gray-900">
          {serviceTitle}
        </span>
        <StatusChip status={payment.status} />
      </div>

      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
          <span className="text-[10px] font-bold text-emerald-700">
            {initials}
          </span>
        </div>
        <span className="text-xs text-gray-600">{providerName}</span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono text-sm font-semibold text-gray-900">
              NPR {fmt(amt)}
            </span>
            <span className="ml-2 text-[10px] text-gray-400">
              {fmtDate(getPaymentRelevantDate(payment))}
            </span>
          </div>

          {isHeld && !payment.refundRequested && (
            <button
              onClick={() =>
                setShowRefundFor(showRefundFor === payment._id ? null : payment._id)
              }
              className="flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-1.5 text-xs text-amber-700 transition hover:bg-amber-50"
            >
              <HiArrowUturnLeft className="h-3.5 w-3.5" />
              Request Refund
            </button>
          )}

          {isHeld && payment.refundRequested && (
            <span className="text-[11px] font-medium text-amber-600">
              Refund requested
            </span>
          )}
        </div>

        {providerPayout > 0 && (
          <p className="text-[11px] text-gray-500">
            Provider payout:{" "}
            <span className="font-medium text-emerald-700">
              NPR {fmt(providerPayout)}
            </span>
          </p>
        )}

        {refundAmount > 0 && (
          <p className="text-[11px] text-gray-500">
            Refunded to you:{" "}
            <span className="font-medium text-gray-900">
              NPR {fmt(refundAmount)}
            </span>
          </p>
        )}

        <div className="rounded-xl bg-gray-50 px-3 py-2">
          <p className={`text-[11px] font-semibold ${getPaymentNarrative(payment).tone}`}>
            {getPaymentNarrative(payment).label}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-gray-500">
            {getPaymentNarrative(payment).detail}
          </p>
        </div>
      </div>

      {showRefundFor === payment._id && (
        <InlineRefundConfirm
          paymentId={payment._id}
          onCancel={() => setShowRefundFor(null)}
          onDone={() => {
            setShowRefundFor(null);
            onRefundDone();
          }}
        />
      )}
    </div>
  );
}

/* ─── main ────────────────────────────────────────────────────────────────── */
export default function ClientTransactions() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showRefundFor, setShowRefundFor] = useState(null);

  const [selectedRange, setSelectedRange] = useState("month");
  const [appliedRange, setAppliedRange] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [appliedCustomFrom, setAppliedCustomFrom] = useState("");
  const [appliedCustomTo, setAppliedCustomTo] = useState("");

  function buildRangeParams(range, fromDate, toDate, limit = 200) {
    const params = { limit };

    if (range === "custom" && fromDate && toDate) {
      params.range = "custom";
      params.from = fromDate;
      params.to = toDate;
    } else {
      params.range = range;
    }

    return params;
  }

  const fetchTransactions = async (
    range = appliedRange,
    fromDate = appliedCustomFrom,
    toDate = appliedCustomTo
  ) => {
    try {
      setLoading(true);
      const res = await api.get("/payment/transactions/client", {
        params: buildRangeParams(range, fromDate, toDate, 200),
      });
      setPayments(res.data?.payments || []);
    } catch (err) {
      console.error("Failed to load transactions", err);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRange !== "custom") {
      setAppliedRange(selectedRange);
    }
  }, [selectedRange]);

  useEffect(() => {
    fetchTransactions(appliedRange, appliedCustomFrom, appliedCustomTo);
    const iv = setInterval(() => {
      if (!document.hidden) {
        fetchTransactions(appliedRange, appliedCustomFrom, appliedCustomTo);
      }
    }, 30000);
    const vis = () => {
      if (!document.hidden) {
        fetchTransactions(appliedRange, appliedCustomFrom, appliedCustomTo);
      }
    };
    document.addEventListener("visibilitychange", vis);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", vis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedRange, appliedCustomFrom, appliedCustomTo]);

  function handleRangeSelect(rangeValue) {
    setSelectedRange(rangeValue);

    if (rangeValue !== "custom") {
      setAppliedRange(rangeValue);
    }
  }

  function handleApplyCustomRange() {
    if (!customFrom || !customTo) return;
    if (customFrom > customTo) return;

    setAppliedCustomFrom(customFrom);
    setAppliedCustomTo(customTo);
    setAppliedRange("custom");
  }

  function handleResetCustomRange() {
    setCustomFrom("");
    setCustomTo("");
    setAppliedCustomFrom("");
    setAppliedCustomTo("");
    setSelectedRange("month");
    setAppliedRange("month");
  }

  const rangeFilteredPayments = useMemo(() => payments, [payments]);

  const summary = useMemo(() => {
    let totalSpent = 0;
    let pending = 0;
    let completed = 0;

    rangeFilteredPayments.forEach((p) => {
      const gross = Number(p.amount || 0);
      const refund = getRefundAmount(p);
      const netSpent = Math.max(0, gross - refund);

      if (["RELEASED", "PARTIALLY_REFUNDED"].includes(p.status)) {
        totalSpent += netSpent;
        completed += 1;
      }

      if (p.status === "FUNDS_HELD") {
        pending += gross;
      }
    });

    return { totalSpent, pending, completed };
  }, [rangeFilteredPayments]);

  const hasHeld = rangeFilteredPayments.some((p) => p.status === "FUNDS_HELD");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rangeFilteredPayments.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;

      const provider = p.providerId?.profile?.name || "";
      const service =
        p.bookingId?.serviceTitle || p.bookingId?.serviceId?.title || "";

      return [provider, service, String(p._id)]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rangeFilteredPayments, statusFilter, search]);

  const kpis = [
    {
      label: "Total Spent",
      value: `NPR ${fmt(summary.totalSpent)}`,
      Icon: HiBanknotes,
      color: "text-emerald-700",
      bg: "bg-emerald-100",
      border: "border-l-emerald-500",
    },
    {
      label: "Pending (Escrow)",
      value: `NPR ${fmt(summary.pending)}`,
      Icon: HiClock,
      color: "text-amber-700",
      bg: "bg-amber-100",
      border: "border-l-amber-500",
    },
    {
      label: "Completed Bookings",
      value: summary.completed,
      Icon: HiCheckCircle,
      color: "text-green-700",
      bg: "bg-green-100",
      border: "border-l-green-500",
    },
  ];

  return (
    <ClientLayout>
      <div
        className="mx-auto max-w-6xl space-y-4"
        style={{ backgroundColor: "#f8fafc" }}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {DASHBOARD_RANGES.map((item) => {
              const active = selectedRange === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleRangeSelect(item.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    active
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {selectedRange === "custom" && (
            <div className="flex w-full flex-col gap-2 rounded-2xl border bg-white p-3 shadow-sm sm:flex-row sm:items-end lg:w-auto">
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-600">
                  From
                </label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-600">
                  To
                </label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleApplyCustomRange}
                  disabled={!customFrom || !customTo || customFrom > customTo}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Apply
                </button>

                <button
                  type="button"
                  onClick={handleResetCustomRange}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {kpis.map((k) => (
            <div
              key={k.label}
              className={`flex items-center gap-3 rounded-2xl border border-gray-100 border-l-4 bg-white p-4 shadow-sm ${k.border}`}
            >
              <div
                className={`${k.bg} flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl`}
              >
                <k.Icon className={`h-5 w-5 ${k.color}`} />
              </div>
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-500">
                  {k.label}
                </p>
                <p className="font-mono text-xl font-bold leading-none text-gray-900">
                  {k.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {hasHeld && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <HiInformationCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
            <p className="text-xs leading-relaxed text-amber-800">
              Your payment is securely held in escrow. Funds are released to your
              provider only after service completion. You can request a refund if
              the service is not delivered.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search provider or service..."
            className="w-56 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">All Statuses</option>
            <option value="RELEASED">Released</option>
            <option value="FUNDS_HELD">Funds Held</option>
            <option value="INITIATED">Initiated</option>
            <option value="DISPUTED">Disputed</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
            <option value="PARTIALLY_REFUNDED">Partial Refund</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            No transactions found.
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      <th className="px-4 py-2.5 text-left">Service</th>
                      <th className="px-4 py-2.5 text-left">Provider</th>
                      <th className="px-4 py-2.5 text-left">Amount</th>
                      <th className="px-4 py-2.5 text-left">Refund / Fee</th>
                      <th className="px-4 py-2.5 text-left">Status</th>
                      <th className="px-4 py-2.5 text-left">Date</th>
                      <th className="px-4 py-2.5 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const amt = Number(p.amount || 0);
                      const refundAmount = getRefundAmount(p);
                      const providerAmt = getProviderPayout(p);
                      const fee = getPlatformFee(p);
                      const isHeld = p.status === "FUNDS_HELD";

                      return (
                        <>
                          <tr
                            key={p._id}
                            className="border-b border-gray-50 transition hover:bg-emerald-50/20"
                          >
                            <td className="px-4 py-2.5 font-medium text-gray-800">
                              {p.bookingId?.serviceTitle ||
                                p.bookingId?.serviceId?.title ||
                                "—"}
                            </td>
                            <td className="px-4 py-2.5 text-gray-600">
                              {p.providerId?.profile?.name || "—"}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="font-mono font-semibold text-gray-900">
                                NPR {fmt(amt)}
                              </span>

                              {providerAmt > 0 && (
                                <div className="font-mono text-[10px] text-gray-400">
                                  Provider payout: NPR {fmt(providerAmt)}
                                </div>
                              )}

                              {refundAmount > 0 && (
                                <div className="font-mono text-[10px] text-gray-500">
                                  Refunded to you: NPR {fmt(refundAmount)}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-2.5 font-mono text-xs text-gray-400">
                              {refundAmount > 0 ? (
                                <div>
                                  <span className="text-gray-700">
                                    NPR {fmt(refundAmount)}
                                  </span>
                                  <div className={`mt-1 max-w-[220px] text-[10px] ${getPaymentNarrative(p).tone}`}>
                                    {getPaymentNarrative(p).label}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <span>NPR {fmt(fee)}</span>
                                  <div className={`mt-1 max-w-[220px] text-[10px] ${getPaymentNarrative(p).tone}`}>
                                    {getPaymentNarrative(p).label}
                                  </div>
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-2.5">
                              <StatusChip status={p.status} />
                            </td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-gray-500">
                              {fmtDate(getPaymentRelevantDate(p))}
                            </td>
                            <td className="px-4 py-2.5">
                              {isHeld && !p.refundRequested && (
                                <button
                                  onClick={() =>
                                    setShowRefundFor(
                                      showRefundFor === p._id ? null : p._id
                                    )
                                  }
                                  className="flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-1.5 text-xs text-amber-700 transition hover:bg-amber-50"
                                >
                                  <HiArrowUturnLeft className="h-3.5 w-3.5" />
                                  Request Refund
                                </button>
                              )}
                              {isHeld && p.refundRequested && (
                                <span className="text-[11px] font-medium text-amber-600">
                                  Refund requested
                                </span>
                              )}
                            </td>
                          </tr>

                          {showRefundFor === p._id && (
                            <tr
                              key={`${p._id}-refund`}
                              className="bg-amber-50/30"
                            >
                              <td colSpan={7} className="px-4 pb-3">
                                <InlineRefundConfirm
                                  paymentId={p._id}
                                  onCancel={() => setShowRefundFor(null)}
                                  onDone={() => {
                                    setShowRefundFor(null);
                                    fetchTransactions();
                                  }}
                                />
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3 md:hidden">
              {filtered.map((p) => (
                <MobileCard
                  key={p._id}
                  payment={p}
                  showRefundFor={showRefundFor}
                  setShowRefundFor={setShowRefundFor}
                  onRefundDone={fetchTransactions}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </ClientLayout>
  );
}