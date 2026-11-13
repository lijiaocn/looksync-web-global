// Account page: profile, balance, credit history, delete account.
(function () {
  const LS = window.LookSync;

  LS.initAuthState();
  LS.mountAccount(document.getElementById("account-slot"));

  const root = document.getElementById("profile-root");

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
        <button class="btn btn-primary" id="gate-signin">Sign in with Google</button>
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
          <h2>Credit history</h2>
          <div id="credit-log" class="credit-log"><div class="spinner"></div></div>
        </section>

        <section class="account-section danger-zone">
          <h2>Delete account</h2>
          <p class="muted">Permanently delete your account and associated data. This can't be undone.</p>
          <button class="btn btn-danger" id="delete-account">Delete my account</button>
        </section>`;

      loadCreditLog();
      document.getElementById("delete-account").onclick = onDeleteAccount;
    } catch (err) {
      root.innerHTML = `<div class="result-gate"><h1>Couldn't load your account</h1><p>${err?.message || "Please try again."}</p></div>`;
    }
  }

  async function loadCreditLog() {
    const box = document.getElementById("credit-log");
    try {
      const { data } = await LS.getMyCreditLog(1, 20);
      if (!data || data.length === 0) {
        box.innerHTML = `<p class="muted">No credit activity yet.</p>`;
        return;
      }
      box.innerHTML = data.map((row) => {
        const when = row.createdAt ? new Date(row.createdAt).toLocaleString() : "";
        const sign = row.amount > 0 ? "+" : "";
        const cls = row.amount > 0 ? "positive" : "negative";
        return `
          <div class="credit-row">
            <div>
              <span class="credit-type">${row.type}</span>
              <span class="credit-when muted">${when}</span>
            </div>
            <span class="credit-amount ${cls}">${sign}${row.amount}</span>
          </div>`;
      }).join("");
    } catch {
      box.innerHTML = `<p class="muted">Couldn't load credit history.</p>`;
    }
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
