/**
 * Emergency Service Diagnostics Utility
 * Helps identify why a service doesn't meet emergency-eligible requirements
 */

/**
 * Check if a service meets all emergency eligibility criteria
 * Returns { isEligible, reasons: [] } for diagnostic purposes
 */
export function diagnoseServiceEligibility(service) {
  const reasons = [];
  
  if (!service) {
    return {
      isEligible: false,
      reasons: ["Service not found"]
    };
  }

  // Check 1: Service must be active
  if (service?.isActive !== true) {
    reasons.push({
      check: "Service Status",
      required: "Active",
      actual: service?.isActive === false ? "Inactive" : "Unknown",
      status: "❌"
    });
  } else {
    reasons.push({
      check: "Service Status",
      required: "Active",
      actual: "Active",
      status: "✓"
    });
  }

  // Check 2: Service must not be admin disabled
  if (service?.adminDisabled === true) {
    reasons.push({
      check: "Admin Disabled",
      required: "Not disabled",
      actual: "Disabled by admin",
      status: "❌"
    });
  } else {
    reasons.push({
      check: "Admin Disabled",
      required: "Not disabled",
      actual: "Enabled",
      status: "✓"
    });
  }

  // Check 3: Emergency price must be > 0
  const emergencyPrice = Number(service?.emergencyPrice || 0);
  if (emergencyPrice <= 0) {
    reasons.push({
      check: "Emergency Price",
      required: "> 0 NPR",
      actual: emergencyPrice === 0 ? "Not set (0)" : `${emergencyPrice} NPR`,
      status: "❌",
      hint: "Go to 'My Services' → Edit this service → Add Emergency Price"
    });
  } else {
    reasons.push({
      check: "Emergency Price",
      required: "> 0 NPR",
      actual: `${emergencyPrice} NPR`,
      status: "✓"
    });
  }

  // Determine overall eligibility
  const isEligible = reasons.every((r) => r.status === "✓");

  return { isEligible, reasons };
}

/**
 * Get diagnostic info for all services
 * Returns { services: [{ diagnosis, service }], hasAnyEligible: bool }
 */
export function diagnoseAllServices(services = []) {
  if (!Array.isArray(services) || services.length === 0) {
    return {
      services: [],
      hasAnyEligible: false,
      diagnosis: "No services found. Create a service with emergency pricing to enable emergency mode."
    };
  }

  const diagnoses = services.map((service) => ({
    service,
    diagnosis: diagnoseServiceEligibility(service)
  }));

  const eligibleServices = diagnoses.filter((d) => d.diagnosis.isEligible);

  return {
    services: diagnoses,
    hasAnyEligible: eligibleServices.length > 0,
    eligibleServices,
    diagnosis:
      eligibleServices.length > 0
        ? `Found ${eligibleServices.length} eligible service(s)`
        : `None of your ${services.length} service(s) meet emergency requirements. See details below.`
  };
}

/**
 * Format diagnostic info for display
 */
export function formatDiagnosticMessage(service) {
  const diag = diagnoseServiceEligibility(service);
  
  const failedChecks = diag.reasons.filter((r) => r.status === "❌");
  
  if (failedChecks.length === 0) {
    return `✓ "${service?.title}" is emergency-eligible`;
  }

  const messages = failedChecks.map((check) => {
    let msg = `${check.status} ${check.check}: ${check.actual}`;
    if (check.hint) {
      msg += ` (${check.hint})`;
    }
    return msg;
  });

  return `"${service?.title}" is not emergency-eligible:\n${messages.join("\n")}`;
}
