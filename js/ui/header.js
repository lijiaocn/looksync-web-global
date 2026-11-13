// Account slot: sessionStorage owns the paint across page loads.
// Values: JSON user | "guest" (explicit sign-out) | absent (unknown / first paint).
// account-boot.html paints synchronously; this file binds events and fills first visit.
(function () {
  const LS = (window.LookSync = window.LookSync || {});
  const CACHE_KEY = "ls.account";

  LS.clearAccountCache = writeGuest;

  LS.mountAccount = function (slot) {
    if (!slot) return;

    const cached = readCachedUser();
    if (cached) {
      if (slot.dataset.accountUid === cached.uid && slot.querySelector(".account-user")) {
        bindSignedIn(slot);
      } else {
        renderSignedIn(slot, cached);
      }
    } else if (isGuest()) {
      ensureSignIn(slot);
    }

    LS.onAuthState((state) => {
      if (!state.ready) return;

      if (!state.authOk) {
        // Keep a cached account paint if we have one; otherwise show retry, not a dead Sign in.
        if (readCachedUser() && slot.querySelector(".account-user")) {
          bindSignedIn(slot);
          return;
        }
        showAuthUnavailable(slot);
        return;
      }

      if (readCachedUser()) {
        bindSignedIn(slot);
        return;
      }

      if (!state.user) {
        writeGuest();
        ensureSignIn(slot);
        return;
      }

      writeCachedUser(state.user);
      renderSignedIn(slot, state.user);
    });
  };

  function readRaw() {
    try {
      return sessionStorage.getItem(CACHE_KEY);
    } catch {
      return null;
    }
  }

  function isGuest() {
    return readRaw() === "guest";
  }

  function readCachedUser() {
    const raw = readRaw();
    if (!raw || raw === "guest") return null;
    try {
      const user = JSON.parse(raw);
      return user && user.uid ? user : null;
    } catch {
      return null;
    }
  }

  function writeCachedUser(user) {
    try {
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          uid: user.uid,
          displayName: user.displayName || "",
          email: user.email || "",
          photoURL: user.photoURL || "",
        }),
      );
    } catch {
      // ignore quota / private mode
    }
  }

  function writeGuest() {
    try {
      sessionStorage.setItem(CACHE_KEY, "guest");
    } catch {
      // ignore
    }
  }

  function ensureSignIn(slot) {
    delete slot.dataset.accountUid;
    let btn = slot.querySelector('[data-act="signin"]');
    if (!btn) {
      slot.innerHTML = `<button class="btn btn-small btn-primary" data-act="signin">Sign in</button>`;
      btn = slot.querySelector('[data-act="signin"]');
    }
    btn.onclick = doSignIn;
  }

  function showAuthUnavailable(slot) {
    delete slot.dataset.accountUid;
    slot.innerHTML = `<button class="btn btn-small btn-ghost" data-act="auth-retry" title="Can't reach Google Sign-In">Retry</button>`;
    slot.querySelector('[data-act="auth-retry"]').onclick = () => location.reload();
  }

  function renderSignedIn(slot, user) {
    slot.dataset.accountUid = user.uid;
    const name = (user.displayName || user.email || "Account").trim();
    const initial = name.charAt(0).toUpperCase();
    const avatar = user.photoURL
      ? `<img src="${escapeHtml(user.photoURL)}" alt="" referrerpolicy="no-referrer">`
      : `<span class="avatar-fallback">${escapeHtml(initial)}</span>`;
    const safeName = escapeHtml(name);

    slot.innerHTML = `
      <div class="account-menu">
        <button class="account-user" data-act="toggle" aria-haspopup="true" aria-expanded="false" title="${safeName}">
          <span class="avatar">${avatar}</span>
          <span class="account-name">${safeName}</span>
        </button>
        <div class="account-dropdown" hidden>
          <a href="history.html">My try-ons</a>
          <a href="profile.html">Account</a>
          <button data-act="signout">Sign out</button>
        </div>
      </div>`;

    bindSignedIn(slot);
  }

  function bindSignedIn(slot) {
    const menu = slot.querySelector(".account-menu");
    const toggle = slot.querySelector('[data-act="toggle"]');
    const dropdown = slot.querySelector(".account-dropdown");
    const signout = slot.querySelector('[data-act="signout"]');
    if (!menu || !toggle || !dropdown || !signout) return;
    if (toggle.dataset.bound === "1") return;
    toggle.dataset.bound = "1";

    function closeMenu() {
      dropdown.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      document.removeEventListener("click", onOutside);
    }
    function onOutside(e) {
      if (!menu.contains(e.target)) closeMenu();
    }
    toggle.onclick = (e) => {
      e.stopPropagation();
      const open = dropdown.hidden;
      dropdown.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
      if (open) document.addEventListener("click", onOutside);
    };
    signout.onclick = async () => {
      closeMenu();
      writeGuest();
      ensureSignIn(slot);
      await LS.signOut();
      LS.toast("Signed out.");
    };
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function doSignIn() {
    try {
      await LS.ensureSignedIn();
    } catch (err) {
      LS.toast(LS.formatAuthError(err), "error");
    }
  }
})();

