import {RefObject, useEffect} from 'react';
import dayjs from 'dayjs';
import {TimelineEvent} from './fileUtils';

export function useAutoScroll(
    ref: RefObject<HTMLDivElement>,
    events: TimelineEvent[],
    now: dayjs.Dayjs,
    autoScroll: boolean,
    setAutoScroll: (state: boolean) => void
) {
    useEffect(() => {
        if (autoScroll && ref.current && events.length > 0) {
            const offset = now.diff(events[0].time, 'second') * 2 - 200;
            ref.current.scrollTo({top: offset, behavior: 'smooth'});
        }
    }, [now, events, autoScroll, ref]);

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
