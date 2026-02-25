// src/components/Dashboard/ClientRecentBookings.jsx
import { useEffect, useState } from "react";
import api from "../../utils/axios";   // ✔ FIXED

export default function ClientRecentBookings() {
  const [list, setList] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        // ✔ FIXED — use api.get
        const res = await api.get("/bookings/upcoming");
        setList(res.data.bookings || []);
      } catch (err) {
        console.error("Recent bookings load failed:", err);
      }
    }
    load();
  }, []);

  return (
    <section className="mt-8">
      <h3 className="text-xl font-semibold mb-4">Upcoming Bookings</h3>

      {list.length === 0 ? (
        <p className="text-gray-500">No upcoming bookings.</p>
      ) : (
        <div className="space-y-4">
          {list.map((b) => (
            <div
              key={b._id}
              className="bg-white p-5 rounded-xl shadow flex justify-between"
            >
              <div>
                <p className="font-semibold">Booking ID: {b._id}</p>
                <p className="text-gray-600">
                  {b.schedule?.date?.slice(0, 10)} – {b.schedule?.slot}
                </p>
              </div>

              <span className="text-brand-700 font-medium capitalize">
                {b.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
