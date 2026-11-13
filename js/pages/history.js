// History page: paginated grid of the user's recent try-ons.
(function () {
  const LS = window.LookSync;

  LS.initAuthState();
  LS.mountAccount(document.getElementById("account-slot"));

  const root = document.getElementById("history-root");
  const PAGE_SIZE = 12;
  let page = 1;

  let lastKey = "__init__";
  LS.onAuthState((state) => {
    if (!state.ready) return;
    const key = !state.authOk ? "__offline__" : state.user ? state.user.uid : null;
    if (key === lastKey) return;
    lastKey = key;
    if (!state.authOk) {
      renderAuthUnavailable();
    } else if (!state.user) {
      renderSignin();
    } else {
      load();
    }
  });

  function renderAuthUnavailable() {
    root.innerHTML = `
      <div class="result-gate">
        <h1>Can't reach Google Sign-In</h1>
        <p>LookSync needs Google to verify your account. Check your network connection, then try again.</p>
        <button class="btn btn-primary" id="gate-retry">Try again</button>
      </div>`;
    document.getElementById("gate-retry").onclick = () => location.reload();
  }

  function renderSignin() {
    root.innerHTML = `
      <div class="result-gate">
        <h1>Sign in to see your try-ons</h1>
        <p>Your history is private to your account. Results are kept for 7 days.</p>
        <button class="btn btn-primary" id="gate-signin">Sign in</button>
      </div>`;
    document.getElementById("gate-signin").onclick = async () => {
      try {
        await LS.ensureSignedIn();
      } catch (err) {
        LS.toast(LS.formatAuthError(err), "error");
      }
    };
  }

  async function load() {
    root.innerHTML = `<div class="loading-block"><div class="spinner"></div></div>`;
    try {
      const { data, pagination } = await LS.getMySyncs(page, PAGE_SIZE);
      if (!data || data.length === 0) {
        root.innerHTML = `
          <div class="result-gate">
            <h1>No try-ons yet</h1>
            <p>Your past looks from the last 7 days show up here.</p>
            <a class="btn btn-primary" href="./">Start your first look</a>
          </div>`;
        return;
      }
      renderGrid(data, pagination);
    } catch (err) {
      root.innerHTML = `<div class="result-gate"><h1>Couldn't load history</h1><p>${err?.message || "Please try again."}</p></div>`;
    }
  }

  function statusLabel(status) {
    if (status === "completed") return "Ready";
    if (status === "failed") return "Failed";
    return "Processing…";
  }

  function renderGrid(items, pagination) {
    const cards = items.map((item) => {
      const thumb = item.results && item.results[0] ? item.results[0].imageUrl : null;
      const scopes = (item.contentScopes || []).join(", ");
      const when = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "";
      const media = thumb
        ? `<img src="${thumb}" alt="Try-on result" loading="lazy">`
        : `<div class="history-pending">${statusLabel(item.status)}</div>`;
      return `
        <article class="history-card" data-id="${item.id}">
          <a class="history-media" href="result.html?id=${encodeURIComponent(item.id)}">
            ${media}
            <span class="history-status status-${item.status}">${statusLabel(item.status)}</span>
          </a>
          <div class="history-meta">
            <span class="history-scopes">${scopes || "Look"}</span>
            <span class="history-when muted">${when}</span>
          </div>
          <button class="history-delete" data-del="${item.id}" aria-label="Delete try-on">Delete</button>
        </article>`;
    }).join("");

    const totalPages = pagination?.totalPages || 1;
    const pager = totalPages > 1
      ? `<div class="pager">
          <button class="btn btn-small btn-ghost" data-page="prev" ${page <= 1 ? "disabled" : ""}>Previous</button>
          <span class="muted">Page ${page} of ${totalPages}</span>
          <button class="btn btn-small btn-ghost" data-page="next" ${page >= totalPages ? "disabled" : ""}>Next</button>
        </div>`
      : "";

    root.innerHTML = `<div class="history-grid">${cards}</div>${pager}`;

    root.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", () => onDelete(btn.dataset.del));
    });
    const prev = root.querySelector('[data-page="prev"]');
    const next = root.querySelector('[data-page="next"]');
    if (prev) prev.onclick = () => { if (page > 1) { page -= 1; load(); } };
    if (next) next.onclick = () => { if (page < totalPages) { page += 1; load(); } };
  }

  async function onDelete(id) {
    const ok = await LS.confirmDialog({
      title: "Delete this try-on?",
      message: "This permanently removes the result. This can't be undone.",
      confirmText: "Delete",
      cancelText: "Keep",
      danger: true,
    });
    if (!ok) return;
    try {
      await LS.deleteMySync(id);
      LS.toast("Try-on deleted.");
      load();
    } catch (err) {
      LS.toast(err?.message || "Couldn't delete. Please try again.", "error");
    }
  }
})();
