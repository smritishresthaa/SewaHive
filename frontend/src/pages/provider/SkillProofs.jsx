import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import ProviderLayout from "../../layouts/ProviderLayout";
import { HiCheckCircle, HiClock, HiExclamationTriangle, HiXCircle, HiPlus, HiArrowUpTray, HiTrash } from "react-icons/hi2";
import api from "../../utils/axios";
import toast from "react-hot-toast";

export default function SkillProofs() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [skillProofs, setSkillProofs] = useState([]);
  const [approvedCategories, setApprovedCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [beforeFiles, setBeforeFiles] = useState([]);
  const [afterFiles, setAfterFiles] = useState([]);
  const [certificateFiles, setCertificateFiles] = useState([]);
  const [formData, setFormData] = useState({
    experienceDescription: "",
    tools: "",
    portfolio: [],
    certificates: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [catRes, skillsRes] = await Promise.all([
        api.get("/providers/categories"),
        api.get(`/providers/${user.id}/skills`)
      ]);
      
      setCategories(catRes.data.categories || []);
      setSkillProofs(skillsRes.data.skillProofs || []);
      setApprovedCategories(skillsRes.data.approvedCategories || []);
    } catch (err) {
      console.error("Failed to fetch skill proofs", err);
      toast.error("Failed to load skill proofs");
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (categoryId = "") => {
    setSelectedCategory(categoryId);
    
    if (categoryId) {
      const existingProof = skillProofs.find(p => p.categoryId?._id === categoryId || p.categoryId === categoryId);
      if (existingProof) {
        setFormData({
          experienceDescription: existingProof.experienceDescription || "",
          tools: existingProof.tools?.join(", ") || "",
          portfolio: existingProof.portfolio || [],
          certificates: existingProof.certificates || []
        });
      } else {
        resetForm();
      }
    } else {
      resetForm();
    }
    
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      experienceDescription: "",
      tools: "",
      portfolio: [],
      certificates: []
    });
    setBeforeFiles([]);
    setAfterFiles([]);
    setCertificateFiles([]);
  };

  const handleFileChange = (e, type) => {
    if (e.target.files) {
      let files = Array.from(e.target.files);
      // Filter duplicates by name and size
      files = files.filter((file, idx, arr) =>
        arr.findIndex(f => f.name === file.name && f.size === file.size) === idx
      );
      if (type === 'before') {
        setBeforeFiles(files);
      } else if (type === 'after') {
        setAfterFiles(files);
      } else {
        setCertificateFiles(files);
      }
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCategory) {
      return toast.error("Please select a category");
    }

    try {
      const data = new FormData();
      data.append('experienceDescription', formData.experienceDescription);
      data.append('tools', formData.tools);
      
      beforeFiles.forEach(file => {
          data.append('portfolioBefore', file);
      });
      afterFiles.forEach(file => {
          data.append('portfolioAfter', file);
      });
      certificateFiles.forEach(file => {
          data.append('certificateImage', file);
      });

      await api.post(`/providers/skills/${selectedCategory}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success("Skill proof submitted successfully!");
      setIsModalOpen(false);
      resetForm();
      fetchData(); // Refresh data
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit skill proof");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium flex items-center gap-1 w-fit"><HiCheckCircle /> Approved</span>;
      case "pending_review":
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium flex items-center gap-1 w-fit"><HiClock /> Pending Review</span>;
      case "needs_correction":
        return <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium flex items-center gap-1 w-fit"><HiExclamationTriangle /> Needs Correction</span>;
      case "rejected":
        return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium flex items-center gap-1 w-fit"><HiXCircle /> Rejected</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <ProviderLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-10 w-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        </div>
      </ProviderLayout>
    );
  }

  // Filter out categories that already have a proof submitted
  const availableCategories = categories.filter(cat => 
    !skillProofs.some(p => (p.categoryId?._id || p.categoryId) === cat._id)
  );

  return (
    <ProviderLayout>
      <div className="max-w-5xl mx-auto mt-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Skill Credibility</h1>
            <p className="text-gray-600 mt-1">Manage your category approvals and skill proofs</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-800 transition"
          >
            <HiPlus /> Add Category Proof
          </button>
        </div>

        {/* Approved Categories Summary */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Approved Categories</h2>
          {approvedCategories.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {approvedCategories.map((cat, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl">
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="font-medium text-emerald-900">{cat.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">You don't have any approved categories yet. Submit a skill proof to get started.</p>
          )}
        </div>

        {/* Skill Proofs List */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Your Submissions</h2>
          
          {skillProofs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <HiArrowUpTray className="text-2xl text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No skill proofs submitted</h3>
              <p className="text-gray-500 mt-1 mb-4">Submit proof of your skills to unlock categories and start receiving bookings.</p>
              <button
                onClick={() => handleOpenModal()}
                className="text-brand-700 font-medium hover:underline"
              >
                Submit your first proof
              </button>
            </div>
          ) : (
            skillProofs.map((proof, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">
                      {proof.categoryId?.icon || "📁"}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{proof.categoryId?.name || "Unknown Category"}</h3>
                      <p className="text-sm text-gray-500">Submitted on {new Date(proof.submittedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {getStatusBadge(proof.status)}
                </div>

                {proof.status === "needs_correction" && proof.adminFeedback && (
                  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <h4 className="text-sm font-bold text-amber-900 mb-1">Admin Feedback:</h4>
                    <p className="text-sm text-amber-800">{proof.adminFeedback}</p>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6 mt-6 pt-6 border-t">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Experience</h4>
                    <p className="text-gray-900 text-sm">{proof.experienceDescription || "No description provided."}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Tools & Equipment</h4>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {proof.tools && proof.tools.length > 0 ? (
                        proof.tools.map((tool, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{tool}</span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">None listed</span>
                      )}
                    </div>

                    {/* Portfolio Display */}
                    {proof.portfolio && proof.portfolio.length > 0 && (
                      <div className="space-y-3">
                         {proof.portfolio.some(p => p.type === 'before') && (
                           <div>
                             <h5 className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded w-fit mb-1">Before Service</h5>
                             <div className="flex gap-2 overflow-x-auto pb-1">
                                {(() => {
                                  const firstBefore = proof.portfolio.find(p => p.type === 'before');
                                  return firstBefore ? (
                                    <a href={firstBefore.url} target="_blank" rel="noreferrer">
                                      <img src={firstBefore.url} className="h-16 w-16 object-cover rounded-lg border border-amber-200 hover:opacity-75" alt="Before" />
                                    </a>
                                  ) : null;
                                })()}
                             </div>
                           </div>
                         )}
                         {proof.portfolio.some(p => p.type === 'after') && (
                           <div>
                             <h5 className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded w-fit mb-1">After Service</h5>
                             <div className="flex gap-2 overflow-x-auto pb-1">
                                {(() => {
                                  const firstAfter = proof.portfolio.find(p => p.type === 'after');
                                  return firstAfter ? (
                                    <a href={firstAfter.url} target="_blank" rel="noreferrer">
                                      <img src={firstAfter.url} className="h-16 w-16 object-cover rounded-lg border border-emerald-200 hover:opacity-75" alt="After" />
                                    </a>
                                  ) : null;
                                })()}
                             </div>
                           </div>
                         )}
                      </div>
                    )}
                  </div>
                </div>

                {(proof.status === "needs_correction" || proof.status === "pending_review") && (
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => handleOpenModal(proof.categoryId?._id || proof.categoryId)}
                      className="text-brand-700 font-medium hover:underline text-sm"
                    >
                      Edit Submission
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Submit Skill Proof</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                  <HiXCircle className="text-2xl" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Category</label>
                  <select
                    className="input w-full"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    required
                    disabled={skillProofs.some(p => (p.categoryId?._id || p.categoryId) === selectedCategory)}
                  >
                    <option value="">-- Select a category --</option>
                    {/* Show currently selected category if editing */}
                    {selectedCategory && !availableCategories.some(c => c._id === selectedCategory) && (
                      <option value={selectedCategory}>
                        {categories.find(c => c._id === selectedCategory)?.name || "Selected Category"}
                      </option>
                    )}
                    {availableCategories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">You must submit proof for each category you want to offer services in.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Experience Description</label>
                  <textarea
                    className="input w-full"
                    rows="4"
                    value={formData.experienceDescription}
                    onChange={(e) => setFormData({...formData, experienceDescription: e.target.value})}
                    placeholder="Describe your experience, training, and background in this specific category..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tools & Equipment</label>
                  <input
                    type="text"
                    className="input w-full"
                    value={formData.tools}
                    onChange={(e) => setFormData({...formData, tools: e.target.value})}
                    placeholder="e.g. Power drill, Wrench set, Ladder (comma separated)"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-900 block mb-1">Before Service Photos</label>
                      <p className="text-xs text-gray-500 mb-2">Show the original state before work began.</p>
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <HiArrowUpTray className="w-8 h-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500 text-center"><span className="font-semibold">Upload Before</span> Photos</p>
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          multiple 
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, 'before')}
                        />
                      </label>
                      {beforeFiles.length > 0 && (
                        <div className="mt-2 p-2 bg-emerald-50 text-emerald-700 text-sm rounded border border-emerald-100 flex items-center gap-2">
                          <HiCheckCircle /> {beforeFiles.length} file(s) selected
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-900 block mb-1">After Service Photos</label>
                      <p className="text-xs text-gray-500 mb-2">Show the completed result for comparison.</p>
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <HiArrowUpTray className="w-8 h-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500 text-center"><span className="font-semibold">Upload After</span> Photos</p>
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          multiple 
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, 'after')}
                        />
                      </label>
                      {afterFiles.length > 0 && (
                        <div className="mt-2 p-2 bg-emerald-50 text-emerald-700 text-sm rounded border border-emerald-100 flex items-center gap-2">
                          <HiCheckCircle /> {afterFiles.length} file(s) selected
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-900 block mb-1">Certificates / Training</label>
                    <p className="text-xs text-gray-500 mb-2">Upload images of relevant certificates. Max 5 images.</p>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <HiArrowUpTray className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-400">PNG, JPG or WEBP</p>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        multiple 
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'certificate')}
                      />
                    </label>
                    {certificateFiles.length > 0 && (
                      <div className="mt-2 p-2 bg-emerald-50 text-emerald-700 text-sm rounded border border-emerald-100 flex items-center gap-2">
                         <HiCheckCircle /> {certificateFiles.length} file(s) selected
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-brand-700 text-white rounded-lg hover:bg-brand-800 transition font-medium"
                  >
                    Submit for Review
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProviderLayout>
  );
}