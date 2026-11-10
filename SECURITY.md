# Security policy

## Supported versions

This extension is a prototype with no published release. Only the latest commit on `main` gets security fixes.

## Reporting a vulnerability

Please do not open a public issue, pull request or discussion for a security problem.

Email **tahmidbintaslimrafi@gmail.com** with:

- a description of the problem and its impact
- the steps or a proof of concept to reproduce it
- the commit you tested, and your browser and version

You will get a reply as soon as possible. Once the problem is confirmed, a fix will be prepared and you will be told before it is published. If you would like credit, say so in your report.

## Scope

In scope: the extension's files (`manifest.json`, `popup.html`, `popup.js`, `unsubscriber.js`, `content.js`), for example a way to make it click outside the Manage subscriptions list, act on another tab or site, or send data anywhere. The demo in `demo/` and its hosted copy are in scope too.

Out of scope: Gmail and Chrome themselves, and the test tooling in `node_modules` (Dependabot tracks updates there; none of it ships in the extension).
