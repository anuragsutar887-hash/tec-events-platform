import { useEffect, useRef, useState } from 'react';

export default function RevealOnScroll({
  children,
  className = '',
  threshold = 0.12,
  delay = 0,
  stagger = false,
  direction = 'up',
  style = {}
}) {
  const ref = useRef(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  const customStyle = {
    ...style,
    transitionDelay: `${delay}ms`
  };

  return (
    <div
      ref={ref}
      className={`reveal-box ${direction ? `reveal-${direction}` : ''} ${isRevealed ? 'is-revealed' : ''} ${stagger ? 'stagger-container' : ''} ${className}`}
      style={customStyle}
    >
      {children}
    </div>
  );
}
