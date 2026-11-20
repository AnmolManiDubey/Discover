/** Read-only checks plus invalid writes; safe to run against the local demo. */
import assert from 'node:assert/strict';

const base = process.env.BASE_URL ?? 'http://localhost:3000';
async function request(path, options) {
  const response = await fetch(new URL(path, base), options);
  const body = await response.json();
  return { response, body };
}
const feed = await request('/feed');
assert.equal(feed.response.status, 200);
assert.ok(Array.isArray(feed.body.profiles));
assert.ok(feed.body.profiles.length <= 30);
for (const p of feed.body.profiles) {
  assert.ok(typeof p.name === 'string' && Array.isArray(p.interests));
  assert.equal('likedYou' in p, false);
  assert.equal('incomingLike' in p, false);
  assert.equal('direction' in p, false);
  assert.notEqual(p.id, 1);
}
const matches = await request('/matches');
assert.equal(matches.response.status, 200);
assert.ok(Array.isArray(matches.body.matches));
const invalid = await request('/swipe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId: 2, direction: 'superlike' }) });
assert.equal(invalid.response.status, 400);
const self = await request('/swipe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId: 1, direction: 'like' }) });
assert.equal(self.response.status, 400);
console.log(`Smoke checks passed: ${feed.body.profiles.length} feed profiles, ${matches.body.matches.length} matches, privacy fields hidden, invalid writes rejected.`);
