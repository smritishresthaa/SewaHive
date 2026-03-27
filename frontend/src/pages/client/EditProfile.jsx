import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/axios";
import ClientLayout from "../../layouts/ClientLayout";

export default function EditProfile() {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [area, setArea] = useState("");
  const [avatar, setAvatar] = useState(null);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    setName(user.profile?.name || "");
    setPhone(user.phone || "");
    setCountry(user.profile?.address?.country || "");
    setCity(user.profile?.address?.city || "");
    setPostalCode(user.profile?.address?.postalCode || "");
    setArea(user.profile?.address?.area || "");
  }, [user]);

  function validate() {
    if (!name.trim()) {
      setError("Name is required.");
      return false;
    }

    if (/^\d+$/.test(name.trim())) {
      setError("Name cannot be only numbers.");
      return false;
    }

    if (phone && !/^[0-9]{7,15}$/.test(phone)) {
      setError("Invalid phone number.");
      return false;
    }

    return true;
  }

  async function handleSave() {
    if (!validate()) return;

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("phone", phone.trim());
      formData.append("country", country.trim());
      formData.append("city", city.trim());
      formData.append("postalCode", postalCode.trim());
      formData.append("area", area.trim());

      if (avatar) {
        formData.append("avatar", avatar);
      }

      const res = await api.put("/auth/profile", formData);
      updateUser(res.data.user);

      setSuccess("Profile updated successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || "Update failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ClientLayout>
      <div className="w-full max-w-2xl mx-auto mt-6 sm:mt-8 rounded-2xl bg-white p-4 shadow sm:p-6">
        <h2 className="mb-6 text-xl font-bold text-gray-900 sm:text-2xl">
          Edit Profile
        </h2>

        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-emerald-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              type="tel"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-emerald-500"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Country
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-emerald-500"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Country"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              City
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-emerald-500"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Area / Street
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-emerald-500"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g. Lubhu, Baneshwor"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Postal Code
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-emerald-500"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="Postal Code"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Profile Picture
            </label>
            <input
              type="file"
              accept="image/*"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-emerald-500"
              onChange={(e) => setAvatar(e.target.files?.[0] || null)}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-emerald-600 py-2 font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </ClientLayout>
  );
}