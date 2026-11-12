// Slack Link Reuse: send Slack message links to the Slack web tab you already have open.
//
// Slack permalinks (https://<workspace>.slack.com/archives/<channel>/p<ts>) load an
// "opening in the desktop app" page. Its "open this link in your browser" link points
// to the same message under /messages/ instead of /archives/, which opens the web
// client directly. We rewrite to that path, and if a Slack web tab is already open we
// load the message there, focus it, and close the tab the link opened.

const SLACK_CLIENT_URL = "https://app.slack.com/client/*";
const recentlyHandled = new Map(); // tabId -> timestamp, avoids double handling

function parseSlackLink(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname;

  // https://<workspace>.slack.com/archives/<C>[/p<ts>][?thread_ts=...&cid=...]
  const archives = url.pathname.match(/^\/archives\/([A-Z0-9]+)(\/p\d+)?\/?$/);
  if (archives && host.endsWith(".slack.com") && host !== "app.slack.com") {
    const target = new URL(`https://${host}/messages/${archives[1]}${archives[2] || ""}`);
    const threadTs = url.searchParams.get("thread_ts");
    if (threadTs) target.searchParams.set("thread_ts", threadTs);
    return target.toString();
  }

  // https://slack.com/app_redirect?channel=<C>&team=<T>
  if ((host === "slack.com" || host.endsWith(".slack.com")) && url.pathname === "/app_redirect") {
    const channel = url.searchParams.get("channel");
    const team = url.searchParams.get("team");
    if (channel && team && /^[A-Z0-9]+$/.test(channel + team)) {
      return `https://app.slack.com/client/${team}/${channel}`;
    }
  }
  return null;
}

async function findSlackTab(excludeTabId, windowId) {
  const tabs = (await chrome.tabs.query({ url: SLACK_CLIENT_URL })).filter(
    (t) => t.id !== excludeTabId
  );
  if (!tabs.length) return null;
  // Prefer a Slack tab in the same window, then the most recently used one.
  tabs.sort(
    (a, b) =>
      (b.windowId === windowId) - (a.windowId === windowId) ||
      (b.lastAccessed || 0) - (a.lastAccessed || 0)
  );
  return tabs[0];
}

// True when the tab exists only because of this link (new tab / blank before it).
function isThrowawayTab(tab) {
  const prev = tab.url || "";
  return (
    !prev ||
    prev === "about:blank" ||
    /^(chrome|brave|edge):\/\/newtab/.test(prev) ||
    parseSlackLink(prev) !== null ||
    /^https:\/\/[^/]+\.slack\.com\/(archives|messages)\//.test(prev)
  );
}

async function handle(details) {
  if (details.frameId !== 0) return;
  const target = parseSlackLink(details.url);
  if (!target) return;

  const last = recentlyHandled.get(details.tabId);
  if (last && Date.now() - last < 3000) return;
  recentlyHandled.set(details.tabId, Date.now());

  let sourceTab;
  try {
    sourceTab = await chrome.tabs.get(details.tabId);
  } catch {
    return;
  }
  // Links Slack itself navigates to inside its own tab are left alone.
  if ((sourceTab.url || "").startsWith("https://app.slack.com/")) return;

  const slackTab = await findSlackTab(sourceTab.id, sourceTab.windowId);
  if (!slackTab) {
    // No Slack tab yet: skip the desktop-app page and open the web client here.
    await chrome.tabs.update(sourceTab.id, { url: target });
    return;
  }

  await chrome.tabs.update(slackTab.id, { url: target, active: true });
  await chrome.windows.update(slackTab.windowId, { focused: true });

  if (isThrowawayTab(sourceTab)) {
    await chrome.tabs.remove(sourceTab.id).catch(() => {});
  } else {
    // The link replaced a page the user still wants: go back to it.
    await chrome.tabs.goBack(sourceTab.id).catch(() => chrome.tabs.remove(sourceTab.id));
  }
}

const filter = {
  url: [
    { hostSuffix: ".slack.com", pathPrefix: "/archives/" },
    { hostEquals: "slack.com", pathEquals: "/app_redirect" },
    { hostSuffix: ".slack.com", pathEquals: "/app_redirect" },
  ],
};

chrome.webNavigation.onBeforeNavigate.addListener((d) => handle(d).catch(console.error), filter);

// Exported for tests (ignored by the browser).
if (typeof module !== "undefined") module.exports = { parseSlackLink };
