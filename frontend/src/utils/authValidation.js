export const MAX_NAME_LENGTH = 60;
export const MAX_EMAIL_LENGTH = 254;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

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

export function normalizeName(name = "") {
  return String(name || "").replace(/\s+/g, " ").trim();
}

export function normalizeEmail(email = "") {
  return String(email || "").trim().toLowerCase();
}

export function validateName(name = "") {
  const normalizedName = normalizeName(name);

  if (!normalizedName) return "Full name is required.";
  if (normalizedName.length < 2) return "Full name must be at least 2 characters long.";
  if (normalizedName.length > MAX_NAME_LENGTH) {
    return `Full name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  }

  const letterMatches = normalizedName.match(/\p{L}/gu) || [];
  if (letterMatches.length < 2) return "Please enter a valid name using real letters.";

  if (!/^[\p{L}\p{M}]+(?:[ .'-][\p{L}\p{M}]+)*$/u.test(normalizedName)) {
    return "Use letters, spaces, apostrophes, hyphens, or periods only in your name.";
  }

  if (/^[^\p{L}]+$/u.test(normalizedName)) {
    return "Please enter a valid name using real letters.";
  }

  return "";
}

export function validateEmail(email = "") {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) return "Email is required.";
  if (normalizedEmail.length > MAX_EMAIL_LENGTH) return "Email address is too long.";
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(normalizedEmail)) {
    return "Please enter a valid email address.";
  }
  if (normalizedEmail.includes("..")) return "Please enter a valid email address.";

  const [localPart = "", domain = ""] = normalizedEmail.split("@");
  if (!localPart || !domain || localPart.length > 64) return "Please enter a valid email address.";

  const domainLabels = domain.split(".");
  if (domainLabels.some((label) => !label || label.startsWith("-") || label.endsWith("-"))) {
    return "Please enter a valid email address.";
  }

  const topLevelDomain = domainLabels[domainLabels.length - 1] || "";
  if (topLevelDomain.length < 2) return "Please enter a valid email address.";

  return "";
}

export function validatePassword(password = "", { email = "", name = "" } = {}) {
  const normalizedPassword = String(password || "");
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = normalizeName(name);
  const loweredPassword = normalizedPassword.toLowerCase();

  if (!normalizedPassword) return "Password is required.";
  if (normalizedPassword.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  }
  if (normalizedPassword.length > MAX_PASSWORD_LENGTH) {
    return `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`;
  }
  if (/\s/.test(normalizedPassword)) return "Password cannot contain spaces.";
  if (!/[a-z]/.test(normalizedPassword)) return "Password must include at least one lowercase letter.";
  if (!/[A-Z]/.test(normalizedPassword)) return "Password must include at least one uppercase letter.";
  if (!/\d/.test(normalizedPassword)) return "Password must include at least one number.";
  if (!/[^A-Za-z0-9]/.test(normalizedPassword)) return "Password must include at least one special character.";
  if (COMMON_WEAK_PASSWORDS.has(loweredPassword)) return "Please choose a less predictable password.";

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

export function validateSignupValues(values = {}) {
  const normalizedName = normalizeName(values.name);
  const normalizedEmail = normalizeEmail(values.email);

  const errors = {
    name: validateName(normalizedName),
    email: validateEmail(normalizedEmail),
    password: validatePassword(values.password, {
      email: normalizedEmail,
      name: normalizedName,
    }),
    confirmPassword: !values.confirmPassword
      ? "Please confirm your password."
      : values.password !== values.confirmPassword
      ? "Passwords do not match."
      : "",
    acceptTerms: values.acceptTerms ? "" : "You must accept the Terms & Conditions.",
  };

  return {
    normalizedName,
    normalizedEmail,
    errors,
    isValid: Object.values(errors).every((value) => !value),
  };
}
