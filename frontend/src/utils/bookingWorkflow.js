export const PRICING_TYPES = Object.freeze({
  FIXED: "FIXED",
  RANGE: "RANGE",
  QUOTE: "QUOTE",
});

const PRICING_TYPE_ALIASES = {
  fixed: PRICING_TYPES.FIXED,
  range: PRICING_TYPES.RANGE,
  quote: PRICING_TYPES.QUOTE,
  quote_required: PRICING_TYPES.QUOTE,
  quote_based: PRICING_TYPES.QUOTE,
  quotebased: PRICING_TYPES.QUOTE,
  [PRICING_TYPES.FIXED]: PRICING_TYPES.FIXED,
  [PRICING_TYPES.RANGE]: PRICING_TYPES.RANGE,
  [PRICING_TYPES.QUOTE]: PRICING_TYPES.QUOTE,
};

export const BOOKING_TAB_STATUSES = Object.freeze({
  requested: ["requested", "quote_requested", "quote_sent", "quote_pending_admin_review", "quote_rejected"],
  pending_payment: ["pending_payment", "quote_accepted"],
  confirmed: ["confirmed", "accepted", "provider_en_route"],
  in_progress: ["in-progress", "in_progress"],
  completion_pending: ["pending-completion", "pending_completion", "completion_pending", "provider_completed", "awaiting_client_confirmation"],
  completed: ["completed", "resolved_refunded"],
  disputed: ["disputed"],
});

export function resolvePricingType(input) {
  const raw = typeof input === "string"
    ? input
    : input?.pricing?.mode || input?.serviceId?.priceMode || input?.priceMode || "fixed";

  const key = String(raw || "fixed").trim();
  return PRICING_TYPE_ALIASES[key] || PRICING_TYPE_ALIASES[key.toLowerCase()] || PRICING_TYPES.FIXED;
}

export function normalizeStatusForTab(status) {
  for (const [tab, statuses] of Object.entries(BOOKING_TAB_STATUSES)) {
    if (statuses.includes(status)) return tab;
  }
  return status;
}

export function statusMatchesTab(status, tab) {
  if (tab === "all") return true;
  return (BOOKING_TAB_STATUSES[tab] || []).includes(status);
}

export function isCompletionPendingStatus(status) {
  return BOOKING_TAB_STATUSES.completion_pending.includes(status);
}
