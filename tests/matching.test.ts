import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { and, eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { recordSwipe } from "../src/lib/swipe-service";

// Test database is isolated: npm test never modifies data/coy.sqlite.
function setup() {
  const dir = mkdtempSync(join(tmpdir(), "coy-matching-"));
  const filename = join(dir, "test.sqlite");
  const sqlite = new Database(filename);
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, age INTEGER NOT NULL, photo TEXT NOT NULL, bio TEXT NOT NULL, city TEXT NOT NULL, college TEXT NOT NULL);
    CREATE TABLE swipes (id INTEGER PRIMARY KEY AUTOINCREMENT, swiper_id INTEGER NOT NULL REFERENCES users(id), target_id INTEGER NOT NULL REFERENCES users(id), direction TEXT NOT NULL, created_at INTEGER NOT NULL, UNIQUE(swiper_id, target_id));
    CREATE TABLE matches (id INTEGER PRIMARY KEY AUTOINCREMENT, user_a_id INTEGER NOT NULL REFERENCES users(id), user_b_id INTEGER NOT NULL REFERENCES users(id), created_at INTEGER NOT NULL, UNIQUE(user_a_id, user_b_id));
  `);
  const db = drizzle(sqlite, { schema });
  db.insert(schema.users).values([1, 2, 3].map(id => ({ id, name: `User ${id}`, age: 23, photo: "placeholder.svg", bio: "bio", city: "Delhi", college: "Demo" }))).run();
  return { db, sqlite, filename, cleanup: () => { if (sqlite.open) sqlite.close(); rmSync(dir, { recursive: true, force: true }); } };
}

test("one-sided like stays private and does not create a match", () => {
  const { db, cleanup } = setup();
  try {
    assert.equal(recordSwipe(db, 2, 1, "like"), "recorded");
    assert.equal(db.select().from(schema.matches).all().length, 0);
    // Public feed may include user 2: incoming likes are NOT a feed exclusion or field.
    const feed = db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users).all();
    assert.ok(feed.some(p => p.id === 2));
    assert.equal(JSON.stringify(feed).includes('"direction"'), false);
  } finally { cleanup(); }
});

test("two reciprocal likes create exactly one match with sorted identifiers", () => {
  const { db, cleanup } = setup();
  try {
    assert.equal(recordSwipe(db, 2, 1, "like"), "recorded");
    assert.equal(recordSwipe(db, 1, 2, "like"), "match");
    assert.deepEqual(db.select({ a: schema.matches.userAId, b: schema.matches.userBId }).from(schema.matches).all(), [{ a: 1, b: 2 }]);
    assert.equal(recordSwipe(db, 1, 2, "like"), "duplicate");
    assert.equal(db.select().from(schema.matches).all().length, 1);
  } finally { cleanup(); }
});

test("pass never matches, and previously swiped profiles remain excluded", () => {
  const { db, cleanup } = setup();
  try {
    recordSwipe(db, 2, 1, "like");
    assert.equal(recordSwipe(db, 1, 2, "pass"), "recorded");
    assert.equal(db.select().from(schema.matches).all().length, 0);
    assert.ok(db.select().from(schema.swipes).where(and(eq(schema.swipes.swiperId, 1), eq(schema.swipes.targetId, 2))).get());
    assert.equal(recordSwipe(db, 1, 2, "like"), "duplicate");
  } finally { cleanup(); }
});

test("invalid targets and self-swipes are rejected without writing", () => {
  const { db, cleanup } = setup();
  try {
    assert.equal(recordSwipe(db, 1, 1, "like"), "self");
    assert.equal(recordSwipe(db, 1, 99, "like"), "not_found");
    assert.equal(db.select().from(schema.swipes).all().length, 0);
  } finally { cleanup(); }
});

test("recorded swipes persist after closing and reopening SQLite", () => {
  const { db, sqlite, filename, cleanup } = setup();
  try {
    assert.equal(recordSwipe(db, 1, 3, "like"), "recorded");
    sqlite.close();
    const reopened = new Database(filename);
    try { assert.equal((reopened.prepare("SELECT direction FROM swipes WHERE swiper_id = 1 AND target_id = 3").get() as { direction: string } | undefined)?.direction, "like"); }
    finally { reopened.close(); }
  } finally { cleanup(); }
});
