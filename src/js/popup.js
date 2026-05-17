const COLOR_STORAGE_KEY = "simpleHighlighterColor";
const DEFAULT_COLOR = "#fff59d";

let statusTimer = null;

function setStatus(message, type = "info") {
  const element = document.getElementById("status");
  if (!element) return;

  element.textContent = message || "";
  element.dataset.type = message ? type : "";

  clearTimeout(statusTimer);
  if (message) {
    statusTimer = setTimeout(() => {
      element.textContent = "";
      element.dataset.type = "";
    }, 3000);
  }
}

function setActiveColor(color) {
  document.querySelectorAll(".colorBtn").forEach((button) => {
    const isActive = button.dataset.color === color;
    button.classList.toggle("isActive", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function getActiveColor() {
  const active = document.querySelector(".colorBtn.isActive");
  return active?.dataset.color || DEFAULT_COLOR;
}

async function getStoredColor() {
  const result = await chrome.storage.local.get([COLOR_STORAGE_KEY]);
  return result[COLOR_STORAGE_KEY] || DEFAULT_COLOR;
}

async function setStoredColor(color) {
  await chrome.storage.local.set({ [COLOR_STORAGE_KEY]: color });
}

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs?.[0] || null);
    });
  });
}

async function ensureAndSend(tab, payload) {
  const directResponse = await sendToContent(tab.id, payload);
  if (directResponse) return directResponse;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["src/js/content.js"],
    });
  } catch {
    return {
      ok: false,
      message:
        "Cannot run on this page. Browser pages, extension stores, and PDFs are restricted.",
    };
  }

  const injectedResponse = await sendToContent(tab.id, payload);
  if (injectedResponse) return injectedResponse;

  return {
    ok: false,
    message: "Could not connect to this page. Try refreshing it.",
  };
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

async function runAction(payload) {
  const tab = await getActiveTab();

  if (!tab?.id) {
    setStatus("No active tab found.", "error");
    return;
  }

  const response = await ensureAndSend(tab, payload);

  if (response?.ok) {
    setStatus(response.message || "Done.", "ok");
    return;
  }

  setStatus(response?.message || "No changes applied.", "error");
}

document.querySelectorAll(".colorBtn").forEach((button) => {
  button.style.backgroundColor = button.dataset.color;

  button.addEventListener("click", async () => {
    const color = button.dataset.color;
    setActiveColor(color);
    await setStoredColor(color);
    setStatus("Color selected.", "info");
  });
});

document.getElementById("highlight").addEventListener("click", () => {
  runAction({ action: "highlight", color: getActiveColor() });
});

document.getElementById("erase").addEventListener("click", () => {
  runAction({ action: "erase" });
});

document.getElementById("clearAll").addEventListener("click", () => {
  runAction({ action: "clearAll" });
});

(async () => {
  try {
    setActiveColor(await getStoredColor());
  } catch {
    setActiveColor(DEFAULT_COLOR);
  }
})();
