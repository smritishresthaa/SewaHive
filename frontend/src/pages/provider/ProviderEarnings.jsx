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

/* ─── status chip ─────────────────────────────────────────────────────────── */
function StatusChip({ status }) {
  const MAP = {
    RELEASED:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    FUNDS_HELD: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    INITIATED: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    FAILED: "bg-red-50 text-red-700 ring-1 ring-red-200",
    DISPUTED: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    REFUNDED: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
    PARTIALLY_REFUNDED:
      "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
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
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
        MAP[status] ||
        "bg-gray-100 text-gray-500 ring-1 ring-gray-200"
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
    totalCommissionPaid: 0,
    pendingPayouts: 0,
    pendingBalance: 0,
    availableBalance: 0,
    totalWithdrawn: 0,
    transactions: [],
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

    const iv = setInterval(() => {
      if (!document.hidden) fetchData();
    }, 30000);

    const vis = () => {
      if (!document.hidden) fetchData();
    };

    document.addEventListener("visibilitychange", vis);

    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", vis);
    };
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
        gross: 0,
        net: 0,
      });
    }

    payments.forEach((p) => {
      if (p.status !== "RELEASED" || !p.createdAt) return;

      const d = new Date(p.createdAt);
      const m = months.find(
        (x) =>
          x.monthIdx === d.getMonth() && x.year === d.getFullYear()
      );

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
  const commission = Number(
    wallet.totalCommissionPaid || (totalEarned * 0.15).toFixed(2)
  );
  const netPayout = Number((totalEarned - commission).toFixed(2));
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
      value: `NPR ${fmt(totalEarned)}`,
      Icon: HiArrowTrendingUp,
      color: "text-blue-700",
      bg: "bg-blue-100",
      border: "border-l-blue-500",
    },
    {
      label: "Commission Paid (15%)",
      value: `NPR ${fmt(commission)}`,
      Icon: HiReceiptPercent,
      color: "text-amber-700",
      bg: "bg-amber-100",
      border: "border-l-amber-500",
    },
    {
      label: "Net Payout (85%)",
      value: `NPR ${fmt(netPayout)}`,
      Icon: HiBanknotes,
      color: "text-green-700",
      bg: "bg-green-100",
      border: "border-l-green-500",
    },
  ];

  const pieData = [
    { name: "Net Payout", value: 85 },
    { name: "Commission", value: 15 },
  ];

  const PIE_COLORS = ["#059669", "#f59e0b"];

  /* ── custom center label ── */
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
          85%
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
                    k.large
                      ? "text-lg sm:text-xl"
                      : "text-base sm:text-lg"
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
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5 lg:col-span-8">
                <div className="mb-4 flex items-center gap-2">
                  <HiChartBar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">
                    Monthly Earnings (Last 6 Months)
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
                        name="Net"
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
                    { color: "#059669", label: "Net (85%)" },
                  ].map((l) => (
                    <div
                      key={l.label}
                      className="flex items-center gap-1.5"
                    >
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

              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5 lg:col-span-4">
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
                        Your Share: 85%
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
                        Platform Fee: 15%
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
                      <th className="px-4 py-2.5 text-left">
                        Commission (15%)
                      </th>
                      <th className="px-4 py-2.5 text-left">
                        Your Payout (85%)
                      </th>
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
                        const comm = Number((gross * 0.15).toFixed(2));
                        const payout = Number((gross * 0.85).toFixed(2));
                        const clientName =
                          p.clientId?.profile?.name || "—";
                        const serviceTitle =
                          p.bookingId?.serviceTitle || "—";

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
                            </td>
                            <td className="px-4 py-2.5 font-mono text-sm text-amber-600">
                              NPR {fmt(comm)}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-sm font-semibold text-emerald-600">
                              NPR {fmt(payout)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-gray-500">
                              {fmtDate(p.createdAt)}
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
                    const comm = Number((gross * 0.15).toFixed(2));
                    const payout = Number((gross * 0.85).toFixed(2));
                    const clientName =
                      p.clientId?.profile?.name || "—";
                    const serviceTitle =
                      p.bookingId?.serviceTitle || "—";

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
                            <p className="text-xs text-gray-400">
                              Commission
                            </p>
                            <p className="font-mono text-amber-600">
                              NPR {fmt(comm)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">
                              Your Payout
                            </p>
                            <p className="font-mono font-semibold text-emerald-600">
                              NPR {fmt(payout)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Date</p>
                            <p className="text-gray-600">
                              {fmtDate(p.createdAt)}
                            </p>
                          </div>
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