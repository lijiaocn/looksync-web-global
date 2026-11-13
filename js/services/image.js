// Client-side compression before upload: longest edge 1600px, JPEG, target <= 1MB.
(function () {
  const LS = (window.LookSync = window.LookSync || {});

  const MAX_EDGE = 1600;
  const MAX_BYTES = 1024 * 1024;
  const QUALITY_STEPS = [0.92, 0.85, 0.78, 0.7, 0.62, 0.55];

  async function loadBitmap(file) {
    if ("createImageBitmap" in window) {
      return createImageBitmap(file);
    }
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function canvasToBlob(canvas, quality) {
    return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  }

  LS.compressImage = async function (file) {
    const bitmap = await loadBitmap(file);
    const srcW = bitmap.width;
    const srcH = bitmap.height;
    const scale = Math.min(1, MAX_EDGE / Math.max(srcW, srcH));
    const w = Math.round(srcW * scale);
    const h = Math.round(srcH * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, w, h);
    if (bitmap.close) bitmap.close();

    let blob = null;
    for (const q of QUALITY_STEPS) {
      blob = await canvasToBlob(canvas, q);
      if (blob && blob.size <= MAX_BYTES) break;
    }
    if (!blob) throw new Error("Could not process this image. Try another photo.");

    return { blob, fileType: "image/jpeg" };
  };
})();
