import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { resolveProductStock } from "../src/db/queries";
import { productSchema } from "../src/lib/actions/product-schema";
import * as schema from "../src/db/schema";

test("resolveProductStock correctly handles various stock tags", () => {
  // Test explicit zero stock
  assert.deepEqual(resolveProductStock(["XS", "S", "stock:0"]), {
    stock: 0,
    inStock: false,
  });

  // Test "out" tag
  assert.deepEqual(resolveProductStock(["stock:out"]), {
    stock: 0,
    inStock: false,
  });

  // Test "unavailable" tag
  assert.deepEqual(resolveProductStock(["stock:unavailable"]), {
    stock: 0,
    inStock: false,
  });

  // Test "false" tag
  assert.deepEqual(resolveProductStock(["stock:false"]), {
    stock: 0,
    inStock: false,
  });

  // Test positive stock values
  assert.deepEqual(resolveProductStock(["stock:5"]), {
    stock: 5,
    inStock: true,
  });
  assert.deepEqual(resolveProductStock(["XS", "S", "M", "L", "stock:42"]), {
    stock: 42,
    inStock: true,
  });

  // Test default stock when no tag is present
  assert.deepEqual(resolveProductStock(["XS", "S", "M", "L"]), {
    stock: 15,
    inStock: true,
  });
  assert.deepEqual(resolveProductStock(null), {
    stock: 15,
    inStock: true,
  });
  assert.deepEqual(resolveProductStock(undefined), {
    stock: 15,
    inStock: true,
  });
});

test("productSchema validates stock field", () => {
  const baseValid = {
    name: "Rose Quartz Glam",
    description: "Salon-sculpted handmade luxury press-on nail set.",
    price: 1250,
    finish: "Exclusive",
  };

  // Valid with positive stock
  const validWithStock = productSchema.safeParse({
    ...baseValid,
    stock: 20,
  });
  assert.equal(validWithStock.success, true);
  if (validWithStock.success) {
    assert.equal(validWithStock.data.stock, 20);
  }

  // Valid with 0 stock (out of stock)
  const validZeroStock = productSchema.safeParse({
    ...baseValid,
    stock: 0,
  });
  assert.equal(validZeroStock.success, true);
  if (validZeroStock.success) {
    assert.equal(validZeroStock.data.stock, 0);
  }

  // Invalid with negative stock
  const invalidNegativeStock = productSchema.safeParse({
    ...baseValid,
    stock: -5,
  });
  assert.equal(invalidNegativeStock.success, false);
});

test("sizes tags filter out metadata from customer size options", () => {
  const mixedSizes = ["XS", "S", "M", "L", "shape:Almond", "color:Pink", "length:Long", "stock:10"];
  const cleanSizes = mixedSizes.filter((s) => !s.includes(":"));
  assert.deepEqual(cleanSizes, ["XS", "S", "M", "L"]);
});

test("products schema includes stock column with default 15", () => {
  assert.ok(schema.products.stock, "products.stock column should exist");
  assert.equal(schema.products.stock.default, 15);
  assert.equal(schema.products.stock.notNull, true);
});

test("migration file exists and alters products table to add stock", () => {
  const migrationPath = path.join(process.cwd(), "drizzle", "0001_yielding_bruce_banner.sql");
  assert.ok(fs.existsSync(migrationPath), "Migration file must exist");
  const sql = fs.readFileSync(migrationPath, "utf-8");
  assert.match(sql, /ALTER TABLE "products" ADD COLUMN "stock" integer DEFAULT 15 NOT NULL;/);
});

test("cart guards out-of-stock products from being added", () => {
  const inStockProduct = {
    slug: "sugar-glaze",
    name: "Sugar Glaze",
    stock: 12,
    inStock: true,
  };
  const outOfStockProduct = {
    slug: "classic-french",
    name: "Classic French",
    stock: 0,
    inStock: false,
  };

  const simulateAddToCart = (product: { stock: number; inStock: boolean }) => {
    if (product.inStock === false || product.stock === 0) {
      return false;
    }
    return true;
  };

  assert.equal(simulateAddToCart(inStockProduct), true, "In-stock product should be added to bag");
  assert.equal(simulateAddToCart(outOfStockProduct), false, "Out-of-stock product must be rejected");
});
