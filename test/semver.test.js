import { maxSatisfying, satisfies } from "../src/lib/semver.js";

test("semver: satisfies exact", () => {
  assert.equal(satisfies("1.2.3", "1.2.3"), true);
  assert.equal(satisfies("1.2.4", "1.2.3"), false);
});

test("semver: satisfies caret", () => {
  assert.equal(satisfies("1.2.3", "^1.2.0"), true);
  assert.equal(satisfies("2.0.0", "^1.2.0"), false);
});

test("semver: maxSatisfying picks highest matching", () => {
  assert.equal(maxSatisfying(["1.0.0", "1.2.0", "1.2.9"], "^1.2.0"), "1.2.9");
});

test("semver: star matches anything", () => {
  assert.equal(maxSatisfying(["1.0.0", "2.0.0"], "*"), "2.0.0");
});

test("semver: comparator ranges", () => {
  assert.equal(maxSatisfying(["1.0.0", "1.2.0", "2.0.0"], ">=1.1.0 <2.0.0"), "1.2.0");
});
