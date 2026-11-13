// Google sign-in wrappers over the compat auth instance.
(function () {
  const LS = (window.LookSync = window.LookSync || {});

  const provider = new firebase.auth.GoogleAuthProvider();

  LS.signInWithGoogle = function () {
    return LS.auth.signInWithPopup(provider);
  };

  LS.signOut = function () {
    if (typeof LS.clearAccountCache === "function") LS.clearAccountCache();
    return LS.auth.signOut();
  };

  LS.subscribeAuth = function (cb) {
    return LS.auth.onAuthStateChanged(cb);
  };

  LS.currentUser = function () {
    return LS.auth.currentUser;
  };
})();
