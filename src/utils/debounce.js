export default function debounce(fn, wait = 200) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      fn(...args);
      t = null;
    }, wait);
  };
}