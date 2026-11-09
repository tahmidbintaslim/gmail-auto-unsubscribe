import { describe, expect, it, vi } from "vitest";
import { AuthError, createGmail, SUBSCRIPTION_QUERY } from "./gmail";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const msg = (id: string, from: string, internalDate: number, unread: boolean, lu = "<https://x.co/u>") => ({
  id,
  internalDate: String(internalDate),
  labelIds: unread ? ["UNREAD", "INBOX"] : ["INBOX"],
  payload: { headers: [{ name: "From", value: from }, ...(lu ? [{ name: "List-Unsubscribe", value: lu }] : [])] },
});

const noSleep = async () => {};
const getToken = async () => "tok";

function fakeFetch(opts: { pages?: string[][]; msgs?: Record<string, any>; sent?: boolean }) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fn = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const u = new URL(url);
    if (u.pathname.endsWith("/messages") && (init?.method ?? "GET") === "GET") {
      if (u.searchParams.get("q")?.startsWith("in:sent")) {
        return json(opts.sent ? { messages: [{ id: "s1" }] } : {});
      }
      const pages = opts.pages!;
      const i = Number(u.searchParams.get("pageToken") ?? 0);
      return json({
        messages: pages[i].map((id) => ({ id })),
        ...(i + 1 < pages.length ? { nextPageToken: String(i + 1) } : {}),
      });
    }
    const id = u.pathname.split("/").pop()!;
    return json(opts.msgs![id]);
  }) as unknown as typeof fetch;
  return { fn, calls };
}

describe("gmail client", () => {
  it("uses the agreed subscription query", () => {
    expect(SUBSCRIPTION_QUERY).toBe(
      "newer_than:90d (category:promotions OR category:updates OR category:forums OR category:social)",
    );
  });

  it("groups by sender, counts unread, finds lastOpenedAt, skips messages without the header", async () => {
    const msgs = {
      a: msg("a", "News <News@Shop.com>", 300, true),
      b: msg("b", "news@shop.com", 200, false),
      c: msg("c", "News <news@shop.com>", 100, true),
      d: msg("d", "other@x.com", 50, true, ""),
    };
    const { fn, calls } = fakeFetch({ pages: [["a", "b", "c", "d"]], msgs, sent: true });
    const out = await createGmail(getToken, fn, noSleep).listSubscribedSenders(1000);
    expect(out).toEqual([
      {
        email: "news@shop.com", name: "News", domain: "shop.com", messages90d: 3, unread: 2,
        lastOpenedAt: 200, lastSeenAt: 300, replied: true, methods: { url: "https://x.co/u" },
      },
    ]);
    expect(calls[0].url).toContain("maxResults=500");
    expect(new URL(calls[0].url).searchParams.get("q")).toBe(SUBSCRIPTION_QUERY);
    expect((calls[0].init?.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    // only senders in the result get a sent lookup
    expect(calls.filter((c) => c.url.includes("in%3Asent")).length).toBe(1);
  });

  it("follows nextPageToken and reports progress", async () => {
    const msgs = { a: msg("a", "a@x.com", 1, true), b: msg("b", "b@x.com", 2, true) };
    const { fn } = fakeFetch({ pages: [["a"], ["b"]], msgs });
    const progress: number[][] = [];
    const out = await createGmail(getToken, fn, noSleep).listSubscribedSenders(0, (d, t) => progress.push([d, t]));
    expect(out.map((s) => s.email).sort()).toEqual(["a@x.com", "b@x.com"]);
    expect(out.every((s) => s.replied === false && s.lastOpenedAt === null)).toBe(true);
    expect(progress.at(-1)).toEqual([2, 2]);
  });

  it("refreshes the token once on 401 then succeeds", async () => {
    const tok = vi.fn(async (o: { refresh: boolean }) => (o.refresh ? "new" : "old"));
    const fn = vi.fn()
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(json({}));
    const out = await createGmail(tok, fn as any, noSleep).listSubscribedSenders(0);
    expect(out).toEqual([]);
    expect(tok).toHaveBeenCalledWith({ refresh: true });
    expect(tok).toHaveBeenCalledTimes(2);
    expect(fn.mock.calls[1][1].headers.Authorization).toBe("Bearer new");
  });

  it("throws AuthError when 401 persists", async () => {
    const fn = vi.fn(async () => json({}, 401));
    await expect(createGmail(getToken, fn as any, noSleep).listSubscribedSenders(0)).rejects.toBeInstanceOf(AuthError);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("backs off 1s,2s on 429 then succeeds", async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi.fn()
      .mockResolvedValueOnce(json({}, 429))
      .mockResolvedValueOnce(json({}, 429))
      .mockResolvedValueOnce(json({}));
    await createGmail(getToken, fn as any, sleep).listSubscribedSenders(0);
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([1000, 2000]);
  });

  it("retries 403 rateLimitExceeded and gives up after 1s,2s,4s", async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi.fn(async () => json({ error: { errors: [{ reason: "rateLimitExceeded" }] } }, 403));
    await expect(createGmail(getToken, fn as any, sleep).listSubscribedSenders(0)).rejects.toThrow();
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([1000, 2000, 4000]);
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it("does not retry a plain 403", async () => {
    const fn = vi.fn(async () => json({ error: { message: "nope" } }, 403));
    await expect(createGmail(getToken, fn as any, noSleep).listSubscribedSenders(0)).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("sendRaw posts base64url without padding", async () => {
    const fn = vi.fn(async () => json({ id: "1" }));
    const rfc = "To: u@a.co\r\n\r\nunsubscribe??>>";
    await createGmail(getToken, fn as any, noSleep).sendRaw(rfc);
    const [url, init] = fn.mock.calls[0] as any;
    expect(url).toBe("https://gmail.googleapis.com/gmail/v1/users/me/messages/send");
    expect(init.method).toBe("POST");
    const { raw } = JSON.parse(init.body);
    expect(raw).not.toMatch(/[+/=]/);
    expect(Buffer.from(raw, "base64url").toString("utf8")).toBe(rfc);
  });
});
