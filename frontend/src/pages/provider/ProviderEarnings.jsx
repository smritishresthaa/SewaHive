// import { useEffect, useMemo, useState } from "react";
// import ProviderLayout from "../../layouts/ProviderLayout";
// import api from "../../utils/axios";
// import toast from "react-hot-toast";
// import {
//   HiWallet,
//   HiArrowTrendingUp,
//   HiReceiptPercent,
//   HiBanknotes,
//   HiChartBar,
// } from "react-icons/hi2";
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
//   PieChart,
//   Pie,
//   Cell,
//   Label,
// } from "recharts";

// /* ─── shared filter helpers ─────────────────────────────────────────────── */
// const DASHBOARD_RANGES = [
//   { value: "today", label: "Today" },
//   { value: "week", label: "This Week" },
//   { value: "month", label: "This Month" },
//   { value: "year", label: "This Year" },
//   { value: "custom", label: "Custom Range" },
// ];

// function buildRangeParams(range, fromDate, toDate, limit) {
//   const params = {};
//   if (limit != null) params.limit = limit;

//   if (range === "custom" && fromDate && toDate) {
//     params.range = "custom";
//     params.from = fromDate;
//     params.to = toDate;
//   } else {
//     params.range = range;
//   }

//   return params;
// }

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

//   if (payment?.status === "REFUNDED") {
//     return 0;
//   }

//   if (
//     ["RELEASED", "FUNDS_HELD", "DISPUTED", "PARTIALLY_REFUNDED"].includes(
//       payment?.status
//     )
//   ) {
//     return Number((Number(payment?.amount || 0) * 0.85).toFixed(2));
//   }

//   return 0;
// }

// function getCommissionAmount(payment) {
//   const gross = Number(payment?.amount || 0);
//   const refund = getRefundAmount(payment);
//   const payout = getProviderPayout(payment);
//   return Number(Math.max(0, gross - refund - payout).toFixed(2));
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

// /* ─── custom tooltips ─────────────────────────────────────────────────────── */
// function BarTooltip({ active, payload, label }) {
//   if (!active || !payload?.length) return null;

//   return (
//     <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs shadow-lg">
//       <p className="mb-1 font-medium text-gray-500">{label}</p>
//       {payload.map((p) => (
//         <p
//           key={p.name}
//           style={{ color: p.color }}
//           className="font-mono font-semibold"
//         >
//           {p.name}: NPR {fmt(p.value)}
//         </p>
//       ))}
//     </div>
//   );
// }

// /* ─── main ────────────────────────────────────────────────────────────────── */
// export default function ProviderEarnings() {
//   const [wallet, setWallet] = useState({
//     balance: 0,
//     totalEarned: 0,
//     totalGrossVolume: 0,
//     totalCommissionPaid: 0,
//     pendingPayouts: 0,
//     pendingBalance: 0,
//     availableBalance: 0,
//     totalWithdrawn: 0,
//     transactions: [],
//   });

//   const [payments, setPayments] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const [selectedRange, setSelectedRange] = useState("month");
//   const [appliedRange, setAppliedRange] = useState("month");
//   const [customFrom, setCustomFrom] = useState("");
//   const [customTo, setCustomTo] = useState("");
//   const [appliedCustomFrom, setAppliedCustomFrom] = useState("");
//   const [appliedCustomTo, setAppliedCustomTo] = useState("");

//   useEffect(() => {
//     if (selectedRange !== "custom") {
//       setAppliedRange(selectedRange);
//     }
//   }, [selectedRange]);

//   const fetchData = async (
//     range = appliedRange,
//     fromDate = appliedCustomFrom,
//     toDate = appliedCustomTo
//   ) => {
//     try {
//       setLoading(true);

//       const rangeParams = buildRangeParams(range, fromDate, toDate);

//       const [walletRes, paymentsRes] = await Promise.all([
//         api.get("/providers/wallet", { params: rangeParams }),
//         api.get("/payment/transactions/provider", {
//           params: buildRangeParams(range, fromDate, toDate, 200),
//         }),
//       ]);

//       setWallet(walletRes.data?.wallet || {});
//       setPayments(paymentsRes.data?.payments || []);
//     } catch (err) {
//       console.error("Failed to load earnings", err);
//       toast.error("Failed to load earnings data");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchData(appliedRange, appliedCustomFrom, appliedCustomTo);

//     const iv = setInterval(() => {
//       if (!document.hidden) {
//         fetchData(appliedRange, appliedCustomFrom, appliedCustomTo);
//       }
//     }, 30000);

//     const vis = () => {
//       if (!document.hidden) {
//         fetchData(appliedRange, appliedCustomFrom, appliedCustomTo);
//       }
//     };

//     document.addEventListener("visibilitychange", vis);

//     return () => {
//       clearInterval(iv);
//       document.removeEventListener("visibilitychange", vis);
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [appliedRange, appliedCustomFrom, appliedCustomTo]);

//   function handleRangeSelect(rangeValue) {
//     setSelectedRange(rangeValue);

//     if (rangeValue !== "custom") {
//       setAppliedRange(rangeValue);
//       setAppliedCustomFrom("");
//       setAppliedCustomTo("");
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

//   /* ── monthly bar chart data (actual payout/gross) ── */
//   const monthlyData = useMemo(() => {
//     const settled = payments.filter((p) => {
//       const payout = getProviderPayout(p);
//       return payout > 0;
//     });

//     if (appliedRange === "today" || appliedRange === "week") {
//       return settled.map((p, idx) => {
//         const gross = Number(p.amount || 0);
//         const net = getProviderPayout(p);

//         return {
//           month:
//             appliedRange === "today"
//               ? new Date(
//                   p.releasedAt ||
//                     p.escrowReleasedAt ||
//                     p.refundedAt ||
//                     p.createdAt
//                 ).toLocaleTimeString("en-US", {
//                   hour: "numeric",
//                   minute: "2-digit",
//                 })
//               : new Date(
//                   p.releasedAt ||
//                     p.escrowReleasedAt ||
//                     p.refundedAt ||
//                     p.createdAt
//                 ).toLocaleDateString("en-US", {
//                   month: "short",
//                   day: "numeric",
//                 }),
//           gross,
//           net,
//           key: `${p._id}-${idx}`,
//         };
//       });
//     }

//     const bucketMap = new Map();

//     settled.forEach((p) => {
//       const sourceDate = new Date(
//         p.releasedAt || p.escrowReleasedAt || p.refundedAt || p.createdAt
//       );

//       const key = `${sourceDate.getFullYear()}-${sourceDate.getMonth()}`;
//       const label = sourceDate.toLocaleDateString("en-US", { month: "short" });

//       if (!bucketMap.has(key)) {
//         bucketMap.set(key, {
//           month: label,
//           year: sourceDate.getFullYear(),
//           monthIdx: sourceDate.getMonth(),
//           gross: 0,
//           net: 0,
//           sortDate: new Date(
//             sourceDate.getFullYear(),
//             sourceDate.getMonth(),
//             1
//           ).getTime(),
//         });
//       }

//       const bucket = bucketMap.get(key);
//       bucket.gross += Number(p.amount || 0);
//       bucket.net += getProviderPayout(p);
//     });

//     return Array.from(bucketMap.values()).sort((a, b) => a.sortDate - b.sortDate);
//   }, [payments, appliedRange]);

//   /* ── derived values ── */
//   const totalGross = Number(wallet.totalGrossVolume || 0);
//   const commission = Number(wallet.totalCommissionPaid || 0);
//   const netPayout = Number(wallet.totalEarned || 0);
//   const balance = Number(wallet.balance || wallet.availableBalance || 0);

//   const kpis = [
//     {
//       label: "Wallet Balance",
//       value: `NPR ${fmt(balance)}`,
//       Icon: HiWallet,
//       color: "text-emerald-700",
//       bg: "bg-emerald-100",
//       border: "border-l-emerald-500",
//       large: true,
//     },
//     {
//       label: "Total Earned (Gross)",
//       value: `NPR ${fmt(totalGross)}`,
//       Icon: HiArrowTrendingUp,
//       color: "text-blue-700",
//       bg: "bg-blue-100",
//       border: "border-l-blue-500",
//     },
//     {
//       label: "Commission Paid",
//       value: `NPR ${fmt(commission)}`,
//       Icon: HiReceiptPercent,
//       color: "text-amber-700",
//       bg: "bg-amber-100",
//       border: "border-l-amber-500",
//     },
//     {
//       label: "Your Payout",
//       value: `NPR ${fmt(netPayout)}`,
//       Icon: HiBanknotes,
//       color: "text-green-700",
//       bg: "bg-green-100",
//       border: "border-l-green-500",
//     },
//   ];

//   const payoutPercent =
//     totalGross > 0 ? Number(((netPayout / totalGross) * 100).toFixed(1)) : 0;
//   const commissionPercent =
//     totalGross > 0 ? Number(((commission / totalGross) * 100).toFixed(1)) : 0;

//   const pieData = [
//     { name: "Your Payout", value: netPayout },
//     { name: "Commission", value: commission },
//   ].filter((item) => item.value > 0);

//   const PIE_COLORS = ["#059669", "#f59e0b"];

//   const DonutCenter = ({ viewBox }) => {
//     if (
//       !viewBox ||
//       typeof viewBox.cx !== "number" ||
//       typeof viewBox.cy !== "number"
//     ) {
//       return null;
//     }

//     const { cx, cy } = viewBox;

//     return (
//       <>
//         <text
//           x={cx}
//           y={cy - 6}
//           textAnchor="middle"
//           className="fill-gray-700 text-xs font-bold"
//           style={{ fontSize: 11, fontWeight: 700 }}
//         >
//           {payoutPercent}%
//         </text>
//         <text
//           x={cx}
//           y={cy + 8}
//           textAnchor="middle"
//           style={{ fontSize: 9, fill: "#6b7280" }}
//         >
//           yours
//         </text>
//       </>
//     );
//   };

//   return (
//     <ProviderLayout>
//       <div
//         className="mx-auto w-full max-w-6xl space-y-4 px-4 py-4 sm:px-6 lg:px-8"
//         style={{ backgroundColor: "#f8fafc" }}
//       >
//         <div className="mb-4 flex flex-col gap-3 lg:items-end">
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

//         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
//           {kpis.map((k) => (
//             <div
//               key={k.label}
//               className={`flex min-w-0 items-center gap-3 rounded-2xl border border-gray-100 border-l-4 bg-white p-4 shadow-sm ${k.border}`}
//             >
//               <div
//                 className={`${k.bg} flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl`}
//               >
//                 <k.Icon className={`h-5 w-5 ${k.color}`} />
//               </div>

//               <div className="min-w-0 flex-1">
//                 <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-500">
//                   {k.label}
//                 </p>
//                 <p
//                   className={`truncate font-mono font-bold leading-tight text-gray-900 ${
//                     k.large ? "text-lg sm:text-xl" : "text-base sm:text-lg"
//                   } ${k.large ? k.color : ""}`}
//                 >
//                   {k.value}
//                 </p>
//               </div>
//             </div>
//           ))}
//         </div>

//         {loading ? (
//           <div className="flex justify-center py-20">
//             <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
//           </div>
//         ) : (
//           <>
//             <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
//               <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5 lg:col-span-8">
//                 <div className="mb-4 flex items-center gap-2">
//                   <HiChartBar className="h-4 w-4 text-gray-400" />
//                   <span className="text-sm font-semibold text-gray-700">
//                     Earnings Overview
//                   </span>
//                 </div>

//                 <div className="h-[220px] w-full sm:h-[240px]">
//                   <ResponsiveContainer width="100%" height="100%">
//                     <BarChart data={monthlyData} barCategoryGap="30%">
//                       <CartesianGrid
//                         strokeDasharray="3 3"
//                         stroke="#f1f5f9"
//                         vertical={false}
//                       />
//                       <XAxis
//                         dataKey="month"
//                         tick={{ fontSize: 10, fill: "#94a3b8" }}
//                         tickLine={false}
//                         axisLine={false}
//                       />
//                       <Tooltip content={<BarTooltip />} />
//                       <Bar
//                         name="Gross"
//                         dataKey="gross"
//                         fill="#3b82f6"
//                         radius={[3, 3, 0, 0]}
//                       />
//                       <Bar
//                         name="Payout"
//                         dataKey="net"
//                         fill="#059669"
//                         radius={[3, 3, 0, 0]}
//                       />
//                     </BarChart>
//                   </ResponsiveContainer>
//                 </div>

//                 <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2">
//                   {[
//                     { color: "#3b82f6", label: "Gross" },
//                     { color: "#059669", label: "Actual Payout" },
//                   ].map((l) => (
//                     <div key={l.label} className="flex items-center gap-1.5">
//                       <div
//                         className="h-2 w-2 rounded-full"
//                         style={{ backgroundColor: l.color }}
//                       />
//                       <span className="text-[10px] text-gray-500">
//                         {l.label}
//                       </span>
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5 lg:col-span-4">
//                 <p className="mb-4 text-sm font-semibold text-gray-700">
//                   Payout Breakdown
//                 </p>

//                 <div className="h-[180px] w-full">
//                   <ResponsiveContainer width="100%" height="100%">
//                     <PieChart>
//                       <Pie
//                         data={pieData}
//                         cx="50%"
//                         cy="50%"
//                         innerRadius={35}
//                         outerRadius={58}
//                         paddingAngle={2}
//                         dataKey="value"
//                         labelLine={false}
//                       >
//                         {pieData.map((_, i) => (
//                           <Cell key={i} fill={PIE_COLORS[i]} />
//                         ))}
//                         <Label content={DonutCenter} position="center" />
//                       </Pie>
//                     </PieChart>
//                   </ResponsiveContainer>
//                 </div>

//                 <div className="mt-3 flex flex-col gap-2">
//                   <div className="flex flex-wrap items-center justify-between gap-2">
//                     <div className="flex items-center gap-1.5">
//                       <div className="h-2 w-2 rounded-full bg-emerald-500" />
//                       <span className="text-xs font-semibold text-emerald-600">
//                         Your Share: {payoutPercent}%
//                       </span>
//                     </div>
//                     <span className="text-xs font-mono font-semibold text-gray-700">
//                       NPR {fmt(netPayout)}
//                     </span>
//                   </div>

//                   <div className="flex flex-wrap items-center justify-between gap-2">
//                     <div className="flex items-center gap-1.5">
//                       <div className="h-2 w-2 rounded-full bg-amber-400" />
//                       <span className="text-xs font-semibold text-amber-600">
//                         Commission: {commissionPercent}%
//                       </span>
//                     </div>
//                     <span className="text-xs font-mono font-semibold text-gray-700">
//                       NPR {fmt(commission)}
//                     </span>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
//               <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
//                 <span className="text-sm font-bold text-gray-800">
//                   Earnings History
//                 </span>
//               </div>

//               <div className="hidden overflow-x-auto md:block">
//                 <table className="w-full min-w-[900px] text-sm">
//                   <thead>
//                     <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-widest text-gray-400">
//                       <th className="px-4 py-2.5 text-left">Service</th>
//                       <th className="px-4 py-2.5 text-left">Client</th>
//                       <th className="px-4 py-2.5 text-left">Gross</th>
//                       <th className="px-4 py-2.5 text-left">Commission</th>
//                       <th className="px-4 py-2.5 text-left">Your Payout</th>
//                       <th className="px-4 py-2.5 text-left">Date</th>
//                       <th className="px-4 py-2.5 text-left">Status</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {payments.length === 0 ? (
//                       <tr>
//                         <td colSpan={7} className="py-16 text-center">
//                           <div className="flex flex-col items-center gap-2">
//                             <HiBanknotes className="h-10 w-10 text-gray-300" />
//                             <span className="text-sm text-gray-400">
//                               No earnings yet
//                             </span>
//                           </div>
//                         </td>
//                       </tr>
//                     ) : (
//                       payments.map((p) => {
//                         const gross = Number(p.amount || 0);
//                         const comm = getCommissionAmount(p);
//                         const payout = getProviderPayout(p);
//                         const refund = getRefundAmount(p);

//                         const clientName = p.clientId?.profile?.name || "—";
//                         const serviceTitle =
//                           p.bookingId?.serviceId?.title ||
//                           p.bookingId?.serviceTitle ||
//                           "—";

//                         const displayDate =
//                           p.releasedAt ||
//                           p.escrowReleasedAt ||
//                           p.refundedAt ||
//                           p.createdAt;

//                         return (
//                           <tr
//                             key={p._id}
//                             className="border-b border-gray-50 transition hover:bg-emerald-50/20"
//                           >
//                             <td className="px-4 py-2.5 font-medium text-gray-800">
//                               {serviceTitle}
//                             </td>
//                             <td className="px-4 py-2.5 text-gray-600">
//                               {clientName}
//                             </td>
//                             <td className="px-4 py-2.5 font-mono text-sm text-gray-900">
//                               NPR {fmt(gross)}
//                               {refund > 0 && (
//                                 <div className="text-[10px] text-gray-500">
//                                   Refunded: NPR {fmt(refund)}
//                                 </div>
//                               )}
//                             </td>
//                             <td className="px-4 py-2.5 font-mono text-sm text-amber-600">
//                               NPR {fmt(comm)}
//                             </td>
//                             <td className="px-4 py-2.5 font-mono text-sm font-semibold text-emerald-600">
//                               NPR {fmt(payout)}
//                             </td>
//                             <td className="whitespace-nowrap px-4 py-2.5 text-gray-500">
//                               {fmtDate(displayDate)}
//                             </td>
//                             <td className="px-4 py-2.5">
//                               <StatusChip status={p.status} />
//                             </td>
//                           </tr>
//                         );
//                       })
//                     )}
//                   </tbody>
//                 </table>
//               </div>

//               <div className="space-y-3 p-4 md:hidden">
//                 {payments.length === 0 ? (
//                   <div className="py-10 text-center">
//                     <div className="flex flex-col items-center gap-2">
//                       <HiBanknotes className="h-10 w-10 text-gray-300" />
//                       <span className="text-sm text-gray-400">
//                         No earnings yet
//                       </span>
//                     </div>
//                   </div>
//                 ) : (
//                   payments.map((p) => {
//                     const gross = Number(p.amount || 0);
//                     const comm = getCommissionAmount(p);
//                     const payout = getProviderPayout(p);
//                     const refund = getRefundAmount(p);

//                     const clientName = p.clientId?.profile?.name || "—";
//                     const serviceTitle =
//                       p.bookingId?.serviceId?.title ||
//                       p.bookingId?.serviceTitle ||
//                       "—";

//                     const displayDate =
//                       p.releasedAt ||
//                       p.escrowReleasedAt ||
//                       p.refundedAt ||
//                       p.createdAt;

//                     return (
//                       <div
//                         key={p._id}
//                         className="rounded-2xl border border-gray-100 bg-slate-50 p-4"
//                       >
//                         <div className="mb-3 flex items-start justify-between gap-3">
//                           <div className="min-w-0">
//                             <p className="break-words font-semibold text-gray-900">
//                               {serviceTitle}
//                             </p>
//                             <p className="mt-1 text-sm text-gray-500">
//                               {clientName}
//                             </p>
//                           </div>
//                           <StatusChip status={p.status} />
//                         </div>

//                         <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
//                           <div>
//                             <p className="text-xs text-gray-400">Gross</p>
//                             <p className="font-mono text-gray-900">
//                               NPR {fmt(gross)}
//                             </p>
//                           </div>

//                           <div>
//                             <p className="text-xs text-gray-400">Commission</p>
//                             <p className="font-mono text-amber-600">
//                               NPR {fmt(comm)}
//                             </p>
//                           </div>

//                           <div>
//                             <p className="text-xs text-gray-400">Your Payout</p>
//                             <p className="font-mono font-semibold text-emerald-600">
//                               NPR {fmt(payout)}
//                             </p>
//                           </div>

//                           <div>
//                             <p className="text-xs text-gray-400">Date</p>
//                             <p className="text-gray-600">{fmtDate(displayDate)}</p>
//                           </div>

//                           {refund > 0 && (
//                             <div>
//                               <p className="text-xs text-gray-400">Refunded</p>
//                               <p className="font-mono text-gray-700">
//                                 NPR {fmt(refund)}
//                               </p>
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                     );
//                   })
//                 )}
//               </div>
//             </div>
//           </>
//         )}
//       </div>
//     </ProviderLayout>
//   );
// }


import { useEffect, useMemo, useState } from "react";
import ProviderLayout from "../../layouts/ProviderLayout";
import api from "../../utils/axios";
import toast from "react-hot-toast";
import {
  HiWallet,
  HiArrowTrendingUp,
  HiReceiptPercent,
  HiBanknotes,
  HiChartBar,
} from "react-icons/hi2";
import {
  BarChart,
  Bar,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Label,
} from "recharts";

/* ─── shared filter helpers ─────────────────────────────────────────────── */
const DASHBOARD_RANGES = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "custom", label: "Custom Range" },
];

function buildRangeParams(range, fromDate, toDate, limit) {
  const params = {};
  if (limit != null) params.limit = limit;

  if (range === "custom" && fromDate && toDate) {
    params.range = "custom";
    params.from = fromDate;
    params.to = toDate;
  } else {
    params.range = range;
  }

  return params;
}

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

  if (payment?.status === "REFUNDED") {
    return 0;
  }

  if (
    ["RELEASED", "FUNDS_HELD", "DISPUTED", "PARTIALLY_REFUNDED"].includes(
      payment?.status
    )
  ) {
    return Number((Number(payment?.amount || 0) * 0.85).toFixed(2));
  }

  return 0;
}

function getCommissionAmount(payment) {
  const gross = Number(payment?.amount || 0);
  const refund = getRefundAmount(payment);
  const payout = getProviderPayout(payment);
  return Number(Math.max(0, gross - refund - payout).toFixed(2));
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


function getEarningNarrative(payment) {
  const resolution = getResolution(payment);
  const bookingStatus = payment?.bookingId?.status;
  const payout = getProviderPayout(payment);
  const refund = getRefundAmount(payment);

  if (payment?.status === "PARTIALLY_REFUNDED") {
    return {
      label: "Partial dispute settlement",
      detail: `You received NPR ${fmt(payout)} and the client was refunded NPR ${fmt(refund)}.`,
      tone: "text-amber-700",
    };
  }

  if (payment?.status === "REFUNDED") {
    if (bookingStatus === "no-show") {
      return {
        label: "No payout due to provider no-show",
        detail: `The client was refunded in full because the job was not started in time.`,
        tone: "text-red-600",
      };
    }

    if (bookingStatus === "rejected") {
      return {
        label: "No payout after rejection",
        detail: `The client payment was refunded because the booking was rejected.`,
        tone: "text-red-600",
      };
    }

    if (resolution?.resolutionType === "refund_full") {
      return {
        label: "Full dispute refund",
        detail: `The admin refunded the client in full, so no payout was released.`,
        tone: "text-red-600",
      };
    }
  }

  if (payment?.status === "FUNDS_HELD") {
    return {
      label: "Waiting for completion",
      detail: `Funds are currently held in escrow and will be released after completion or resolution.`,
      tone: "text-amber-700",
    };
  }

  if (payment?.status === "RELEASED") {
    return {
      label: "Payout released",
      detail: `Your payout of NPR ${fmt(payout)} has been released successfully.`,
      tone: "text-emerald-700",
    };
  }

  return {
    label: "Payment update",
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

/* ─── custom tooltips ─────────────────────────────────────────────────────── */
function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-gray-500">{label}</p>
      {payload.map((p) => (
        <p
          key={p.name}
          style={{ color: p.color }}
          className="font-mono font-semibold"
        >
          {p.name}: NPR {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

/* ─── main ────────────────────────────────────────────────────────────────── */
export default function ProviderEarnings() {
  const [wallet, setWallet] = useState({
    balance: 0,
    totalEarned: 0,
    totalGrossVolume: 0,
    totalCommissionPaid: 0,
    pendingPayouts: 0,
    pendingBalance: 0,
    availableBalance: 0,
    totalWithdrawn: 0,
    transactions: [],
  });

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedRange, setSelectedRange] = useState("month");
  const [appliedRange, setAppliedRange] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [appliedCustomFrom, setAppliedCustomFrom] = useState("");
  const [appliedCustomTo, setAppliedCustomTo] = useState("");

  useEffect(() => {
    if (selectedRange !== "custom") {
      setAppliedRange(selectedRange);
    }
  }, [selectedRange]);

  const fetchData = async (
    range = appliedRange,
    fromDate = appliedCustomFrom,
    toDate = appliedCustomTo
  ) => {
    try {
      setLoading(true);

      const rangeParams = buildRangeParams(range, fromDate, toDate);

      const [walletRes, paymentsRes] = await Promise.all([
        api.get("/providers/wallet", { params: rangeParams }),
        api.get("/payment/transactions/provider", {
          params: buildRangeParams(range, fromDate, toDate, 200),
        }),
      ]);

      setWallet(walletRes.data?.wallet || {});
      setPayments(paymentsRes.data?.payments || []);
    } catch (err) {
      console.error("Failed to load earnings", err);
      toast.error("Failed to load earnings data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(appliedRange, appliedCustomFrom, appliedCustomTo);

    const iv = setInterval(() => {
      if (!document.hidden) {
        fetchData(appliedRange, appliedCustomFrom, appliedCustomTo);
      }
    }, 30000);

    const vis = () => {
      if (!document.hidden) {
        fetchData(appliedRange, appliedCustomFrom, appliedCustomTo);
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
      setAppliedCustomFrom("");
      setAppliedCustomTo("");
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

  /* ── monthly bar chart data (actual payout/gross) ── */
  const monthlyData = useMemo(() => {
    const settled = payments.filter((p) => {
      const payout = getProviderPayout(p);
      return payout > 0;
    });

    if (appliedRange === "today" || appliedRange === "week") {
      return settled.map((p, idx) => {
        const gross = Number(p.amount || 0);
        const net = getProviderPayout(p);

        return {
          month:
            appliedRange === "today"
              ? new Date(
                  p.releasedAt ||
                    p.escrowReleasedAt ||
                    p.refundedAt ||
                    p.createdAt
                ).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : new Date(
                  p.releasedAt ||
                    p.escrowReleasedAt ||
                    p.refundedAt ||
                    p.createdAt
                ).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                }),
          gross,
          net,
          key: `${p._id}-${idx}`,
        };
      });
    }

    const bucketMap = new Map();

    settled.forEach((p) => {
      const sourceDate = new Date(
        p.releasedAt || p.escrowReleasedAt || p.refundedAt || p.createdAt
      );

      const key = `${sourceDate.getFullYear()}-${sourceDate.getMonth()}`;
      const label = sourceDate.toLocaleDateString("en-US", { month: "short" });

      if (!bucketMap.has(key)) {
        bucketMap.set(key, {
          month: label,
          year: sourceDate.getFullYear(),
          monthIdx: sourceDate.getMonth(),
          gross: 0,
          net: 0,
          sortDate: new Date(
            sourceDate.getFullYear(),
            sourceDate.getMonth(),
            1
          ).getTime(),
        });
      }

      const bucket = bucketMap.get(key);
      bucket.gross += Number(p.amount || 0);
      bucket.net += getProviderPayout(p);
    });

    return Array.from(bucketMap.values()).sort((a, b) => a.sortDate - b.sortDate);
  }, [payments, appliedRange]);

  /* ── derived values ── */
  const totalGross = Number(wallet.totalGrossVolume || 0);
  const commission = Number(wallet.totalCommissionPaid || 0);
  const netPayout = Number(wallet.totalEarned || 0);
  const balance = Number(wallet.balance || wallet.availableBalance || 0);

  const kpis = [
    {
      label: "Wallet Balance",
      value: `NPR ${fmt(balance)}`,
      Icon: HiWallet,
      color: "text-emerald-700",
      bg: "bg-emerald-100",
      border: "border-l-emerald-500",
      large: true,
    },
    {
      label: "Total Earned (Gross)",
      value: `NPR ${fmt(totalGross)}`,
      Icon: HiArrowTrendingUp,
      color: "text-blue-700",
      bg: "bg-blue-100",
      border: "border-l-blue-500",
    },
    {
      label: "Commission Paid",
      value: `NPR ${fmt(commission)}`,
      Icon: HiReceiptPercent,
      color: "text-amber-700",
      bg: "bg-amber-100",
      border: "border-l-amber-500",
    },
    {
      label: "Your Payout",
      value: `NPR ${fmt(netPayout)}`,
      Icon: HiBanknotes,
      color: "text-green-700",
      bg: "bg-green-100",
      border: "border-l-green-500",
    },
  ];

  const payoutPercent =
    totalGross > 0 ? Number(((netPayout / totalGross) * 100).toFixed(1)) : 0;
  const commissionPercent =
    totalGross > 0 ? Number(((commission / totalGross) * 100).toFixed(1)) : 0;

  const pieData = [
    { name: "Your Payout", value: netPayout },
    { name: "Commission", value: commission },
  ].filter((item) => item.value > 0);

  const PIE_COLORS = ["#059669", "#f59e0b"];

  const DonutCenter = ({ viewBox }) => {
    if (
      !viewBox ||
      typeof viewBox.cx !== "number" ||
      typeof viewBox.cy !== "number"
    ) {
      return null;
    }

    const { cx, cy } = viewBox;

    return (
      <>
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          className="fill-gray-700 text-xs font-bold"
          style={{ fontSize: 11, fontWeight: 700 }}
        >
          {payoutPercent}%
        </text>
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          style={{ fontSize: 9, fill: "#6b7280" }}
        >
          yours
        </text>
      </>
    );
  };

  return (
    <ProviderLayout>
      <div
        className="mx-auto w-full max-w-6xl space-y-4 px-4 py-4 sm:px-6 lg:px-8"
        style={{ backgroundColor: "#f8fafc" }}
      >
        <div className="mb-4 flex flex-col gap-3 lg:items-end">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => (
            <div
              key={k.label}
              className={`flex min-w-0 items-center gap-3 rounded-2xl border border-gray-100 border-l-4 bg-white p-4 shadow-sm ${k.border}`}
            >
              <div
                className={`${k.bg} flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl`}
              >
                <k.Icon className={`h-5 w-5 ${k.color}`} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-500">
                  {k.label}
                </p>
                <p
                  className={`truncate font-mono font-bold leading-tight text-gray-900 ${
                    k.large ? "text-lg sm:text-xl" : "text-base sm:text-lg"
                  } ${k.large ? k.color : ""}`}
                >
                  {k.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5 lg:col-span-8 min-w-0">
                <div className="mb-4 flex items-center gap-2">
                  <HiChartBar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">
                    Earnings Overview
                  </span>
                </div>

                <div className="h-[220px] w-full sm:h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} barCategoryGap="30%">
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f1f5f9"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<BarTooltip />} />
                      <Bar
                        name="Gross"
                        dataKey="gross"
                        fill="#3b82f6"
                        radius={[3, 3, 0, 0]}
                      />
                      <Bar
                        name="Payout"
                        dataKey="net"
                        fill="#059669"
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2">
                  {[
                    { color: "#3b82f6", label: "Gross" },
                    { color: "#059669", label: "Actual Payout" },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: l.color }}
                      />
                      <span className="text-[10px] text-gray-500">
                        {l.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5 lg:col-span-4 min-w-0">
                <p className="mb-4 text-sm font-semibold text-gray-700">
                  Payout Breakdown
                </p>

                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={58}
                        paddingAngle={2}
                        dataKey="value"
                        labelLine={false}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i]} />
                        ))}
                        <Label content={DonutCenter} position="center" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-600">
                        Your Share: {payoutPercent}%
                      </span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-gray-700">
                      NPR {fmt(netPayout)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-amber-400" />
                      <span className="text-xs font-semibold text-amber-600">
                        Commission: {commissionPercent}%
                      </span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-gray-700">
                      NPR {fmt(commission)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
                <span className="text-sm font-bold text-gray-800">
                  Earnings History
                </span>
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      <th className="px-4 py-2.5 text-left">Service</th>
                      <th className="px-4 py-2.5 text-left">Client</th>
                      <th className="px-4 py-2.5 text-left">Gross</th>
                      <th className="px-4 py-2.5 text-left">Commission</th>
                      <th className="px-4 py-2.5 text-left">Your Payout</th>
                      <th className="px-4 py-2.5 text-left">Date</th>
                      <th className="px-4 py-2.5 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <HiBanknotes className="h-10 w-10 text-gray-300" />
                            <span className="text-sm text-gray-400">
                              No earnings yet
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => {
                        const gross = Number(p.amount || 0);
                        const comm = getCommissionAmount(p);
                        const payout = getProviderPayout(p);
                        const refund = getRefundAmount(p);

                        const clientName = p.clientId?.profile?.name || "—";
                        const serviceTitle =
                          p.bookingId?.serviceId?.title ||
                          p.bookingId?.serviceTitle ||
                          "—";

                        const displayDate =
                          p.releasedAt ||
                          p.escrowReleasedAt ||
                          p.refundedAt ||
                          p.createdAt;

                        return (
                          <tr
                            key={p._id}
                            className="border-b border-gray-50 transition hover:bg-emerald-50/20"
                          >
                            <td className="px-4 py-2.5 font-medium text-gray-800">
                              {serviceTitle}
                            </td>
                            <td className="px-4 py-2.5 text-gray-600">
                              {clientName}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-sm text-gray-900">
                              NPR {fmt(gross)}
                              {refund > 0 && (
                                <div className="text-[10px] text-gray-500">
                                  Refunded: NPR {fmt(refund)}
                                </div>
                              )}
                              <div className={`mt-1 max-w-[220px] text-[10px] ${getEarningNarrative(p).tone}`}>
                                {getEarningNarrative(p).label}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-sm text-amber-600">
                              NPR {fmt(comm)}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-sm font-semibold text-emerald-600">
                              NPR {fmt(payout)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-gray-500">
                              {fmtDate(displayDate)}
                            </td>
                            <td className="px-4 py-2.5">
                              <StatusChip status={p.status} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 p-4 md:hidden">
                {payments.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <HiBanknotes className="h-10 w-10 text-gray-300" />
                      <span className="text-sm text-gray-400">
                        No earnings yet
                      </span>
                    </div>
                  </div>
                ) : (
                  payments.map((p) => {
                    const gross = Number(p.amount || 0);
                    const comm = getCommissionAmount(p);
                    const payout = getProviderPayout(p);
                    const refund = getRefundAmount(p);

                    const clientName = p.clientId?.profile?.name || "—";
                    const serviceTitle =
                      p.bookingId?.serviceId?.title ||
                      p.bookingId?.serviceTitle ||
                      "—";

                    const displayDate =
                      p.releasedAt ||
                      p.escrowReleasedAt ||
                      p.refundedAt ||
                      p.createdAt;

                    return (
                      <div
                        key={p._id}
                        className="rounded-2xl border border-gray-100 bg-slate-50 p-4"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words font-semibold text-gray-900">
                              {serviceTitle}
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                              {clientName}
                            </p>
                          </div>
                          <StatusChip status={p.status} />
                        </div>

                        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                          <div>
                            <p className="text-xs text-gray-400">Gross</p>
                            <p className="font-mono text-gray-900">
                              NPR {fmt(gross)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-400">Commission</p>
                            <p className="font-mono text-amber-600">
                              NPR {fmt(comm)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-400">Your Payout</p>
                            <p className="font-mono font-semibold text-emerald-600">
                              NPR {fmt(payout)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-400">Date</p>
                            <p className="text-gray-600">{fmtDate(displayDate)}</p>
                          </div>

                          {refund > 0 && (
                            <div>
                              <p className="text-xs text-gray-400">Refunded</p>
                              <p className="font-mono text-gray-700">
                                NPR {fmt(refund)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </ProviderLayout>
  );
}