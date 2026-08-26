import { useState, useEffect, useRef } from 'react';
import { useReducedMotion } from './useReducedMotion';

interface UseCountUpOptions {
  durationMs?: number;
  decimals?: number;
  startValue?: number;
}

export function useCountUp(targetValue: number, options: UseCountUpOptions = {}): number {
  const { durationMs = 600, decimals = 0, startValue = 0 } = options;
  const reducedMotion = useReducedMotion();
  const [currentValue, setCurrentValue] = useState<number>(() =>
    reducedMotion ? targetValue : startValue
  );

  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      setCurrentValue(targetValue);
      return;
    }

    const startVal = currentValue;
    const endVal = targetValue;
    const delta = endVal - startVal;

    if (Math.abs(delta) < 0.0001) {
      setCurrentValue(targetValue);
      return;
    }

    const startTime = performance.now();

    const updateCount = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Custom smooth fintech ease-out cubic curve: 1 - Math.pow(1 - progress, 3)
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextVal = startVal + delta * easedProgress;

      if (decimals > 0) {
        const factor = Math.pow(10, decimals);
        setCurrentValue(Math.round(nextVal * factor) / factor);
      } else {
        setCurrentValue(Math.round(nextVal));
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(updateCount);
      } else {
        setCurrentValue(endVal);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateCount);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetValue, durationMs, decimals, reducedMotion]);

  return currentValue;
}
