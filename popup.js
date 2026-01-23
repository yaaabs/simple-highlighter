const DEFAULT_COLOR = "#fff59d";

function setStatus(message) {
  const el = document.getElementById("status");
  if (!el) return;
  el.textContent = message || "";
}

function setActiveColor(color) {
  document.querySelectorAll(".colorBtn").forEach((btn) => {
    btn.classList.toggle("isActive", btn.dataset.color === color);
  });
}

function getActiveColor() {
  const active = document.querySelector(".colorBtn.isActive");
  return active?.dataset.color || DEFAULT_COLOR;
}

async function getStoredColor() {
  const result = await chrome.storage.local.get(["simpleHighlighterColor"]);
  return result.simpleHighlighterColor || DEFAULT_COLOR;
}

async function setStoredColor(color) {
  await chrome.storage.local.set({ simpleHighlighterColor: color });
}

function withActiveTab(fn) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs?.[0]?.id;
    if (!tabId) {
      setStatus("No active tab.");
      return;
    }
    fn(tabId);
  });
}

function sendToContent(tabId, payload) {
  chrome.tabs.sendMessage(tabId, payload, (response) => {
    const err = chrome.runtime.lastError;
    if (err) {
      setStatus("Unable to run on this page.");
      return;
    }

    if (!response?.ok) {
      setStatus(response?.message || "No changes applied.");
      return;
    }

    setStatus(response.message || "Done.");
  });
}

document.querySelectorAll(".colorBtn").forEach((btn) => {
  btn.style.background = btn.dataset.color;
  btn.addEventListener("click", async () => {
    const color = btn.dataset.color;
    setActiveColor(color);
    await setStoredColor(color);
    setStatus("Color selected.");
  });
});

document.getElementById("highlight").addEventListener("click", () => {
  const color = getActiveColor();
  withActiveTab((tabId) => sendToContent(tabId, { action: "highlight", color }));
});

document.getElementById("erase").addEventListener("click", () => {
  withActiveTab((tabId) => sendToContent(tabId, { action: "erase" }));
});

document.getElementById("clearAll").addEventListener("click", () => {
  withActiveTab((tabId) => sendToContent(tabId, { action: "clearAll" }));
});

(async () => {
  const color = await getStoredColor();
  setActiveColor(color);
})();
