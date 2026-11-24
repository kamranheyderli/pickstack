import { useEffect, useState } from "react";
import { readPref, writePref } from "./storage";

export const themes = ["system", "light", "dark"] as const;
export type Theme = (typeof themes)[number];

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() =>
    readPref("theme", themes, "system"),
  );

  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.dataset["theme"] = dark ? "dark" : "light";
    };
    apply();
    writePref("theme", theme);
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  const cycle = () =>
    setTheme(
      (t) => themes[(themes.indexOf(t) + 1) % themes.length] ?? "system",
    );
  return [theme, cycle];
}
