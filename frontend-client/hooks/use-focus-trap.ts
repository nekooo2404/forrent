import { useEffect, useRef } from "react";

/**
 * Focus trap hook for modals and dialogs
 * Traps focus within a container when active
 * Cycles focus between first and last focusable elements
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(isActive: boolean) {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;
    const previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Find all focusable elements
    const focusableElements = Array.from(container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element on mount
    firstElement?.focus();

    function handleTab(event: KeyboardEvent) {
      if (event.key !== "Tab") return;

      // Shift + Tab: if on first element, go to last
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
      // Tab: if on last element, go to first
      else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }

    document.addEventListener("keydown", handleTab);
    return () => {
      document.removeEventListener("keydown", handleTab);
      if (previouslyFocusedElement?.isConnected) previouslyFocusedElement.focus();
    };
  }, [isActive]);

  return containerRef;
}
