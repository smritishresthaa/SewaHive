function normalizeNepalPhone(raw = "") {
  let phone = String(raw).trim();

  // remove spaces, dashes, parentheses
  phone = phone.replace(/[\s\-()]/g, "");

  if (phone.startsWith("+977")) {
    phone = phone.slice(4);
  } else if (phone.startsWith("977")) {
    phone = phone.slice(3);
  }

  return phone;
}

function isValidNepalMobile(raw = "") {
  const phone = normalizeNepalPhone(raw);
  return /^(97|98)\d{8}$/.test(phone);
}

module.exports = {
  normalizeNepalPhone,
  isValidNepalMobile,
};