// src/pages/provider/VerificationUpload.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  HiArrowPath,
  HiCheckCircle,
  HiClock,
  HiCloudArrowUp,
  HiDocumentText,
  HiExclamationTriangle,
  HiInformationCircle,
  HiShieldCheck,
} from "react-icons/hi2";
import ProviderLayout from "../../layouts/ProviderLayout";
import api from "../../utils/axios";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

function StatusBadge({ status }) {
  const map = {
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    submitted: "bg-amber-100 text-amber-800 border-amber-200",
    under_review: "bg-blue-100 text-blue-800 border-blue-200",
    pending_review: "bg-blue-100 text-blue-800 border-blue-200",
    needs_correction: "bg-rose-100 text-rose-800 border-rose-200",
    rejected: "bg-rose-100 text-rose-800 border-rose-200",
  };

  const label =
    status === "approved"
      ? "KYC Verified"
      : status === "rejected"
      ? "Rejected"
      : status === "needs_correction"
      ? "Needs Correction"
      : status === "under_review" || status === "pending_review"
      ? "Pending Review"
      : "Submitted";

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border ${map[status] || map.submitted}`}>
      {status === "approved" && <HiCheckCircle className="h-4 w-4" />}        
      {status === "submitted" && <HiClock className="h-4 w-4" />}        
      {(status === "under_review" || status === "pending_review") && <HiClock className="h-4 w-4" />}        
      {status === "needs_correction" && <HiExclamationTriangle className="h-4 w-4" />}        
      {status === "rejected" && <HiExclamationTriangle className="h-4 w-4" />}        
      {label}
    </span>
  );
}

function FilePicker({ label, name, required, accept, helper, onChange, preview, error, disabled }) {
  return (
    <label className={`block border border-dashed rounded-xl p-4 bg-white transition ${
      disabled
        ? "border-gray-200 bg-gray-50 cursor-not-allowed"
        : "border-gray-300 hover:border-emerald-300 cursor-pointer"
    }`}>
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
          disabled
            ? "bg-gray-100 text-gray-400"
            : "bg-emerald-50 text-emerald-600"
        }`}>
          <HiCloudArrowUp />
        </div>
        <div>
          <p className={`font-semibold flex items-center gap-2 ${disabled ? "text-gray-500" : "text-gray-800"}`}>
            {label}
            {required && <span className="text-rose-500 text-sm">*</span>}
          </p>
          <p className={`text-sm ${disabled ? "text-gray-400" : "text-gray-500"}`}>{helper}</p>
          {preview && (
            <p className="text-sm text-emerald-600 mt-1 truncate">Selected: {preview.name}</p>
          )}
          {error && (
            <p className="text-sm text-rose-600 mt-1">{error}</p>
          )}
        </div>
      </div>
      <input
        type="file"
        accept={accept}
        name={name}
        className="hidden"
        disabled={disabled}
        onChange={(e) => onChange(name, e.target.files?.[0] || null)}
      />
    </label>
  );
}

export default function ProviderVerification() {
  const { user } = useAuth();
  const [documentType, setDocumentType] = useState("citizenship");
  const [files, setFiles] = useState({
    citizenshipFront: null,
    citizenshipBack: null,
    passport: null,
    drivingLicenseFront: null,
    drivingLicenseBack: null,
    selfie: null,
    addressProof: null,
  });
  const [previews, setPreviews] = useState({});
  const [fileErrors, setFileErrors] = useState({});
  const [declaredName, setDeclaredName] = useState("");
  const [declaredDob, setDeclaredDob] = useState("");
  const [addressProofType, setAddressProofType] = useState("utility_bill");
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsStatus, setGpsStatus] = useState("idle");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState(null);
  const [resubmittingId, setResubmittingId] = useState(null);

  const requiredFields = useMemo(() => {
    if (documentType === "passport") {
      return ["passport", "selfie"];
    }
    if (documentType === "driving_license") {
      return ["drivingLicenseFront", "drivingLicenseBack", "selfie"];
    }
    return ["citizenshipFront", "citizenshipBack", "selfie"];
  }, [documentType]);

  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const BLUR_THRESHOLD = 80;
  const allowedMimeTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);

  async function getBlurScore(file) {
    try {
      const bitmap = await createImageBitmap(file);
      const maxSize = 320;
      const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0, width, height);

      const { data } = ctx.getImageData(0, 0, width, height);
      let sum = 0;
      let sumSq = 0;
      let count = 0;

      const idx = (x, y) => (y * width + x) * 4;
      for (let y = 1; y < height - 1; y += 2) {
        for (let x = 1; x < width - 1; x += 2) {
          const c = idx(x, y);
          const up = idx(x, y - 1);
          const down = idx(x, y + 1);
          const left = idx(x - 1, y);
          const right = idx(x + 1, y);

          const centerGray = data[c] * 0.299 + data[c + 1] * 0.587 + data[c + 2] * 0.114;
          const upGray = data[up] * 0.299 + data[up + 1] * 0.587 + data[up + 2] * 0.114;
          const downGray = data[down] * 0.299 + data[down + 1] * 0.587 + data[down + 2] * 0.114;
          const leftGray = data[left] * 0.299 + data[left + 1] * 0.587 + data[left + 2] * 0.114;
          const rightGray = data[right] * 0.299 + data[right + 1] * 0.587 + data[right + 2] * 0.114;

          const laplacian =
            upGray + downGray + leftGray + rightGray - 4 * centerGray;
          sum += laplacian;
          sumSq += laplacian * laplacian;
          count += 1;
        }
      }

      if (count === 0) return null;
      const mean = sum / count;
      return sumSq / count - mean * mean;
    } catch (err) {
      return null;
    }
  }

  async function validateFile(file, { imagesOnly = false } = {}) {
    if (!file) return { ok: true };

    if (file.size > MAX_FILE_SIZE) {
      return { ok: false, message: "File exceeds 5MB limit." };
    }

    if (!allowedMimeTypes.has(file.type)) {
      return { ok: false, message: "Unsupported file type. Use JPG, PNG, or PDF." };
    }

    if (imagesOnly && !file.type.startsWith("image/")) {
      return { ok: false, message: "This field only accepts images." };
    }

    if (file.type.startsWith("image/")) {
      const blurScore = await getBlurScore(file);
      if (blurScore !== null && blurScore < BLUR_THRESHOLD) {
        return { ok: false, message: "Image looks blurry. Please upload a clearer photo." };
      }
    }

    return { ok: true };
  }

  async function loadStatus() {
    try {
      const res = await api.get("/providers/verification");
      setVerification(res.data?.verification || null);
    } catch (err) {
      toast.error("Could not load KYC status");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const draftRaw = localStorage.getItem("sewahiveKycDraft");
    if (draftRaw) {
      try {
        const draft = JSON.parse(draftRaw);
        if (draft.documentType) setDocumentType(draft.documentType);
        if (draft.declaredName) setDeclaredName(draft.declaredName);
        if (draft.declaredDob) setDeclaredDob(draft.declaredDob);
        if (draft.addressProofType) setAddressProofType(draft.addressProofType);
        if (draft.gpsLocation) setGpsLocation(draft.gpsLocation);
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!declaredName) setDeclaredName(user.profile?.name || "");
    if (!declaredDob && user.profile?.dob) {
      setDeclaredDob(new Date(user.profile.dob).toISOString().slice(0, 10));
    }
  }, [user, declaredName, declaredDob]);

  useEffect(() => {
    loadStatus();
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    let source;
    let retryTimer;

    const connect = () => {
      source = new EventSource(`${baseUrl}/notifications/stream?token=${token}`);
      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.event === "notification") {
            const type = payload?.notification?.type;
            if (
              type === "verification_approved" ||
              type === "verification_rejected" ||
              type === "verification_needs_correction" ||
              type === "verification_under_review"
            ) {
              loadStatus();
            }
          }
        } catch {
          // ignore
        }
      };
      source.onerror = () => {
        source.close();
        if (!retryTimer) {
          retryTimer = setTimeout(() => {
            retryTimer = null;
            connect();
          }, 5000);
        }
      };
    };

    connect();

    return () => {
      if (source) source.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  function handleFileChange(field, file) {
    setFiles((prev) => ({ ...prev, [field]: file }));
    setPreviews((prev) => ({ ...prev, [field]: file ? { name: file.name } : null }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // PHASE 2A: Block submission if status is pending/under_review OR approved
    if (verification && ["submitted", "under_review", "pending_review", "approved"].includes(verification.status)) {
      const isApproved = verification.status === "approved";
      toast.error(
        isApproved 
          ? "Your KYC has already been verified. No further submissions needed."
          : "Your KYC is already under review. Please wait for admin decision before resubmitting.",
        { duration: 5000 }
      );
      return;
    }

    // basic validation
    const missing = requiredFields.filter((field) => !files[field]);
    if (missing.length) {
      toast.error(`Please attach: ${missing.join(", ")}`);
      return;
    }

    const formData = new FormData();
    formData.append("documentType", documentType);

    if (documentType === "citizenship") {
      formData.append("citizenshipFront", files.citizenshipFront);
      formData.append("citizenshipBack", files.citizenshipBack);
    } else {
      formData.append("passport", files.passport);
    }

    formData.append("selfie", files.selfie);

    try {
      setSubmitting(true);
      const res = await api.post("/providers/verification", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setVerification(res.data?.verification || null);
      toast.success("KYC submitted. We'll review it shortly.");
      setFiles({ citizenshipFront: null, citizenshipBack: null, passport: null, selfie: null });
      setPreviews({});
    } catch (err) {
      const message = err.response?.data?.message || "Upload failed";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const status = verification?.status || "pending";

  return (
    <ProviderLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              KYC Verification
              {status === "approved" && (
                <HiShieldCheck className="h-6 w-6 text-emerald-600" title="Verified" />
              )}
            </h1>
            <p className="text-gray-600">Upload your citizenship or passport along with a selfie. We review in under 24 hours.</p>
          </div>
          {!loading && <StatusBadge status={status} />}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow p-6 space-y-4">
            {status === "approved" && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
                <HiCheckCircle className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-900">KYC Verification Complete</p>
                  <p className="text-sm text-emerald-800 mt-1">Your identity has been verified. You can now access all features. No further document submission is required.</p>
                </div>
              </div>
            )}
            
            <div className="flex flex-wrap gap-3">
              {[
                { key: "citizenship", label: "Citizenship" },
                { key: "passport", label: "Passport" },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setDocumentType(option.key)}
                  disabled={status === "approved"}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                    status === "approved"
                      ? "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed"
                      : documentType === option.key
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 text-gray-700 hover:border-emerald-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {documentType === "citizenship" ? (
                <div className="grid md:grid-cols-2 gap-4">
                  <FilePicker
                    label="Citizenship (Front)"
                    name="citizenshipFront"
                    required
                    accept="image/*,application/pdf"
                    helper="Clear photo of the front side"
                    onChange={handleFileChange}
                    preview={previews.citizenshipFront}
                    disabled={status === "approved"}
                  />
                  <FilePicker
                    label="Citizenship (Back)"
                    name="citizenshipBack"
                    required
                    accept="image/*,application/pdf"
                    helper="Clear photo of the back side"
                    onChange={handleFileChange}
                    preview={previews.citizenshipBack}
                    disabled={status === "approved"}
                  />
                </div>
              ) : (
                <FilePicker
                  label="Passport (photo page)"
                  name="passport"
                  required
                  accept="image/*,application/pdf"
                  helper="Full page including MRZ"
                  onChange={handleFileChange}
                  preview={previews.passport}
                  disabled={status === "approved"}
                />
              )}

              <FilePicker
                label="Selfie with ID"
                name="selfie"
                required
                accept="image/*"
                helper="Hold the same document near your face"
                onChange={handleFileChange}
                preview={previews.selfie}
                disabled={status === "approved"}
              />

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting || (verification && ["submitted", "under_review", "pending_review", "approved"].includes(verification.status))}
                  className="bg-emerald-600 text-white px-5 py-2 rounded-lg shadow hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting 
                    ? "Uploading..." 
                    : (verification?.status === "approved")
                    ? "✓ KYC Verified"
                    : (verification && ["submitted", "under_review", "pending_review"].includes(verification.status))
                    ? "Pending Review"
                    : "Submit for review"}
                </button>

                {verification?.status === "approved" && (
                  <span className="text-sm text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                    ✓ KYC verification complete
                  </span>
                )}

                {verification && ["submitted", "under_review", "pending_review"].includes(verification.status) && (
                  <span className="text-sm text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
                    ⏳ Submission locked during review
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setFiles({ citizenshipFront: null, citizenshipBack: null, passport: null, selfie: null });
                    setPreviews({});
                  }}
                  className="text-gray-600 flex items-center gap-2"
                  disabled={verification && ["submitted", "under_review", "pending_review", "approved"].includes(verification.status)}
                >
                  <HiArrowPath className="h-4 w-4" /> Reset selections
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow p-5 space-y-3">
              <div className="flex items-center gap-2 text-gray-800 font-semibold">
                <HiDocumentText className="text-emerald-600" /> What you'll need
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Government ID (Citizenship front & back or Passport)</li>
                <li>• Selfie holding the same ID (no filters, good lighting)</li>
                <li>• Files accepted: JPG, PNG, PDF up to 5MB each</li>
                <li>• Details must be readable: name, DOB, document number</li>
                <li>• Submitting again replaces your previous KYC</li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow p-5 space-y-3">
              <div className="flex items-center gap-2 text-gray-800 font-semibold">
                <HiClock className="text-amber-500" /> Status timeline
              </div>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start gap-3">
                  <div className="mt-1"><HiCloudArrowUp className="text-emerald-600" /></div>
                  <div>
                    <p className="font-semibold">Submit documents</p>
                    <p className="text-gray-500">Upload both sides plus a selfie for faster approval.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1"><HiClock className="text-amber-500" /></div>
                  <div>
                    <p className="font-semibold">Under review</p>
                    <p className="text-gray-500">Admins verify within 24h. We'll notify you if we need anything.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1"><HiShieldCheck className="text-emerald-600" /></div>
                  <div>
                    <p className="font-semibold">Approved</p>
                    <p className="text-gray-500">A green tick will appear on your profile once verified.</p>
                  </div>
                </div>
              </div>
            </div>

            {verification?.documents?.length > 0 && (
              <div className="bg-white rounded-2xl shadow p-5">
                <div className="flex items-center gap-2 text-gray-800 font-semibold mb-3">
                  <HiShieldCheck className="text-emerald-600" /> Last submission
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Document type: {verification.documentType || "citizenship"} • Submitted {new Date(verification.updatedAt || verification.createdAt).toLocaleString()}
                </p>
                <div className="space-y-2 text-sm text-gray-700">
                  {verification.documents.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="capitalize">{doc.type.replace("-", " ")}</span>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:underline"
                      >
                        View file
                      </a>
                    </div>
                  ))}
                </div>
                {verification.adminComment && (
                  <p className="mt-3 text-sm text-rose-600">Admin note: {verification.adminComment}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProviderLayout>
  );
}
