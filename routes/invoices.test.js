process.env.NODE_ENV = "test";
const request = require("supertest");
const app = require("../app");
const db = require("../db");

const test_company1 = {
  code: "test1",
  name: "Test Company 1",
  description: "This is the first test company"
};
const test_company2 = {
  code: "test2",
  name: "Test Company 2",
  description: "This is the second test company"
};

const test_invoice1 = { comp_code: test_company1.code, amt: 100 };
const test_invoice2 = { comp_code: test_company1.code, amt: 200 };

describe("companies routes tests (with setup and cleanup)", () => {
  // add test data
  beforeEach(async () => {
    // add test companies
    await db.query(
      `INSERT INTO companies VALUES ($1, $2, $3), ($4, $5, $6)`,
      [
        test_company1.code,
        test_company1.name,
        test_company1.description,
        test_company2.code,
        test_company2.name,
        test_company2.description
      ]
    );
    await db.query(
      `INSERT INTO invoices (comp_code, amt, paid) VALUES ($1, $2, $3), ($4, $5, $6)`,
      [
        test_invoice1.comp_code,
        test_invoice1.amt,
        false,
        test_invoice2.comp_code,
        test_invoice2.amt,
        false
      ]);
  });

  test("can get all invoices", async () => {
    const resp = await request(app).get("/invoices");
    const comp_code = test_invoice1.comp_code;
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      invoices: [
        { id: expect.any(Number), comp_code },
        { id: expect.any(Number), comp_code }
      ]
    });
  });

  test("can get invoices by id", async () => {
    // first get id of first invoice
    const result = await db.query(
      `SELECT id FROM invoices WHERE amt = $1`, [test_invoice1.amt]
    );
    const { id } = result.rows[0];
    const resp = await request(app).get(`/invoices/${id}`);
    const { amt } = test_invoice1;
    const { code, name, description } = test_company1;
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      invoice: {
        id,
        amt,
        paid: false,
        add_date: expect.any(String),
        paid_date: null,
        company: {
          code,
          name,
          description
        }
      }
    })
  });

  test("get 404 when try to get invoice with bad id", async () => {
    const resp = await request(app).get("/invoices/0");
    expect(resp.statusCode).toEqual(404);
  });

  test("can create invoice with valid data", async () => {
    const comp_code = test_company1.code;
    const amt = 300;
    const new_invoice = { comp_code, amt }
    const resp = await request(app).post("/invoices").send(new_invoice);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      invoice: { 
        id: expect.any(Number),
        comp_code,
        amt,
        paid: false,
        add_date: expect.any(String),
        paid_date: null
      }
    })
  });

  test("get 400 when try to create invoice with bad data", async () => {
    let comp_code = test_company1.code;
    const amt = 300;
    // try creating invoice missing comp_code
    const new_invoice1 = { amt }
    const resp1 = await request(app).post("/invoices").send(new_invoice1);
    expect(resp1.statusCode).toEqual(400);
    // try creating invoice missing amt
    const new_invoice2 = { comp_code }
    const resp2 = await request(app).post("/invoices").send(new_invoice2);
    expect(resp2.statusCode).toEqual(400);
    // try creating invoice with bad comp_code
    comp_code = "bad"
    const new_invoice3 = { comp_code, amt }
    const resp3 = await request(app).post("/invoices").send(new_invoice3);
    expect(resp3.statusCode).toEqual(500);
  });

  test("can edit invoice with valid data", async () => {
    // first get id of first invoice
    const result = await db.query(
      `SELECT id FROM invoices WHERE amt = $1`, [test_invoice1.amt]
    );
    const { id } = result.rows[0];
    const amt = 50;
    const paid = true;
    const invoice_data = { amt, paid };
    const resp = await request(app).put(`/invoices/${id}`).send(invoice_data);
    const { code: comp_code } = test_company1;
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      invoice: {
        id,
        comp_code,
        amt,
        paid: true,
        add_date: expect.any(String),
        paid_date: expect.any(String)
      }
    })
  });

  test("get 404 when try to edit invoice with bad id", async () => {
    const amt = 50;
    const paid = true;
    const invoice_data = { amt, paid }
    const resp = await request(app).put("/invoices/0").send(invoice_data);
    expect(resp.statusCode).toEqual(404);
  });

  test("get 400 when try to edit invoice with bad data", async () => {
    const result = await db.query(
      `SELECT id FROM invoices WHERE amt = $1`, [test_invoice1.amt]
    );
    const { id } = result.rows[0];
    // try creating invoice without amt
    const amt = 50;
    const paid = true;
    const invoice_data1 = { paid }
    const resp1 = await request(app).put(`/invoices/${id}`)
      .send(invoice_data1);
    expect(resp1.statusCode).toEqual(400);
    const invoice_data2 = { amt }
    const resp2 = await request(app).put(`/invoices/${id}`)
      .send(invoice_data2);
    expect(resp2.statusCode).toEqual(400);
  });

  test("can delete invoice", async () => {
    const result = await db.query(
      `SELECT id FROM invoices WHERE amt = $1`, [test_invoice1.amt]
    );
    const { id } = result.rows[0];
    const resp = await request(app).delete(`/invoices/${id}`);
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({ status: "deleted" });
  });

  test("get 404 when try to delete invoice with bad id", async () => {
    const resp = await request(app).delete(`/invoices/0`);
    expect(resp.statusCode).toEqual(404);
  });

  // clean out test data
  afterEach(async () => {
    await db.query(`DELETE FROM companies`);
  });

  afterAll(async () => {
    await db.end();
  });
});