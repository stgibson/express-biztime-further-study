const express = require("express");
const db = require("../db");
const ExpressError = require("../expressError");

const router = new express.Router();

router.get("/", async (req, res, next) => {
  try {
    const result = await db.query("SELECT id, comp_code FROM invoices");
    return res.json({ invoices: result.rows });
  }
  catch(err) {
    return next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const result = await db.query(
      "SELECT id, amt, paid, add_date, paid_date, code, name, description FROM invoices i JOIN companies c ON i.comp_code=c.code WHERE id=$1",
      [req.params.id]
    );
    // verify found invoice
    if (!result.rows.length) {
      return next();
    }
    // extract data to separate invoice data from company data
    const { id, amt, paid, add_date, paid_date, code, name, description } =
      result.rows[0];
    return res.json({
      invoice: {
        id,
        amt,
        paid,
        add_date,
        paid_date,
        company: { 
          code,
          name,
          description
        }
      }
    });
  }
  catch(err) {
    return next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { comp_code, amt } = req.body;
    if (!comp_code || !amt) {
      const expressError = new ExpressError(
        "Require comp_code and amt in request", 400
      );
      return next(expressError);
    }
    const result = await db.query(
      "INSERT INTO invoices (comp_code, amt) VALUES ($1, $2) RETURNING id, comp_code, amt, paid, add_date, paid_date",
      [comp_code, amt]
    );
    return res.status(201).json({ invoice: result.rows[0] });
  }
  catch(err) {
    return next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { amt, paid } = req.body;
    if (!amt || paid === undefined) {
      const expressError = new ExpressError(
        "Require amt and paid in request", 400
      );
      return next(expressError);
    }
    // get paid status to compare with request's paid
    let result = await db.query(
      `SELECT paid FROM invoices WHERE id = $1`,
      [req.params.id]
    );
    // verify found invoice
    if (!result.rows.length) {
      return next();
    }
    const { paid: currPaid } = result.rows[0];
    // if paid status doesn't change, just update amt
    if (paid === currPaid) {
      result = await db.query(
        `
          UPDATE invoices SET amt=$1 WHERE id=$2 RETURNING
            id, comp_code, amt, paid, add_date, paid_date
        `,
        [amt, req.params.id]
      );
    }
    // if paid status changes from not paid to paid, set paid_date to current
    else if (paid && !currPaid) {
      result = await db.query(
        `
          UPDATE invoices SET amt=$1, paid=$2, paid_date=CURRENT_DATE WHERE
            id=$3 RETURNING id, comp_code, amt, paid, add_date, paid_date
        `,
        [amt, paid, req.params.id]
      );
    }
    // if paid status changes from paid to not paid, set paid_date to null
    else {
      result = await db.query(
        `
          UPDATE invoices SET amt=$1, paid=$2, paid_date=null WHERE
            id=$3 RETURNING id, comp_code, amt, paid, add_date, paid_date
        `,
        [amt, paid, req.params.id]
      );
    }
    return res.json({ invoice: result.rows[0] });
  }
  catch(err) {
    return next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    // first make sure can find invoice
    const result = await db.query(
      "SELECT id FROM invoices WHERE id=$1",
      [req.params.id]
    );
    if (!result.rows.length) {
      return next();
    }
    await db.query(
      "DELETE FROM invoices WHERE id=$1", [req.params.id]
    );
    return res.json({ status: "deleted" });
  }
  catch(err) {
    return next(err);
  }
});

module.exports = router;