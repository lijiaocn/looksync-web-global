// Sign-in chooser: Google or email/password.
(function () {
  const LS = (window.LookSync = window.LookSync || {});

  function cancelledError() {
    const err = new Error("Sign-in was cancelled.");
    err.code = "auth/cancelled";
    return err;
  }

  function mountOverlay(html) {
    const overlay = document.createElement("div");
    overlay.className = "dialog-overlay";
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    return overlay;
  }

  function closeOverlay(overlay, onKey) {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  }

  LS.promptSignIn = function () {
    return new Promise((resolve, reject) => {
      const overlay = mountOverlay(`
        <div class="dialog sign-in-dialog" role="dialog" aria-modal="true" aria-labelledby="sign-in-title">
          <h2 class="dialog-title" id="sign-in-title">Sign in</h2>
          <p class="dialog-message">Choose how you want to continue.</p>
          <div class="sign-in-methods">
            <button type="button" class="sign-in-provider sign-in-provider-google" data-act="google">
              <svg class="sign-in-provider-icon" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
            <button type="button" class="sign-in-provider sign-in-provider-email" data-act="email">
              <svg class="sign-in-provider-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2"></rect>
                <path d="M3 7l9 6 9-6"></path>
              </svg>
              <span>Continue with email</span>
            </button>
          </div>
          <div class="dialog-actions">
            <button type="button" class="sign-in-cancel" data-act="cancel">Cancel</button>
          </div>
        </div>`);

      function onKey(e) {
        if (e.key === "Escape") finishCancel();
      }

      function finishCancel() {
        closeOverlay(overlay, onKey);
        reject(cancelledError());
      }

      document.addEventListener("keydown", onKey);
      overlay.addEventListener("click", async (e) => {
        if (e.target === overlay) {
          finishCancel();
          return;
        }
        const act = e.target.closest("[data-act]")?.dataset.act;
        if (act === "cancel") {
          finishCancel();
          return;
        }
        if (act === "google") {
          closeOverlay(overlay, onKey);
          try {
            resolve(await LS.signInWithGoogle());
          } catch (err) {
            reject(err);
          }
          return;
        }
        if (act === "email") {
          closeOverlay(overlay, onKey);
          try {
            resolve(await promptEmailSignIn());
          } catch (err) {
            reject(err);
          }
        }
      });
    });
  };

  function promptEmailSignIn() {
    return new Promise((resolve, reject) => {
      let mode = "signin";
      const overlay = mountOverlay(`
        <div class="dialog sign-in-dialog" role="dialog" aria-modal="true" aria-labelledby="email-sign-in-title">
          <h2 class="dialog-title" id="email-sign-in-title">Sign in with email</h2>
          <form class="sign-in-form" novalidate>
            <label class="sign-in-field">
              <span>Email</span>
              <input type="email" name="email" autocomplete="email" required>
            </label>
            <label class="sign-in-field">
              <span>Password</span>
              <input type="password" name="password" autocomplete="current-password" required minlength="6">
            </label>
            <p class="sign-in-error" hidden></p>
            <div class="dialog-actions sign-in-form-actions">
              <button type="button" class="sign-in-cancel" data-act="cancel">Cancel</button>
              <button type="submit" class="sign-in-submit" data-act="submit">Sign in</button>
            </div>
          </form>
          <button type="button" class="sign-in-switch" data-act="switch">Need an account? Create one</button>
        </div>`);

      const title = overlay.querySelector("#email-sign-in-title");
      const form = overlay.querySelector(".sign-in-form");
      const submitBtn = overlay.querySelector('[data-act="submit"]');
      const switchBtn = overlay.querySelector('[data-act="switch"]');
      const errorEl = overlay.querySelector(".sign-in-error");
      const passwordInput = overlay.querySelector('input[name="password"]');

      function onKey(e) {
        if (e.key === "Escape") finishCancel();
      }

      function finishCancel() {
        closeOverlay(overlay, onKey);
        reject(cancelledError());
      }

      function setMode(next) {
        mode = next;
        const isCreate = mode === "signup";
        title.textContent = isCreate ? "Create account" : "Sign in with email";
        submitBtn.textContent = isCreate ? "Create account" : "Sign in";
        switchBtn.textContent = isCreate ? "Have an account? Sign in" : "Need an account? Create one";
        passwordInput.autocomplete = isCreate ? "new-password" : "current-password";
        errorEl.hidden = true;
        errorEl.textContent = "";
      }

      function showError(message) {
        errorEl.textContent = message;
        errorEl.hidden = !message;
      }

      document.addEventListener("keydown", onKey);
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) finishCancel();
        const act = e.target.closest("[data-act]")?.dataset.act;
        if (act === "cancel") finishCancel();
        if (act === "switch") setMode(mode === "signin" ? "signup" : "signin");
      });

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = String(form.email.value || "").trim();
        const password = String(form.password.value || "");
        if (!email || !password) {
          showError("Enter your email and password.");
          return;
        }
        submitBtn.disabled = true;
        showError("");
        try {
          const cred =
            mode === "signup"
              ? await LS.createAccountWithEmail(email, password)
              : await LS.signInWithEmail(email, password);
          closeOverlay(overlay, onKey);
          resolve(cred);
        } catch (err) {
          showError(LS.formatAuthError(err));
          submitBtn.disabled = false;
        }
      });

      form.email.focus();
    });
  }
})();
