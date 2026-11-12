// Run: node test.js
global.chrome = { webNavigation: { onBeforeNavigate: { addListener() {} } } };
const { parseSlackLink } = require("./extension/background.js");
const assert = require("assert");
const cases = [
  ["https://acme.slack.com/archives/C02HZ4Y7CUR/p1794490742067099?thread_ts=1794313579.617549&cid=C02HZ4Y7CUR",
   "https://acme.slack.com/messages/C02HZ4Y7CUR/p1794490742067099?thread_ts=1794313579.617549"],
  ["https://acme.slack.com/archives/C02HZ4Y7CUR/p1794490742067099", "https://acme.slack.com/messages/C02HZ4Y7CUR/p1794490742067099"],
  ["https://acme.slack.com/archives/C02HZ4Y7CUR", "https://acme.slack.com/messages/C02HZ4Y7CUR"],
  ["https://slack.com/app_redirect?channel=C1&team=T1", "https://app.slack.com/client/T1/C1"],
  ["https://app.slack.com/client/T1/C1", null],
  ["https://acme.slack.com/messages/C1/p1", null],
  ["https://example.com/archives/C1", null],
];
for (const [input, want] of cases) assert.strictEqual(parseSlackLink(input), want, input);
console.log(`ok ${cases.length} cases`);
