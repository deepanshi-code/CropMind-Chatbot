import { createContext, useContext, useEffect, useState } from "react";

const C = createContext();

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.body.classList.remove("light", "dark");

    if (dark) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.add("light");
    }
  }, [dark]);

  const toggle = () => {
    setDark((prev) => !prev);
  };

  return (
    <C.Provider value={{ dark, toggle }}>
      {children}
    </C.Provider>
  );
}

export const useTheme = () => useContext(C);