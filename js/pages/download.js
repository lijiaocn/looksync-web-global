// Scroll-reveal, store version tabs, mainland China store placeholder.
(function () {
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("visible"));
  }

  function selectStoreTab(id) {
    document.querySelectorAll("[data-store-switch]").forEach((root) => {
      root.querySelectorAll("[data-store-tab]").forEach((tab) => {
        const on = tab.getAttribute("data-store-tab") === id;
        tab.setAttribute("aria-selected", on ? "true" : "false");
        tab.tabIndex = on ? 0 : -1;
      });
      root.querySelectorAll("[data-store-panel]").forEach((panel) => {
        const on = panel.getAttribute("data-store-panel") === id;
        panel.hidden = !on;
      });
    });
  }

  document.querySelectorAll("[data-store-switch]").forEach((root) => {
    root.querySelector(".store-tablist")?.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-store-tab]");
      if (!tab || !root.contains(tab)) return;
      selectStoreTab(tab.getAttribute("data-store-tab"));
    });
  });

  document.querySelectorAll("[data-cn-store-soon]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const zh = document.documentElement.lang.toLowerCase().startsWith("zh");
      const message = zh ? "正在发布，敬请期待" : "Coming soon";
      const LS = window.LookSync;
      if (LS && typeof LS.toast === "function") {
        LS.toast(message);
      } else {
        window.alert(message);
      }
    });
  });
})();
