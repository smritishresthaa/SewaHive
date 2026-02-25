// routes/categories.js
const express = require("express");
const Category = require("../models/Category");
const Subcategory = require("../models/Subcategory");

const router = express.Router();

// Public: list active categories
router.get("/", async (req, res, next) => {
  try {
    const categories = await Category.find({ status: "active" })
      .sort({ sortOrder: 1, name: 1 })
      .select("name description icon image iconKey sortOrder suggestedPriceMode recommendedPriceRange");

    res.json({ data: categories });
  } catch (err) {
    next(err);
  }
});

// Public: list active subcategories
router.get("/subcategories", async (req, res, next) => {
  try {
    const { categoryId } = req.query;
    const filter = { status: "active" };
    if (categoryId) filter.categoryId = categoryId;

    const subcategories = await Subcategory.find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .select("name description status sortOrder categoryId suggestedPriceMode");

    res.json({ data: subcategories });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
