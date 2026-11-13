// Shared shell for static pages: auth + account slot only.
(function () {
  const LS = window.LookSync;
  LS.initAuthState();
  LS.mountAccount(document.getElementById("account-slot"));
})();
