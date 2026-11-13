// Lightweight transient toast. One shared container.
(function () {
  const LS = (window.LookSync = window.LookSync || {});

  let container = null;

  function ensureContainer() {
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-stack";
      document.body.appendChild(container);
    }
    return container;
  }

  LS.toast = function (message, type = "info", duration = 3200) {
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = message;
    ensureContainer().appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 300);
    }, duration);
  };
})();
