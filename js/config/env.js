// Backend env comes only from Jekyll: LookSync.JEKYLL_ENV.
//   production (default) → prod
//   development          → dev
//   emulator             → emulator (dev project + local Auth/Functions)
(function () {
  const LS = (window.LookSync = window.LookSync || {});

  const jekyllEnv = LS.JEKYLL_ENV || "production";

  if (jekyllEnv === "emulator") {
    LS.ENV = "emulator";
    LS.IS_EMULATOR = true;
    LS.PROJECT_ENV = "dev";
    return;
  }

  if (jekyllEnv === "development") {
    LS.ENV = "dev";
    LS.IS_EMULATOR = false;
    LS.PROJECT_ENV = "dev";
    return;
  }

  LS.ENV = "prod";
  LS.IS_EMULATOR = false;
  LS.PROJECT_ENV = "prod";
})();
