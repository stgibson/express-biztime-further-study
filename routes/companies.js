const express = require("express");
const db = require("../db");
const ExpressError = require("../expressError");

const router = new express.Router();

router.get("/", async (req, res, next) => {
  try {
    const result = await db.query("SELECT code, name FROM companies");
    return res.json({ companies: result.rows });
  }
  catch(err) {
    return next(err);
  }
});

router.get("/:code", async (req, res, next) => {
  try {
    const comp_result = await db.query(
      "SELECT code, name, description FROM companies WHERE code=$1",
      [req.params.code]
    );
    // verify found company
    if (!comp_result.rows.length) {
      return next();
    }
    // get list of invoice ids for company
    const invoice_result = await db.query(
      "SELECT id FROM invoices i JOIN companies c ON i.comp_code=c.code WHERE code=$1",
      [req.params.code]
    )
    // separate company data from invoice data
    const { code, name, description } = comp_result.rows[0];
    return res.json({
      company: {
        code,
        name,
        description,
        invoices: invoice_result.rows
      }
    });
  }
  catch(err) {
    return next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { code, name, description } = req.body;
    if (!code || !name || !description) {
      const expressError = new ExpressError(
        "Require code, name, and description in request", 400
      );
      return next(expressError);
    }
    const result = await db.query(
      "INSERT INTO companies VALUES ($1, $2, $3) RETURNING code, name, description",
      [code, name, description]
    );
    return res.json({ company: result.rows[0] });
  }
  catch(err) {
    return next(err);
  }
});

router.put("/:code", async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name || !description) {
      const expressError = new ExpressError(
        "Require name, and description in request", 400
      );
      return next(expressError);
    }
    const result = await db.query(
      "UPDATE companies SET name=$1, description=$2 WHERE code=$3 RETURNING code, name, description",
      [name, description, req.params.code]
    );
    // verify found company
    if (!result.rows.length) {
      return next();
    }
    return res.json({ company: result.rows[0] });
  }
  catch(err) {
    return next(err);
  }
});

router.delete("/:code", async (req, res, next) => {
  try {
    // first make sure can find company
    const result = await db.query(
      "SELECT code FROM companies WHERE code=$1",
      [req.params.code]
    );
    if (!result.rows.length) {
      return next();
    }
    await db.query(
      "DELETE FROM companies WHERE code=$1", [req.params.code]
    );
    return res.json({ status: "deleted" });
  }
  catch(err) {
    return next(err);
  }
});

module.exports = router;