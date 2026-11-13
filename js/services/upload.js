// compress → getUploadUrl → PUT(signedUrl) → create*. Web uploads are always private.
(function () {
  const LS = (window.LookSync = window.LookSync || {});

  async function putFile(file, purpose) {
    const { blob, fileType } = await LS.compressImage(file);
    const { uploadId, uploadUrl } = await LS.call("images-getUploadUrl", {
      purpose,
      fileType,
      isPublic: false,
    });
    const resp = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": fileType },
      body: blob,
    });
    if (!resp.ok) {
      throw new Error(`Upload failed (${resp.status}). Please try again.`);
    }
    return uploadId;
  }

  LS.uploadReference = async function (file) {
    const uploadId = await putFile(file, "reference");
    const { referenceId } = await LS.call("references-createReference", {
      uploadId,
      isPublic: false,
    });
    return referenceId;
  };

  LS.uploadOriginal = async function (file) {
    const uploadId = await putFile(file, "original");
    const { originalId } = await LS.call("originals-createOriginal", { uploadId });
    return originalId;
  };
})();
