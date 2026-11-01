/** A photo from the tablet's camera or gallery, made small (longest side 1024 px, JPEG) before it is sent. */
export function shrinkPhoto(file: File): Promise<{ b64: string; url: string }> {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1024 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
      const url = c.toDataURL("image/jpeg", 0.8);
      URL.revokeObjectURL(img.src);
      ok({ b64: url.split(",")[1] || "", url });
    };
    img.onerror = () => fail(new Error("not an image"));
    img.src = URL.createObjectURL(file);
  });
}
