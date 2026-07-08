(function () {
  try {
    var theme = localStorage.getItem("forrent-admin-theme") || "system";
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var resolved = theme === "dark" || (theme === "system" && prefersDark) ? "dark" : "light";
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(resolved);
  } catch {}
})();
