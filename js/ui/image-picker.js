// Click-to-select + drag & drop image picker with preview.
// Enhances an existing static dropzone in the HTML (SEO-friendly).
(function () {
  const LS = (window.LookSync = window.LookSync || {});

  LS.createImagePicker = function (root, { onChange } = {}) {
    const input = root.querySelector('input[type="file"]');
    const preview = root.querySelector(".dropzone-preview");
    let file = null;

    function setFile(f) {
      if (!f || !f.type.startsWith("image/")) return;
      file = f;
      const url = URL.createObjectURL(f);
      preview.style.backgroundImage = `url("${url}")`;
      root.classList.add("has-image");
      if (onChange) onChange(file);
    }

    root.addEventListener("click", (e) => {
      if (e.target.closest("[data-act='clear']")) return;
      input.click();
    });
    input.addEventListener("change", () => {
      if (input.files && input.files[0]) setFile(input.files[0]);
    });

    ["dragenter", "dragover"].forEach((evt) =>
      root.addEventListener(evt, (e) => {
        e.preventDefault();
        root.classList.add("dragover");
      }),
    );
    ["dragleave", "drop"].forEach((evt) =>
      root.addEventListener(evt, (e) => {
        e.preventDefault();
        if (evt === "dragleave" && root.contains(e.relatedTarget)) return;
        root.classList.remove("dragover");
      }),
    );
    root.addEventListener("drop", (e) => {
      const f = e.dataTransfer?.files?.[0];
      if (f) setFile(f);
    });

    const clearBtn = root.querySelector("[data-act='clear']");
    if (clearBtn) {
      clearBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        reset();
      });
    }

    function reset() {
      file = null;
      input.value = "";
      preview.style.backgroundImage = "";
      root.classList.remove("has-image");
      if (onChange) onChange(null);
    }

    return {
      getFile: () => file,
      reset,
    };
  };
})();
