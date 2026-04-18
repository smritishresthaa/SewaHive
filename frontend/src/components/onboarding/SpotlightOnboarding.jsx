import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  HiArrowLongRight,
  HiCheck,
  HiChevronLeft,
  HiChevronRight,
  HiXMark,
} from "react-icons/hi2";
import { useAuth } from "../../context/AuthContext";

const SPOTLIGHT_PADDING = 8;
const MAX_TARGET_RETRIES = 8;
const TARGET_RETRY_DELAY = 120;

function buildRect(rect) {
  return {
    top: Math.max(SPOTLIGHT_PADDING, rect.top - SPOTLIGHT_PADDING),
    left: Math.max(SPOTLIGHT_PADDING, rect.left - SPOTLIGHT_PADDING),
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
  };
}

function isElementRenderable(element) {
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    styles.display !== "none" &&
    styles.visibility !== "hidden" &&
    styles.opacity !== "0" &&
    !element.hasAttribute("hidden")
  );
}

function isElementOnScreen(element) {
  if (!isElementRenderable(element)) return false;

  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  return (
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < viewportHeight &&
    rect.left < viewportWidth
  );
}

function getTargetFromSelectors(selectors = []) {
  for (const selector of selectors) {
    if (!selector) continue;

    const elements = Array.from(document.querySelectorAll(selector));
    if (!elements.length) continue;

    const onScreenMatch = elements.find((element) => isElementOnScreen(element));
    if (onScreenMatch) return onScreenMatch;

    const renderableMatch = elements.find((element) => isElementRenderable(element));
    if (renderableMatch) return renderableMatch;
  }

  return null;
}

function shouldScrollIntoView(rect) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const verticalBuffer = Math.min(96, viewportHeight * 0.14);
  const horizontalBuffer = Math.min(56, viewportWidth * 0.08);

  return (
    rect.top < verticalBuffer ||
    rect.bottom > viewportHeight - verticalBuffer ||
    rect.left < horizontalBuffer ||
    rect.right > viewportWidth - horizontalBuffer
  );
}

function clampTooltipPosition(rect, viewportWidth, viewportHeight) {
  const cardWidth = Math.min(360, viewportWidth - 24);
  const prefersBelow = rect.top < viewportHeight * 0.35;
  const top = prefersBelow
    ? Math.min(viewportHeight - 190, rect.bottom + 16)
    : Math.max(12, rect.top - 176);
  const left = Math.min(
    viewportWidth - cardWidth - 12,
    Math.max(12, rect.left + rect.width / 2 - cardWidth / 2)
  );

  return { top, left, width: cardWidth };
}

export default function SpotlightOnboarding({ role = "client" }) {
  const { user, markWalkthroughStatus } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const activeTargetRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const animationFrameRef = useRef(null);
  const settleFrameRef = useRef(null);

  const normalizedRole = role === "provider" ? "provider" : "client";
  const isDashboardRoute =
    normalizedRole === "provider"
      ? location.pathname === "/provider/dashboard"
      : location.pathname === "/client/dashboard";

  const walkthroughState = user?.onboarding?.walkthrough?.[normalizedRole] || {};
  const profileMissing = !user?.onboarding?.profileCompleted;
  const providerNeedsSetup =
    normalizedRole === "provider" &&
    (!user?.onboarding?.kycCompleted ||
      !user?.onboarding?.skillProfileCompleted ||
      profileMissing);

  const steps = useMemo(() => {
    if (normalizedRole === "provider") {
      return [
        {
          id: "provider-home",
          title: "This is your provider command center",
          body:
            "Use this dashboard to track requests, earnings, ratings, and the live health of your provider account.",
          selectors: ['[data-onboarding="provider-main"]'],
        },
        {
          id: "provider-profile",
          title: providerNeedsSetup
            ? "Start with profile and verification"
            : "Keep your provider profile sharp",
          body: providerNeedsSetup
            ? "Complete your profile, verification, and credibility details here so clients can trust and book you faster."
            : "Your profile and verification areas control how trustworthy and bookable your provider account looks to clients.",
          selectors: [
            '[data-onboarding="provider-profile-link"]',
            '[data-onboarding="provider-menu-button"]',
            '[data-onboarding="provider-main"]',
          ],
        },
        {
          id: "provider-services",
          title: "Manage the services you offer",
          body:
            "Add services, refine pricing, and keep your listings ready for discovery from this area.",
          selectors: [
            '[data-onboarding="provider-services-link"]',
            '[data-onboarding="provider-menu-button"]',
            '[data-onboarding="provider-main"]',
          ],
        },
        {
          id: "provider-bookings",
          title: "Stay on top of bookings and messages",
          body:
            "New requests, ongoing jobs, and chat conversations stay easier to manage from your bookings and messages areas.",
          selectors: [
            '[data-onboarding="provider-bookings-link"]',
            '[data-onboarding="provider-messages-link"]',
            '[data-onboarding="provider-menu-button"]',
            '[data-onboarding="provider-main"]',
          ],
        },
        {
          id: "provider-performance",
          title: "Watch your performance signals",
          body:
            "Trust score, reviews, earnings, and booking trends help you understand what is improving and where to focus next.",
          selectors: [
            '[data-onboarding="provider-performance"]',
            '[data-onboarding="provider-main"]',
          ],
        },
      ];
    }

    return [
      {
        id: "client-home",
        title: "This is your client home base",
        body:
          "Your dashboard keeps bookings, updates, and quick access actions in one place so you can get help fast.",
        selectors: ['[data-onboarding="client-main"]'],
      },
      {
        id: "client-browse",
        title: "Browse services from the real dashboard",
        body:
          "Start here when you want to explore providers and request a service without leaving the main experience.",
        selectors: [
          '[data-onboarding="client-browse-services"]',
          '[data-onboarding="client-main"]',
        ],
      },
      {
        id: "client-bookings",
        title: "Track requests and booking progress",
        body:
          "Your booking history keeps upcoming, pending, and completed service requests organized in one place.",
        selectors: [
          '[data-onboarding="client-bookings-link"]',
          '[data-onboarding="client-main"]',
        ],
      },
      {
        id: "client-account",
        title: profileMissing
          ? "Finish your profile from here"
          : "Profile and messages stay close",
        body: profileMissing
          ? "Add your phone and address from your profile area so future booking details and coordination stay smooth."
          : "Use your profile and messages areas to manage account details, requests, and provider conversations.",
        selectors: [
          '[data-onboarding="client-profile-button"]',
          '[data-onboarding="client-messages-link"]',
          '[data-onboarding="client-menu-button"]',
          '[data-onboarding="client-main"]',
        ],
      },
    ];
  }, [normalizedRole, profileMissing, providerNeedsSetup]);

  const clearPendingWork = useCallback(() => {
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (settleFrameRef.current) {
      window.cancelAnimationFrame(settleFrameRef.current);
      settleFrameRef.current = null;
    }
  }, []);

  const measureTarget = useCallback(
    (element, { allowScroll = false, behavior = "smooth" } = {}) => {
      if (!element || !isElementRenderable(element)) {
        activeTargetRef.current = null;
        setTargetRect(null);
        return;
      }

      const rect = element.getBoundingClientRect();
      activeTargetRef.current = element;

      if (allowScroll && shouldScrollIntoView(rect)) {
        element.scrollIntoView({ behavior, block: "center", inline: "center" });
      }

      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }

      if (settleFrameRef.current) {
        window.cancelAnimationFrame(settleFrameRef.current);
      }

      animationFrameRef.current = window.requestAnimationFrame(() => {
        settleFrameRef.current = window.requestAnimationFrame(() => {
          if (!isElementRenderable(element)) {
            activeTargetRef.current = null;
            setTargetRect(null);
            return;
          }

          setTargetRect(buildRect(element.getBoundingClientRect()));
        });
      });
    },
    []
  );

  const resolveTarget = useCallback(
    (attempt = 0, options = {}) => {
      if (!isOpen) return;

      const currentStep = steps[stepIndex];
      if (!currentStep) return;

      const target = getTargetFromSelectors(currentStep.selectors);

      if (!target) {
        if (attempt >= MAX_TARGET_RETRIES) {
          activeTargetRef.current = null;
          setTargetRect(null);
          return;
        }

        retryTimeoutRef.current = window.setTimeout(() => {
          resolveTarget(attempt + 1, options);
        }, TARGET_RETRY_DELAY);
        return;
      }

      measureTarget(target, options);
    },
    [isOpen, measureTarget, stepIndex, steps]
  );

  useEffect(() => {
    if (!isDashboardRoute || isOpen) return undefined;
    if (walkthroughState?.completedAt || walkthroughState?.skippedAt) return undefined;

    const timer = window.setTimeout(() => {
      setStepIndex(0);
      setIsOpen(true);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [isDashboardRoute, isOpen, walkthroughState?.completedAt, walkthroughState?.skippedAt]);

  useEffect(() => {
    if (!isOpen) {
      clearPendingWork();
      activeTargetRef.current = null;
      setTargetRect(null);
      return undefined;
    }

    setTargetRect(null);
    resolveTarget(0, {
      allowScroll: true,
      behavior: stepIndex === 0 ? "auto" : "smooth",
    });

    return () => {
      clearPendingWork();
    };
  }, [clearPendingWork, isOpen, resolveTarget, stepIndex]);

  useEffect(() => {
    if (!isOpen) return undefined;

    let ticking = false;

    const remeasure = () => {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        ticking = false;

        const currentTarget = activeTargetRef.current;
        if (currentTarget && isElementRenderable(currentTarget)) {
          measureTarget(currentTarget, { allowScroll: false });
          return;
        }

        resolveTarget(0, { allowScroll: false, behavior: "auto" });
      });
    };

    window.addEventListener("resize", remeasure);
    window.addEventListener("scroll", remeasure, true);

    let resizeObserver;
    if (typeof ResizeObserver !== "undefined" && activeTargetRef.current) {
      resizeObserver = new ResizeObserver(() => {
        remeasure();
      });
      resizeObserver.observe(activeTargetRef.current);
    }

    return () => {
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", remeasure, true);
      resizeObserver?.disconnect();
    };
  }, [isOpen, measureTarget, resolveTarget, targetRect, stepIndex]);

  const currentStep = steps[stepIndex];

  async function persistStatus(status) {
    try {
      setIsSaving(true);
      await markWalkthroughStatus(normalizedRole, status);
    } catch (error) {
      console.error("Failed to update walkthrough state", error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSkip() {
    setIsOpen(false);
    if (!walkthroughState?.completedAt) {
      await persistStatus("skipped");
    }
  }

  async function handleDone() {
    setIsOpen(false);
    await persistStatus("completed");
  }

  function handleReplay() {
    setStepIndex(0);
    setIsOpen(true);
  }

  function handleContextAction() {
    if (normalizedRole === "provider") {
      if (profileMissing || !user?.onboarding?.skillProfileCompleted) {
        navigate("/provider/profile");
      } else if (!user?.onboarding?.kycCompleted) {
        navigate("/provider/verification");
      } else {
        navigate("/provider/services");
      }
      return;
    }

    if (profileMissing) {
      navigate("/client/profile/edit");
    } else {
      navigate("/services");
    }
  }

  const showContextAction =
    (normalizedRole === "client" &&
      (profileMissing || currentStep?.id === "client-browse")) ||
    (normalizedRole === "provider" &&
      (providerNeedsSetup || currentStep?.id === "provider-services"));

  return (
    <>
      {isDashboardRoute && (
        <button
          type="button"
          onClick={handleReplay}
          className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/95 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:bg-emerald-50 sm:bottom-6 sm:right-6"
        >
          <HiArrowLongRight className="h-4 w-4" />
          Replay tour
        </button>
      )}

      {isOpen && currentStep && targetRect && (
        <div className="fixed inset-0 z-[120]">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px]" />

          <div
            className="pointer-events-none absolute rounded-3xl border-2 border-emerald-300 shadow-[0_0_0_9999px_rgba(2,6,23,0.6)] transition-all duration-300 ease-out"
            style={{
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height,
            }}
          />

          <div
            className="absolute rounded-3xl border border-white/15 bg-white p-5 shadow-2xl transition-all duration-300 ease-out"
            style={clampTooltipPosition(targetRect, window.innerWidth, window.innerHeight)}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  {normalizedRole === "provider" ? "Provider tour" : "Client tour"}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-950">
                  {currentStep.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {currentStep.body}
                </p>
              </div>

              <button
                type="button"
                onClick={handleSkip}
                disabled={isSaving}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Close onboarding"
              >
                <HiXMark className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {steps.map((step, index) => (
                  <span
                    key={step.id}
                    className={`h-2.5 rounded-full transition-all ${
                      index === stepIndex ? "w-6 bg-emerald-600" : "w-2.5 bg-slate-200"
                    }`}
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {showContextAction && (
                  <button
                    type="button"
                    onClick={handleContextAction}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    {normalizedRole === "provider"
                      ? providerNeedsSetup
                        ? "Open setup"
                        : "Open services"
                      : profileMissing
                      ? "Open profile"
                      : "Browse services"}
                    <HiArrowLongRight className="h-4 w-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={isSaving}
                  className="rounded-full px-3.5 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                >
                  Skip
                </button>

                <button
                  type="button"
                  onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
                  disabled={stepIndex === 0}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <HiChevronLeft className="h-4 w-4" />
                  Back
                </button>

                {stepIndex === steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleDone}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <HiCheck className="h-4 w-4" />
                    Got it
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setStepIndex((value) => Math.min(steps.length - 1, value + 1))
                    }
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    Next
                    <HiChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}