const sendEmail = require("./sendEmail");

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function providerGreeting(providerName) {
  const safeName = String(providerName || "").trim();
  return safeName ? `Hi ${escapeHtml(safeName)},` : "Hello,";
}

function normalizeDocumentType(documentType) {
  const value = String(documentType || "").trim().toLowerCase();
  if (value === "driving_license") return "driving license";
  if (value === "citizenship") return "citizenship";
  if (value === "passport") return "passport";
  return "identity document";
}

function wrapEmail({ heading, intro, details = [], nextSteps = [], footer = "" }) {
  const detailsHtml = details.length
    ? `<ul>${details.map((item) => `<li>${item}</li>`).join("")}</ul>`
    : "";

  const nextStepsHtml = nextSteps.length
    ? `
      <p><strong>What happens next:</strong></p>
      <ul>${nextSteps.map((item) => `<li>${item}</li>`).join("")}</ul>
    `
    : "";

  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <h2 style="margin-bottom: 12px; color: #065f46;">${heading}</h2>
      <p>${intro}</p>
      ${detailsHtml}
      ${nextStepsHtml}
      ${footer ? `<p style="margin-top: 16px;">${footer}</p>` : ""}
      <p style="margin-top: 20px;">Thanks,<br/>SewaHive</p>
    </div>
  `;
}

async function sendProviderIdVerificationSubmittedEmail({
  to,
  providerName,
  documentType,
}) {
  const friendlyDocumentType = normalizeDocumentType(documentType);

  return sendEmail(
    to,
    "SewaHive ID verification submitted",
    wrapEmail({
      heading: "ID verification submitted",
      intro: `${providerGreeting(providerName)} Your ${escapeHtml(
        friendlyDocumentType
      )} verification request has been submitted successfully.`,
      details: [
        "Your documents are now in the admin review queue.",
        "We will email you again when the review is approved, rejected, or needs correction.",
      ],
      nextSteps: [
        "Keep an eye on your email and provider verification page.",
        "If corrections are requested, reupload only the documents mentioned in the email.",
      ],
    })
  );
}

async function sendProviderSkillVerificationSubmittedEmail({
  to,
  providerName,
  categoryName,
}) {
  const safeCategoryName = String(categoryName || "").trim() || "your selected category";

  return sendEmail(
    to,
    "SewaHive skill verification submitted",
    wrapEmail({
      heading: "Skill verification submitted",
      intro: `${providerGreeting(providerName)} Your skill proof for <strong>${escapeHtml(
        safeCategoryName
      )}</strong> has been submitted successfully.`,
      details: [
        "Your submission is now pending admin review.",
        "We will email you again when the review is approved, rejected, or needs correction.",
      ],
      nextSteps: [
        "You can continue improving your provider profile while your skill proof is under review.",
      ],
    })
  );
}

async function sendProviderIdVerificationStatusEmail({
  to,
  providerName,
  status,
  adminComment,
  documentType,
  badge,
}) {
  const normalizedStatus = String(status || "").trim().toLowerCase();
  const friendlyDocumentType = normalizeDocumentType(documentType);
  const safeComment = String(adminComment || "").trim();
  const safeBadge = String(badge || "").trim();

  let subject = "SewaHive verification update";
  let heading = "Verification update";
  let intro = `${providerGreeting(providerName)} We reviewed your ${escapeHtml(
    friendlyDocumentType
  )} verification request.`;
  let nextSteps = [];

  if (normalizedStatus === "approved") {
    subject = "SewaHive verification approved";
    heading = "Verification approved";
    intro = `${providerGreeting(
      providerName
    )} Your ID verification has been approved.`;
    nextSteps = [
      safeBadge
        ? `Your account badge is now set to ${escapeHtml(safeBadge)}.`
        : "Your provider account can now continue using verified-only flows where applicable.",
    ];
  } else if (normalizedStatus === "rejected") {
    subject = "SewaHive verification rejected";
    heading = "Verification rejected";
    intro = `${providerGreeting(
      providerName
    )} Your ID verification was rejected.`;
    nextSteps = [
      "Review the feedback carefully before submitting a new verification request.",
    ];
  } else if (normalizedStatus === "needs_correction") {
    subject = "SewaHive verification needs correction";
    heading = "Verification needs correction";
    intro = `${providerGreeting(
      providerName
    )} Your ID verification needs correction before it can be approved.`;
    nextSteps = [
      "Please reupload the requested document(s) from your verification page.",
      "Once resubmitted, your verification will return to review.",
    ];
  } else if (normalizedStatus === "under_review") {
    subject = "SewaHive verification under review";
    heading = "Verification under review";
    intro = `${providerGreeting(
      providerName
    )} Your ID verification is currently under review.`;
    nextSteps = [
      "No action is needed from you right now unless we request corrections.",
    ];
  } else if (normalizedStatus === "submitted") {
    subject = "SewaHive verification received";
    heading = "Verification received";
    intro = `${providerGreeting(
      providerName
    )} We received your ID verification submission.`;
    nextSteps = [
      "Your documents are now waiting for review.",
    ];
  }

  const details = [];
  if (safeComment) {
    details.push(`<strong>Admin note:</strong> ${escapeHtml(safeComment)}`);
  }

  return sendEmail(
    to,
    subject,
    wrapEmail({
      heading,
      intro,
      details,
      nextSteps,
    })
  );
}

async function sendProviderSkillVerificationStatusEmail({
  to,
  providerName,
  categoryName,
  status,
  adminFeedback,
}) {
  const normalizedStatus = String(status || "").trim().toLowerCase();
  const safeCategoryName = String(categoryName || "").trim() || "your selected category";
  const safeFeedback = String(adminFeedback || "").trim();

  let subject = "SewaHive skill verification update";
  let heading = "Skill verification update";
  let intro = `${providerGreeting(providerName)} We reviewed your skill proof for <strong>${escapeHtml(
    safeCategoryName
  )}</strong>.`;
  let nextSteps = [];

  if (normalizedStatus === "approved") {
    subject = "SewaHive skill verification approved";
    heading = "Skill verification approved";
    intro = `${providerGreeting(
      providerName
    )} Your skill proof for <strong>${escapeHtml(
      safeCategoryName
    )}</strong> has been approved.`;
    nextSteps = [
      "You can continue managing services in this category with your approved proof on record.",
    ];
  } else if (normalizedStatus === "rejected") {
    subject = "SewaHive skill verification rejected";
    heading = "Skill verification rejected";
    intro = `${providerGreeting(
      providerName
    )} Your skill proof for <strong>${escapeHtml(
      safeCategoryName
    )}</strong> was rejected.`;
    nextSteps = [
      "Please review the feedback carefully before submitting a new proof.",
    ];
  } else if (normalizedStatus === "needs_correction") {
    subject = "SewaHive skill verification needs correction";
    heading = "Skill verification needs correction";
    intro = `${providerGreeting(
      providerName
    )} Your skill proof for <strong>${escapeHtml(
      safeCategoryName
    )}</strong> needs correction before it can be approved.`;
    nextSteps = [
      "Update the requested proof details and resubmit them for review.",
    ];
  }

  const details = [];
  if (safeFeedback) {
    details.push(`<strong>Admin feedback:</strong> ${escapeHtml(safeFeedback)}`);
  }

  return sendEmail(
    to,
    subject,
    wrapEmail({
      heading,
      intro,
      details,
      nextSteps,
    })
  );
}

module.exports = {
  sendProviderIdVerificationSubmittedEmail,
  sendProviderSkillVerificationSubmittedEmail,
  sendProviderIdVerificationStatusEmail,
  sendProviderSkillVerificationStatusEmail,
};
