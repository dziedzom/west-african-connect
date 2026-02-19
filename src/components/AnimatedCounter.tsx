import { useEffect, useRef, useState } from "react";
import { useInView, useSpring, useMotionValue } from "framer-motion";

interface AnimatedCounterProps {
  value: string;
  className?: string;
}

const AnimatedCounter = ({ value, className }: AnimatedCounterProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  // Extract numeric part and prefix/suffix
  const match = value.match(/^([^0-9]*)([0-9.]+)([^0-9]*)$/);
  const prefix = match?.[1] ?? "";
  const numStr = match?.[2] ?? "0";
  const suffix = match?.[3] ?? "";
  const target = parseFloat(numStr);
  const hasDecimal = numStr.includes(".");
  const isNumeric = !!match;

  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 50, damping: 20, duration: 1.5 });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (isInView && isNumeric) motionVal.set(target);
  }, [isInView, target, motionVal, isNumeric]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (v: number) => {
      setDisplay(hasDecimal ? v.toFixed(1) : Math.round(v).toString());
    });
    return unsubscribe;
  }, [spring, hasDecimal]);

  if (!isNumeric) return <span className={className}>{value}</span>;

  return (
    <span ref={ref} className={className}>
      {prefix}{display}{suffix}
    </span>
  );
};

export default AnimatedCounter;
