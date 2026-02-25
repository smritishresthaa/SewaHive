import React from "react";
import { Link } from "react-router-dom";
import TopNavbar from "../components/Navbar/TopNavbar";

import amazonLogo from "../logos/amazon.png";
import coinbaseLogo from "../logos/coinbase.png";
import googleLogo from "../logos/google.png";
import microsoftLogo from "../logos/microsoft.png";

const leftWorker = new URL("../../hero-left.png", import.meta.url).href;
const rightWorker = new URL("../../hero-right.png", import.meta.url).href;

export default function Landing() {
  const [activeTab, setActiveTab] = React.useState("Cleaners");
  const [counts, setCounts] = React.useState({
    services: 0,
    providers: 0,
    customers: 0,
  });

  const statsRef = React.useRef(null);

  // COUNT-UP ANIMATION
  React.useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const start = performance.now();
          const duration = 1200;

          function step(now) {
            const p = Math.min(1, (now - start) / duration);
            setCounts({
              services: Math.round(200 * p),
              providers: Math.round(1500 * p),
              customers: Math.round(10000 * p),
            });
            if (p < 1) requestAnimationFrame(step);
          }

          requestAnimationFrame(step);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    io.observe(statsRef.current);
    return () => io.disconnect();
  }, []);

  const tabs = ["Cleaners", "Handymen", "Plumbers", "Decors", "Electrical Pros"];

  const servicesByTab = {
    Cleaners: [
      {
        title: "House Cleaning",
        img: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800&auto=format&fit=crop",
      },
      {
        title: "Deep Cleaning",
        img: "https://images.unsplash.com/photo-1581578016903-4f6a3c7f91ce?q=80&w=800&auto=format&fit=crop",
      },
      {
        title: "Office Cleaning",
        img: "https://images.unsplash.com/photo-1503428593586-e225b39bddfe?q=80&w=800&auto=format&fit=crop",
      },
      {
        title: "Window Cleaning",
        img: "https://images.unsplash.com/photo-1585408634512-a2a7f3c44b48?q=80&w=800&auto=format&fit=crop",
      },
    ],

    Handymen: [
      {
        title: "Furniture Assembly",
        img: "https://images.unsplash.com/photo-1621905252475-ff29c0d4f1d1?q=80&w=800&auto=format&fit=crop",
      },
      {
        title: "Home Repairs",
        img: "https://images.unsplash.com/photo-1560184897-aec8a45d28c1?q=80&w=800&auto=format&fit=crop",
      },
      {
        title: "Mounting & Installation",
        img: "https://images.unsplash.com/photo-1588356281254-2a0e9f04e6b8?q=80&w=800&auto=format&fit=crop",
      },
      {
        title: "Carpentry",
        img: "https://images.unsplash.com/photo-1516979187457-637abb4f3aa1?q=80&w=800&auto=format&fit=crop",
      },
    ],

    Plumbers: [
      {
        title: "Pipe Repair & Installation",
        img: "https://images.unsplash.com/photo-1581091014534-5d7110a8d9a0?q=80&w=800&auto=format&fit=crop",
      },
      {
        title: "Drain Cleaning",
        img: "https://images.unsplash.com/photo-1604882357860-6387f4dc1a93?q=80&w=800&auto=format&fit=crop",
      },
      {
        title: "Leak Fixing",
        img: "https://images.unsplash.com/photo-1530133532239-72f122cbf4c0?q=80&w=800&auto=format&fit=crop",
      },
      {
        title: "Bathroom Fittings",
        img: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=800&auto=format&fit=crop",
      },
    ],

    Decors: [
      {
        title: "Interior Wall Painting",
        img: "https://images.unsplash.com/photo-1523419409543-a7c0d3f27c13?q=80&w=800&auto=format&fit=crop",
      },
      {
        title: "Home Styling",
        img: "https://images.unsplash.com/photo-1493666438817-866a91353ca9?q=80&w=800&auto=format&fit=crop",
      },
      {
        title: "Event Decor",
        img: "https://images.unsplash.com/photo-1492684223066-81342ee5ff5b?q=80&w=800&auto=format&fit=crop",
      },
      {
        title: "Wallpaper & Finish",
        img: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=800&auto=format&fit=crop",
      },
    ],

    "Electrical Pros": [
      {
        title: "Electrical Work",
        img: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop",
      },
      {
        title: "AC Repair & Service",
        img: "https://images.unsplash.com/photo-1562101240-3b6b92c198b5?q=80&w=800&auto=format&fit=crop",
      },
      {
        title: "TV Mounting",
        img: "https://images.unsplash.com/photo-1589578527966-3b0c8d5f2afe?q=80&w=800&auto=format&fit=crop",
      },
      {
        title: "Wiring & Installation",
        img: "https://images.unsplash.com/photo-1555685812-4b74323fd1f3?q=80&w=800&auto=format&fit=crop",
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      {/* 🌟 TOP NAVBAR */}
      <TopNavbar />

      {/* 🌟 HERO SECTION */}
      <section className="relative w-full min-h-[90vh] bg-[#164f2b] text-white overflow-hidden flex items-center">
        <img
          src={leftWorker}
          className="absolute bottom-0 left-0 w-[330px] md:w-[420px] lg:w-[480px]"
        />
        <img
          src={rightWorker}
          className="absolute bottom-0 right-0 w-[330px] md:w-[420px] lg:w-[480px]"
        />

        <div className="relative z-10 w-full text-center px-6 max-w-3xl mx-auto">
          <div className="inline-block bg-green-200 text-green-800 px-5 py-2 rounded-full text-sm font-inter">
            Hire skilled professionals in just a few clicks
          </div>

          <h1 className="mt-6 text-4xl md:text-6xl font-poppins font-medium leading-tight">
            Serving made simple
            <br />
            with Sewa Hive
          </h1>

          <p className="mt-6 text-white/90 text-lg font-inter max-w-xl mx-auto">
            Connecting you with skilled professionals for all your home and personal needs.
          </p>

          {/* SEARCH BAR */}
          <div className="mt-10 max-w-2xl mx-auto flex items-center bg-[#1a5b35]/80 rounded-full p-2 shadow-lg">
            <span className="pl-5 pr-3 text-white/80">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              className="flex-1 bg-transparent outline-none px-2 py-3 placeholder-white/70 font-inter"
              placeholder="Find the perfect service you need"
            />
            <Link
              to="/login"
              className="ml-2 bg-[#2fae5e] text-white font-inter font-medium px-6 py-3 rounded-full shadow"
            >
              Search
            </Link>
          </div>

          {/* TRUST LOGOS */}
          <div className="mt-12 text-white/80 text-sm font-inter">
            Trusted by top companies
          </div>
          <div className="mt-5 flex items-center justify-center gap-0.5 opacity-95">
            <div className="w-32 h-12 flex items-center justify-center">
              <img src={amazonLogo} alt="Amazon" className="max-h-24 object-contain" />
            </div>
            <div className="w-32 h-12 flex items-center justify-center">
              <img src={coinbaseLogo} alt="Coinbase" className="max-h-12 object-contain" />
            </div>
            <div className="w-32 h-12 flex items-center justify-center">
              <img src={googleLogo} alt="Google" className="max-h-12 object-contain" />
            </div>
            <div className="w-32 h-12 flex items-center justify-center">
              <img src={microsoftLogo} alt="Microsoft" className="max-h-28 object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* 💚 ABOUT + STATS SECTION */}
      <section id="about" ref={statsRef} className="max-w-7xl mx-auto px-6 py-16">
        <p className="text-center text-lg md:text-xl text-gray-800 font-inter max-w-4xl mx-auto">
          Sewa Hive connects you with trusted and verified professionals, ensuring top-quality
          and dependable service every time. Our platform offers a seamless experience through an
          intuitive, user-friendly interface and a simple booking process designed for convenience.
          Your satisfaction is our highest priority — supported by dedicated assistance and a
          guaranteed service promise.
        </p>

        <div className="mt-12 grid md:grid-cols-3 gap-8">
          {[
            { key: "services", label: "Services", icon: "check", suffix: "+" },
            { key: "providers", label: "Service Providers", icon: "shield", suffix: "+" },
            { key: "customers", label: "Happy Customers", icon: "star", suffix: "+" },
          ].map((item, i) => (
            <div
              key={i}
              className="rounded-2xl border shadow-md p-8 text-center bg-white hover:shadow-lg transition"
            >
              <div className="mx-auto h-16 w-16 rounded-full bg-[#1c6c3b] text-white flex items-center justify-center shadow">
                {item.icon === "check" && (
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
                {item.icon === "shield" && (
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2l7 4v6c0 5-3.8 9.4-7 10-3.2-.6-7-5-7-10V6l7-4z" />
                  </svg>
                )}
                {item.icon === "star" && (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                    <path d="M12 17.3l6.18 3.64-1.64-7.03L21 9.24l-7.19-.61L12 2 10.19 8.63 3 9.24l4.46 4.67-1.64 7.03L12 17.3z" />
                  </svg>
                )}
              </div>
              <div className="mt-5 text-4xl font-inter font-normal text-gray-900 tracking-tight">
                {counts[item.key].toLocaleString()}
                {item.suffix}
              </div>
              <div className="mt-2 text-gray-600 text-lg font-inter font-medium">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why choose (FEATURES SECTION WITH NEW HOVER EFFECT) */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-center">
          <span className="inline-block bg-brand-100 text-brand-700 px-4 py-1 rounded-full text-sm font-inter">
            Why Choose SewaHive
          </span>
          <h2 className="mt-4 text-4xl font-poppins font-medium">Our Top Features</h2>
          <p className="mt-2 text-gray-600 font-inter">
            Everything you need to find and hire the perfect professional for your task
          </p>
        </div>

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Secure & Safe",
              desc: "All payments are processed securely with buyer protection and encrypted transactions",
              badge: "100% Secure",
              badgeColor: "bg-green-100 text-green-800",
              iconColor: "from-green-500 to-emerald-600",
              hoverBg: "hover:bg-green-50",
              icon: "shield",
            },
            {
              title: "Top Rated Pros",
              desc: "Browse verified reviews and ratings from real customers to make informed decisions",
              badge: "4.8+ Avg Rating",
              badgeColor: "bg-yellow-100 text-yellow-800",
              iconColor: "from-yellow-400 to-orange-500",
              hoverBg: "hover:bg-yellow-50",
              icon: "star",
            },
            {
              title: "Local Experts",
              desc: "Find trusted professionals in your neighborhood who understand local needs",
              badge: "All Major Cities",
              badgeColor: "bg-pink-100 text-pink-800",
              iconColor: "from-pink-500 to-fuchsia-600",
              hoverBg: "hover:bg-pink-50",
              icon: "pin",
            },
            {
              title: "Flexible Scheduling",
              desc: "Book for today or schedule for later at your convenience, 24/7 availability",
              badge: "Same Day Service",
              badgeColor: "bg-blue-100 text-blue-800",
              iconColor: "from-blue-500 to-indigo-600",
              hoverBg: "hover:bg-blue-50",
              icon: "calendar",
            },
          ].map((f, i) => (
            <div
              key={i}
              className={`group rounded-2xl border shadow-sm p-6 bg-white transition-all duration-300 hover:-translate-y-3 hover:shadow-[0_12px_30px_rgba(0,0,0,0.12)] ${f.hoverBg}`}
            >
              {/* ICON */}
              <div
                className={`h-12 w-12 rounded-xl bg-gradient-to-br ${f.iconColor} text-white grid place-items-center transition-all duration-300 group-hover:scale-110 group-hover:brightness-110`}
              >
                {f.icon === "shield" && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l7 4v6c0 5-3.8 9.4-7 10-3.2-.6-7-5-7-10V6l7-4z" />
                  </svg>
                )}
                {f.icon === "star" && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 17.3l6.18 3.64-1.64-7.03L21 9.24l-7.19-.61L12 2 10.19 8.63 3 9.24l4.46 4.67-1.64 7.03L12 17.3z" />
                  </svg>
                )}
                {f.icon === "pin" && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 21s-6-5.33-6-10a6 6 0 1112 0c0 4.67-6 10-6 10z" />
                    <circle cx="12" cy="11" r="2" />
                  </svg>
                )}
                {f.icon === "calendar" && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                )}
              </div>

              {/* TITLE */}
              <div className="mt-4 text-lg font-poppins font-medium text-gray-900">
                {f.title}
              </div>

              {/* DESCRIPTION */}
              <p className="mt-2 text-sm text-gray-600 font-inter leading-relaxed">
                {f.desc}
              </p>

              {/* BADGE */}
              <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-inter ${f.badgeColor}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span>{f.badge}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center">
          <h2 className="text-4xl font-poppins font-medium">Pros for every project in</h2>
          <div className="mt-1 text-4xl font-poppins font-medium text-brand-700">Your Area</div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-8 text-sm font-inter">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`relative pb-2 flex items-center gap-2 ${activeTab === t ? "text-brand-700" : "text-gray-600"}`}
            >
              {/* Icons */}
              {t === "Cleaners" && (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3l6 6" strokeLinecap="round" />
                  <path d="M2 22l9-9" strokeLinecap="round" />
                  <path d="M3.5 20.5l2 2" strokeLinecap="round" />
                  <path d="M5.5 18.5l2 2" strokeLinecap="round" />
                  <path d="M7.5 16.5l2 2" strokeLinecap="round" />
                </svg>
              )}
              {t === "Handymen" && (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 3l5 5-3 3-5-5z" />
                  <path d="M2 22l6-6" />
                  <path d="M14 7l-9 9" />
                </svg>
              )}
              {t === "Plumbers" && (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 21s-6-5-6-10a6 6 0 1112 0c0 5-6 10-6 10z" />
                </svg>
              )}
              {t === "Decors" && (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13.5 2a6.5 6.5 0 000 13h3a2.5 2.5 0 010 5H8" />
                  <circle cx="6" cy="18" r="2" />
                </svg>
              )}
              {t === "Electrical Pros" && (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h7l-1 8 10-12h-7z" />
                </svg>
              )}

              <span className="font-inter">{t}</span>

              {activeTab === t && (
                <span className="absolute left-0 right-0 mx-auto mt-7 h-[2px] w-12 bg-brand-700"></span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {servicesByTab[activeTab].map((s, i) => (
            <div
              key={i}
              className="service-card rounded-2xl overflow-hidden shadow-sm bg-white hover:-translate-y-2 hover:shadow-md transition-all"
            >
              <div
                className="image-zoom h-44 bg-gray-200"
                style={{
                  backgroundImage: `url(${s.img})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div className="p-4">
                <div className="font-inter font-medium">{s.title}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Steps with animations */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-10 items-start">
          {/* LEFT TEXT AREA */}
          <div className="fade-up" style={{ animationDelay: "0.1s" }}>
            <h2 className="text-4xl md:text-5xl font-poppins font-medium">
              Step-by-Step Guide to Getting Your Task Done with Ease
            </h2>
            <p className="mt-4 text-gray-600 font-inter max-w-xl">
              Discover how easy it is to find the right professional for your everyday needs.
              Follow these three simple steps to connect with trusted experts and get your tasks
              done quickly, safely, and hassle-free.
            </p>
          </div>

          {/* RIGHT STEPS LIST */}
          <div className="space-y-8">
            {[
              {
                n: "1",
                t: "Choose Your Service",
                d: "Browse through Sewa Hive's wide range of service categories and pick the one that suits your needs.",
              },
              {
                n: "2",
                t: "Book a Service Provider",
                d: "Select from our trusted, verified professionals. Check their ratings and book your preferred expert.",
              },
              {
                n: "3",
                t: "Get It Done",
                d: "Sit back and relax while our professional completes the task with care and precision.",
              },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                {/* Circle Number Animation */}
                <div
                  className="h-10 w-10 rounded-full bg-brand-500 text-white grid place-items-center step-pop"
                  style={{ animationDelay: `${0.2 + i * 0.15}s` }}
                >
                  {step.n}
                </div>

                {/* Text Block Animation */}
                <div className="step-slide" style={{ animationDelay: `${0.25 + i * 0.15}s` }}>
                  <div className="text-lg font-poppins font-medium">{step.t}</div>
                  <p className="mt-1 text-gray-600 font-inter text-sm md:text-base">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular services */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center">
          <h2 className="text-3xl font-poppins font-medium">Discover Most Popular Services</h2>
          <p className="mt-2 text-sm text-gray-600 font-inter">
            Explore the services our customers love the most
          </p>
        </div>

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "House Cleaning",
              rating: "4.9",
              stats: ["250+ Providers", "2.5k+ bookings", "From NPR 500"],
              img: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800&auto=format&fit=crop",
            },
            {
              title: "Plumbing Repair",
              rating: "4.8",
              stats: ["180+ Providers", "1.8k+ bookings", "From NPR 800"],
              img: "https://images.unsplash.com/photo-1517048676732-d65bcf4dbf47?q=80&w=800&auto=format&fit=crop",
            },
            {
              title: "Electrical Work",
              rating: "4.9",
              stats: ["200+ Providers", "2.1k+ bookings", "From NPR 700"],
              img: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop",
            },
            {
              title: "Home Painting",
              rating: "4.7",
              stats: ["120+ Providers", "12k+ bookings", "From NPR 1,500"],
              img: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?q=80&w=800&auto=format&fit=crop",
            },
            {
              title: "Furniture Assembly",
              rating: "4.8",
              stats: ["95+ Providers", "950+ bookings", "From NPR 600"],
              img: "https://images.unsplash.com/photo-1581572891871-237a7c66c1ea?q=80&w=800&auto=format&fit=crop",
            },
            {
              title: "AC Repair & Service",
              rating: "4.9",
              stats: ["140+ Providers", "1.5k+ bookings", "From NPR 1,000"],
              img: "https://images.unsplash.com/photo-1562101240-3b6b92c198b5?q=80&w=800&auto=format&fit=crop",
            },
            {
              title: "Deep Cleaning",
              rating: "4.8",
              stats: ["160+ Providers", "1.3k+ bookings", "From NPR 1,200"],
              img: "https://images.unsplash.com/photo-1581578016903-4f6a3c7f91ce?q=80&w=800&auto=format&fit=crop",
            },
            {
              title: "Handyman Services",
              rating: "4.7",
              stats: ["210+ Providers", "1.9k+ bookings", "From NPR 500"],
              img: "https://images.unsplash.com/photo-1560184897-aec8a45d28c1?q=80&w=800&auto=format&fit=crop",
            },
          ].map((card, i) => (
            <div
              key={i}
              className="popular-card rounded-2xl overflow-hidden shadow-sm bg-white hover:-translate-y-2 hover:shadow-md transition-all"
            >
              <div className="relative">
                {/* Image */}
                <div
                  className="h-40 bg-gray-200"
                  style={{
                    backgroundImage: `url(${card.img})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                ></div>

                {/* Rating Badge */}
                <div className="absolute top-2 right-2 bg-brand-700 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
                    <path d="M12 17.3l6.18 3.64-1.64-7.03L21 9.24l-7.19-.61L12 2 10.19 8.63 3 9.24l4.46 4.67-1.64 7.03L12 17.3z" />
                  </svg>
                  {card.rating}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4">
                <div className="font-poppins font-medium">{card.title}</div>
                <div className="mt-2 space-y-1 text-sm text-gray-600 font-inter">
                  {card.stats.map((s, si) => (
                    <div key={si} className="flex items-center gap-2">
                      {/* 🔥 PREMIUM ICON LOGIC */}
                      {si === 0 && (
                        /* Providers */
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-brand-700"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            d="M17 20v-2a4 4 0 00-3-3.87M7 20v-2a4 4 0 013-3.87"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 12a4 4 0 110-8 4 4 0 010 8z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                      {si === 1 && (
                        /* Bookings */
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-brand-700"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M8 7V3m8 4V3M3 11h18" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M9 16l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                          <rect x="3" y="7" width="18" height="14" rx="2" ry="2" />
                        </svg>
                      )}
                      {si === 2 && (
                        /* Price */
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-brand-700"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            d="M3 8a4 4 0 014-4h10a4 4 0 014 4v8a4 4 0 01-4 4H7a4 4 0 01-4-4V8z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle cx="15" cy="12" r="2" />
                        </svg>
                      )}
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-brand-700 text-white px-5 py-2 rounded-full transition-colors hover:bg-brand-800 font-inter"
          >
            Browse All Services <span>›</span>
          </Link>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center">
          <h2 className="text-3xl font-poppins font-medium">What our customers are saying</h2>
          <p className="mt-2 text-sm text-gray-600 font-inter">
            Real stories from satisfied customers across Nepal
          </p>
        </div>

        <div className="mt-8 rounded-2xl p-8 md:p-10 bg-[#1c6c3b] text-white shadow">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-white/20 grid place-items-center">👤</div>
            <div className="flex-1">
              <div className="flex gap-1 text-green-300 mb-3 items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
                    <path d="M12 17.3l6.18 3.64-1.64-7.03L21 9.24l-7.19-.61L12 2 10.19 8.63 3 9.24l4.46 4.67-1.64 7.03L12 17.3z" />
                  </svg>
                ))}
              </div>

              <blockquote className="text-lg leading-relaxed font-inter">
                <span className="font-poppins font-medium">
                  SewaHive has completely transformed how I manage home maintenance.
                </span>{" "}
                I hired a plumber for an emergency repair… they arrived within 2 hours! Affordable,
                fast, reliable — now I use SewaHive for everything.
              </blockquote>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                <span className="font-poppins font-medium">Rajesh Maharjan</span>
                <span className="text-white/80 font-inter">Kathmandu • Used Plumbing Service</span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-white/90 font-inter">
                  <svg width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Verified Customer
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* GRID TESTIMONIALS */}
        <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              name: "Sita Sharma",
              loc: "Lalitpur",
              tag: "House Cleaning",
              text: "The cleaner was punctual, thorough, and very professional. My home has never looked this clean.",
            },
            {
              name: "Ramesh Thapa",
              loc: "Bhaktapur",
              tag: "Electrical Work",
              text: "Verified electrician fixed everything in one visit. Great service and transparent pricing!",
            },
            {
              name: "Priya Gurung",
              loc: "Kathmandu",
              tag: "Furniture Assembly",
              text: "Skilled and efficient. The booking process was so simple and hassle-free!",
            },
            {
              name: "Bikram Rai",
              loc: "Pokhara",
              tag: "Home Painting",
              text: "Outstanding painting job — finished on time and my living room looks brand new.",
            },
          ].map((r, i) => (
            <div
              key={i}
              className="testimonial-card rounded-2xl border shadow-sm p-6 bg-white hover:-translate-y-2 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 grid place-items-center ring-2 ring-green-200">
                  🧑
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-poppins font-medium">{r.name}</span>
                    <span className="inline-flex items-center gap-1 text-green-700 text-xs font-inter">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      Verified
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 font-inter">{r.loc}</div>

                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-inter">
                    {r.tag}
                  </div>

                  <div className="mt-3 flex gap-1 text-yellow-500 items-center">
                    {Array.from({ length: 5 }).map((_, si) => (
                      <svg key={si} width="16" height="16" fill="currentColor" className="flex-shrink-0" viewBox="0 0 24 24">
                        <path d="M12 17.3l6.18 3.64-1.64-7.03L21 9.24l-7.19-.61L12 2 10.19 8.63 3 9.24l4.46 4.67-1.64 7.03L12 17.3z" />
                      </svg>
                    ))}
                  </div>

                  <p className="mt-2 text-sm text-gray-700 font-inter">"{r.text}"</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <button className="inline-flex items-center gap-2 border border-brand-700 text-brand-700 px-5 py-2 rounded-full hover:bg-brand-50 transition-all font-inter">
            Read More Reviews <span>›</span>
          </button>
        </div>
      </section>

      {/* CTA + Footer */}
      <section className="bg-[#164f2b] text-white">
        <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h3 className="text-3xl font-poppins font-medium">Ready to Start?</h3>
            <p className="mt-3 text-white/90 font-inter">
              Join thousands of satisfied customers who trust SewaHive for their home service needs.
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                to="/signup"
                className="bg-white text-[#164f2b] px-5 py-2 rounded-full font-inter hover:-translate-y-1 hover:shadow-md transition-all"
              >
                Get Started
              </Link>
              <Link
                to="/provider/signup"
                className="border border-white text-white px-5 py-2 rounded-full font-inter hover:bg-white/10 transition-colors"
              >
                Become a Tasker
              </Link>
            </div>
          </div>
          <div>
            <div
              className="h-48 md:h-64 rounded-2xl bg-center bg-cover"
              style={{
                backgroundImage:
                  "url(https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1200&auto=format&fit=crop)",
              }}
            ></div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-white text-gray-800">
          <div className="max-w-7xl mx-auto px-6 py-12 grid sm:grid-cols-2 md:grid-cols-5 gap-8">
            {/* Column 1 */}
            <div>
              <div className="font-poppins font-medium">SewaHive</div>
              <ul className="mt-3 space-y-2 text-sm font-inter">
                <li>
                  <a href="#about" className="hover:text-brand-700">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Press
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Blog
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 2 */}
            <div>
              <div className="font-poppins font-medium">Community</div>
              <ul className="mt-3 space-y-2 text-sm font-inter">
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Taskers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Customers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Events
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Referrals
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3 */}
            <div>
              <div className="font-poppins font-medium">Support</div>
              <ul className="mt-3 space-y-2 text-sm font-inter">
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Safety
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Privacy
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4 */}
            <div>
              <div className="font-poppins font-medium">Discover</div>
              <ul className="mt-3 space-y-2 text-sm font-inter">
                <li>
                  <a href="#categories" className="hover:text-brand-700">
                    Services
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Projects
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Reviews
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Locations
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 5 */}
            <div>
              <div className="font-poppins font-medium">Hire on SewaHive</div>
              <ul className="mt-3 space-y-2 text-sm font-inter">
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Post a Task
                  </a>
                </li>
                <li>
                  <a href="#categories" className="hover:text-brand-700">
                    Browse Services
                  </a>
                </li>
                <li>
                  <Link to="/provider/signup" className="hover:text-brand-700">
                    Become Provider
                  </Link>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Business
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t">
            <div className="max-w-7xl mx-auto px-6 py-6 text-center text-xs text-gray-600 font-inter">
              © 2024 SewaHive Inc. All rights reserved.
            </div>
            <div className="text-center pb-10 text-xs font-inter">
              <a href="/admin" className="text-brand-700">
                Admin Portal
              </a>
            </div>
          </div>
        </footer>
      </section>

      {/* Floating help widget */}
      <button className="fixed bottom-4 right-4 h-10 w-10 rounded-full bg-black text-white text-lg grid place-items-center shadow">
        ?
      </button>
    </div>
  );
}
