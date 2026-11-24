export default `:root {
  font-family: system-ui, sans-serif;
  color: #0f172a;
  background: #f8fafc;
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
  color: #475569;
  text-decoration: none;
  font-weight: 500;
}

.link:hover {
  color: #0f172a;
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
  color: #475569;
}

.card {
  background: #fff;
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
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
  background: #0f172a;
  color: #fff;
  border: 0;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  font: inherit;
  cursor: pointer;
}

.btn:hover {
  background: #334155;
}
`;
