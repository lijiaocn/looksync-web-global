// Confirm dialog that must be acknowledged. Returns Promise<boolean>.
(function () {
  const LS = (window.LookSync = window.LookSync || {});

  LS.confirmDialog = function ({ title, message, confirmText = "Confirm", cancelText = "Cancel", danger = false }) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "dialog-overlay";
      overlay.innerHTML = `
        <div class="dialog" role="dialog" aria-modal="true">
          <h2 class="dialog-title"></h2>
          <p class="dialog-message"></p>
          <div class="dialog-actions">
            <button class="btn btn-ghost" data-act="cancel"></button>
            <button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-act="confirm"></button>
          </div>
        </div>`;
      overlay.querySelector(".dialog-title").textContent = title;
      overlay.querySelector(".dialog-message").textContent = message;
      overlay.querySelector('[data-act="cancel"]').textContent = cancelText;
      overlay.querySelector('[data-act="confirm"]').textContent = confirmText;

      function close(result) {
        overlay.remove();
        document.removeEventListener("keydown", onKey);
        resolve(result);
      }
      function onKey(e) {
        if (e.key === "Escape") close(false);
      }

      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close(false);
        const act = e.target.closest("[data-act]")?.dataset.act;
        if (act === "cancel") close(false);
        if (act === "confirm") close(true);
      });
      document.addEventListener("keydown", onKey);
      document.body.appendChild(overlay);
      overlay.querySelector('[data-act="confirm"]').focus();
    });
  };
})();
