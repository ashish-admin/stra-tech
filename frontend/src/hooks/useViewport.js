import { useEffect, useState } from "react";

export default function useViewport() {
  const [vw, setVw] = useState(window.innerWidth);
  const [vh, setVh] = useState(window.innerHeight);

  useEffect(() => {
    const onResize = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const isMobile = vw < 768;         // tailwind md breakpoint
  const isDesktop = vw >= 1024;      // tailwind lg breakpoint
  return { vw, vh, isMobile, isDesktop };
}
