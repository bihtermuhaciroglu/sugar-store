const MAX_WIDTH = 600;
const JPEG_QUALITY = 0.7;

function isHeic(file) {
  return /^image\/hei[cf]$/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

async function toJpegBlob(file) {
  if (!isHeic(file)) return file;

  const heic2any = (await import("heic2any")).default;
  const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.8 });
  return Array.isArray(result) ? result[0] : result;
}

export async function resizeImageFile(file) {
  if (!file.type.startsWith("image/") && !isHeic(file)) {
    throw new Error("Sadece fotoğraf dosyaları yüklenebilir (jpg, png, heic vb.)");
  }

  let blob;
  try {
    blob = await toJpegBlob(file);
  } catch {
    throw new Error("iPhone (HEIC) fotoğrafı dönüştürülemedi, lütfen jpg/png olarak tekrar deneyin");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Görsel okunamadı"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Görsel açılamadı, desteklenmeyen bir format olabilir"));
      img.onload = () => {
        const scale = Math.min(1, MAX_WIDTH / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(blob);
  });
}
