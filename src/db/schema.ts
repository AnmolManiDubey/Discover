import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  photo: text("photo").notNull(),
  bio: text("bio").notNull(),
  city: text("city").notNull(),
  college: text("college").notNull(),
});

export const interests = sqliteTable("interests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const userInterests = sqliteTable("user_interests", {
  userId: integer("user_id").notNull().references(() => users.id),
  interestId: integer("interest_id").notNull().references(() => interests.id),
}, (table) => [uniqueIndex("user_interest_unique").on(table.userId, table.interestId)]);

export const swipes = sqliteTable("swipes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  swiperId: integer("swiper_id").notNull().references(() => users.id),
  targetId: integer("target_id").notNull().references(() => users.id),
  direction: text("direction", { enum: ["like", "pass"] }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [uniqueIndex("unique_swipe").on(table.swiperId, table.targetId)]);

export const matches = sqliteTable("matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userAId: integer("user_a_id").notNull().references(() => users.id),
  userBId: integer("user_b_id").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [uniqueIndex("unique_match").on(table.userAId, table.userBId)]);
