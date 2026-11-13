// Workbench page: pick two photos, choose scopes, start a try-on.
(function () {
  const LS = window.LookSync;

  LS.initAuthState();
  LS.mountAccount(document.getElementById("account-slot"));

  const referencePicker = LS.createImagePicker(document.getElementById("picker-reference"));
  const originalPicker = LS.createImagePicker(document.getElementById("picker-original"));
  const startBtn = document.getElementById("start-btn");
  const overlay = document.getElementById("work-overlay");
  const stepEls = overlay
    ? Array.from(overlay.querySelectorAll(".work-steps [data-step]"))
    : [];

  let scopeSelector = null;
  LS.createScopeSelector(document.getElementById("scope-chips")).then((s) => {
    scopeSelector = s;
  });

  function setBusy(busy) {
    startBtn.disabled = busy;
    if (!overlay) return;
    if (busy) {
      overlay.hidden = false;
      overlay.setAttribute("aria-busy", "true");
    } else {
      overlay.hidden = true;
      overlay.removeAttribute("aria-busy");
      setProgress(-1);
    }
  }

  // activeIndex: current step; all before it are done. -1 resets.
  function setProgress(activeIndex) {
    stepEls.forEach((el, i) => {
      el.classList.toggle("is-done", i < activeIndex);
      el.classList.toggle("is-active", i === activeIndex);
    });
  }

  // Never leave the busy mask stuck after a refresh / back-forward cache restore.
  setBusy(false);
  window.addEventListener("pageshow", () => setBusy(false));

  startBtn.addEventListener("click", async () => {
    const referenceFile = referencePicker.getFile();
    const originalFile = originalPicker.getFile();

    if (!referenceFile) {
      LS.toast("Add a reference look first.", "error");
      return;
    }
    if (!originalFile) {
      LS.toast("Add your own photo to try it on.", "error");
      return;
    }

    try {
      setBusy(true);
      setProgress(0);
      await LS.ensureSignedIn();
      await LS.refreshBalance();

      const { balance } = LS.getAuthState();
      if (balance !== null && balance <= 0) {
        LS.toast("You're out of credits.", "error");
        location.href = "purchase.html";
        return;
      }

      const scopes = scopeSelector ? scopeSelector.getSelected() : ["makeup"];
      if (scopes.length === 0) {
        LS.toast("Pick at least one thing to sync.", "error");
        return;
      }

      setProgress(1);
      const referenceId = await LS.uploadReference(referenceFile);
      setProgress(2);
      const originalId = await LS.uploadOriginal(originalFile);
      setProgress(3);
      const { syncId } = await LS.createSync(referenceId, originalId, scopes);
      location.href = `result.html?id=${encodeURIComponent(syncId)}`;
    } catch (err) {
      if (err instanceof LS.ApiError && err.customCode === "INSUFFICIENT_BALANCE") {
        LS.toast("You're out of credits.", "error");
        location.href = "purchase.html";
        return;
      }
      if ((err?.code || "").includes("popup-closed") || (err?.code || "").includes("cancelled") || (err?.code || "").includes("network")) {
        LS.toast(LS.formatAuthError(err), "error");
        return;
      }
      LS.toast(err?.message || "Something went wrong. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  });
})();
