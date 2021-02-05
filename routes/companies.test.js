process.env.NODE_ENV = "test";
const request = require("supertest");
const app = require("../app");
const db = require("../db");

const test_company1 = {
  code: "testcomp1",
  name: "Test Company 1",
  description: "This is the first test company"
};
const test_company2 = {
  code: "testcomp2",
  name: "Test Company 2",
  description: "This is the second test company"
};

const test_invoice1 = { comp_code: test_company1.code, amt: 100 };
const test_invoice2 = { comp_code: test_company1.code, amt: 200 };

const test_industry1 = { code: "testind1", industry: "Test Industry 1" };
const test_industry2 = { code: "testind2", industry: "Test Industry 2" };

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
      `INSERT INTO invoices (comp_code, amt) VALUES ($1, $2), ($3, $4)`,
      [
        test_invoice1.comp_code,
        test_invoice1.amt,
        test_invoice2.comp_code,
        test_invoice2.amt
      ]);
    await db.query(
      `INSERT INTO industries VALUES ($1, $2), ($3, $4)`,
      [
        test_industry1.code,
        test_industry1.industry,
        test_industry2.code,
        test_industry2.industry
      ]
    );
    await db.query(
      `
        INSERT INTO companies_industries (comp_code, ind_code) VALUES
        ($1, $2), ($3, $4)
      `,
      [
        test_company1.code,
        test_industry1.code,
        test_company1.code,
        test_industry2.code
      ]
    );
  });

  test("can get all companies", async () => {
    const resp = await request(app).get("/companies");
    const { code: code1, name: name1 } = test_company1;
    const { code: code2, name: name2 } = test_company2;
    const expectedCompanies = [
      { code: code1, name: name1 },
      { code: code2, name: name2 }
    ];
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({ companies: expectedCompanies });
  });

  test("can get company with invoices by code", async () => {
    const resp = await request(app).get(`/companies/${test_company1.code}`);
    const { code, name, description } = test_company1;
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      company: {
        code,
        name,
        description,
        invoices: [expect.any(Number), expect.any(Number)],
        industries: [test_industry1.industry, test_industry2.industry]
      }
    })
  });

  test("get 404 when try to get company with bad code", async () => {
    const resp = await request(app).get("/companies/badcode");
    expect(resp.statusCode).toEqual(404);
  });

  test("can create company with valid data", async () => {
    const name = "New Company";
    const code = "newcompany"
    const description = "This is a new company.";
    const new_company = { name, description }
    const resp = await request(app).post("/companies").send(new_company);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      company: { code, name, description }
    })
  });

  test("get 400 when try to create company with bad data", async () => {
    const name = "New Company";
    const description = "This is a new company.";
    // try creating company missing name
    const new_company1 = { description }
    const resp1 = await request(app).post("/companies").send(new_company1);
    expect(resp1.statusCode).toEqual(400);
    // try creating company missing description
    const new_company2 = { name }
    const resp2 = await request(app).post("/companies").send(new_company2);
    expect(resp2.statusCode).toEqual(400);
  });

  test("can edit company with valid data", async () => {
    const code = test_company1.code;
    const name = "New Company!";
    const description = "This is a new company.";
    const new_company = { name, description }
    const resp = await request(app).put(`/companies/${code}`)
      .send(new_company);
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      company: { code, name, description }
    })
  });

  test("get 404 when try to edit company with bad code", async () => {
    const name = "New Company";
    const description = "This is a new company.";
    const new_company = { name, description }
    const resp = await request(app).put("/companies/badcode")
      .send(new_company);
    expect(resp.statusCode).toEqual(404);
  });

  test("get 400 when try to edit company with bad data", async () => {
    const code = test_company1.code;
    const name = "New Company";
    const description = "This is a new company.";
    // try creating company missing name
    const new_company1 = { description }
    const resp1 = await request(app).put(`/companies/${code}`)
      .send(new_company1);
    expect(resp1.statusCode).toEqual(400);
    // try creating company missing description
    const new_company2 = { name }
    const resp2 = await request(app).put(`/companies/${code}`)
      .send(new_company2);
    expect(resp2.statusCode).toEqual(400);
  });

  test("can delete company", async () => {
    const code = test_company1.code;
    const resp = await request(app).delete(`/companies/${code}`);
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({ status: "deleted" });
  });

  test("get 404 when try to delete company with bad code", async () => {
    const resp = await request(app).delete(`/companies/badcode`);
    expect(resp.statusCode).toEqual(404);
  });

  // clean out test data
  afterEach(async () => {
    await db.query(`DELETE FROM invoices`);
    await db.query(`DELETE FROM companies_industries`);
    await db.query(`DELETE FROM companies`);
    await db.query(`DELETE FROM industries`);
  });

  afterAll(async () => {
    await db.end();
  });
});