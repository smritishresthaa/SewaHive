// src/components/Dashboard/ClientStats.jsx
import { useEffect, useState } from "react";
import api from "../../utils/axios";   // ✔ FIXED (must be api)

export default function ClientStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        // ✔ Use api.get (correct baseURL)
        const pastRes = await api.get("/bookings/past");
        const past = pastRes.data.bookings || [];

        const upcomingRes = await api.get("/bookings/upcoming");
        const upcoming = upcomingRes.data.bookings || [];

        setStats({
          total: past.length + upcoming.length,
          completed: past.filter((b) => b.status === "completed").length,
          active: upcoming.length,
        });
      } catch (err) {
        console.error("Stats load failed:", err);
      }
    }

    load();
  }, []);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
      <div className="bg-white p-6 rounded-xl shadow">
        <p className="text-gray-500 text-sm">Total Bookings</p>
        <p className="text-2xl font-bold mt-1">{stats.total}</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow">
        <p className="text-gray-500 text-sm">Completed</p>
        <p className="text-2xl font-bold mt-1 text-emerald-600">
          {stats.completed}
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow">
        <p className="text-gray-500 text-sm">Active</p>
        <p className="text-2xl font-bold mt-1 text-brand-700">
          {stats.active}
        </p>
      </div>
    </div>
  );
}
