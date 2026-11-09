import type { SenderStats } from "./gmail";

export type Scored = SenderStats & { score: number; recommend: boolean; reasons: string[] };

const DAY_MS = 86_400_000;
const round2 = (x: number) => Math.round(x * 100) / 100;
const daysSince = (t: number, now: number) => Math.floor((now - t) / DAY_MS);

export function scoreSender(s: SenderStats, now: number): Scored {
  if (s.replied) return { ...s, score: 0, recommend: false, reasons: ["You've replied to this sender"] };
  const read = s.messages90d - s.unread;
  const unreadRatio = s.messages90d === 0 ? 0 : s.unread / s.messages90d;
  const volume = Math.min(1, s.messages90d / 30);
  const staleness = s.lastOpenedAt == null ? 1 : Math.min(1, daysSince(s.lastOpenedAt, now) / 90);
  const score = round2(0.5 * unreadRatio + 0.3 * volume + 0.2 * staleness);

  const reasons: string[] = [];
  if (unreadRatio >= 0.8) reasons.push(`You opened ${read} of ${s.messages90d} emails`);
  if (s.messages90d >= 12) reasons.push(`${s.messages90d} emails in 90 days`);
  if (s.lastOpenedAt == null) reasons.push("You haven't read any");
  else {
    const days = daysSince(s.lastOpenedAt, now);
    if (days >= 60) reasons.push(`Newest read email is ${days} days old`);
  }
  return { ...s, score, recommend: score >= 0.6, reasons };
}

export function rankSenders(list: SenderStats[], now: number): Scored[] {
  return list
    .map((s) => scoreSender(s, now))
    .sort((a, b) => b.score - a.score || b.messages90d - a.messages90d);
}
