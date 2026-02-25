import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ProviderLayout from "../../layouts/ProviderLayout";
import { HiPencil, HiCamera } from "react-icons/hi2";
import api from "../../utils/axios";
import toast from "react-hot-toast";

export default function ProviderProfile() {
  const { user, updateUser } = useAuth();

  const [preview, setPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // edit toggles
  const [editPersonal, setEditPersonal] = useState(false);
  const [editAddress, setEditAddress] = useState(false);

  // personal
  const [personal, setPersonal] = useState({
    name: user?.profile?.name || "",
    phone: user?.phone || "",
    email: user?.email || "",
  });

  // address
  const [address, setAddress] = useState({
    country: user?.profile?.address?.country || "",
    city: user?.profile?.address?.city || "",
    postalCode: user?.profile?.address?.postalCode || "",
    area: user?.profile?.address?.area || "",
  });

  /* -----------------------------------
     AVATAR UPLOAD (IMMEDIATE)
  ----------------------------------- */
  async function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview immediately
    const url = URL.createObjectURL(file);
    setPreview(url);
    setAvatarFile(file);

    // Upload immediately
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      console.log('Uploading avatar to /auth/profile...', file.name, file.size);
      const res = await api.put("/auth/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log('Avatar upload successful:', res.data);
      updateUser(res.data.user);
      toast.success("Profile picture updated successfully! 📸");
      setPreview(null); // Clear preview since we now have the real URL
    } catch (err) {
      console.error('Avatar upload failed:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        message: err.response?.data?.message || err.message,
        error: err.response?.data?.error,
      });
      toast.error(`Failed to upload profile picture: ${err.response?.data?.message || err.message}`);
      setPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  }

  /* -----------------------------------
     SAVE PERSONAL INFO
  ----------------------------------- */
  async function savePersonal() {
    try {
      const formData = new FormData();
      formData.append("name", personal.name.trim());
      formData.append("phone", personal.phone.trim());

      const res = await api.put("/auth/profile", formData);
      updateUser(res.data.user);

      toast.success("Personal information updated successfully ✅");
      setEditPersonal(false);
    } catch (err) {
      toast.error("Failed to update personal information ❌");
    }
  }

  /* -----------------------------------
     SAVE ADDRESS INFO
  ----------------------------------- */
  async function saveAddress() {
    try {
      const formData = new FormData();
      formData.append("country", address.country.trim());
      formData.append("city", address.city.trim());
      formData.append("postalCode", address.postalCode.trim());
      formData.append("area", address.area.trim());

      const res = await api.put("/auth/profile", formData);
      updateUser(res.data.user);

      toast.success("Address updated successfully 📍");
      setEditAddress(false);
    } catch (err) {
      toast.error("Failed to update address ❌");
    }
  }

  // skill credibility
  const [editSkills, setEditSkills] = useState(false);
  const [skills, setSkills] = useState({
    experienceYears: user?.providerDetails?.experienceYears || 0,
    experienceDescription: user?.providerDetails?.experienceDescription || "",
    tools: user?.providerDetails?.tools?.join(", ") || "",
  });

  /* -----------------------------------
     SAVE SKILLS INFO
  ----------------------------------- */
  async function saveSkills() {
    try {
      const payload = {
        experienceYears: Number(skills.experienceYears),
        experienceDescription: skills.experienceDescription.trim(),
        tools: skills.tools.split(",").map(t => t.trim()).filter(t => t),
      };

      const res = await api.put("/providers/profile/skills", payload);
      updateUser(res.data.user);

      toast.success("Skill credibility updated successfully 🛠️");
      setEditSkills(false);
    } catch (err) {
      toast.error("Failed to update skill credibility ❌");
    }
  }

  return (
    <ProviderLayout>
      <div className="max-w-5xl mx-auto mt-6">

        {/* ================= HEADER CARD ================= */}
        <div className="bg-brand-700 text-white p-8 rounded-3xl shadow flex items-center gap-6 mb-8">
          <div className="relative">
            {preview || user?.profile?.avatarUrl ? (
              <img
                src={preview || user?.profile?.avatarUrl}
                className="w-24 h-24 rounded-full object-cover border-4 border-white/30"
                alt="profile"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-emerald-500 border-4 border-white/30 flex items-center justify-center text-3xl font-bold">
                {user?.profile?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
            <label className="absolute bottom-0 right-0 bg-white p-2 rounded-full cursor-pointer hover:bg-gray-100 transition">
              {uploadingAvatar ? (
                <div className="h-5 w-5 rounded-full border-2 border-brand-700 border-t-transparent animate-spin" />
              ) : (
                <HiCamera className="text-brand-700" />
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} disabled={uploadingAvatar} />
            </label>
          </div>

          <div>
            <h1 className="text-3xl font-bold">
              Hello, {user?.profile?.name} 👋
            </h1>
            <p className="text-white/80">{user?.email}</p>
          </div>
        </div>

        {/* ================= PERSONAL INFO ================= */}
        <div className="bg-white p-6 rounded-2xl shadow mb-6">
          <div className="flex justify-between mb-4">
            <h2 className="font-semibold">Personal Information</h2>
            {!editPersonal && (
              <button
                type="button"
                onClick={() => setEditPersonal(true)}
                className="text-brand-700 flex gap-1 cursor-pointer"
              >
                <HiPencil /> Edit
              </button>
            )}
          </div>

          {!editPersonal ? (
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div><p className="text-gray-400">Name</p>{user?.profile?.name}</div>
              <div><p className="text-gray-400">Email</p>{user?.email}</div>
              <div><p className="text-gray-400">Phone</p>{user?.phone || "—"}</div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <input
                className="input"
                value={personal.name}
                onChange={e => setPersonal({ ...personal, name: e.target.value })}
              />
              <input
                disabled
                className="input bg-gray-100"
                value={personal.email}
              />
              <input
                className="input"
                value={personal.phone}
                onChange={e => setPersonal({ ...personal, phone: e.target.value })}
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={savePersonal}
                  className="bg-brand-700 text-white px-4 py-2 rounded cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditPersonal(false)}
                  className="bg-gray-200 px-4 py-2 rounded cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================= ADDRESS INFO ================= */}
        <div className="bg-white p-6 rounded-2xl shadow mb-6">
          <div className="flex justify-between mb-4">
            <h2 className="font-semibold">Address Information</h2>
            {!editAddress && (
              <button
                type="button"
                onClick={() => setEditAddress(true)}
                className="text-brand-700 flex gap-1 cursor-pointer"
              >
                <HiPencil /> Edit
              </button>
            )}
          </div>

          {!editAddress ? (
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div><p className="text-gray-400">Country</p>{address.country || "—"}</div>
              <div><p className="text-gray-400">City</p>{address.city || "—"}</div>
              <div><p className="text-gray-400">Postal Code</p>{address.postalCode || "—"}</div>
              <div><p className="text-gray-400">Area</p>{address.area || "—"}</div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <input
                className="input"
                value={address.country}
                onChange={e => setAddress({ ...address, country: e.target.value })}
              />
              <input
                className="input"
                value={address.city}
                onChange={e => setAddress({ ...address, city: e.target.value })}
              />
              <input
                className="input"
                value={address.postalCode}
                onChange={e => setAddress({ ...address, postalCode: e.target.value })}
              />
              <input
                className="input"
                value={address.area}
                onChange={e => setAddress({ ...address, area: e.target.value })}
                placeholder="Local area (e.g. Lubhu)"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={saveAddress}
                  className="bg-brand-700 text-white px-4 py-2 rounded cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditAddress(false)}
                  className="bg-gray-200 px-4 py-2 rounded cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProviderLayout>
  );
}
