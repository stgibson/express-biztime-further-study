const express = require("express");
const { set } = require("../app");
const db = require("../db");
const ExpressError = require("../expressError");

const router = new express.Router();

router.get("/", async (req, res, next) => {
  try {
    const result = await db.query(
      `
        SELECT industry, name FROM industries i LEFT JOIN
          companies_industries ci ON i.code = ci.ind_code LEFT JOIN companies c
          ON ci.comp_code = c.code
      `
    );
    const industries_dict = {};
    for (let row of result.rows) {
      const industry = row.industry;
      const company = row.name;
      if (!industries_dict[industry]) {
        industries_dict[industry] = [];
      }
      industries_dict[industry].push(company);
    }
    const industries = [];
    for (let industry in industries_dict) {
      if (industries_dict[industry][0]) {
        industries.push({ industry, companies: industries_dict[industry] });
      }
      else {
        industries.push({ industry })
      }
    }
    return res.json({ industries });
  }
  catch(err) {
    return next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { code, industry } = req.body;
    if (!code || !industry) {
      const expressError = new ExpressError(
        "Require code and industry in request", 400
      );
      return next(expressError);
    }
    const result = await db.query(
      "INSERT INTO industries VALUES ($1, $2) RETURNING code, industry",
      [code, industry]
    );
    return res.status(201).json({ industry: result.rows[0] });
  }
  catch(err) {
    return next(err);
  }
});

router.put("/:code", async (req, res, next) => {
  try {
    const { comp_code } = req.body;
    if (!comp_code) {
      const expressError = new ExpressError(
        "Require comp_code in request", 400
      );
      return next(expressError);
    }
    // first verify not already a pair
    const result = await db.query(
      `
        SELECT id FROM companies_industries WHERE comp_code = $1 AND
          ind_code = $2
      `,
      [comp_code, req.params.code]
    );
    // if already pair, let user know
    if (result.rows.length) {
      const expressError = new ExpressError(
        "Industry already associated with that company", 400
      );
      return next(expressError);
    }
    await db.query(
      `
        INSERT INTO companies_industries (comp_code, ind_code) VALUES
          ($1, $2)
      `,
      [comp_code, req.params.code]
    );
    return res.json({ status: "success" });
  }
  catch(err) {
    return next(err);
  }
});

module.exports = router;