import { RefObject, useEffect, useState } from 'react';

export const useBoundingClientRect = (
  ref: RefObject<HTMLElement>,
  callback?: (rect: DOMRect) => void
) => {
  const [rect, setRect] = useState({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  });

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver(() => {
      const rect = ref.current?.getBoundingClientRect();
      if (rect) {
        setRect(rect);
        callback?.(rect);
      }
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, callback]);

  return rect;
}; 