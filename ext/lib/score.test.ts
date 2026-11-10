import { describe, expect, it } from "vitest";
import type { SenderStats } from "./gmail";
import { rankSenders, scoreSender } from "./score";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 9);

const sender = (over: Partial<SenderStats> = {}): SenderStats => ({
  email: "news@example.com",
  name: "News",
  domain: "example.com",
  messages90d: 0,
  unread: 0,
  lastOpenedAt: NOW,
  lastSeenAt: NOW,
  replied: false,
  methods: {},
  ...over,
});

describe("scoreSender", () => {
  it("never-opened high-volume unread sender is recommended with all reasons", () => {
    const r = scoreSender(sender({ messages90d: 30, unread: 30, lastOpenedAt: null }), NOW);
    expect(r.score).toBe(1);
    expect(r.recommend).toBe(true);
    expect(r.reasons).toEqual(["You opened 0 of 30 emails", "30 emails in 90 days", "You haven't read any"]);
  });

  it("low-volume sender opened today scores 0.03 and gets no reasons", () => {
    const r = scoreSender(sender({ messages90d: 3, unread: 0 }), NOW);
    expect(r.score).toBe(0.03);
    expect(r.recommend).toBe(false);
    expect(r.reasons).toEqual([]);
  });

  it("a replied-to sender scores 0 even with every metric maxed", () => {
    const r = scoreSender(
      sender({ messages90d: 100, unread: 100, lastOpenedAt: null, replied: true }),
      NOW,
    );
    expect(r.score).toBe(0);
    expect(r.recommend).toBe(false);
    expect(r.reasons).toEqual(["You've replied to this sender"]);
  });

  it("zero messages gives a finite score using unreadRatio 0", () => {
    const r = scoreSender(sender({ messages90d: 0, unread: 0, lastOpenedAt: null }), NOW);
    expect(Number.isFinite(r.score)).toBe(true);
    expect(r.score).toBe(0.2);
    expect(r.recommend).toBe(false);
  });

  it("reports 'Newest read email is N days old' from 60 days on", () => {
    const r = scoreSender(sender({ messages90d: 1, lastOpenedAt: NOW - 60 * DAY }), NOW);
    expect(r.reasons).toEqual(["Newest read email is 60 days old"]);
  });
});

describe("rankSenders", () => {
  it("sorts by score, breaking ties by messages90d descending, without mutating input", () => {
    const small = sender({ email: "small@x.com", messages90d: 30, unread: 0 });
    const big = sender({ email: "big@x.com", messages90d: 45, unread: 0 });
    const top = sender({ email: "top@x.com", messages90d: 30, unread: 30, lastOpenedAt: null });
    const input = [small, big, top];
    const ranked = rankSenders(input, NOW);
    expect(ranked.map((s) => s.email)).toEqual(["top@x.com", "big@x.com", "small@x.com"]);
    expect(input).toEqual([small, big, top]);
    expect(ranked).not.toBe(input);
  });
});
