import { useEffect, useMemo, useState } from "react";
import ProviderLayout from "../../layouts/ProviderLayout";
import api from "../../utils/axios";
import toast from "react-hot-toast";
import {
  HiWallet, HiArrowTrendingUp, HiReceiptPercent, HiBanknotes, HiChartBar,
} from "react-icons/hi2";
import {
  BarChart, Bar, XAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

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

/* ─── custom tooltips ─────────────────────────────────────────────────────── */
function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white border border-gray-100 shadow-lg px-3 py-2 text-xs">
      <p className="text-gray-500 font-medium mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold font-mono">
          {p.name}: NPR {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

/* ─── main ────────────────────────────────────────────────────────────────── */
export default function ProviderEarnings() {
  const [wallet, setWallet] = useState({
    balance: 0, totalEarned: 0, totalCommissionPaid: 0, pendingPayouts: 0,
    pendingBalance: 0, availableBalance: 0, totalWithdrawn: 0, transactions: [],
  });
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [walletRes, paymentsRes] = await Promise.all([
        api.get("/providers/wallet"),
        api.get("/payment/transactions/provider?limit=200"),
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
    fetchData();
    const iv = setInterval(() => { if (!document.hidden) fetchData(); }, 30000);
    const vis = () => { if (!document.hidden) fetchData(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", vis); };
  }, []);

  /* ── monthly bar chart data (last 6 months, RELEASED only) ── */
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: d.toLocaleDateString("en-US", { month: "short" }),
        year: d.getFullYear(),
        monthIdx: d.getMonth(),
        gross: 0, net: 0,
      });
    }
    payments.forEach(p => {
      if (p.status !== "RELEASED" || !p.createdAt) return;
      const d = new Date(p.createdAt);
      const m = months.find(x => x.monthIdx === d.getMonth() && x.year === d.getFullYear());
      if (m) {
        const amt = Number(p.amount || 0);
        m.gross += amt;
        m.net += amt * 0.85;
      }
    });
    return months;
  }, [payments]);

  /* ── derived values ── */
  const totalEarned = Number(wallet.totalEarned || 0);
  const commission  = Number(wallet.totalCommissionPaid || (totalEarned * 0.15).toFixed(2));
  const netPayout   = Number((totalEarned - commission).toFixed(2));
  const balance     = Number(wallet.balance || wallet.availableBalance || 0);

  const kpis = [
    { label: "Wallet Balance",      value: `NPR ${fmt(balance)}`,    Icon: HiWallet,          color: "text-emerald-700", bg: "bg-emerald-100", border: "border-l-emerald-500", large: true },
    { label: "Total Earned (Gross)", value: `NPR ${fmt(totalEarned)}`, Icon: HiArrowTrendingUp, color: "text-blue-700",    bg: "bg-blue-100",    border: "border-l-blue-500"    },
    { label: "Commission Paid (15%)", value: `NPR ${fmt(commission)}`, Icon: HiReceiptPercent,  color: "text-amber-700",  bg: "bg-amber-100",   border: "border-l-amber-500"    },
    { label: "Net Payout (85%)",     value: `NPR ${fmt(netPayout)}`,  Icon: HiBanknotes,       color: "text-green-700",  bg: "bg-green-100",   border: "border-l-green-500"    },
  ];

  const pieData = [
    { name: "Net Payout", value: 85 },
    { name: "Commission", value: 15 },
  ];
  const PIE_COLORS = ["#059669", "#f59e0b"];

  /* ── custom center label ── */
  const DonutCenter = ({ viewBox }) => {
    const { cx, cy } = viewBox;
    return (
      <>
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-gray-700 text-xs font-bold" style={{ fontSize: 11, fontWeight: 700 }}>85%</text>
        <text x={cx} y={cy + 8} textAnchor="middle" style={{ fontSize: 9, fill: "#6b7280" }}>yours</text>
      </>
    );
  };

  return (
    <ProviderLayout>
      <div className="space-y-4 max-w-6xl mx-auto" style={{ backgroundColor: "#f8fafc" }}>

        {/* ─── KPI STRIP ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map(k => (
            <div key={k.label} className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 border-l-4 ${k.border}`}>
              <div className={`${k.bg} w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0`}>
                <k.Icon className={`w-5 h-5 ${k.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide leading-none mb-1">{k.label}</p>
                <p className={`font-bold font-mono text-gray-900 leading-none truncate ${k.large ? "text-2xl" : "text-xl"} ${k.large ? k.color : ""}`}>{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            {/* ─── CHARTS ROW ──────────────────────────────────────────── */}
            <div className="grid grid-cols-12 gap-4">

              {/* Monthly Bar Chart (8 cols) */}
              <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <HiChartBar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">Monthly Earnings (Last 6 Months)</span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={monthlyData} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<BarTooltip />} />
                    <Bar name="Gross" dataKey="gross" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                    <Bar name="Net" dataKey="net" fill="#059669" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-5 mt-2">
                  {[{ color: "#3b82f6", label: "Gross" }, { color: "#059669", label: "Net (85%)" }].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                      <span className="text-[10px] text-gray-500">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Earning Breakdown Donut (4 cols) */}
              <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-sm font-semibold text-gray-700 mb-4">Payout Breakdown</p>
                <ResponsiveContainer width="100%" height={140}>
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
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      <DonutCenter />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 mt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-600">Your Share: 85%</span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-gray-700">NPR {fmt(netPayout)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-xs font-semibold text-amber-600">Platform Fee: 15%</span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-gray-700">NPR {fmt(commission)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── EARNINGS TABLE ──────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <span className="text-sm font-bold text-gray-800">Earnings History</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                      <th className="text-left py-2.5 px-4">Service</th>
                      <th className="text-left py-2.5 px-4">Client</th>
                      <th className="text-left py-2.5 px-4">Gross</th>
                      <th className="text-left py-2.5 px-4">Commission (15%)</th>
                      <th className="text-left py-2.5 px-4">Your Payout (85%)</th>
                      <th className="text-left py-2.5 px-4">Date</th>
                      <th className="text-left py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <HiBanknotes className="w-10 h-10 text-gray-300" />
                            <span className="text-sm text-gray-400">No earnings yet</span>
                          </div>
                        </td>
                      </tr>
                    ) : payments.map(p => {
                      const gross = Number(p.amount || 0);
                      const comm  = Number((gross * 0.15).toFixed(2));
                      const payout = Number((gross * 0.85).toFixed(2));
                      const clientName = p.clientId?.profile?.name || "—";
                      const serviceTitle = p.bookingId?.serviceTitle || "—";
                      return (
                        <tr key={p._id} className="border-b border-gray-50 hover:bg-emerald-50/20 transition">
                          <td className="py-2.5 px-4 text-gray-800 font-medium">{serviceTitle}</td>
                          <td className="py-2.5 px-4 text-gray-600">{clientName}</td>
                          <td className="py-2.5 px-4 font-mono text-sm text-gray-900">NPR {fmt(gross)}</td>
                          <td className="py-2.5 px-4 font-mono text-sm text-amber-600">NPR {fmt(comm)}</td>
                          <td className="py-2.5 px-4 font-mono text-sm font-semibold text-emerald-600">NPR {fmt(payout)}</td>
                          <td className="py-2.5 px-4 text-gray-500 whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                          <td className="py-2.5 px-4"><StatusChip status={p.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </ProviderLayout>
  );
}
