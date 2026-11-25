const PIECES = 14;
const COLORS = [
  "var(--color-accent)",
  "var(--color-accent-2)",
  "#f59e0b",
  "#10b981",
];

/**
 * A one-shot burst of confetti around its parent (which must be `relative`). Remount it with a
 * new `key` to play again; hidden when the user prefers reduced motion.
 */
export function Burst() {
  return (
    <span aria-hidden="true" className="burst">
      {Array.from({ length: PIECES }, (_, i) => (
        // The outer span points the piece in its direction; the inner one flies and fades.
        <span key={i} style={{ transform: `rotate(${(360 / PIECES) * i}deg)` }}>
          <span
            style={{
              background: COLORS[i % COLORS.length],
              ["--burst-distance" as string]: `${34 + (i % 3) * 12}px`,
            }}
          />
        </span>
      ))}
    </span>
  );
}
