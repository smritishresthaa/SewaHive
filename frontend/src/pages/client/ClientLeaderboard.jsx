import { useEffect, useMemo, useState } from "react";
import ClientLayout from "../../layouts/ClientLayout";
import api from "../../utils/axios";
import goldMedal from "../../assets/gold.png";
import silverMedal from "../../assets/silver.png";
import bronzeMedal from "../../assets/bronze.png";

const medalImages = [goldMedal, silverMedal, bronzeMedal];
const medalNames = ["Gold", "Silver", "Bronze"];

const rangeOptions = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "This Year", value: "year" },
  { label: "Custom Range", value: "custom" },
];

const MedalBadge = ({ medalSrc, medalName }) => (
  <div className="relative flex items-center justify-center h-12 w-12">
    <img
      src={medalSrc}
      alt={`${medalName} Medal`}
      className="h-full w-full object-contain"
    />
  </div>
);

export default function ClientLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  const [range, setRange] = useState("month");
  const [category, setCategory] = useState("all");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchLeaderboard = async () => {
      try {
        setLoading(true);

        const params = new URLSearchParams();
        params.set("range", range);

        if (range === "custom" && fromDate && toDate) {
          params.set("from", fromDate);
          params.set("to", toDate);
        }

        const res = await api.get(`/leaderboard/current?${params.toString()}`);
        const data = res.data?.data || [];

        if (isMounted) {
          setLeaderboard(data);
        }
      } catch (err) {
        console.error("Failed to load leaderboard:", err);
        if (isMounted) {
          setLeaderboard([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (range !== "custom" || (fromDate && toDate)) {
      fetchLeaderboard();
    }

    return () => {
      isMounted = false;
    };
  }, [range, fromDate, toDate]);

  const categories = useMemo(() => {
    const unique = new Set();

    leaderboard.forEach((entry) => {
      if (entry.categoryName) {
        unique.add(entry.categoryName);
      }
    });

    return Array.from(unique);
  }, [leaderboard]);

  const filteredLeaderboard = useMemo(() => {
    return leaderboard.filter((entry) => {
      if (category !== "all" && entry.categoryName !== category) {
        return false;
      }

      return true;
    });
  }, [leaderboard, category]);

  const topThree = filteredLeaderboard.slice(0, 3);
  const remaining = filteredLeaderboard.slice(3);
  const podiumSlots = [0, 1, 2];

  const getProviderName = (entry) =>
    entry.providerId?.profile?.name ||
    entry.providerId?.name ||
    entry.providerId?.email?.split("@")[0] ||
    "Provider";

  const getProviderUsername = (entry) => {
    const raw =
      entry.providerId?.profile?.username ||
      entry.providerId?.username ||
      entry.providerId?.email?.split("@")[0] ||
      "provider";

    return `@${raw.replace(/^@/, "")}`;
  };

  const formatScore = (entry) =>
    Math.round(entry.points ?? entry.scores?.totalScore ?? 0);

  const activeRangeLabel =
    rangeOptions.find((item) => item.value === range)?.label || "This Month";

  return (
    <ClientLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div
              style={{
                fontFamily: "Satoshi, 'Space Grotesk', 'Segoe UI', sans-serif",
              }}
            >
              <h1 className="text-3xl font-semibold text-gray-900">
                Top Service Providers
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Discover the highest-rated professionals on SewaHive
              </p>
            </div>

            <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-lg font-semibold">
              LB
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {rangeOptions.map((item) => (
              <button
                key={item.value}
                onClick={() => setRange(item.value)}
                className={`rounded-full border px-5 py-2 text-sm font-medium transition ${
                  range === item.value
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {range === "custom" && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-gray-500">
                  From
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">
                  To
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
                />
              </div>
            </div>
          )}

          <div className="mt-5">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full md:w-80 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Showing leaderboard for{" "}
            <span className="font-semibold text-gray-700">
              {activeRangeLabel}
            </span>
          </p>

          {loading ? (
            <div className="mt-10 text-center text-gray-500">
              Loading leaderboard...
            </div>
          ) : topThree.length === 0 ? (
            <div className="mt-10 text-center text-gray-500">
              No leaderboard data for this filter.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {podiumSlots.map((slot) => {
                const entry = topThree[slot];

                return (
                  <div
                    key={entry?._id || `podium-${slot}`}
                    className="rounded-2xl border bg-white p-4 shadow-sm ring-1 ring-amber-200"
                  >
                    <div className="flex items-center gap-4">
                      <MedalBadge
                        medalSrc={medalImages[slot]}
                        medalName={medalNames[slot]}
                      />

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate flex items-center gap-1">
                          {entry ? getProviderUsername(entry) : "---"}
                          {entry?.badges?.includes("Verified Provider") && (
                            <span
                              className="text-emerald-500 text-xs"
                              title="Verified Provider"
                            >
                              ✓
                            </span>
                          )}
                        </p>

                        <p className="text-xs text-gray-500 truncate">
                          {entry ? getProviderName(entry) : "No data yet"}
                        </p>

                        {entry?.categoryName && (
                          <p className="text-[11px] text-emerald-600 mt-1">
                            {entry.categoryName}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-8">
            <div className="grid grid-cols-3 text-xs font-semibold text-gray-500 uppercase tracking-[0.15em] px-4">
              <span>Username</span>
              <span className="text-center">Rank</span>
              <span className="text-right">Score</span>
            </div>

            <div className="mt-3 space-y-3">
              {remaining.length === 0 && !loading ? (
                <div className="rounded-full bg-slate-100 px-4 py-3 text-sm text-gray-500 text-center">
                  No more ranked providers yet.
                </div>
              ) : (
                remaining.map((entry, index) => {
                  const rank = entry.rank || index + topThree.length + 1;

                  return (
                    <div
                      key={entry._id}
                      className="grid grid-cols-3 items-center rounded-full bg-slate-100 px-4 py-3 text-sm"
                    >
                      <span className="text-gray-900 truncate flex items-center gap-1">
                        {getProviderUsername(entry)}
                        {entry?.badges?.includes("Verified Provider") && (
                          <span
                            className="text-emerald-500 text-xs"
                            title="Verified Provider"
                          >
                            ✓
                          </span>
                        )}
                      </span>

                      <span className="text-center text-gray-700">
                        {rank}
                      </span>

                      <span className="text-right text-gray-900 font-semibold">
                        {formatScore(entry)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}