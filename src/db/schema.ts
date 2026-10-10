import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ─── Better Auth tables ────────────────────────────────────────────── */
/** Field/column layout follows the Better Auth Drizzle adapter contract. */

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    /** Phone-first accounts carry a synthetic placeholder email. */
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    phoneNumber: text("phone_number"),
    phoneNumberVerified: boolean("phone_number_verified").notNull().default(false),
    /** Added by the Better Auth admin plugin: "user" | "admin". */
    role: text("role"),
    banned: boolean("banned"),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("user_email_idx").on(t.email),
    uniqueIndex("user_phone_idx").on(t.phoneNumber),
  ],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    /** Set when an admin impersonates the session's user. */
    impersonatedBy: text("impersonated_by"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("session_token_idx").on(t.token),
    index("session_user_idx").on(t.userId),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ─── Enums ─────────────────────────────────────────────────────────── */
export const finishEnum = pgEnum("finish", [
  "Exclusive",
  "Classic",
  "Signature",
]);
export const badgeEnum = pgEnum("badge", ["Bestseller", "New"]);
export const paymentMethodEnum = pgEnum("payment_method", [
  /** Legacy — COD is no longer offered. Kept so historical orders stay valid. */
  "cod",
  "bkash",
  "nagad",
  "card",
]);
/** Payment state tracked separately from fulfillment status (SSLCommerz). */
export const paymentStatusEnum = pgEnum("payment_status", [
  /** Awaiting gateway confirmation after session initiation. */
  "unpaid",
  /** Validated by the SSLCommerz Order Validation API. */
  "paid",
  "failed",
  "cancelled",
  "refunded",
]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "fulfilled",
  "cancelled",
]);

/* ─── Products ──────────────────────────────────────────────────────── */
export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    tagline: text("tagline").notNull(),
    description: text("description").notNull(),
    /** Price in whole BDT — integers only, never floats, for money. */
    price: integer("price").notNull(),
    compareAtPrice: integer("compare_at_price"),
    finish: finishEnum("finish").notNull(),
    badge: badgeEnum("badge"),
    /** Placeholder swatch gradient pair — replaced by real photography later. */
    toneA: text("tone_a").notNull(),
    toneB: text("tone_b").notNull(),
    /** Temporary: scraped product photography. Swap for owned assets pre-launch. */
    imageUrl: text("image_url"),
    /** Available sizes, e.g. {"XS","S","M","L"} — empty/NULL means all defaults. */
    sizes: text("sizes").array(),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("products_slug_idx").on(t.slug),
    index("products_active_sort_idx").on(t.isActive, t.sortOrder),
  ],
);

/* ─── Customers (lightweight — guest checkout friendly) ─────────────── */
export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    /** Phone is the identity key — BD orders often have no email. */
    phone: text("phone").notNull(),
    email: text("email"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("customers_phone_idx").on(t.phone)],
);

/* ─── Orders ────────────────────────────────────────────────────────── */
export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    /** Public-facing number, e.g. LIO-4F2K9Q1A. Non-sequential on purpose. */
    orderNumber: text("order_number").notNull(),
    /** Authenticated shopper (required once phone auth is enabled). */
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    customerId: integer("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    // Delivery details are snapshotted onto the order — an order must
    // never change when a customer edits their profile later.
    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    addressLine: text("address_line").notNull(),
    city: text("city").notNull(),
    postalCode: text("postal_code"),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    // ─── SSLCommerz gateway fields (paymentStatus defaults until wiring) ──
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("unpaid"),
    /** tran_id sent to SSLCommerz — equals orderNumber in v1. */
    transactionId: text("transaction_id"),
    /** Validation ID from the SSLCommerz Order Validation API. */
    valId: text("val_id"),
    bankTranId: text("bank_tran_id"),
    /** 0 = safe, 1 = risky (hold fulfilment) per gateway docs. */
    riskLevel: integer("risk_level"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    /** Raw gateway payload (IPN / validation) kept for audit + disputes. */
    paymentDetails: jsonb("payment_details"),
    status: orderStatusEnum("status").notNull().default("pending"),
    subtotal: integer("subtotal").notNull(),
    shippingFee: integer("shipping_fee").notNull(),
    total: integer("total").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("orders_number_idx").on(t.orderNumber),
    index("orders_status_idx").on(t.status),
    index("orders_customer_idx").on(t.customerId),
    index("orders_payment_status_idx").on(t.paymentStatus),
    index("orders_transaction_idx").on(t.transactionId),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /** Nullable + snapshot fields: order history survives product deletion. */
    productId: integer("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    productName: text("product_name").notNull(),
    finish: finishEnum("finish").notNull(),
    size: text("size").notNull(),
    qty: integer("qty").notNull(),
    unitPrice: integer("unit_price").notNull(),
    lineTotal: integer("line_total").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

/* ─── Product images (gallery; first = cover) ───────────────────────── */
export const productImages = pgTable(
  "product_images",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    /** Lower = earlier in gallery. Position 0 is the cover image. */
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("product_images_product_idx").on(t.productId),
    index("product_images_product_pos_idx").on(t.productId, t.position),
  ],
);

/* ─── Reviews ───────────────────────────────────────────────────────── */
export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    /** Null = brand-level review (shown on home). */
    productId: integer("product_id").references(() => products.id, {
      onDelete: "cascade",
    }),
    authorName: text("author_name").notNull(),
    location: text("location").notNull(),
    rating: integer("rating").notNull(), // 1–5, validated at the app layer
    body: text("body").notNull(),
    isApproved: boolean("is_approved").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("reviews_approved_idx").on(t.isApproved)],
);

/* ─── Newsletter ────────────────────────────────────────────────────── */
export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: serial("id").primaryKey(),
    /** Stored lowercased; uniqueness is case-insensitive by convention. */
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("newsletter_email_idx").on(t.email)],
);

/* ─── Site content (editable microcopy) ─────────────────────────────── */
export const siteContent = pgTable("site_content", {
  /** e.g. "announcements" | "marquee" */
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ─── Relations ─────────────────────────────────────────────────────── */
export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(user, {
    fields: [orders.userId],
    references: [user.id],
  }),
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  reviews: many(reviews),
  orderItems: many(orderItems),
  images: many(productImages),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
}));
