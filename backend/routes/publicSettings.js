const express = require("express");
const AdminServiceConfig = require("../models/AdminServiceConfig");

const router = express.Router();

// Public route for signup pages
router.get("/settings/public", async (req, res) => {
  try {
    const settings = await AdminServiceConfig.findOneAndUpdate(
      {},
      {},
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({
      success: true,
      registrationOpen: settings?.registrationOpen ?? true,
    });
  } catch (err) {
    console.error("Failed to fetch public settings:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch public settings",
    });
  }
});

module.exports = router;