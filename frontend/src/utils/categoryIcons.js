// src/utils/categoryIcons.js
import React from "react";
import {
  FiHome,
  FiDroplet,
  FiZap,
  FiTool,
  FiPenTool,
  FiSun,
  FiWind,
  FiPackage,
  FiSettings,
  FiShield,
  FiMapPin,
  FiCalendar,
  FiScissors,
  FiTruck,
  FiMonitor,
  FiGrid,
} from "react-icons/fi";
import { HiBugAnt } from "react-icons/hi2";

function normalizeCategoryValue(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/\s+/g, "-");
}

function resolveIconComponent(category) {
  const normalized = normalizeCategoryValue(
    category?.iconKey || category?.name || category || ""
  );

  const iconMap = {
    cleaning: FiHome,
    plumbing: FiDroplet,
    electrical: FiZap,
    electrician: FiZap,
    carpentry: FiTool,
    handyman: FiTool,
    painting: FiPenTool,
    decor: FiPenTool,
    "painting-and-decor": FiPenTool,
    gardening: FiSun,
    pest: HiBugAnt,
    "pest-control": HiBugAnt,
    ac: FiWind,
    "ac-repair": FiWind,
    appliance: FiSettings,
    "appliance-repair": FiSettings,
    shifting: FiPackage,
    moving: FiTruck,
    delivery: FiTruck,
    security: FiShield,
    "cctv-installation": FiShield,
    salon: FiScissors,
    beauty: FiScissors,
    "home-salon": FiScissors,
    electronics: FiMonitor,
    "computer-repair": FiMonitor,
    default: FiGrid,
  };

  return iconMap[normalized] || iconMap.default;
}

export function getCategoryIcon(category, className = "w-5 h-5") {
  const Icon = resolveIconComponent(category);
  return React.createElement(Icon, { className });
}

export function getCategoryIconComponent(category) {
  return resolveIconComponent(category);
}