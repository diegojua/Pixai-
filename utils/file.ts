export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const resizeImage = (
  base64Str: string,
  maxWidth: number,
  maxHeight: number,
  mimeType: string = 'image/png'
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = maxWidth;
      canvas.height = maxHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Use better interpolation for downscaling if possible, though basic is fine for this
        ctx.drawImage(img, 0, 0, maxWidth, maxHeight);
        resolve(canvas.toDataURL(mimeType));
      } else {
        resolve(base64Str); // Fail safe
      }
    };
  });
};