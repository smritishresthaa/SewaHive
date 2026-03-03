import { useEffect, useMemo, useState } from "react";
import api from "../utils/axios";
import goldMedal from "../assets/gold.png";
import silverMedal from "../assets/silver.png";
import bronzeMedal from "../assets/bronze.png";

const medalImages = [goldMedal, silverMedal, bronzeMedal];
const medalNames = ["Gold", "Silver", "Bronze"];

const MedalBadge = ({ medalSrc, medalName }) => (
  <div className="relative flex items-center justify-center h-12 w-12">
    <img src={medalSrc} alt={`${medalName} Medal`} className="h-full w-full object-contain" />
  </div>
);

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("overall");

  useEffect(() => {
    let isMounted = true;

    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const res = await api.get("/leaderboard/current?range=30d");
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

    fetchLeaderboard();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredLeaderboard = useMemo(() => {
    if (viewMode === "qualified") {
      return leaderboard.filter((entry) => entry.qualifiesForLeaderboard);
    }
    if (viewMode === "rising") {
      return leaderboard.filter((entry) => entry.isRisingProvider);
    }
    return leaderboard;
  }, [leaderboard, viewMode]);

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
    Math.round(entry.scores?.totalScore ?? entry.points ?? 0);

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Leaderboard</h1>
              <p className="text-[11px] text-gray-500 mt-0.5">Top performing providers</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-lg font-semibold">
              LB
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-500">Showing :</span>
            <select
              value={viewMode}
              onChange={(event) => setViewMode(event.target.value)}
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm"
            >
              <option value="overall">Overall</option>
              <option value="qualified">Qualified</option>
              <option value="rising">Rising</option>
            </select>
          </div>

          {loading ? (
            <div className="mt-10 text-center text-gray-500">Loading leaderboard...</div>
          ) : topThree.length === 0 ? (
            <div className="mt-10 text-center text-gray-500">No leaderboard data yet.</div>
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
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {entry ? getProviderUsername(entry) : "---"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {entry ? getProviderName(entry) : "No data yet"}
                        </p>
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
                      <span className="text-gray-900">{getProviderUsername(entry)}</span>
                      <span className="text-center text-gray-700">{rank}</span>
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
    </div>
  );
}
