import { describe, it, expect } from "vitest";
import { parseListUnsubscribe } from "./listUnsubscribe";

const POST = "List-Unsubscribe=One-Click";
describe("parseListUnsubscribe", () => {
  it("one-click https + mailto", () => {
    expect(parseListUnsubscribe("<https://a.co/u?x=1>, <mailto:u@a.co?subject=unsub>", POST)).toEqual({
      oneClickUrl: "https://a.co/u?x=1",
      url: "https://a.co/u?x=1",
      mailto: "mailto:u@a.co?subject=unsub",
    });
  });
  it("no post header means no oneClickUrl", () => {
    const r = parseListUnsubscribe("<https://a.co/u?x=1>, <mailto:u@a.co?subject=unsub>", undefined);
    expect(r.oneClickUrl).toBeUndefined();
    expect(r.url).toBe("https://a.co/u?x=1");
  });
  it("mailto only", () => {
    expect(parseListUnsubscribe("<mailto:u@a.co>", undefined)).toEqual({ mailto: "mailto:u@a.co" });
  });
  it("folded whitespace", () => {
    expect(parseListUnsubscribe("<https://a.co/u>,\r\n <mailto:x@a.co>", undefined)).toEqual({
      url: "https://a.co/u",
      mailto: "mailto:x@a.co",
    });
  });
  it("garbage, empty, undefined", () => {
    expect(parseListUnsubscribe("garbage", undefined)).toEqual({});
    expect(parseListUnsubscribe("", POST)).toEqual({});
    expect(parseListUnsubscribe(undefined, undefined)).toEqual({});
  });
  it("http is never one-click but kept as url", () => {
    expect(parseListUnsubscribe("<http://a.co/u>", POST)).toEqual({ url: "http://a.co/u" });
  });
  it("prefers https over earlier http", () => {
    expect(parseListUnsubscribe("<http://a.co/u>, <https://a.co/s>", POST)).toEqual({
      url: "https://a.co/s",
      oneClickUrl: "https://a.co/s",
    });
  });
});
