const PRICING_TYPES = Object.freeze({
  FIXED: "FIXED",
  RANGE: "RANGE",
  QUOTE: "QUOTE",
});

const pricingTypeAliasMap = {
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

const STATUS_ALIASES = Object.freeze({
  requested: ["requested", "quote_requested", "quote_sent", "quote_pending_admin_review", "quote_rejected"],
  pending_payment: ["pending_payment", "quote_accepted"],
  confirmed: ["confirmed", "accepted", "provider_en_route"],
  in_progress: ["in-progress", "in_progress"],
  completion_pending: ["pending-completion", "pending_completion", "completion_pending", "provider_completed", "awaiting_client_confirmation"],
  completed: ["completed", "resolved_refunded"],
  disputed: ["disputed"],
});

const TERMINAL_STATUSES = Object.freeze(["completed", "cancelled", "rejected", "no-show", "resolved_refunded"]);

function resolvePricingType(input) {
  const raw = typeof input === "string"
    ? input
    : input?.pricing?.mode || input?.serviceId?.priceMode || input?.priceMode || "fixed";

  const key = String(raw || "fixed").trim();
  return pricingTypeAliasMap[key] || pricingTypeAliasMap[key.toLowerCase()] || PRICING_TYPES.FIXED;
}

function isQuotePricing(input) {
  return resolvePricingType(input) === PRICING_TYPES.QUOTE;
}

function isRangePricing(input) {
  return resolvePricingType(input) === PRICING_TYPES.RANGE;
}

function isFixedPricing(input) {
  return resolvePricingType(input) === PRICING_TYPES.FIXED;
}

function toStoredPricingMode(input) {
  const pricingType = resolvePricingType(input);
  if (pricingType === PRICING_TYPES.RANGE) return "range";
  if (pricingType === PRICING_TYPES.QUOTE) return "quote_required";
  return "fixed";
}

function getStatusesForTab(tab) {
  if (!tab) return [];
  return STATUS_ALIASES[tab] || [];
}

function isCompletionPendingStatus(status) {
  return STATUS_ALIASES.completion_pending.includes(status);
}

function normalizeStatusForTab(status) {
  for (const [tab, statuses] of Object.entries(STATUS_ALIASES)) {
    if (statuses.includes(status)) {
      return tab;
    }
  }
  return status;
}

function resolvePostInitialEscrowStatus(booking) {
  return isQuotePricing(booking) ? "confirmed" : "requested";
}

module.exports = {
  PRICING_TYPES,
  STATUS_ALIASES,
  TERMINAL_STATUSES,
  resolvePricingType,
  toStoredPricingMode,
  isQuotePricing,
  isRangePricing,
  isFixedPricing,
  getStatusesForTab,
  isCompletionPendingStatus,
  normalizeStatusForTab,
  resolvePostInitialEscrowStatus,
};
