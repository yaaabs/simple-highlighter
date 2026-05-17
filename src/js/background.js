const COLOR_STORAGE_KEY = "simpleHighlighterColor";
const DEFAULT_COLOR = "#fff59d";

const COLORS = {
  yellow: { title: "Yellow", value: "#fff59d" },
  green: { title: "Green", value: "#a7f3d0" },
  pink: { title: "Pink", value: "#fbcfe8" },
  blue: { title: "Blue", value: "#bfdbfe" },
};

const WEB_DOCUMENT_PATTERNS = ["http://*/*", "https://*/*"];

chrome.runtime.onInstalled.addListener((details) => {
  registerContextMenus();

  if (details.reason === "update") {
    openUpdatePage();
  }
});

chrome.runtime.onStartup.addListener(() => {
  registerContextMenus();
});

function openUpdatePage() {
  const version = chrome.runtime.getManifest().version;
  chrome.tabs.create({
    url: chrome.runtime.getURL(`src/html/update.html?version=${encodeURIComponent(version)}`),
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id || isRestrictedUrl(tab.url)) return;

  if (info.menuItemId === "simple-highlighter-erase") {
    await runTabAction(tab.id, { action: "erase" });
    return;
  }

  const colorKey = String(info.menuItemId).replace(
    "simple-highlighter-color-",
    "",
  );
  const color = COLORS[colorKey]?.value;
  if (!color) return;

  await chrome.storage.local.set({ [COLOR_STORAGE_KEY]: color });
  await runTabAction(tab.id, { action: "highlight", color });
});

async function registerContextMenus() {
  try {
    await removeAllContextMenus();

    chrome.contextMenus.create({
      id: "simple-highlighter-root",
      title: "Simple Highlighter",
      contexts: ["selection"],
      documentUrlPatterns: WEB_DOCUMENT_PATTERNS,
    });

    for (const [key, color] of Object.entries(COLORS)) {
      chrome.contextMenus.create({
        id: `simple-highlighter-color-${key}`,
        parentId: "simple-highlighter-root",
        title: color.title,
        contexts: ["selection"],
        documentUrlPatterns: WEB_DOCUMENT_PATTERNS,
      });
    }

    chrome.contextMenus.create({
      id: "simple-highlighter-separator",
      parentId: "simple-highlighter-root",
      type: "separator",
      contexts: ["selection"],
      documentUrlPatterns: WEB_DOCUMENT_PATTERNS,
    });

    chrome.contextMenus.create({
      id: "simple-highlighter-erase",
      parentId: "simple-highlighter-root",
      title: "Erase highlight",
      contexts: ["selection"],
      documentUrlPatterns: WEB_DOCUMENT_PATTERNS,
    });
  } catch {
    // Context menus are rebuilt the next time the service worker wakes.
  }
}

function removeAllContextMenus() {
  return new Promise((resolve) => {
    chrome.contextMenus.removeAll(() => {
      resolve();
    });
  });
}

async function runTabAction(tabId, payload) {
  const directResponse = await sendToContent(tabId, payload);
  if (directResponse) return directResponse;

  try {
    await ensureContentScript(tabId);
    return await sendToContent(tabId, payload);
  } catch {
    return null;
  }
}

async function ensureContentScript(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["src/js/content.js"],
  });
}

function sendToContent(tabId, payload) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, payload, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        resolve(null);
        return;
      }

      resolve(response || null);
    });
  });
}

function isRestrictedUrl(url) {
  if (!url) return true;

  return (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("data:") ||
    url.startsWith("javascript:")
  );
}
