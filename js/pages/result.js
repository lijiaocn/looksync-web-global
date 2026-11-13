// Result page: poll a single sync until it completes, then show compare view.
(function () {
  const LS = window.LookSync;

  LS.initAuthState();
  LS.mountAccount(document.getElementById("account-slot"));

  const syncId = new URLSearchParams(location.search).get("id");
  const root = document.getElementById("result-root");

  const POLL_MIN = 2000;
  const POLL_MAX = 5000;
  let pollTimer = null;
  let stopped = false;

  const CREDITS_LINK = `
    <a class="result-head-credits" href="purchase.html" aria-label="Get more credits">
      <svg class="result-head-credits-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="9" cy="20" r="1.5" fill="currentColor" stroke="none"></circle>
        <circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none"></circle>
        <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.5L21 8H7"></path>
      </svg>
      <span>Credits</span>
    </a>`;

  if (!syncId) {
    renderMessage("No try-on selected", "This link is missing a try-on id. Head back and start a new look.", true);
  } else {
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
        startPolling();
      }
    });
  }

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
        <h1>Sign in to see your try-on</h1>
        <p>Your photos and results are private to your account.</p>
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

  function renderMessage(title, body, home = false) {
    root.innerHTML = `
      <div class="result-gate">
        <h1>${title}</h1>
        <p>${body}</p>
        ${home ? '<a class="btn btn-primary" href="./">Start a new look</a>' : ""}
      </div>`;
  }

  function statusMarkup(title, meta) {
    return `
      <div class="spinner" aria-hidden="true"></div>
      <p class="result-status-title">${title}</p>
      ${meta ? `<p class="result-status-meta">${meta}</p>` : ""}`;
  }

  function renderPending(title, meta) {
    root.innerHTML = `
      <div class="result-head">
        ${CREDITS_LINK}
        <div class="result-tabs" role="tablist">
          <button class="result-tab active" type="button" data-view="result" disabled>Result</button>
          <button class="result-tab" type="button" data-view="compare" disabled>Compare</button>
          <button class="result-tab" type="button" data-view="original" disabled>Original</button>
          <button class="result-tab" type="button" data-view="look" disabled>Look</button>
        </div>
      </div>
      <div class="result-stage" id="result-stage">
        <div class="result-slot">
          <div class="result-spacer" aria-hidden="true"></div>
          <div class="result-status" id="result-status">${statusMarkup(title, meta)}</div>
          <div class="result-media"></div>
        </div>
      </div>
      <div class="result-actions">
        <a class="btn btn-primary" href="./">Continue try-on</a>
      </div>`;
  }

  function setStatus(title, meta) {
    const el = document.getElementById("result-status");
    if (el) el.innerHTML = statusMarkup(title, meta);
    else renderPending(title, meta);
  }

  function startPolling() {
    if (!root.querySelector(".result-slot")) {
      renderPending("Loading your try-on…");
    } else {
      setStatus("Loading your try-on…");
    }
    let interval = POLL_MIN;
    let creatingShown = false;
    const tick = async () => {
      if (stopped) return;
      try {
        const detail = await LS.getSyncDetail(syncId);
        if (detail.status === "completed") {
          renderResult(detail);
          return;
        }
        if (detail.status === "failed") {
          renderMessage("That try-on didn't work out", "The look couldn't be generated. Your credit flow is handled server-side — try a clearer photo.", true);
          return;
        }
        if (!creatingShown) {
          creatingShown = true;
          setStatus("Creating your look…", "Usually ready in about a minute.");
        }
      } catch (err) {
        renderMessage("Couldn't load this try-on", err?.message || "Please try again.", true);
        return;
      }
      interval = Math.min(POLL_MAX, interval + 1000);
      pollTimer = setTimeout(tick, interval);
    };
    tick();
  }

  window.addEventListener("beforeunload", () => {
    stopped = true;
    if (pollTimer) clearTimeout(pollTimer);
  });

  function renderResult(detail) {
    const resultImg = detail.results && detail.results[0] ? detail.results[0].imageUrl : null;
    const originalImg = detail.source?.original?.imageUrl || null;
    const referenceImg = detail.source?.reference?.imageUrl || null;

    if (!resultImg) {
      renderMessage("Result unavailable", "This result may have expired (results are kept for 7 days).", true);
      return;
    }

    root.innerHTML = `
      <div class="result-head">
        ${CREDITS_LINK}
        <div class="result-tabs" role="tablist">
          <button class="result-tab active" type="button" data-view="result">Result</button>
          <button class="result-tab" type="button" data-view="compare"${originalImg ? "" : " disabled"}>Compare</button>
          <button class="result-tab" type="button" data-view="original"${originalImg ? "" : " disabled"}>Original</button>
          <button class="result-tab" type="button" data-view="look"${referenceImg ? "" : " disabled"}>Look</button>
        </div>
      </div>
      <div class="result-stage" id="result-stage">
        <div class="result-slot" id="result-slot">
          <div class="result-spacer" aria-hidden="true"></div>
          <div class="result-media" id="result-media"></div>
        </div>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" type="button" id="result-save">Save photo</button>
        <a class="btn btn-primary" href="./">Continue try-on</a>
      </div>`;

    document.getElementById("result-save").onclick = () => saveResultImage(resultImg);

    const slot = document.getElementById("result-slot");
    const media = document.getElementById("result-media");
    let showToken = 0;

    function showSingle(src, alt) {
      const token = ++showToken;
      media.innerHTML = "";
      const img = new Image();
      img.className = "result-single";
      img.alt = alt;
      const settle = () => {
        if (token !== showToken) return;
        media.innerHTML = "";
        media.appendChild(img);
      };
      img.onload = settle;
      img.onerror = settle;
      img.src = src;
      if (img.complete) settle();
    }

    function show(view) {
      if (view === "compare" && originalImg) {
        ++showToken;
        media.innerHTML = "";
        const holder = document.createElement("div");
        media.appendChild(holder);
        LS.createCompareSlider(holder, {
          beforeSrc: resultImg,
          afterSrc: originalImg,
          beforeLabel: "Result",
          afterLabel: "Original",
        });
      } else if (view === "original") {
        showSingle(originalImg, "Your original photo");
      } else if (view === "look") {
        showSingle(referenceImg, "Reference look");
      } else {
        showSingle(resultImg, "Try-on result");
      }
    }

    root.querySelectorAll(".result-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        if (tab.disabled) return;
        root.querySelectorAll(".result-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        show(tab.dataset.view);
      });
    });

    show("result");
  }

  async function saveResultImage(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("download failed");
      const blob = await res.blob();
      const ext = (blob.type || "").includes("png") ? "png" : "jpg";
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `looksync-${syncId || "result"}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      LS.toast("Couldn't save the photo. Try opening it and saving manually.", "error");
    }
  }
})();
