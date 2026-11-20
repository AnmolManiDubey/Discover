import { db } from "../src/db";
import { users, interests, userInterests, swipes, matches } from "../src/db/schema";
import profiles from "./profiles.json";

// Re-running seed resets the demo state. Don't run after creating swipes you want to keep.
db.transaction(tx => {
  tx.delete(matches).run();
  tx.delete(swipes).run();
  tx.delete(userInterests).run();
  tx.delete(interests).run();
  tx.delete(users).run();
  tx.insert(users).values(profiles.map(({interests: unusedInterests, ...profile}) => { void unusedInterests; return profile; })).run();
  const interestNames = [...new Set(profiles.flatMap(profile => profile.interests))];
  tx.insert(interests).values(interestNames.map(name => ({ name }))).run();
  const interestIdByName = new Map(tx.select().from(interests).all().map(row => [row.name,row.id]));
  tx.insert(userInterests).values(profiles.flatMap(profile => profile.interests.map(name => ({ userId: profile.id, interestId: interestIdByName.get(name)! })))).run();
  // Pre-seeded private incoming likes, not exposed by the feed API.
  tx.insert(swipes).values([2,5,8,11,14,17,20,23,26,29].map(swiperId => ({ swiperId, targetId: 1, direction: "like" as const, createdAt: new Date() }))).run();
});
console.log(`Seeded ${profiles.length} users (${profiles.length-1} candidates) and 10 private incoming likes.`);
