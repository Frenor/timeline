import React, { useEffect, useRef, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { useInterval } from 'react-use';
import { parseXlsxFile, TimelineEvent } from './utils/fileUtils';
import { useAutoScroll } from './utils/useAutoScroll';
import StudioClock from './components/StudioClock';
import './App.scss';

dayjs.extend(isBetween);

interface TimelineItemProps {
    event: TimelineEvent;
    isNow: boolean;
    isPast: boolean;
    onClick: () => void;
}

type TimelineItemRef = HTMLDivElement | null;
const TimelineItem = React.forwardRef<TimelineItemRef, TimelineItemProps>(({ event, isNow, isPast, onClick }, ref) => {
    const classes = ['timeline-item'];
    if (event.completed) classes.push('completed');
    else if (isNow) classes.push('current');
    else if (isPast) classes.push('past');

    return (
        <div ref={ref as React.Ref<HTMLDivElement>} className={classes.join(' ')} onClick={onClick}>
            <div className="col title">{event.title}</div>
            <div className="col time">{event.from.format('HH:mm')} - {event.to.format('HH:mm')}</div>
            <div className="col location">{event.location}</div>
            <div className="col description">{event.description}</div>
            <div className="col special">{event.special}</div>
        </div>
    );
});

interface TimelineProps {
    events: TimelineEvent[];
    onToggleComplete: (index: number) => void;
    autoScrollEnabled: boolean;
}

function Timeline({ events, onToggleComplete, autoScrollEnabled }: TimelineProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [now, setNow] = useState<Dayjs>(dayjs());
    const [internalAutoScroll, setInternalAutoScroll] = useState(true);
    const itemRefs = useRef<TimelineItemRef[]>([]);
    const activeEventRef = useRef<TimelineItemRef>(null);

    useInterval(() => setNow(dayjs()), 1000);
    const effective = autoScrollEnabled && internalAutoScroll;
    useAutoScroll(containerRef, events, now, effective, setInternalAutoScroll);

    // Sorting by status, time, location
    const getStatus = (e: TimelineEvent) => {
        if (now.isAfter(e.to, 'second')) return 0;
        if (now.isBetween(e.from, e.to, 'second', '[]')) return 1;
        return 2;
    };
    const sorted = [...events].sort((a, b) => {
        const sa = getStatus(a), sb = getStatus(b);
        if (sa !== sb) return sa - sb;
        if (!a.from.isSame(b.from)) return a.from.isBefore(b.from) ? -1 : 1;
        if (!a.to.isSame(b.to)) return a.to.isBefore(b.to) ? -1 : 1;
        return a.location.localeCompare(b.location);
    });

    // Group into hour buckets
    const buckets: Record<string, TimelineEvent[]> = {};
    sorted.forEach(e => {
        const hour = e.from.format('HH:00');
        buckets[hour] = buckets[hour] || [];
        buckets[hour].push(e);
    });



    let idxCounter = 0;
    return (
        <div className="timeline" ref={containerRef}>
            {/* Column headers */}
            <div className="timeline-header">
                <div className="col title">Title</div>
                <div className="col time">Time</div>
                <div className="col location">Location</div>
                <div className="col description">Description</div>
                <div className="col special">Special</div>
            </div>
            {Object.entries(buckets).map(([hour, bucket]) => (
                <div key={hour}>
                    <div className="hour-header">{hour}</div>
                    {bucket.map(e => {
                        const idx = idxCounter++;
                        const isNow = now.isBetween(e.from, e.to, 'second', '[]');
                        const isPast = now.isAfter(e.to, 'second');
                        return (
                            <TimelineItem
                                key={idx}
                                ref={el => (itemRefs.current[idx] = el)}
                                event={e}
                                isNow={isNow}
                                isPast={isPast}
                                onClick={() => {
                                    onToggleComplete(events.indexOf(e));
                                }}
                            />
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

function App() {
    const [events, setEvents] = useState<TimelineEvent[]>(() => {
        const base = dayjs().startOf('hour');
        return Array.from({ length: 50 }).map((_, i) => {
            const start = base.add(Math.floor(Math.random() * 120), 'minute');
            const end = start.add(Math.floor(Math.random() * 30) + 5, 'minute');
            return {
                title: `Event ${i + 1}`,
                from: start,
                to: end,
                location: `Loc ${Math.ceil(Math.random() * 10)}`,
                description: `Desc ${i + 1}`,
                special: Math.random() < 0.2 ? '⚠️ attention' : '',
                completed: false
            };
        });
    });

    useEffect(() => {
        localStorage.setItem(
            'timelineEvents',
            JSON.stringify(events.map(e => ({ ...e, from: e.from.toISOString(), to: e.to.toISOString() })))
        );
    }, [events]);

    const [errors, setErrors] = useState<string[]>([]);
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setErrors([]);
            return;
        }
        const { items, errors } = await parseXlsxFile(file, true);
        setEvents(items);
        setErrors(errors);
    };

    const toggleComplete = (idx: number) => {
        setEvents(prev => prev.map((e, i) => (i === idx ? { ...e, completed: !e.completed } : e)));
    };

    return (
        <div className={`app-container ${darkMode ? 'dark' : ''}`}>
            <header className="app-header">
                <label className="theme-toggle">
                    <input type="checkbox" checked={darkMode} onChange={() => setDarkMode(prev => !prev)} />
                    <span>Dark Mode</span>
                </label>
                <label className="auto-scroll-toggle">
                    <input type="checkbox" checked={autoScrollEnabled} onChange={() => setAutoScrollEnabled(prev => !prev)} />
                    <span>Auto Scroll</span>
                </label>
                <input type="file" accept=".xlsx" onChange={handleFile} className="file-input" />
                {errors.length > 0 && (
                    <div className="error-list">
                        {errors.map((err, i) => (
                            <div key={i} className="error-item">
                                {err}
                            </div>
                        ))}
                    </div>
                )}
            </header>
            <StudioClock showSecondsHand={true} size={128} />
            <Timeline events={events} onToggleComplete={toggleComplete} autoScrollEnabled={autoScrollEnabled} />
        </div>
    );
}

export default App;