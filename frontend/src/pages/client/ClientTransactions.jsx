import { useEffect, useMemo, useState } from "react";
import ClientLayout from "../../layouts/ClientLayout";
import api from "../../utils/axios";

const formatStatus = (status) => {
  const mapping = {
    RELEASED: "Released",
    FUNDS_HELD: "Funds Held",
    INITIATED: "Initiated",
    FAILED: "Failed",
    DISPUTED: "Disputed",
    REFUNDED: "Refunded",
    PARTIALLY_REFUNDED: "Partially Refunded",
  };
  return mapping[status] || status || "Unknown";
};

const statusStyles = (status) => {
  if (status === "RELEASED") return "bg-green-100 text-green-700";
  if (status === "FUNDS_HELD") return "bg-yellow-100 text-yellow-700";
  if (status === "INITIATED") return "bg-blue-100 text-blue-700";
  if (status === "FAILED") return "bg-red-100 text-red-700";
  if (status === "DISPUTED") return "bg-orange-100 text-orange-700";
  return "bg-gray-100 text-gray-700";
};

export default function ClientTransactions() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("30d");
  const [sortOrder, setSortOrder] = useState("newest");

  useEffect(() => {
    let isMounted = true;

    const fetchTransactions = async () => {
      if (document.hidden) return;
      try {
        setLoading(true);
        const res = await api.get("/payment/transactions/client?limit=50");
        if (isMounted) {
          setPayments(res.data?.payments || []);
          setError("");
        }
      } catch (err) {
        console.error("Failed to load transactions", err);
        if (isMounted) {
          setError("Failed to load transactions");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTransactions();
    const interval = setInterval(fetchTransactions, 30000);
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchTransactions();
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
    const now = new Date();
    const rangeStart = (() => {
      if (range === "all") return null;
      const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
      return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    })();

    const normalizedSearch = search.trim().toLowerCase();

    const base = payments.filter((payment) => {
      if (statusFilter !== "all" && payment.status !== statusFilter) {
        return false;
      }

      if (rangeStart) {
        const createdAt = new Date(payment.createdAt || 0);
        if (createdAt < rangeStart) return false;
      }

      if (!normalizedSearch) return true;

      const providerName = payment.providerId?.profile?.name || "";
      const bookingId = payment.bookingId?._id || payment.bookingId || "";
      const transactionId = payment._id || "";
      const amount = String(payment.amount || "");

      return [providerName, bookingId, transactionId, amount]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });

    return base.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return sortOrder === "oldest" ? timeA - timeB : timeB - timeA;
    });
  }, [payments, range, search, sortOrder, statusFilter]);

  const metrics = useMemo(() => {
    const summary = {
      released: 0,
      held: 0,
      disputed: 0,
      failed: 0,
    };

    payments.forEach((payment) => {
      const amount = Number(payment.amount || 0);
      if (payment.status === "RELEASED") summary.released += amount;
      if (payment.status === "FUNDS_HELD") summary.held += amount;
      if (payment.status === "DISPUTED") summary.disputed += amount;
      if (payment.status === "FAILED") summary.failed += amount;
    });

    return summary;
  }, [payments]);

  return (
    <ClientLayout>
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-6">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(16,185,129,0.15), transparent 45%), radial-gradient(circle at 80% 10%, rgba(56,189,248,0.15), transparent 40%)",
          }}
        />
        <div className="relative">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div style={{ fontFamily: "Satoshi, 'Space Grotesk', 'Segoe UI', sans-serif" }}>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Statement</p>
              <h1 className="text-3xl font-semibold text-gray-900">Your Transactions</h1>
              <p className="text-sm text-gray-600 mt-1">
                A clear view of payments, escrow, and releases.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-emerald-700">
                Updated every 30s
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
                Gateway: eSewa
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-gray-500">Released</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            NPR {metrics.released.toLocaleString()}
          </p>
          <p className="text-xs text-emerald-700 mt-2">Settled to providers</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-gray-500">In Escrow</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            NPR {metrics.held.toLocaleString()}
          </p>
          <p className="text-xs text-yellow-700 mt-2">Awaiting confirmation</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-gray-500">Disputed</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            NPR {metrics.disputed.toLocaleString()}
          </p>
          <p className="text-xs text-orange-700 mt-2">Under review</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-gray-500">Failed</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            NPR {metrics.failed.toLocaleString()}
          </p>
          <p className="text-xs text-red-700 mt-2">Payment issues</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              { value: "7d", label: "7 days" },
              { value: "30d", label: "30 days" },
              { value: "90d", label: "90 days" },
              { value: "all", label: "All time" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRange(option.value)}
                className={`rounded-full px-3 py-1 border ${
                  range === option.value
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="RELEASED">Released</option>
              <option value="FUNDS_HELD">Funds Held</option>
              <option value="INITIATED">Initiated</option>
              <option value="DISPUTED">Disputed</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
              <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
            </select>
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search provider, booking, amount..."
              className="rounded-lg border px-3 py-2 text-sm w-full md:w-64"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 text-gray-600">Loading transactions...</div>
      ) : error ? (
        <div className="mt-6 text-red-600">{error}</div>
      ) : filteredPayments.length === 0 ? (
        <p className="mt-6 text-gray-600">No transactions found for this view.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Reference</th>
                  <th className="text-left p-3">Provider</th>
                  <th className="text-left p-3">Amount</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => {
                  const bookingId = payment.bookingId?._id || payment.bookingId;
                  const providerName = payment.providerId?.profile?.name || "Provider";
                  const labelId = bookingId ? String(bookingId).slice(-6) : String(payment._id).slice(-6);
                  return (
                    <tr key={payment._id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-gray-600">
                        {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : "-"}
                      </td>
                      <td className="p-3 font-mono text-blue-600">TXN-{labelId}</td>
                      <td className="p-3 text-gray-800">{providerName}</td>
                      <td className="p-3 font-semibold">NPR {Number(payment.amount || 0).toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles(payment.status)}`}>
                          {formatStatus(payment.status)}
                        </span>
                      </td>
                      <td className="p-3 text-gray-600 capitalize">
                        {payment.purpose ? payment.purpose.replace("_", " ") : "payment"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ClientLayout>
  );
}
