import { useEffect, useMemo, useState } from "react";
import ProviderLayout from "../../layouts/ProviderLayout";
import api from "../../utils/axios";
import {
  HiCurrencyDollar,
  HiClock,
  HiCheckCircle,
  HiExclamationTriangle,
  HiArrowTrendingUp,
} from "react-icons/hi2";

const STATUS_LABELS = {
  RELEASED: "Released",
  FUNDS_HELD: "Funds Held",
  INITIATED: "Initiated",
  FAILED: "Failed",
  DISPUTED: "Disputed",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partially Refunded",
};

const statusStyles = (status) => {
  if (status === "RELEASED") return "bg-green-100 text-green-700";
  if (status === "FUNDS_HELD") return "bg-yellow-100 text-yellow-700";
  if (status === "INITIATED") return "bg-blue-100 text-blue-700";
  if (status === "FAILED") return "bg-red-100 text-red-700";
  if (status === "DISPUTED") return "bg-orange-100 text-orange-700";
  return "bg-gray-100 text-gray-700";
};

const rangeOptions = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

const getRangeStart = (range) => {
  if (range === "all") return null;
  const now = new Date();
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return start;
};

export default function ProviderEarnings() {
  const [wallet, setWallet] = useState({
    totalEarned: 0,
    pendingBalance: 0,
    availableBalance: 0,
    totalWithdrawn: 0,
    totalRefunded: 0,
    transactions: [],
  });
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState("30d");

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (document.hidden) return;
      try {
        setLoading(true);
        const [walletRes, paymentsRes] = await Promise.all([
          api.get("/providers/wallet"),
          api.get("/payment/transactions/provider?limit=200"),
        ]);

        if (isMounted) {
          setWallet(walletRes.data?.wallet || {});
          setPayments(paymentsRes.data?.payments || []);
          setError("");
        }
      } catch (err) {
        console.error("Failed to load earnings", err);
        if (isMounted) {
          setError("Failed to load earnings data");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchData();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const filteredPayments = useMemo(() => {
    const startDate = getRangeStart(range);
    if (!startDate) return payments;
    return payments.filter((payment) => {
      const createdAt = new Date(payment.createdAt || 0);
      return createdAt >= startDate;
    });
  }, [payments, range]);

  const metrics = useMemo(() => {
    const summary = {
      released: 0,
      held: 0,
      disputed: 0,
      refunded: 0,
      totalCount: filteredPayments.length,
    };

    filteredPayments.forEach((payment) => {
      const amount = Number(payment.amount || 0);
      if (payment.status === "RELEASED") summary.released += amount;
      if (payment.status === "FUNDS_HELD") summary.held += amount;
      if (payment.status === "DISPUTED") summary.disputed += amount;
      if (["REFUNDED", "PARTIALLY_REFUNDED"].includes(payment.status)) {
        summary.refunded += amount;
      }
    });

    return summary;
  }, [filteredPayments]);

  const lastReleased = useMemo(() => {
    const released = payments
      .filter((payment) => payment.status === "RELEASED")
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return released[0] || null;
  }, [payments]);

  return (
    <ProviderLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Earnings</h1>
            <p className="text-gray-600 mt-1">
              Track your income, escrow, and payouts in real time.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Filter</span>
            <select
              value={range}
              onChange={(event) => setRange(event.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              {rangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="mb-4 text-red-600">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="h-10 w-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white border rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <HiCurrencyDollar className="text-2xl text-emerald-600" />
                  <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    Available
                  </span>
                </div>
                <p className="text-sm text-gray-500">Available balance</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  NPR {Number(wallet.availableBalance || 0).toLocaleString()}
                </p>
              </div>

              <div className="bg-white border rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <HiClock className="text-2xl text-yellow-500" />
                  <span className="text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full">
                    Escrow
                  </span>
                </div>
                <p className="text-sm text-gray-500">Pending in escrow</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  NPR {Number(wallet.pendingBalance || 0).toLocaleString()}
                </p>
              </div>

              <div className="bg-white border rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <HiCheckCircle className="text-2xl text-green-600" />
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    Lifetime
                  </span>
                </div>
                <p className="text-sm text-gray-500">Total earned</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  NPR {Number(wallet.totalEarned || 0).toLocaleString()}
                </p>
              </div>

              <div className="bg-white border rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <HiArrowTrendingUp className="text-2xl text-blue-600" />
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    Withdrawn
                  </span>
                </div>
                <p className="text-sm text-gray-500">Total withdrawn</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  NPR {Number(wallet.totalWithdrawn || 0).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white border rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Earnings summary</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Based on {rangeOptions.find((o) => o.value === range)?.label}
                </p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Released earnings</span>
                    <span className="font-semibold text-gray-900">
                      NPR {metrics.released.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Held in escrow</span>
                    <span className="font-semibold text-gray-900">
                      NPR {metrics.held.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Disputed amounts</span>
                    <span className="font-semibold text-gray-900">
                      NPR {metrics.disputed.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Refunded amounts</span>
                    <span className="font-semibold text-gray-900">
                      NPR {metrics.refunded.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white border rounded-2xl p-6 shadow-sm lg:col-span-2">
                <h2 className="text-lg font-semibold text-gray-900">Latest payout</h2>
                <div className="mt-4 flex items-center justify-between border rounded-xl p-4 bg-emerald-50">
                  <div>
                    <p className="text-sm text-emerald-700">Most recent released payment</p>
                    <p className="text-2xl font-bold text-emerald-900 mt-1">
                      NPR {Number(lastReleased?.amount || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-emerald-700 mt-2">
                      {lastReleased?.createdAt
                        ? new Date(lastReleased.createdAt).toLocaleString()
                        : "No released payments yet"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-emerald-700">Bookings</p>
                    <p className="text-3xl font-bold text-emerald-900">
                      {metrics.totalCount}
                    </p>
                    <p className="text-xs text-emerald-700">in selected range</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-2xl p-6 shadow-sm mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Earnings history</h2>
                <span className="text-xs text-gray-500">Updated every 30s</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3">Date</th>
                      <th className="text-left p-3">Booking</th>
                      <th className="text-left p-3">Client</th>
                      <th className="text-left p-3">Amount</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td className="p-4 text-gray-500" colSpan={6}>
                          No transactions for the selected range.
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((payment) => {
                        const bookingId = payment.bookingId?._id || payment.bookingId;
                        const bookingRef = bookingId ? String(bookingId).slice(-6) : "----";
                        const clientName = payment.clientId?.profile?.name || "Client";
                        return (
                          <tr key={payment._id} className="border-b hover:bg-gray-50">
                            <td className="p-3 text-gray-600">
                              {payment.createdAt
                                ? new Date(payment.createdAt).toLocaleDateString()
                                : "-"}
                            </td>
                            <td className="p-3 font-mono text-blue-600">BK-{bookingRef}</td>
                            <td className="p-3 text-gray-800">{clientName}</td>
                            <td className="p-3 font-semibold">
                              NPR {Number(payment.amount || 0).toLocaleString()}
                            </td>
                            <td className="p-3">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles(payment.status)}`}>
                                {STATUS_LABELS[payment.status] || payment.status || "Unknown"}
                              </span>
                            </td>
                            <td className="p-3 text-gray-600 capitalize">
                              {payment.purpose ? payment.purpose.replace("_", " ") : "-"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <HiExclamationTriangle className="text-orange-500" />
                <h2 className="text-lg font-semibold text-gray-900">Wallet activity</h2>
              </div>
              {wallet.transactions?.length ? (
                <div className="space-y-3">
                  {wallet.transactions.map((entry) => (
                    <div key={entry._id} className="flex items-center justify-between border rounded-lg p-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{entry.type}</p>
                        <p className="text-xs text-gray-500">{entry.description || "Wallet update"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          NPR {Number(entry.amount || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "-"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No wallet activity yet.</p>
              )}
            </div>
          </>
        )}
      </div>
    </ProviderLayout>
  );
 }
