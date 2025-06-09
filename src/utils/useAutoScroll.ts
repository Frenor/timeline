import { RefObject, useEffect } from 'react';
import dayjs from 'dayjs';
import { TimelineEvent } from './fileUtils';

export function useAutoScroll(
  ref: RefObject<HTMLDivElement>,
  events: TimelineEvent[],
  now: dayjs.Dayjs,
  autoScroll: boolean,
  setAutoScroll: (value: boolean) => void
) {
  // Helper to scroll to a specific element (with offset)
  const scrollToElement = (element: Element, container: HTMLDivElement) => {
    const HEADER_OFFSET = 150;
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const relativeTop = elementRect.top - containerRect.top + container.scrollTop - HEADER_OFFSET;
    container.scrollTo({ top: relativeTop, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!autoScroll || !ref.current || events.length === 0) return;

    const container = ref.current;

    // Find the currently active event
    const activeEvent = events.find(
      e => !e.completed && now.isBetween(e.from, e.to, 'second', '[]'),
    );

    // Query for the scrolling target
    let target: Element | null = null;

    if (activeEvent) {
      // Scroll to the first .timeline-item.current:not(.completed)
      target = container.querySelector('.timeline-item.current:not(.completed)');
    } else {
      // Otherwise, look for the first upcoming non-completed event
      const upcomingEvent = events.find(
        e => !e.completed && now.isBefore(e.from, 'second'),
      );
      if (upcomingEvent) {
        // Find matching .timeline-item containing the event title
        target = Array.from(container.querySelectorAll('.timeline-item'))
          .find(el => el.textContent?.includes(upcomingEvent.title)) ?? null;
      }
    }

    // If a target was found, scroll to it
    if (target) {
      scrollToElement(target, container);
    }
  }, [now, events, autoScroll, ref]);

  // Reset auto scroll after user scrolls
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let timeout: NodeJS.Timeout;
    const onScroll = () => {
      setAutoScroll(false);
      clearTimeout(timeout);
      timeout = setTimeout(() => setAutoScroll(true), 5000);
    };

    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [ref, setAutoScroll]);
}