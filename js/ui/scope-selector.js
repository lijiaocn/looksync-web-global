// Multi-select chips for "what to sync". Mirrors iOS SyncContentScopePicker:
// Full Look (makeup) toggles with eyebrow / eyeMakeup / blush / lips together;
// getSelected folds parts away when makeup is on (same as SyncContentScope.apiValues).
(function () {
  const LS = (window.LookSync = window.LookSync || {});

  const MAKEUP = "makeup";
  const MAKEUP_PARTS = new Set(["eyebrow", "eyeMakeup", "blush", "lips"]);

  const FALLBACK = [
    { value: "makeup", label: "Full Look" },
    { value: "eyebrow", label: "Brows" },
    { value: "eyeMakeup", label: "Eyes" },
    { value: "blush", label: "Blush" },
    { value: "lips", label: "Lips" },
    { value: "hairstyle", label: "Hair" },
    { value: "hat", label: "Hat" },
    { value: "glasses", label: "Glasses" },
  ];

  LS.createScopeSelector = async function (root) {
    const selected = new Set([MAKEUP]);
    let options = FALLBACK;

    try {
      const { data } = await LS.getSyncContentScopes("en");
      const enabled = (data || []).filter((o) => o.enabled !== false);
      if (enabled.length) options = enabled;
    } catch {
      // keep fallback
    }

    const optionValues = new Set(options.map((o) => o.value));
    // Full Look selected → show all available makeup parts as selected too.
    if (selected.has(MAKEUP)) {
      MAKEUP_PARTS.forEach((p) => {
        if (optionValues.has(p)) selected.add(p);
      });
    }

    root.innerHTML = "";
    options.forEach((opt) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = opt.label;
      chip.dataset.value = opt.value;
      if (selected.has(opt.value)) chip.classList.add("active");
      chip.addEventListener("click", () => {
        toggle(opt.value);
        syncChipUI();
      });
      root.appendChild(chip);
    });

    function toggle(value) {
      if (value === MAKEUP) {
        if (selected.has(MAKEUP)) {
          selected.delete(MAKEUP);
          MAKEUP_PARTS.forEach((p) => selected.delete(p));
        } else {
          selected.add(MAKEUP);
          MAKEUP_PARTS.forEach((p) => {
            if (optionValues.has(p)) selected.add(p);
          });
        }
        return;
      }

      if (MAKEUP_PARTS.has(value)) {
        if (selected.has(value)) {
          selected.delete(value);
          selected.delete(MAKEUP);
        } else {
          selected.add(value);
          const partsPresent = [...MAKEUP_PARTS].filter((p) => optionValues.has(p));
          if (partsPresent.every((p) => selected.has(p))) {
            selected.add(MAKEUP);
          }
        }
        return;
      }

      if (selected.has(value)) selected.delete(value);
      else selected.add(value);
    }

    function syncChipUI() {
      root.querySelectorAll(".chip").forEach((chip) => {
        chip.classList.toggle("active", selected.has(chip.dataset.value));
      });
    }

    return {
      getSelected() {
        const effective = new Set(selected);
        if (effective.has(MAKEUP)) {
          MAKEUP_PARTS.forEach((p) => effective.delete(p));
        }
        return options.map((o) => o.value).filter((v) => effective.has(v));
      },
    };
  };
})();
