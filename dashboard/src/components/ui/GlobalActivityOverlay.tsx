import { useEffect, useRef, useState } from 'react';
import { useAppSelector } from '../../store/hooks';
import { colors, font, radius, spacing } from '../../theme/tokens';

const SHOW_DELAY_MS = 180;
const MIN_VISIBLE_MS = 420;
const FADE_MS = 180;

export function GlobalActivityOverlay() {
  const entries = useAppSelector((state) => state.activity.entries);
  const activeCount = entries.length;
  const label = entries[entries.length - 1]?.label ?? 'Saving changes...';
  const [rendered, setRendered] = useState(false);
  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef<number | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const unmountTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (showTimerRef.current) {
        window.clearTimeout(showTimerRef.current);
      }
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
      if (unmountTimerRef.current) {
        window.clearTimeout(unmountTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (showTimerRef.current) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (unmountTimerRef.current) {
      window.clearTimeout(unmountTimerRef.current);
      unmountTimerRef.current = null;
    }

    if (activeCount > 0) {
      if (rendered) {
        if (!visible) {
          shownAtRef.current = Date.now();
          setVisible(true);
        }
        return;
      }

      showTimerRef.current = window.setTimeout(() => {
        shownAtRef.current = Date.now();
        setRendered(true);
        setVisible(true);
      }, SHOW_DELAY_MS);
      return;
    }

    if (!rendered) {
      return;
    }

    const elapsed = shownAtRef.current == null ? 0 : Date.now() - shownAtRef.current;
    const waitMs = Math.max(MIN_VISIBLE_MS - elapsed, 0);

    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      unmountTimerRef.current = window.setTimeout(() => {
        shownAtRef.current = null;
        setRendered(false);
      }, FADE_MS);
    }, waitMs);
  }, [activeCount, rendered, visible]);

  if (!rendered) {
    return null;
  }

  return (
    <div
      aria-hidden={!visible}
      style={{
        alignItems: 'center',
        backgroundColor: visible ? 'rgba(8, 17, 31, 0.28)' : 'rgba(8, 17, 31, 0)',
        backdropFilter: visible ? 'blur(8px)' : 'blur(0px)',
        display: 'flex',
        inset: 0,
        justifyContent: 'center',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        position: 'absolute',
        transition: `opacity ${FADE_MS}ms ease, backdrop-filter ${FADE_MS}ms ease, background-color ${FADE_MS}ms ease`,
        zIndex: 120,
      }}
    >
      <div
        style={{
          alignItems: 'center',
          backgroundColor: colors.surfaceElevated,
          border: `1px solid ${colors.borderStrong}`,
          borderRadius: radius.lg,
          boxShadow: `0 20px 60px ${colors.shadow}`,
          display: 'flex',
          gap: spacing.md,
          minWidth: 240,
          padding: `${spacing.md}px ${spacing.lg}px`,
        }}
      >
        <span style={spinnerStyle} />
        <span
          style={{
            color: colors.text.primary,
            fontFamily: font.family,
            fontSize: font.size.sm,
            fontWeight: font.weight.medium,
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

const spinnerStyle = {
  animation: 'dashboard-activity-spin 900ms linear infinite',
  border: `2px solid ${colors.borderStrong}`,
  borderRadius: '50%',
  borderTopColor: colors.accent,
  flexShrink: 0,
  height: 18,
  width: 18,
} as const;
