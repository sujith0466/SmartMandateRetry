import React from 'react';
import { useCountUp } from './useCountUp';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  formatIndianRupee?: boolean;
  className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  formatIndianRupee = false,
  className = '',
}) => {
  const count = useCountUp(value, {
    decimals,
    durationMs: 650,
  });

  let formattedValue: string;

  if (formatIndianRupee) {
    formattedValue = count.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } else if (decimals > 0) {
    formattedValue = count.toFixed(decimals);
  } else {
    formattedValue = count.toLocaleString('en-IN');
  }

  return (
    <span className={className}>
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
};
