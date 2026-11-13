// Firebase init via compat SDK. Exposes LS.auth / LS.functions for the rest of the app.
(function () {
  const LS = (window.LookSync = window.LookSync || {});

  firebase.initializeApp(LS.FIREBASE_CONFIGS[LS.PROJECT_ENV]);

  const auth = firebase.auth();
  const functions = firebase.app().functions(LS.REGION);

  if (LS.IS_EMULATOR) {
    // 与当前页面 hostname 对齐，避免 localhost 页去连 127.0.0.1（或反过来）时行为不一致。
    const host = location.hostname === "127.0.0.1" ? "127.0.0.1" : "localhost";
    auth.useEmulator(`http://${host}:${LS.EMULATOR.authPort || 9099}`, {
      disableWarnings: true,
    });
    functions.useEmulator(host, LS.EMULATOR.functionsPort);
  }

  LS.auth = auth;
  LS.functions = functions;
})();
