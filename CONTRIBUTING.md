# Contributing

Thanks for taking the time to help. This extension is a prototype, so small, focused changes are the easiest to review.

## Before you start

- Read [Known limitations](README.md#known-limitations) and [Status and roadmap](README.md#status-and-roadmap). Open an issue first for anything larger than a small fix.
- Keep the extension's surface as it is: no new permissions, network calls or storage without a clear reason in the pull request.
- For a security problem, do not open an issue. Follow [SECURITY.md](SECURITY.md).

## Set up

You need Node.js 22 (22.13 or later) or 24, with npm, and Chrome for the manual test.

```bash
git clone https://github.com/tahmidbintaslim/gmail-auto-unsubscribe.git
cd gmail-auto-unsubscribe
npm ci
```

Load the folder with **Load unpacked** on `chrome://extensions`. After changing a file, click the reload icon on the extension's card.

## Checks

CI runs `npm ci` and `npm test` on Node 22 and 24 for every push and pull request to `main`, plus CodeQL. Run the tests before you open a pull request:

```bash
npm test        # Vitest + jsdom against test/fixtures/
npm run demo    # optional: watch the loop on http://localhost:8000/demo/
```

The tests use a hand-written stand-in for Gmail's page, so they do not prove the extension works on real Gmail. If you can, also work through the [manual checklist](README.md#manual-test-on-real-gmail) on a test account.

## Pull requests

- One change per pull request, with a short description of what changed and why.
- If you change what the loop clicks, add a test with a fixture in `test/fixtures/` and update the README.
- Fixtures must be anonymized: no real names, addresses or message content.
- Use a [conventional commit](https://www.conventionalcommits.org/) subject, for example `fix(ui): skip rows without an Unsubscribe button`.

## License

By contributing, you agree that your contribution is licensed under the MIT License, the license of this project.
