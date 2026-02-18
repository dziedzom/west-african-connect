import { useEffect, useRef } from "react";

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(staggerMs = 100) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const children = el.querySelectorAll(".reveal");
    if (children.length === 0) {
      el.classList.add("reveal");
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (children.length > 0) {
              children.forEach((child, i) => {
                setTimeout(() => child.classList.add("visible"), i * staggerMs);
              });
            } else {
              el.classList.add("visible");
            }
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [staggerMs]);

  return ref;
}
