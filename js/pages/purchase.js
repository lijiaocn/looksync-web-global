// Pricing page: buttons are display-only until payments are wired up.
(function () {
  const LS = window.LookSync;

  LS.initAuthState();
  LS.mountAccount(document.getElementById("account-slot"));

  // Buying isn't wired to a payment provider yet — surface that honestly.
  document.querySelectorAll("[data-buy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      LS.toast("购买功能尚未开通", "info");
    });
  });
})();
