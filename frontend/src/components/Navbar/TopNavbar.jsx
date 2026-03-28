import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { HiBars3, HiXMark, HiChevronDown } from "react-icons/hi2";
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileServices, setShowMobileServices] = useState(false);

  const [categories, setCategories] = useState([]);
  const [categorySubcategories, setCategorySubcategories] = useState({});
  const [loadingCategories, setLoadingCategories] = useState(false);

  const dropdownRef = useRef(null);

  const avatarUrl = user?.profile?.avatarUrl;
  const initial =
    user?.profile?.name?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "U";

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      setLoadingCategories(true);
      const res = await api.get("/categories");
      const cats = res.data.data || [];
      setCategories(cats);

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
    if (user?.role === "client") return navigate("/client/profile");
    if (user?.role === "provider") return navigate("/provider/profile");
    if (user?.role === "admin") return navigate("/");
    return navigate("/");
  };

  const handleCategoryNavigate = (catId, subName = null) => {
    if (subName) {
      navigate(
        `/services?category=${encodeURIComponent(catId)}&subcategory=${encodeURIComponent(
          subName
        )}`
      );
    } else {
      navigate(`/services?category=${encodeURIComponent(catId)}`);
    }

    setShowDropdown(false);
    setShowMobileMenu(false);
    setShowMobileServices(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        {/* Left */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => setShowMobileMenu(true)}
            className="rounded-lg p-2 text-gray-700 hover:bg-gray-100 md:hidden"
            aria-label="Open menu"
          >
            <HiBars3 className="h-6 w-6" />
          </button>

          <Link to="/" className="flex shrink-0 items-center">
            <img src={logo} alt="SewaHive" className="h-7 w-auto sm:h-8" />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 font-medium text-gray-700 md:flex lg:gap-10">
          <a href="#about" className="transition-colors hover:text-brand-700">
            About
          </a>

          <Link to="/help" className="transition-colors hover:text-brand-700">
            Help
          </Link>

          {/* Services Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown((prev) => !prev)}
              className="flex items-center gap-1 transition-colors hover:text-brand-700"
            >
              Services
              <HiChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  showDropdown ? "rotate-180" : ""
                }`}
              />
            </button>

            {showDropdown && (
              <div
                className="absolute right-auto top-full z-[70] mt-2 w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-0 shadow-xl sm:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl"
                style={{
                  minWidth: "min(90vw, 320px)",
                  maxWidth: "min(98vw, 420px)",
                }}
              >
                <div className="max-h-[70vh] divide-y divide-gray-100 overflow-y-auto">
                  {loadingCategories ? (
                    <div className="py-8 text-center text-base font-medium text-gray-500">
                      Loading categories...
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="py-8 text-center text-base font-medium text-gray-500">
                      No categories available
                    </div>
                  ) : (
                    categories.map((cat) => (
                      <div key={cat._id} className="p-0">
                        <div className="flex items-center gap-2 px-4 pb-2 pt-4">
                          <span className="flex items-center justify-center text-xl text-brand-700">
                            {getCategoryIcon(cat)}
                          </span>
                          <h4 className="truncate text-base font-semibold text-gray-900">
                            {cat.name}
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 gap-1 px-4 pb-4 sm:grid-cols-2">
                          {(categorySubcategories[cat._id] || []).length > 0 ? (
                            (categorySubcategories[cat._id] || []).map((sub) => (
                              <button
                                key={sub._id}
                                onClick={() => handleCategoryNavigate(cat._id, sub.name)}
                                className="rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200"
                              >
                                {sub.name}
                              </button>
                            ))
                          ) : (
                            <button
                              onClick={() => handleCategoryNavigate(cat._id)}
                              className="rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200"
                            >
                              View Services
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="rounded-b-2xl border-t bg-gray-50 px-4 py-4">
                  <button
                    onClick={() => {
                      navigate("/services");
                      setShowDropdown(false);
                    }}
                    className="w-full rounded-xl bg-brand-700 px-4 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-brand-800"
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
              className="rounded-full bg-green-200 px-5 py-2 font-medium text-green-800"
            >
              Become a Tasker
            </Link>
          )}
        </nav>

        {/* Right */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3 md:gap-4">
          {!isAuthenticated && (
            <>
              <Link to="/login" className="hidden font-medium text-gray-700 sm:inline">
                Login
              </Link>

              <Link
                to="/signup"
                className="rounded-full bg-brand-700 px-4 py-2 text-sm text-white sm:px-5 sm:text-base"
              >
                Sign Up
              </Link>
            </>
          )}

          {isAuthenticated && (
            <>
              {user?.role !== "provider" && (
                <Link
                  to="/provider/signup"
                  className="hidden rounded-full bg-green-200 px-5 py-2 font-medium text-green-800 lg:inline-flex"
                >
                  Become a Tasker
                </Link>
              )}

              <NotificationBell />

              <button
                onClick={handleAvatarClick}
                className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-600 font-semibold text-white sm:h-10 sm:w-10"
                aria-label="Open profile"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      if (e.currentTarget.parentElement) {
                        e.currentTarget.parentElement.textContent = initial;
                      }
                    }}
                  />
                ) : (
                  initial
                )}
              </button>

              <div className="hidden sm:block">
                <UserDropdown />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 md:hidden"
            onClick={() => setShowMobileMenu(false)}
          />

          <div className="fixed left-0 top-0 z-[60] h-full w-[88%] max-w-sm bg-white shadow-xl md:hidden">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <p className="text-lg font-bold text-gray-900">Menu</p>
                <p className="text-xs text-gray-500">Browse SewaHive</p>
              </div>

              <button
                onClick={() => setShowMobileMenu(false)}
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                aria-label="Close menu"
              >
                <HiXMark className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(100vh-80px)] space-y-2 overflow-y-auto p-4">
              <a
                href="#about"
                onClick={() => setShowMobileMenu(false)}
                className="block rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                About
              </a>

              <Link
                to="/help"
                onClick={() => setShowMobileMenu(false)}
                className="block rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Help
              </Link>

              {/* Mobile Services */}
              <div className="rounded-xl border border-gray-200">
                <button
                  onClick={() => setShowMobileServices((prev) => !prev)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-800"
                >
                  Services
                  <HiChevronDown
                    className={`h-4 w-4 transition-transform ${
                      showMobileServices ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showMobileServices && (
                  <div className="space-y-3 border-t px-3 py-3">
                    {loadingCategories ? (
                      <div className="py-2 text-sm text-gray-500">Loading categories...</div>
                    ) : categories.length === 0 ? (
                      <div className="py-2 text-sm text-gray-500">No categories available</div>
                    ) : (
                      categories.map((cat) => (
                        <div key={cat._id} className="rounded-lg bg-gray-50 p-3">
                          <button
                            onClick={() => handleCategoryNavigate(cat._id)}
                            className="mb-2 flex w-full items-center gap-2 text-left font-semibold text-gray-900"
                          >
                            <span className="text-brand-700">{getCategoryIcon(cat)}</span>
                            {cat.name}
                          </button>

                          <div className="space-y-1 pl-0">
                            {(categorySubcategories[cat._id] || []).length > 0 ? (
                              (categorySubcategories[cat._id] || []).map((sub) => (
                                <button
                                  key={sub._id}
                                  onClick={() => handleCategoryNavigate(cat._id, sub.name)}
                                  className="block w-full rounded-lg px-2 py-2 text-left text-sm text-gray-600 hover:bg-white hover:text-brand-700"
                                >
                                  {sub.name}
                                </button>
                              ))
                            ) : (
                              <button
                                onClick={() => handleCategoryNavigate(cat._id)}
                                className="block w-full rounded-lg px-2 py-2 text-left text-sm text-gray-600 hover:bg-white hover:text-brand-700"
                              >
                                View Services
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}

                    <button
                      onClick={() => {
                        navigate("/services");
                        setShowMobileMenu(false);
                        setShowMobileServices(false);
                      }}
                      className="w-full rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-medium text-white"
                    >
                      View All Services
                    </button>
                  </div>
                )}
              </div>

              {!isAuthenticated && (
                <>
                  <Link
                    to="/login"
                    onClick={() => setShowMobileMenu(false)}
                    className="block rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Login
                  </Link>

                  <Link
                    to="/signup"
                    onClick={() => setShowMobileMenu(false)}
                    className="block rounded-xl bg-brand-700 px-4 py-3 text-sm font-medium text-white"
                  >
                    Sign Up
                  </Link>

                  <Link
                    to="/provider/signup"
                    onClick={() => setShowMobileMenu(false)}
                    className="block rounded-xl bg-green-100 px-4 py-3 text-sm font-medium text-green-800"
                  >
                    Become a Tasker
                  </Link>
                </>
              )}

              {isAuthenticated && user?.role !== "provider" && (
                <Link
                  to="/provider/signup"
                  onClick={() => setShowMobileMenu(false)}
                  className="block rounded-xl bg-green-100 px-4 py-3 text-sm font-medium text-green-800"
                >
                  Become a Tasker
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}