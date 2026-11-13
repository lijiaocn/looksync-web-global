// In-memory auth + balance cache. The gate for "Start try-on" reads this,
// not persisted storage.
(function () {
  const LS = (window.LookSync = window.LookSync || {});

  // authOk: false when Firebase Auth never became healthy (e.g. Google unreachable).
  let state = { user: null, balance: null, ready: false, authOk: true };
  const listeners = new Set();
  let started = false;

  const READY_TIMEOUT_MS = 4000;

  function notify() {
    listeners.forEach((fn) => fn(state));
  }

  function markReady(user, authOk) {
    const sameUser = user && state.user && user.uid === state.user.uid;
    state = {
      user: user ?? null,
      balance: sameUser ? state.balance : null,
      ready: true,
      authOk: authOk !== false,
    };
    notify();
  }

  async function loadBalance() {
    try {
      const { credits } = await LS.getMyBalance();
      if (state.user) {
        state = { ...state, balance: credits };
        notify();
      }
    } catch {
      // Non-fatal: balance just stays unknown.
    }
  }

  function looksLikeNetworkAuthError(err) {
    const code = String(err?.code || "");
    const message = String(err?.message || err || "");
    return (
      code.includes("network") ||
      message.includes("network") ||
      message.includes("Failed to fetch") ||
      message.includes("ERR_NAME_NOT_RESOLVED") ||
      message.includes("ERR_INTERNET_DISCONNECTED") ||
      message.includes("ERR_CONNECTION") ||
      message.includes("INTERNAL ASSERTION FAILED") ||
      message.includes("Pending promise was never set")
    );
  }

  LS.formatAuthError = function (err) {
    if (looksLikeNetworkAuthError(err) || (state.ready && state.authOk === false)) {
      return "Can't reach sign-in right now. Check your network and try again.";
    }
    const code = String(err?.code || "");
    if (code.includes("popup-closed") || code.includes("cancelled")) {
      return "Sign-in was cancelled.";
    }
    if (code.includes("invalid-email")) return "That email doesn't look valid.";
    if (code.includes("user-not-found") || code.includes("invalid-credential") || code.includes("wrong-password")) {
      return "Email or password is incorrect.";
    }
    if (code.includes("email-already-in-use")) return "That email already has an account. Sign in instead.";
    if (code.includes("weak-password")) return "Use a password with at least 6 characters.";
    if (code.includes("too-many-requests")) return "Too many attempts. Wait a moment and try again.";
    return err?.message || "Sign-in failed. Please try again.";
  };

  LS.isAuthUnavailable = function () {
    return state.ready && state.authOk === false;
  };

  LS.initAuthState = function () {
    if (started) return;
    started = true;

    console.info(`[LookSync] env=${LS.ENV}${LS.IS_EMULATOR ? " (Auth emulator)" : ""}`);

    const timeoutId = setTimeout(() => {
      if (state.ready) return;
      console.warn(
        "[LookSync] Auth is slow to become ready." +
          (LS.IS_EMULATOR
            ? " Emulator mode may be unreachable."
            : " Google Sign-In may be blocked or offline."),
      );
      // Never got onAuthStateChanged — treat as unreachable, not "signed out".
      markReady(null, false);
    }, READY_TIMEOUT_MS);

    LS.subscribeAuth((user) => {
      clearTimeout(timeoutId);
      markReady(user, true);
    });
  };

  LS.onAuthState = function (cb) {
    listeners.add(cb);
    cb(state);
    return () => listeners.delete(cb);
  };

  LS.getAuthState = function () {
    return state;
  };

  LS.isSignedIn = function () {
    return !!state.user;
  };

  LS.refreshBalance = async function () {
    if (state.user) await loadBalance();
  };

  // The only login gate. Already signed in → pass through; otherwise show chooser.
  LS.ensureSignedIn = async function () {
    if (state.user) return state.user;
    if (state.ready && state.authOk === false) {
      const err = new Error("Can't reach sign-in right now. Check your network and try again.");
      err.code = "auth/network-request-failed";
      throw err;
    }
    try {
      const cred = await LS.promptSignIn();
      state = { user: cred.user, balance: null, ready: true, authOk: true };
      notify();
      await loadBalance();
      return cred.user;
    } catch (err) {
      if (looksLikeNetworkAuthError(err)) {
        state = { ...state, ready: true, authOk: false, user: null, balance: null };
        notify();
      }
      throw err;
    }
  };
})();
