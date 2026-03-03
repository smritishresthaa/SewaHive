import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import ClientLayout from "../../layouts/ClientLayout";
import api from "../../utils/axios";
import {
  HiBanknotes, HiClock, HiCheckCircle, HiInformationCircle,
  HiArrowUturnLeft,
} from "react-icons/hi2";

/* ─── helpers ────────────────────────────────────────────────────────────── */
const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

/* ─── status chip ─────────────────────────────────────────────────────────── */
function StatusChip({ status }) {
  const MAP = {
    RELEASED:           "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    FUNDS_HELD:         "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    INITIATED:          "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    FAILED:             "bg-red-50 text-red-700 ring-1 ring-red-200",
    DISPUTED:           "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    REFUNDED:           "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
    PARTIALLY_REFUNDED: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  };
  const LABELS = {
    RELEASED: "Released", FUNDS_HELD: "Funds Held", INITIATED: "Initiated",
    FAILED: "Failed", DISPUTED: "Disputed", REFUNDED: "Refunded", PARTIALLY_REFUNDED: "Partial Refund",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${MAP[status] || "bg-gray-100 text-gray-500 ring-1 ring-gray-200"}`}>
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
      toast.error(err?.response?.data?.message || "Failed to submit refund request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 bg-amber-50 rounded-xl p-3 text-xs">
      <p className="text-amber-800 mb-2">Are you sure? This will notify our team to review your refund request.</p>
      <div className="flex gap-2">
        <button onClick={handleConfirm} disabled={loading}
          className="bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition disabled:opacity-60 text-xs">
          {loading ? "Submitting..." : "Confirm"}
        </button>
        <button onClick={onCancel} className="text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition text-xs">
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ─── mobile card ─────────────────────────────────────────────────────────── */
function MobileCard({ payment, showRefundFor, setShowRefundFor, onRefundDone }) {
  const amt = Number(payment.amount || 0);
  const providerName = payment.providerId?.profile?.name || "Provider";
  const serviceTitle = payment.bookingId?.serviceTitle || "Service";
  const initials = providerName.slice(0, 2).toUpperCase();
  const isHeld = payment.status === "FUNDS_HELD";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-semibold text-gray-900 leading-tight">{serviceTitle}</span>
        <StatusChip status={payment.status} />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-emerald-700">{initials}</span>
        </div>
        <span className="text-xs text-gray-600">{providerName}</span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-mono font-semibold text-gray-900">NPR {fmt(amt)}</span>
          <span className="ml-2 text-[10px] text-gray-400">{fmtDate(payment.createdAt)}</span>
        </div>
        {isHeld && !payment.refundRequested && (
          <button
            onClick={() => setShowRefundFor(showRefundFor === payment._id ? null : payment._id)}
            className="text-xs border border-amber-300 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-50 transition flex items-center gap-1.5"
          >
            <HiArrowUturnLeft className="w-3.5 h-3.5" />
            Request Refund
          </button>
        )}
        {isHeld && payment.refundRequested && (
          <span className="text-[11px] text-amber-600 font-medium">Refund requested</span>
        )}
      </div>
      {showRefundFor === payment._id && (
        <InlineRefundConfirm
          paymentId={payment._id}
          onCancel={() => setShowRefundFor(null)}
          onDone={() => { setShowRefundFor(null); onRefundDone() }}
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

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.get("/payment/transactions/client?limit=200");
      setPayments(res.data?.payments || []);
    } catch (err) {
      console.error("Failed to load transactions", err);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    const iv = setInterval(() => { if (!document.hidden) fetchTransactions(); }, 30000);
    const vis = () => { if (!document.hidden) fetchTransactions(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", vis); };
  }, []);

  /* ── summary ── */
  const summary = useMemo(() => {
    let totalSpent = 0, pending = 0, completed = 0;
    payments.forEach(p => {
      const amt = Number(p.amount || 0);
      if (p.status === "RELEASED") { totalSpent += amt; completed++ }
      if (p.status === "FUNDS_HELD") pending += amt;
    });
    return { totalSpent, pending, completed };
  }, [payments]);

  const hasHeld = payments.some(p => p.status === "FUNDS_HELD");

  /* ── filtered ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter(p => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      const provider = p.providerId?.profile?.name || "";
      const service = p.bookingId?.serviceTitle || "";
      return [provider, service, String(p._id)].join(" ").toLowerCase().includes(q);
    });
  }, [payments, statusFilter, search]);

  const kpis = [
    { label: "Total Spent", value: `NPR ${fmt(summary.totalSpent)}`, Icon: HiBanknotes,   color: "text-emerald-700", bg: "bg-emerald-100", border: "border-l-emerald-500" },
    { label: "Pending (Escrow)", value: `NPR ${fmt(summary.pending)}`, Icon: HiClock,      color: "text-amber-700",  bg: "bg-amber-100",   border: "border-l-amber-500"   },
    { label: "Completed Bookings", value: summary.completed,           Icon: HiCheckCircle, color: "text-green-700",  bg: "bg-green-100",   border: "border-l-green-500"   },
  ];

  return (
    <ClientLayout>
      <div className="space-y-4 max-w-6xl mx-auto" style={{ backgroundColor: "#f8fafc" }}>

        {/* ─── SUMMARY STRIP ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {kpis.map(k => (
            <div key={k.label} className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 border-l-4 ${k.border}`}>
              <div className={`${k.bg} w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0`}>
                <k.Icon className={`w-5 h-5 ${k.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide leading-none mb-1">{k.label}</p>
                <p className="text-xl font-bold font-mono text-gray-900 leading-none">{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ─── ESCROW BANNER ───────────────────────────────────────────── */}
        {hasHeld && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-3">
            <HiInformationCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              Your payment is securely held in escrow. Funds are released to your provider only after service completion. You can request a refund if the service is not delivered.
            </p>
          </div>
        )}

        {/* filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search provider or service..."
            className="rounded-xl bg-white border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 w-56"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">All Statuses</option>
            <option value="RELEASED">Released</option>
            <option value="FUNDS_HELD">Funds Held</option>
            <option value="INITIATED">Initiated</option>
            <option value="DISPUTED">Disputed</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>

        {/* ─── DESKTOP TABLE ───────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No transactions found.</div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                      <th className="text-left py-2.5 px-4">Service</th>
                      <th className="text-left py-2.5 px-4">Provider</th>
                      <th className="text-left py-2.5 px-4">Amount</th>
                      <th className="text-left py-2.5 px-4">Platform Fee</th>
                      <th className="text-left py-2.5 px-4">Status</th>
                      <th className="text-left py-2.5 px-4">Date</th>
                      <th className="text-left py-2.5 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => {
                      const amt = Number(p.amount || 0);
                      const fee = Number((amt * 0.15).toFixed(2));
                      const providerAmt = Number((amt * 0.85).toFixed(2));
                      const isHeld = p.status === "FUNDS_HELD";
                      return (
                        <>
                          <tr key={p._id} className="border-b border-gray-50 hover:bg-emerald-50/20 transition">
                            <td className="py-2.5 px-4 text-gray-800 font-medium">{p.bookingId?.serviceTitle || "—"}</td>
                            <td className="py-2.5 px-4 text-gray-600">{p.providerId?.profile?.name || "—"}</td>
                            <td className="py-2.5 px-4">
                              <span className="font-mono font-semibold text-gray-900">NPR {fmt(amt)}</span>
                              <div className="text-[10px] text-gray-400 font-mono">NPR {fmt(providerAmt)} goes to provider</div>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-xs text-gray-400">NPR {fmt(fee)}</td>
                            <td className="py-2.5 px-4"><StatusChip status={p.status} /></td>
                            <td className="py-2.5 px-4 text-gray-500 whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                            <td className="py-2.5 px-4">
                              {isHeld && !p.refundRequested && (
                                <button
                                  onClick={() => setShowRefundFor(showRefundFor === p._id ? null : p._id)}
                                  className="text-xs border border-amber-300 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-50 transition flex items-center gap-1.5"
                                >
                                  <HiArrowUturnLeft className="w-3.5 h-3.5" />
                                  Request Refund
                                </button>
                              )}
                              {isHeld && p.refundRequested && (
                                <span className="text-[11px] text-amber-600 font-medium">Refund requested</span>
                              )}
                            </td>
                          </tr>
                          {showRefundFor === p._id && (
                            <tr key={`${p._id}-refund`} className="bg-amber-50/30">
                              <td colSpan={7} className="px-4 pb-3">
                                <InlineRefundConfirm
                                  paymentId={p._id}
                                  onCancel={() => setShowRefundFor(null)}
                                  onDone={() => { setShowRefundFor(null); fetchTransactions(); }}
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

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filtered.map(p => (
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
