# Simple Highlighter

Simple Highlighter is a lightweight Manifest V3 extension for Chromium-based browsers. It gives you a fast, focused way to mark selected text, remove highlights, and clear a page without clutter or setup friction.

It is built for readers, students, researchers, and anyone who wants a clean way to emphasize text on webpages without breaking the page layout.

## Why It’s Useful

If you read, research, compare, or review text online, this extension keeps the important parts visible in seconds. It is intentionally simple: pick a color, highlight the selection, erase when needed, or clear everything on the page.

## Features

- Four highlight colors: yellow, green, pink, and blue
- Popup actions for highlight, erase, and clear
- Right-click menu actions for quick highlighting and erase
- Saved color preference with `chrome.storage.local`
- Built-in validation for empty selections and non-highlighted erase attempts
- Works on normal HTTP/HTTPS webpages
- Clear status messages for success and failure states

## Project Structure

```text
simple-highlighter/
  src/
    css/
      style.css
    html/
      popup.html
    js/
      background.js
      content.js
      popup.js
  icons/
  manifest.json
  LICENSE
  README.md
```

## For Everyone

### Install from Microsoft Edge Add-ons

If you want the easiest path, install it from Microsoft Edge Add-ons when the listing is available:

[Microsoft Edge Add-ons listing](https://microsoftedge.microsoft.com/addons/detail/simple-highlighter/ffookhiocalfakfgmfebagpopnhfdihc)

After installation, pin the extension from the browser toolbar if you want one-click access.

### How to Use It

1. Select text on a normal webpage.
2. Open the Simple Highlighter popup.
3. Choose a color and click Highlight.
4. To remove a highlight, select highlighted text and click Erase.
5. Use Clear when you want to remove all highlights from the current page.

## For Developers

There is no build step. This repository is ready to load directly as an unpacked extension.

### Local Installation

1. Open `edge://extensions` in Microsoft Edge or `chrome://extensions` in Chrome.
2. Turn on Developer mode.
3. Choose Load unpacked.
4. Select this `simple-highlighter` folder.

The browser should load the project root folder, not the individual `src` files. After moving or renaming files, use the extension page's Reload button and refresh the popup or target tab so the new paths are picked up.

### Testing Checklist

- Verify highlight works on a normal webpage.
- Verify erase shows a clear message when the selection does not contain highlights.
- Verify clear removes all highlights from the page.
- Verify the popup UI loads cleanly and remains readable on light backgrounds.
- Verify the right-click menu actions appear on selected text.
- Verify behavior on restricted pages such as browser internal pages and PDFs.

### Validation Command

Run the following check from the project root:

```bash
node --check src/js/background.js src/js/content.js src/js/popup.js
```

## Store Copy Guidance

For organic discovery in extension stores, use wording that includes the problem and the action users want. Strong phrases for this extension are: text highlighter, webpage highlight, study tool, reading helper, highlight selected text, erase highlights, and clear all highlights.

The short store description should stay benefit-first and specific. A good pattern is: what it does, where it works, and why it is useful. For example: "Highlight important text on webpages, erase highlights, and clear pages quickly with a lightweight popup."

## Permissions

| Permission | Purpose |
| --- | --- |
| `activeTab` | Lets the extension act on the current tab after the user invokes it |
| `storage` | Saves the selected highlight color locally |
| `scripting` | Injects `content.js` into a user-invoked tab when needed |
| `contextMenus` | Adds right-click highlight and erase actions |
| `http://*/*`, `https://*/*` | Allows highlighting on normal webpages reliably |

No data is sent off-device.

## Known Limits

- Browser security blocks extension scripts on `chrome://`, `edge://`, `about:`, extension store pages, and native PDF viewers.
- Cross-origin iframe content cannot be highlighted from the parent page.
- Highlights are not persisted after page reload.

## License

This project is released under the MIT License. See [LICENSE](LICENSE).

## Versioning And Releases

This repository follows semantic versioning. The current version is `1.1.1`, which should stay aligned across:

- `manifest.json`
- Git tags such as `v1.1.1`
- Microsoft Edge Add-ons releases

When a future release is ready, bump the version in `manifest.json`, add a matching git tag, and publish the same version in the store release notes.
