// src/components/Navbar/TopNavbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import logo from "../../logos/logo.png";
import UserDropdown from "./UserDropdown";
import NotificationBell from "./NotificationBell";
import api from "../../utils/axios";
import { getCategoryIcon } from "../../utils/categoryIcons";

export default function TopNavbar() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categorySubcategories, setCategorySubcategories] = useState({}); // Map of categoryId -> subcategories
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const dropdownRef = useRef(null);

  const avatarUrl = user?.profile?.avatarUrl;
  const initial =
    user?.profile?.name?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "U";

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      setLoadingCategories(true);
      const res = await api.get("/categories");
      const cats = res.data.data || [];
      setCategories(cats);
      // Fetch subcategories for each category
      for (const cat of cats) {
        fetchSubcategories(cat._id);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }

  async function fetchSubcategories(categoryId) {
    try {
      const res = await api.get(`/categories/subcategories?categoryId=${categoryId}`);
      const subs = res.data.data || [];
      setCategorySubcategories((prev) => ({
        ...prev,
        [categoryId]: subs,
      }));
    } catch (err) {
      console.error(`Failed to load subcategories for category ${categoryId}:`, err);
      setCategorySubcategories((prev) => ({
        ...prev,
        [categoryId]: [],
      }));
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAvatarClick = () => {
    // ✅ Route to profile page based on role
    if (user?.role === "client") return navigate("/client/profile");
    if (user?.role === "provider") return navigate("/provider/profile");
    if (user?.role === "admin") return navigate("/");
    return navigate("/");
  };

  return (
    <header className="w-full bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/">
          <img src={logo} alt="SewaHive" className="h-6" />
        </Link>

        <nav className="hidden md:flex gap-10 text-gray-700 font-medium items-center">
          <a href="#about" className="hover:text-brand-700">About</a>
          
          <Link to="/help" className="hover:text-brand-700 transition-colors">Help</Link>

          {/* Services Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1 hover:text-brand-700 transition-colors"
            >
              Services
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className={`transform transition-transform duration-200 ${showDropdown ? "rotate-180" : ""}`}
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute top-full left-0 mt-1 w-screen max-w-md bg-white rounded-lg shadow-md border border-gray-150 p-4 z-50">
                <div className="space-y-4">
                  {loadingCategories ? (
                    <div className="text-sm text-gray-500 text-center py-4">Loading categories...</div>
                  ) : categories.length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-4">No categories available</div>
                  ) : (
                    categories.map((cat) => (
                      <div key={cat._id}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{getCategoryIcon(cat)}</span>
                          <h4 className="font-semibold text-gray-900">{cat.name}</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pl-8">
                          {(categorySubcategories[cat._id] || []).length > 0 ? (
                            (categorySubcategories[cat._id] || []).map((sub) => (
                              <button
                                key={sub._id}
                                onClick={() => {
                                  navigate(`/services?category=${cat._id}`);
                                  setShowDropdown(false);
                                }}
                                className="text-sm text-gray-600 hover:text-brand-700 text-left transition-colors"
                              >
                                {sub.name}
                              </button>
                            ))
                          ) : (
                            <button
                              onClick={() => {
                                navigate(`/services?category=${cat._id}`);
                                setShowDropdown(false);
                              }}
                              className="text-sm text-gray-600 hover:text-brand-700 text-left transition-colors"
                            >
                              View Services
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <button
                    onClick={() => {
                      navigate("/services");
                      setShowDropdown(false);
                    }}
                    className="w-full bg-brand-700 text-white px-4 py-2 rounded-lg hover:bg-brand-800 transition-colors font-medium"
                  >
                    View All Services
                  </button>
                </div>
              </div>
            )}
          </div>

          {!isAuthenticated && (
            <Link
              to="/provider/signup"
              className="bg-green-200 text-green-800 px-5 py-2 rounded-full font-medium"
            >
              Become a Tasker
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-4">
          {!isAuthenticated && (
            <>
              <Link to="/login" className="font-medium">Login</Link>
              <Link to="/signup" className="bg-brand-700 text-white px-5 py-2 rounded-full">
                Sign Up
              </Link>
            </>
          )}

          {isAuthenticated && (
            <>
              {user?.role !== "provider" && (
                <Link
                  to="/provider/signup"
                  className="bg-green-200 text-green-800 px-5 py-2 rounded-full font-medium"
                >
                  Become a Tasker
                </Link>
              )}

              {/* ✅ NOTIFICATION BELL */}
              <NotificationBell />

              {/* ✅ AVATAR */}
              <button
                onClick={handleAvatarClick}
                className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-semibold overflow-hidden"
                aria-label="Open profile"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  initial
                )}
              </button>

              <UserDropdown />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
