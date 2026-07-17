import { useEffect } from 'react';

const ACTIVE_SCROLLBAR_CLASS = 'ui-scrollbar--active';
const HIDE_DELAY_MS = 650;

export function useTransientScrollbars() {
  useEffect(() => {
    const hideTimers = new Map<Element, number>();

    const handleScroll = (event: Event) => {
      const element = event.target;
      if (!(element instanceof Element)) {
        return;
      }

      element.classList.add(ACTIVE_SCROLLBAR_CLASS);

      const existingTimer = hideTimers.get(element);
      if (existingTimer != null) {
        window.clearTimeout(existingTimer);
      }

      const timer = window.setTimeout(() => {
        element.classList.remove(ACTIVE_SCROLLBAR_CLASS);
        hideTimers.delete(element);
      }, HIDE_DELAY_MS);
      hideTimers.set(element, timer);
    };

    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });

    return () => {
      document.removeEventListener('scroll', handleScroll, true);
      hideTimers.forEach((timer, element) => {
        window.clearTimeout(timer);
        element.classList.remove(ACTIVE_SCROLLBAR_CLASS);
      });
    };
  }, []);
}
