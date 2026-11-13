// Firebase project configs (prod / dev). Emulator reuses the dev project.
(function () {
  const LS = (window.LookSync = window.LookSync || {});

  LS.FIREBASE_CONFIGS = {
    prod: {
      apiKey: "AIzaSyBE5K2vl9IA44pV6VZE4Gl-KNZ-CcZECeY",
      authDomain: "looksync-prod.firebaseapp.com",
      projectId: "looksync-prod",
      storageBucket: "looksync-prod.firebasestorage.app",
      messagingSenderId: "582868627807",
      appId: "1:582868627807:web:2dcb2d1b7806b6338746ea",
      measurementId: "G-EXDKPYTC73",
    },
    dev: {
      apiKey: "AIzaSyBAIJLO_oQiCBvYI6f-iFDtsc9VOvK--QU",
      authDomain: "looksync-dev.firebaseapp.com",
      projectId: "looksync-dev",
      storageBucket: "looksync-dev.firebasestorage.app",
      messagingSenderId: "663280899717",
      appId: "1:663280899717:web:a61725c7967b7a772e3bec",
    },
  };

  LS.REGION = "us-central1";

  LS.EMULATOR = {
    authPort: 9099,
    functionsPort: 5001,
  };
})();
