const MAX_AVATAR_INPUT_BYTES = 8 * 1024 * 1024;

/**
 * Reads an image file, center-crops it to a square and shrinks it so the saved
 * profile photo stays small (a few KB) instead of storing a multi-MB original.
 */
export const fileToAvatarDataUrl = (file: File, size = 256): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('NOT_AN_IMAGE'));
      return;
    }
    if (file.size > MAX_AVATAR_INPUT_BYTES) {
      reject(new Error('IMAGE_TOO_LARGE'));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('NO_CANVAS');
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('IMAGE_LOAD_FAILED'));
    };
    img.src = url;
  });
