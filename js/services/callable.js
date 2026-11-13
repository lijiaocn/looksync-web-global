// Single backend entry point. Every service goes through here.
(function () {
  const LS = (window.LookSync = window.LookSync || {});

  // Normalized error so pages can branch on code without digging into Firebase internals.
  LS.ApiError = class ApiError extends Error {
    constructor(code, message, customCode) {
      super(message);
      this.name = "ApiError";
      this.code = code;
      this.customCode = customCode;
    }
  };

  LS.call = async function (name, data) {
    try {
      const fn = LS.functions.httpsCallable(name);
      const res = await fn(data ?? {});
      return res.data;
    } catch (err) {
      throw new LS.ApiError(
        err?.code || "internal",
        err?.message || "Something went wrong. Please try again.",
        err?.details?.customCode,
      );
    }
  };
})();
