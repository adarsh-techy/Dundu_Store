/** Normalises an image path from the API into something the browser can load. */
export const imageUrl = (img, fallback = '/placeholder.svg') => {
  if (!img) return fallback;
  if (/^(https?:)?\/\//.test(img) || img.startsWith('data:')) return img;
  return img.startsWith('/') ? img : `/${img}`;
};
