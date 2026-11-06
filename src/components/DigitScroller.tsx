'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';

export interface DigitScrollerProps {
  targetDigit: number;
  durationMs: number;
  delayMs?: number;
}

/**
 * DigitScroller: High-performance CSS transform-gpu slot-machine vertical reel.
 * When durationMs is 0, renders immediately without transitions or timers (0ms overhead for warehouse floor).
 * When durationMs > 0, performs a single GPU-composited translateY transition without React re-render cascades.
 */
export const DigitScroller: React.FC<DigitScrollerProps> = React.memo(({
  targetDigit,
  durationMs,
  delayMs = 0,
}) => {
  // If instant duration (e.g. warehouse floor), render directly
  if (durationMs <= 0) {
    return <span className="inline-block font-mono">{targetDigit}</span>;
  }

  // Generate a multi-step reel that cycles numbers and locks onto targetDigit
  const reel = useMemo(() => {
    const steps = 18;
    const start = Math.floor(Math.random() * 10);
    const arr: number[] = [start];
    for (let i = 1; i < steps - 1; i++) {
      arr.push((start + i) % 10);
    }
    arr.push(targetDigit);
    return arr;
  }, [targetDigit]);

  const [isLocked, setIsLocked] = useState<boolean>(false);
  const prevTargetRef = useRef(targetDigit);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const raf = requestAnimationFrame(() => {
      timer = setTimeout(() => {
        setIsLocked(true);
      }, delayMs + 20);
    });

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [delayMs]);

  // If targetDigit changes dynamically (e.g. silent Turso sync updates initial 0 to final amount)
  useEffect(() => {
    if (prevTargetRef.current !== targetDigit) {
      prevTargetRef.current = targetDigit;
      setIsLocked(false);
      const timer = setTimeout(() => {
        setIsLocked(true);
      }, delayMs + 20);
      return () => clearTimeout(timer);
    }
  }, [targetDigit, delayMs]);

  const targetTranslatePct = ((reel.length - 1) / reel.length) * 100;

  return (
    <span className="inline-block relative overflow-hidden h-[1.15em] align-top select-none font-mono">
      <span
        className="flex flex-col transform-gpu will-change-transform"
        style={{
          transform: isLocked ? `translateY(-${targetTranslatePct}%)` : 'translateY(0%)',
          transition: isLocked
            ? `transform ${durationMs}ms cubic-bezier(0.12, 0.8, 0.2, 1)`
            : 'none',
        }}
      >
        {reel.map((digit, idx) => (
          <span
            key={idx}
            className="h-[1.15em] leading-[1.15em] flex items-center justify-center"
          >
            {digit}
          </span>
        ))}
      </span>
    </span>
  );
});
DigitScroller.displayName = 'DigitScroller';

export interface NumberScrollerProps {
  value: number;
  prefix?: string;
  suffix?: string;
  currencyCode?: string;
  formatAsCurrency?: boolean;
  mode?: 'executive' | 'instant' | 'default';
  durationMs?: number;
  className?: string;
}

/**
 * NumberScroller: Formats numbers with localized grouping commas and scrolls digits.
 * - In 'executive' mode: duration is randomized between 2000ms and 4000ms per metric.
 * - In 'instant' mode (or default without executive mode): duration is 0ms (instant render, warehouse safe).
 */
export const NumberScroller: React.FC<NumberScrollerProps> = React.memo(({
  value,
  prefix = '',
  suffix = '',
  mode = 'default',
  durationMs,
  className = '',
}) => {
  const num = Math.round(Number(value) || 0);

  // Determine duration: 2000-3000ms for executive mode, 0ms for instant/warehouse floor
  const computedDuration = useMemo(() => {
    if (durationMs !== undefined) return durationMs;
    if (mode === 'executive') {
      // Randomized 2000ms - 3000ms
      return 2000 + Math.floor(Math.random() * 1000);
    }
    // Instant (0ms) for warehouse floor and general views
    return 0;
  }, [mode, durationMs]);

  const formattedStr = Math.abs(num).toLocaleString('en-US');
  const chars = formattedStr.split('');

  // If 0ms, render instantly with zero animation wrapper
  if (computedDuration <= 0) {
    return (
      <span dir="ltr" className={`inline-block font-mono ${className}`}>
        <span className="inline-flex items-baseline">
          {num < 0 && <span>-</span>}
          {prefix && <span>{prefix}</span>}
          <span>{formattedStr}</span>
          {suffix && <span className="ms-0.5">{suffix}</span>}
        </span>
      </span>
    );
  }

  return (
    <span dir="ltr" className={`inline-block font-mono select-none ${className}`}>
      <span className="inline-flex items-baseline">
        {num < 0 && <span>-</span>}
        {prefix && <span>{prefix}</span>}
        {chars.map((char, idx) => {
          const isDigit = char >= '0' && char <= '9';
          if (!isDigit) {
            return (
              <span key={idx} className="inline-block">
                {char}
              </span>
            );
          }
          return (
            <DigitScroller
              key={idx}
              targetDigit={parseInt(char, 10)}
              durationMs={computedDuration}
              delayMs={idx * 40}
            />
          );
        })}
        {suffix && <span className="ms-0.5">{suffix}</span>}
      </span>
    </span>
  );
});
NumberScroller.displayName = 'NumberScroller';

export default NumberScroller;

