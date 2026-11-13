// Account page: profile, balance, orders / credit history tabs, delete account.
(function () {
  const LS = window.LookSync;

  LS.initAuthState();
  LS.mountAccount(document.getElementById("account-slot"));

  const root = document.getElementById("profile-root");
  const PAGE_SIZE = 10;

  let activeTab = "orders";
  let ordersPage = 1;
  let creditsPage = 1;

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
      renderProfile();
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
        <h1>Sign in to view your account</h1>
        <p>Your profile, credits, and history are private to your account.</p>
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

  async function renderProfile() {
    root.innerHTML = `<div class="loading-block"><div class="spinner"></div></div>`;
    try {
      const [profile, balance] = await Promise.all([LS.getMyProfile(), LS.getMyBalance()]);
      const initial = (profile.name || profile.email || "?").trim().charAt(0).toUpperCase();
      const avatar = profile.avatarUrl
        ? `<img src="${profile.avatarUrl}" alt="" referrerpolicy="no-referrer">`
        : `<span class="avatar-fallback large">${initial}</span>`;

      root.innerHTML = `
        <section class="account-card">
          <div class="account-id">
            <div class="avatar large">${avatar}</div>
            <div>
              <h1>${profile.name || "LookSync user"}</h1>
              <p class="muted">${profile.email || ""}</p>
            </div>
          </div>
          <div class="balance-box">
            <span class="muted">Credits</span>
            <strong id="balance-value">${balance.credits}</strong>
            <a class="btn btn-small btn-primary" href="purchase.html">Get more</a>
          </div>
        </section>

        <section class="account-section">
          <div class="account-tabs" role="tablist">
            <button type="button" class="account-tab${activeTab === "orders" ? " active" : ""}" role="tab" data-tab="orders" aria-selected="${activeTab === "orders"}">Orders</button>
            <button type="button" class="account-tab${activeTab === "credits" ? " active" : ""}" role="tab" data-tab="credits" aria-selected="${activeTab === "credits"}">Credit history</button>
          </div>
          <div id="account-tab-panel" class="account-tab-panel">
            <div class="spinner"></div>
          </div>
        </section>

        <section class="account-section danger-zone">
          <h2>Delete account</h2>
          <p class="muted">Permanently delete your account and associated data. This can't be undone.</p>
          <button class="btn btn-danger" id="delete-account">Delete my account</button>
        </section>`;

      root.querySelectorAll("[data-tab]").forEach((tab) => {
        tab.addEventListener("click", () => {
          const next = tab.dataset.tab;
          if (next === activeTab) return;
          activeTab = next;
          root.querySelectorAll(".account-tab").forEach((t) => {
            const on = t.dataset.tab === activeTab;
            t.classList.toggle("active", on);
            t.setAttribute("aria-selected", String(on));
          });
          loadActiveTab();
        });
      });

      document.getElementById("delete-account").onclick = onDeleteAccount;
      loadActiveTab();
    } catch (err) {
      root.innerHTML = `<div class="result-gate"><h1>Couldn't load your account</h1><p>${err?.message || "Please try again."}</p></div>`;
    }
  }

  function loadActiveTab() {
    if (activeTab === "orders") loadOrders();
    else loadCreditLog();
  }

  function renderPager(currentPage, totalPages, onPrev, onNext) {
    if (!totalPages || totalPages <= 1) return "";
    return `
      <div class="pager">
        <button type="button" class="btn btn-small btn-ghost" data-page="prev" ${currentPage <= 1 ? "disabled" : ""}>Previous</button>
        <span class="muted">Page ${currentPage} of ${totalPages}</span>
        <button type="button" class="btn btn-small btn-ghost" data-page="next" ${currentPage >= totalPages ? "disabled" : ""}>Next</button>
      </div>`;
  }

  async function loadOrders() {
    const panel = document.getElementById("account-tab-panel");
    if (!panel) return;
    panel.innerHTML = `<div class="spinner"></div>`;
    try {
      const { data, pagination } = await LS.getMyOrders(ordersPage, PAGE_SIZE);
      const totalPages = pagination?.totalPages || 1;
      if (pagination?.currentPage) ordersPage = pagination.currentPage;

      if (!data || data.length === 0) {
        panel.innerHTML = `<p class="muted">No orders yet.</p>`;
        return;
      }

      const rows = data.map((order) => {
        const when = order.createdAt ? new Date(order.createdAt).toLocaleString() : "";
        const status = orderStatusLabel(order.status);
        const channel = order.paymentChannel || "—";
        const canRefund = order.status === "completed";
        return `
          <div class="order-row">
            <div class="order-main">
              <div class="order-title">
                <span class="order-credits">${order.creditsAmount || 0} credits</span>
                <span class="order-status status-${escapeAttr(order.status || "")}">${status}</span>
              </div>
              <div class="order-meta muted">
                <span>${escapeHtml(channel)}</span>
                <span>${when}</span>
              </div>
            </div>
            ${canRefund
              ? `<button type="button" class="btn btn-small btn-ghost" data-refund="${escapeAttr(order.id)}">Refund</button>`
              : ""}
          </div>`;
      }).join("");

      panel.innerHTML = `
        <div class="order-list">${rows}</div>
        ${renderPager(ordersPage, totalPages)}`;

      panel.querySelectorAll("[data-refund]").forEach((btn) => {
        btn.onclick = () => LS.toast("退款功能尚未开通", "info");
      });
      const prev = panel.querySelector('[data-page="prev"]');
      const next = panel.querySelector('[data-page="next"]');
      if (prev) prev.onclick = () => { if (ordersPage > 1) { ordersPage -= 1; loadOrders(); } };
      if (next) next.onclick = () => { if (ordersPage < totalPages) { ordersPage += 1; loadOrders(); } };
    } catch {
      panel.innerHTML = `<p class="muted">Couldn't load orders.</p>`;
    }
  }

  async function loadCreditLog() {
    const panel = document.getElementById("account-tab-panel");
    if (!panel) return;
    panel.innerHTML = `<div class="spinner"></div>`;
    try {
      const { data, pagination } = await LS.getMyCreditLog(creditsPage, PAGE_SIZE);
      const totalPages = pagination?.totalPages || 1;
      if (pagination?.currentPage) creditsPage = pagination.currentPage;

      if (!data || data.length === 0) {
        panel.innerHTML = `<p class="muted">No credit activity yet.</p>`;
        return;
      }

      const rows = data.map((row) => {
        const when = row.createdAt ? new Date(row.createdAt).toLocaleString() : "";
        const sign = row.amount > 0 ? "+" : "";
        const cls = row.amount > 0 ? "positive" : "negative";
        return `
          <div class="credit-row">
            <div>
              <span class="credit-type">${escapeHtml(row.type || "")}</span>
              <span class="credit-when muted">${when}</span>
            </div>
            <span class="credit-amount ${cls}">${sign}${row.amount}</span>
          </div>`;
      }).join("");

      panel.innerHTML = `
        <div class="credit-log">${rows}</div>
        ${renderPager(creditsPage, totalPages)}`;

      const prev = panel.querySelector('[data-page="prev"]');
      const next = panel.querySelector('[data-page="next"]');
      if (prev) prev.onclick = () => { if (creditsPage > 1) { creditsPage -= 1; loadCreditLog(); } };
      if (next) next.onclick = () => { if (creditsPage < totalPages) { creditsPage += 1; loadCreditLog(); } };
    } catch {
      panel.innerHTML = `<p class="muted">Couldn't load credit history.</p>`;
    }
  }

  function orderStatusLabel(status) {
    if (status === "completed") return "Completed";
    if (status === "refunded") return "Refunded";
    if (status === "paid") return "Paid";
    if (status === "unpaid") return "Unpaid";
    if (status === "cancelled") return "Cancelled";
    if (status === "failed") return "Failed";
    return status || "Unknown";
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  async function onDeleteAccount() {
    const ok = await LS.confirmDialog({
      title: "Delete your account?",
      message: "This permanently deletes your account and associated data. This action cannot be undone.",
      confirmText: "Delete account",
      cancelText: "Keep account",
      danger: true,
    });
    if (!ok) return;
    try {
      await LS.deleteMyAccount();
      await LS.signOut();
      LS.toast("Your account has been deleted.");
      setTimeout(() => (location.href = "./"), 1200);
    } catch (err) {
      LS.toast(err?.message || "Couldn't delete account. Please try again.", "error");
    }
  }
})();
