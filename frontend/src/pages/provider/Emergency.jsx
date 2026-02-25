import React, { useState } from "react";
import api from "../../utils/axios";

export default function ProviderEmergency() {
  const [value, setValue] = useState(false);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    try {
      setSaving(true);
      const newValue = !value;
      await api.post("/providers/toggle-emergency", { value: newValue });
      setValue(newValue);
    } catch (err) {
      console.error("Failed to toggle emergency", err);
      alert("Failed to update emergency availability.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">
        Emergency Availability
      </h2>
      <p className="text-sm text-gray-600 mb-4 max-w-md">
        Turn this on when you’re available for urgent, last-minute jobs.
      </p>
      <button
        onClick={toggle}
        disabled={saving}
        className={`px-4 py-2 rounded text-white ${
          value ? "bg-red-600" : "bg-gray-700"
        }`}
      >
        {saving
          ? "Saving..."
          : value
          ? "Turn off emergency"
          : "Turn on emergency"}
      </button>
    </div>
  );
}
