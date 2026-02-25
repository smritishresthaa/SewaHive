// src/components/Dashboard/ClientSuggestedServices.jsx
import { useEffect, useState } from "react";
import api from "../../utils/axios";   // ✔ FIXED (must use api)

export default function ClientSuggestedServices() {
  const [services, setServices] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        // ✔ FIXED (use api.get)
        const res = await api.get("/services/list?limit=6");
        setServices(res.data.services || []);
      } catch (err) {
        console.error("Suggested services load failed:", err);
      }
    }
    load();
  }, []);

  return (
    <section className="mt-10">
      <h3 className="text-xl font-semibold mb-4">Suggested Services</h3>

      {services.length === 0 ? (
        <p className="text-gray-500">No services found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {services.map((s) => (
            <div
              key={s._id}
              className="bg-white p-5 rounded-xl shadow hover:shadow-md transition"
            >
              <p className="font-semibold text-lg">{s.title}</p>
              <p className="text-gray-600 text-sm mt-1">{s.category}</p>
              <p className="text-brand-700 font-semibold mt-2">
                Rs. {s.basePrice}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
