// Sync-related callables.
(function () {
  const LS = (window.LookSync = window.LookSync || {});

  LS.createSync = function (referenceId, originalId, contentScopes, customText) {
    const data = { referenceId, originalId, contentScopes };
    if (customText) data.customText = customText;
    return LS.call("syncs-createSync", data);
  };

  LS.getSyncDetail = function (syncId) {
    return LS.call("syncs-getSyncDetail", { syncId });
  };

  LS.getMySyncs = function (page, pageSize) {
    return LS.call("syncs-getMySyncs", { page, pageSize });
  };

  LS.deleteMySync = function (syncId) {
    return LS.call("syncs-deleteMySync", { syncId });
  };

  LS.getSyncContentScopes = function (locale) {
    return LS.call("syncs-getSyncContentScopes", { locale: locale || "en" });
  };
})();
