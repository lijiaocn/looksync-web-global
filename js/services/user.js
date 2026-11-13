// User / balance callables.
(function () {
  const LS = (window.LookSync = window.LookSync || {});

  LS.getMyProfile = function () {
    return LS.call("user-getMyProfile");
  };

  LS.getMyBalance = function () {
    return LS.call("user-getMyBalance");
  };

  LS.getMyCreditLog = function (page, pageSize) {
    return LS.call("user-getMyCreditLog", { page, pageSize });
  };

  LS.getMyOrders = function (page, pageSize) {
    return LS.call("user-getMyOrder", { page, pageSize });
  };

  LS.deleteMyAccount = function () {
    return LS.call("user-deleteMyAccount");
  };
})();
