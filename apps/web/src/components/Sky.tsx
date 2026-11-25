/**
 * Where each shooting star starts (% of the viewport), how long its flight takes and when it
 * first appears. Fixed values rather than random ones, so the sky is the same on every render
 * and the streaks never bunch up.
 */
const STARS = [
  { top: 4, left: 38, duration: 7, delay: 0.5 },
  { top: 0, left: 72, duration: 9, delay: 3 },
  { top: 12, left: 95, duration: 8, delay: 6.5 },
  { top: 2, left: 55, duration: 11, delay: 9 },
  { top: 22, left: 88, duration: 10, delay: 12.5 },
  { top: 0, left: 20, duration: 12, delay: 15 },
] as const;

/**
 * The night sky behind the dark theme: faint fixed stars and a few shooting stars crossing
 * diagonally. Decorative only, hidden in the light theme and without motion when the user
 * prefers reduced motion (see `.sky` in index.css).
 */
export function Sky() {
  return (
    <div className="sky" aria-hidden="true">
      {STARS.map((star, index) => (
        <span
          key={index}
          className="shooting-star"
          style={{
            top: `${star.top}%`,
            left: `${star.left}%`,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
