const MAX_NAME_LENGTH = 60;
const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

const COMMON_WEAK_PASSWORDS = new Set([
  "password",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "welcome123",
  "admin123",
  "letmein123",
  "abc12345",
  "iloveyou",
  "00000000",
]);

function normalizeName(name = "") {
  return String(name || "").replace(/\s+/g, " ").trim();
}

function normalizeEmail(email = "") {
  return String(email || "").trim().toLowerCase();
}

function validateName(name = "") {
  const normalizedName = normalizeName(name);

  if (!normalizedName) {
    return "Full name is required.";
  }

  if (normalizedName.length < 2) {
    return "Full name must be at least 2 characters long.";
  }

  if (normalizedName.length > MAX_NAME_LENGTH) {
    return `Full name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  }

  const letterMatches = normalizedName.match(/\p{L}/gu) || [];
  if (letterMatches.length < 2) {
    return "Please enter a valid name using real letters.";
  }

  if (!/^[\p{L}\p{M}]+(?:[ .'-][\p{L}\p{M}]+)*$/u.test(normalizedName)) {
    return "Use letters, spaces, apostrophes, hyphens, or periods only in your name.";
  }

  if (/^[^\p{L}]+$/u.test(normalizedName)) {
    return "Please enter a valid name using real letters.";
  }

  return "";
}

function validateEmail(email = "") {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return "Email is required.";
  }

  if (normalizedEmail.length > MAX_EMAIL_LENGTH) {
    return "Email address is too long.";
  }

  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(normalizedEmail)) {
    return "Please enter a valid email address.";
  }

  if (normalizedEmail.includes("..")) {
    return "Please enter a valid email address.";
  }

  const [localPart = "", domain = ""] = normalizedEmail.split("@");

  if (!localPart || !domain || localPart.length > 64) {
    return "Please enter a valid email address.";
  }

  const domainLabels = domain.split(".");
  if (domainLabels.some((label) => !label || label.startsWith("-") || label.endsWith("-"))) {
    return "Please enter a valid email address.";
  }

  const topLevelDomain = domainLabels[domainLabels.length - 1] || "";
  if (topLevelDomain.length < 2) {
    return "Please enter a valid email address.";
  }

  return "";
}

function validatePassword(password = "", { email = "", name = "" } = {}) {
  const normalizedPassword = String(password || "");
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = normalizeName(name);
  const loweredPassword = normalizedPassword.toLowerCase();

  if (!normalizedPassword) {
    return "Password is required.";
  }

  if (normalizedPassword.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  }

  if (normalizedPassword.length > MAX_PASSWORD_LENGTH) {
    return `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`;
  }

  if (/\s/.test(normalizedPassword)) {
    return "Password cannot contain spaces.";
  }

  if (!/[a-z]/.test(normalizedPassword)) {
    return "Password must include at least one lowercase letter.";
  }

  if (!/[A-Z]/.test(normalizedPassword)) {
    return "Password must include at least one uppercase letter.";
  }

  if (!/\d/.test(normalizedPassword)) {
    return "Password must include at least one number.";
  }

  if (!/[^A-Za-z0-9]/.test(normalizedPassword)) {
    return "Password must include at least one special character.";
  }

  if (COMMON_WEAK_PASSWORDS.has(loweredPassword)) {
    return "Please choose a less predictable password.";
  }

  const localPart = normalizedEmail.split("@")[0] || "";
  const blockedParts = [
    localPart,
    ...normalizedName
      .toLowerCase()
      .split(/[^\p{L}\p{M}]+/u)
      .filter((part) => part.length >= 3),
  ].filter(Boolean);

  if (blockedParts.some((part) => loweredPassword.includes(part.toLowerCase()))) {
    return "Password should not include your name or email.";
  }

  return "";
}

function validateRegistrationPayload({ name = "", email = "", password = "" } = {}) {
  const normalizedName = normalizeName(name);
  const normalizedEmail = normalizeEmail(email);

  const errors = {
    name: validateName(normalizedName),
    email: validateEmail(normalizedEmail),
    password: validatePassword(password, { email: normalizedEmail, name: normalizedName }),
  };

  return {
    normalizedName,
    normalizedEmail,
    errors,
    isValid: !errors.name && !errors.email && !errors.password,
  };
}

module.exports = {
  MAX_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  normalizeName,
  normalizeEmail,
  validateName,
  validateEmail,
  validatePassword,
  validateRegistrationPayload,
};
