// Native before/after compare slider. No framework state — a CSS var --pos
// (0–100) drives a clip-path on the "before" image and the handle position.
// Pointer events use capture so dragging keeps working outside the element.
(function () {
  const LS = (window.LookSync = window.LookSync || {});

  LS.createCompareSlider = function (root, { beforeSrc, afterSrc, beforeLabel = "Result", afterLabel = "Original" }) {
    root.classList.add("compare-slider");
    root.innerHTML = `
      <img class="compare-img compare-after" src="${afterSrc}" alt="${afterLabel}">
      <img class="compare-img compare-before" src="${beforeSrc}" alt="${beforeLabel}">
      <span class="compare-label compare-label-before">${beforeLabel}</span>
      <span class="compare-label compare-label-after">${afterLabel}</span>
      <div class="compare-handle" role="slider" aria-label="Compare" aria-valuemin="0" aria-valuemax="100" tabindex="0">
        <span class="compare-handle-grip"></span>
      </div>`;

    const handle = root.querySelector(".compare-handle");
    let pos = 50;

    function apply() {
      root.style.setProperty("--pos", String(pos));
      handle.setAttribute("aria-valuenow", String(Math.round(pos)));
    }

    function setFromClientX(clientX) {
      const rect = root.getBoundingClientRect();
      pos = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      apply();
    }

    function onPointerMove(e) {
      if (e.buttons === 0) return;
      setFromClientX(e.clientX);
    }

    handle.addEventListener("pointerdown", (e) => {
      handle.setPointerCapture(e.pointerId);
      setFromClientX(e.clientX);
    });
    handle.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerdown", (e) => {
      if (e.target === handle || handle.contains(e.target)) return;
      setFromClientX(e.clientX);
    });
    handle.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { pos = Math.max(0, pos - 2); apply(); }
      if (e.key === "ArrowRight") { pos = Math.min(100, pos + 2); apply(); }
    });

    apply();
    return { setPosition: (v) => { pos = v; apply(); } };
  };
})();
