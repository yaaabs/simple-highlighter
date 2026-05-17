function getVersionFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("version") || "latest";
}

const versionLabel = document.getElementById("versionLabel");
if (versionLabel) {
  versionLabel.textContent = `Version ${getVersionFromQuery()}`;
}
