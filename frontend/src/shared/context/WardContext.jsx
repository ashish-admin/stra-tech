// frontend/src/context/WardContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";

const WardContext = createContext({ ward: "All", setWard: () => {} });

export function WardProvider({ children, initialWard = "All" }) {
  const [ward, setWard] = useState(initialWard);

  // read initial ward from URL (?ward=...)
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const q = url.searchParams.get("ward");
      if (q) setWard(q);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep URL in sync for easy deep-linking
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (ward && ward !== "All") url.searchParams.set("ward", ward);
      else url.searchParams.delete("ward");
      window.history.replaceState({}, "", url);
    } catch {}
  }, [ward]);

  return (
    <WardContext.Provider value={{ ward, setWard }}>
      {children}
    </WardContext.Provider>
  );
}

export function useWard() {
  return useContext(WardContext);
}
