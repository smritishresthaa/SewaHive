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

  const [editPersonal, setEditPersonal] = useState(false);
  const [editAddress, setEditAddress] = useState(false);

  const [personal, setPersonal] = useState({
    name: user?.profile?.name || "",
    phone: user?.phone || "",
    email: user?.email || "",
  });

  const [address, setAddress] = useState({
    country: user?.profile?.address?.country || "",
    city: user?.profile?.address?.city || "",
    postalCode: user?.profile?.address?.postalCode || "",
    area: user?.profile?.address?.area || "",
  });

  const [editSkills, setEditSkills] = useState(false);
  const [skills, setSkills] = useState({
    experienceYears: user?.providerDetails?.experienceYears || 0,
    experienceDescription: user?.providerDetails?.experienceDescription || "",
    tools: user?.providerDetails?.tools?.join(", ") || "",
  });

  async function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreview(url);
    setAvatarFile(file);

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      console.log("Uploading avatar to /auth/profile...", file.name, file.size);
      const res = await api.put("/auth/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("Avatar upload successful:", res.data);
      updateUser(res.data.user);
      toast.success("Profile picture updated successfully! 📸");
      setPreview(null);
    } catch (err) {
      console.error("Avatar upload failed:", {
        status: err.response?.status,
        statusText: err.response?.statusText,
        message: err.response?.data?.message || err.message,
        error: err.response?.data?.error,
      });
      toast.error(
        `Failed to upload profile picture: ${
          err.response?.data?.message || err.message
        }`
      );
      setPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  }

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

  async function saveSkills() {
    try {
      const payload = {
        experienceYears: Number(skills.experienceYears),
        experienceDescription: skills.experienceDescription.trim(),
        tools: skills.tools
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t),
      };

      const res = await api.put("/providers/profile/skills", payload);
      updateUser(res.data.user);

      toast.success("Skill credibility updated successfully 🛠️");
      setEditSkills(false);
    } catch (err) {
      toast.error("Failed to update skill credibility ❌");
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";
  const readCardClass = "rounded-2xl bg-white p-4 shadow sm:p-6";
  const sectionHeaderClass =
    "mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between";

  return (
    <ProviderLayout>
      <div className="mx-auto mt-4 w-full max-w-5xl px-4 pb-6 sm:mt-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-5 rounded-3xl bg-brand-700 p-5 text-white shadow sm:mb-8 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
          <div className="relative mx-auto sm:mx-0">
            {preview || user?.profile?.avatarUrl ? (
              <img
                src={preview || user?.profile?.avatarUrl}
                className="h-24 w-24 rounded-full border-4 border-white/30 object-cover"
                alt="profile"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/30 bg-emerald-500 text-3xl font-bold">
                {user?.profile?.name?.charAt(0)?.toUpperCase() ||
                  user?.email?.charAt(0)?.toUpperCase() ||
                  "U"}
              </div>
            )}

            <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-white p-2 transition hover:bg-gray-100">
              {uploadingAvatar ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-700 border-t-transparent" />
              ) : (
                <HiCamera className="text-brand-700" />
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
                disabled={uploadingAvatar}
              />
            </label>
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="break-words text-2xl font-bold sm:text-3xl">
              Hello, {user?.profile?.name} 👋
            </h1>
            <p className="mt-1 break-all text-sm text-white/80 sm:text-base">
              {user?.email}
            </p>
          </div>
        </div>

        <div className={`${readCardClass} mb-6`}>
          <div className={sectionHeaderClass}>
            <h2 className="font-semibold text-gray-900">Personal Information</h2>
            {!editPersonal && (
              <button
                type="button"
                onClick={() => setEditPersonal(true)}
                className="inline-flex items-center gap-1 self-start text-brand-700"
              >
                <HiPencil /> Edit
              </button>
            )}
          </div>

          {!editPersonal ? (
            <div className="grid gap-5 text-sm sm:grid-cols-2 sm:gap-6">
              <div>
                <p className="text-gray-400">Name</p>
                <div className="break-words">{user?.profile?.name}</div>
              </div>
              <div>
                <p className="text-gray-400">Email</p>
                <div className="break-all">{user?.email}</div>
              </div>
              <div>
                <p className="text-gray-400">Phone</p>
                <div>{user?.phone || "—"}</div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <input
                className={inputClass}
                value={personal.name}
                onChange={(e) => setPersonal({ ...personal, name: e.target.value })}
              />
              <input disabled className={`${inputClass} bg-gray-100`} value={personal.email} />
              <input
                className={inputClass}
                value={personal.phone}
                onChange={(e) => setPersonal({ ...personal, phone: e.target.value })}
              />

              <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row">
                <button
                  type="button"
                  onClick={savePersonal}
                  className="rounded bg-brand-700 px-4 py-2 text-white"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditPersonal(false)}
                  className="rounded bg-gray-200 px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={`${readCardClass} mb-6`}>
          <div className={sectionHeaderClass}>
            <h2 className="font-semibold text-gray-900">Address Information</h2>
            {!editAddress && (
              <button
                type="button"
                onClick={() => setEditAddress(true)}
                className="inline-flex items-center gap-1 self-start text-brand-700"
              >
                <HiPencil /> Edit
              </button>
            )}
          </div>

          {!editAddress ? (
            <div className="grid gap-5 text-sm sm:grid-cols-2 sm:gap-6">
              <div>
                <p className="text-gray-400">Country</p>
                <div>{address.country || "—"}</div>
              </div>
              <div>
                <p className="text-gray-400">City</p>
                <div>{address.city || "—"}</div>
              </div>
              <div>
                <p className="text-gray-400">Postal Code</p>
                <div>{address.postalCode || "—"}</div>
              </div>
              <div>
                <p className="text-gray-400">Area</p>
                <div className="break-words">{address.area || "—"}</div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <input
                className={inputClass}
                value={address.country}
                onChange={(e) => setAddress({ ...address, country: e.target.value })}
              />
              <input
                className={inputClass}
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
              />
              <input
                className={inputClass}
                value={address.postalCode}
                onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
              />
              <input
                className={inputClass}
                value={address.area}
                onChange={(e) => setAddress({ ...address, area: e.target.value })}
                placeholder="Local area (e.g. Lubhu)"
              />

              <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row">
                <button
                  type="button"
                  onClick={saveAddress}
                  className="rounded bg-brand-700 px-4 py-2 text-white"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditAddress(false)}
                  className="rounded bg-gray-200 px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={readCardClass}>
          <div className={sectionHeaderClass}>
            <h2 className="font-semibold text-gray-900">Skill Credibility</h2>
            {!editSkills && (
              <button
                type="button"
                onClick={() => setEditSkills(true)}
                className="inline-flex items-center gap-1 self-start text-brand-700"
              >
                <HiPencil /> Edit
              </button>
            )}
          </div>

          {!editSkills ? (
            <div className="grid gap-5 text-sm sm:grid-cols-2 sm:gap-6">
              <div>
                <p className="text-gray-400">Experience Years</p>
                <div>{skills.experienceYears || 0}</div>
              </div>
              <div>
                <p className="text-gray-400">Tools</p>
                <div className="break-words">{skills.tools || "—"}</div>
              </div>
              <div className="sm:col-span-2">
                <p className="text-gray-400">Experience Description</p>
                <div className="break-words">{skills.experienceDescription || "—"}</div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="number"
                className={inputClass}
                value={skills.experienceYears}
                onChange={(e) =>
                  setSkills({ ...skills, experienceYears: e.target.value })
                }
                placeholder="Years of experience"
              />
              <input
                className={inputClass}
                value={skills.tools}
                onChange={(e) => setSkills({ ...skills, tools: e.target.value })}
                placeholder="Tools (comma separated)"
              />
              <textarea
                className={`${inputClass} min-h-[120px] md:col-span-2`}
                value={skills.experienceDescription}
                onChange={(e) =>
                  setSkills({ ...skills, experienceDescription: e.target.value })
                }
                placeholder="Describe your experience"
              />

              <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row">
                <button
                  type="button"
                  onClick={saveSkills}
                  className="rounded bg-brand-700 px-4 py-2 text-white"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditSkills(false)}
                  className="rounded bg-gray-200 px-4 py-2"
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