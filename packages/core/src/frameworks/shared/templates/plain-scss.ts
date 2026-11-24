/** The demo stylesheet of `plain-css.ts` written with Sass variables and nesting. */
export default `$text: #0f172a;
$muted: #475569;
$surface: #fff;
$background: #f8fafc;
$accent-hover: #334155;

:root {
  font-family: system-ui, sans-serif;
  color: $text;
  background: $background;
}

body {
  margin: 0;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 2rem;
  box-sizing: border-box;
}

.title {
  font-size: 1.875rem;
  margin: 0;
}

.nav {
  display: flex;
  gap: 1rem;
}

.link {
  color: $muted;
  text-decoration: none;
  font-weight: 500;

  &:hover {
    color: $text;
  }
}

.page {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.text {
  max-width: 28rem;
  text-align: center;
  color: $muted;
}

.card {
  background: $surface;
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba($text, 0.08);
  text-align: center;
}

.count {
  font-size: 3rem;
  font-weight: 700;
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.row {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}

.btn {
  background: $text;
  color: $surface;
  border: 0;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  font: inherit;
  cursor: pointer;

  &:hover {
    background: $accent-hover;
  }
}
`;
