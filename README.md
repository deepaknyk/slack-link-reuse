# Slack Link Reuse

A small Chrome/Brave/Edge extension for people who use Slack in the browser
(app.slack.com) instead of the desktop app.

**Problem:** clicking a Slack link (`https://<workspace>.slack.com/archives/...`)
from GitHub, Linear, email or a terminal opens a new tab with the "Launching
Slack… open this link in your browser" page, then loads a second copy of Slack.

**With the extension:** the link loads in the Slack tab you already have open and
that tab comes to the front. The extra tab closes. If no Slack tab is open, the
link opens straight into the web client and skips the desktop-app page.

It handles message, thread-reply and channel permalinks, plus
`slack.com/app_redirect?channel=…&team=…` links. Links you click inside Slack
itself are left alone.

## Install (Chrome, Brave, Edge, Arc; Mac, Windows, Linux)

1. Download or clone this folder. Keep it somewhere permanent, because the browser
   loads it from that location.
2. Open `chrome://extensions` (or `brave://extensions`, `edge://extensions`),
   turn on **Developer mode**, click **Load unpacked**, and pick the
   `extension/` folder.

That's it. To update it, replace the files and click the reload icon on the
extension's card.

### Linux alternative: load it with a launch flag

If your browser already starts with `--load-extension=…` (Omarchy does this in
`~/.config/brave-flags.conf` or `chromium-flags.conf`), add the `extension/`
folder's path to that comma-separated list, then restart the browser.

## Permissions

- `tabs`, `webNavigation`: notice Slack links as they open, find your Slack tab,
  and close the extra tab.
- `https://*.slack.com/*`: limits all of this to Slack URLs.

It makes no network requests and stores nothing.

## How it works

Slack's desktop-app page includes an "open this link in your browser" link to the
same message under `/messages/` instead of `/archives/`. The extension rewrites
`/archives/<channel>/p<ts>?thread_ts=…` to that `/messages/` URL and loads it in
your existing Slack tab. A link that replaced a page in the same tab sends that
tab back to the page it was on.

Test the URL parsing with `node test.js`.
