// src/utils/categoryIcons.js
const iconMap = {
  cleaning: "🧹",
  handyman: "🔧",
  plumbing: "💧",
  electrical: "⚡",
  painting: "🎨",
  moving: "📦",
  gardening: "🌿",
  pest_control: "🪲",
  beauty: "💇",
  tutoring: "📚",
  automotive: "🚗",
  appliances: "🧺",
  electronics: "💻",
};

export function getCategoryIcon(category) {
  if (!category) return "📦";
  if (category.icon) return category.icon;
  if (category.iconKey && iconMap[category.iconKey]) return iconMap[category.iconKey];
  return "📦";
}

export function getIconByKey(iconKey) {
  return iconMap[iconKey] || "📦";
}
