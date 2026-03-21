import { useEffect, useRef, useState } from "react";

interface LazySectionProps {
  children: React.ReactNode;
  minHeight?: string;
  rootMargin?: string;
}

/**
 * Defers rendering children until the section scrolls into the viewport.
 * Once mounted it stays mounted — no unmount on scroll away.
 */
const LazySection = ({ children, minHeight = "200px", rootMargin = "200px" }: LazySectionProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [mounted, rootMargin]);

  return (
    <div ref={ref} style={mounted ? undefined : { minHeight }}>
      {mounted ? children : null}
    </div>
  );
};

export default LazySection;
