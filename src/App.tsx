import React, { useEffect, useRef, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { useInterval } from 'react-use';
import { parseXlsxFile, TimelineEvent } from './utils/fileUtils';
import { useAutoScroll } from './utils/useAutoScroll';
import './App.scss';

dayjs.extend(isBetween);

const generateDemoEvents = (count = 50): TimelineEvent[] => {
    const base = dayjs().startOf('hour');
    return Array.from({ length: count }).map((_, i) => {
        const from = base.add(Math.floor(Math.random() * 120), 'minute');
        const to = from.add(Math.floor(Math.random() * 30) + 5, 'minute');
        return {
            title: `Event ${i + 1}`,
            from,
            to,
            location: `Loc ${Math.ceil(Math.random() * 10)}`,
            description: `Desc ${i + 1}`,
            special: Math.random() < 0.2 ? '⚠️ attention' : '',
            completed: false
        };
    });
};

function StudioClock() {
    const [now, setNow] = useState<Dayjs>(dayjs());
    useInterval(() => setNow(dayjs()), 1000);
    const seconds = now.second();
    return (
        <div className="studio-clock">
            <div className="clock-time">{now.format('HH:mm:ss')}</div>
            {Array.from({ length: 60 }).map((_, i) => {
                const angle = ((i * 6) - 90) * (Math.PI / 180);
                const radius = 60;
                const x = 64 + radius * Math.cos(angle);
                const y = 64 + radius * Math.sin(angle);
                return <div key={i} className={`dot ${i <= seconds ? 'active' : ''}`} style={{ left: x, top: y }} />;
            })}
        </div>
    );
}

type TimelineItemRef = HTMLDivElement | null;
interface TimelineItemProps {
    event: TimelineEvent;
    isNow: boolean;
    isPast: boolean;
    onClick(): void;
}
const TimelineItem = React.forwardRef<TimelineItemRef, TimelineItemProps>(({ event, isNow, isPast, onClick }, ref) => {
    const classes = ['timeline-item'];
    if (event.completed) classes.push('completed');
    else if (isNow) classes.push('current');
    else if (isPast) classes.push('past');
    return (
        <div ref={ref} className={classes.join(' ')} onClick={onClick} tabIndex={-1}>
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
    onToggleComplete(index: number): void;
    autoScrollEnabled: boolean;
}

function Timeline({ events, onToggleComplete, autoScrollEnabled }: TimelineProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [now, setNow] = useState<Dayjs>(dayjs());
    const [internalAutoScroll, setInternalAutoScroll] = useState(true);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const itemRefs = useRef<TimelineItemRef[]>([]);

    useInterval(() => setNow(dayjs()), 1000);
    useAutoScroll(containerRef, events, now, autoScrollEnabled && internalAutoScroll, setInternalAutoScroll);

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

    const buckets: Record<string, TimelineEvent[]> = {};
    sorted.forEach(e => {
        const hour = e.from.format('HH:00');
        buckets[hour] = buckets[hour] || [];
        buckets[hour].push(e);
    });

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIdx(i => (i + 1) % sorted.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIdx(i => (i - 1 + sorted.length) % sorted.length);
            }
        };
        const container = containerRef.current;
        container?.addEventListener('keydown', handleKey);
        return () => container?.removeEventListener('keydown', handleKey);
    }, [sorted.length]);

    useEffect(() => {
        itemRefs.current[selectedIdx]?.focus();
    }, [selectedIdx]);

    let idxCounter = 0;
    return (
        <div className="timeline" ref={containerRef} tabIndex={0}>
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
                                    setSelectedIdx(idx);
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
        const saved = localStorage.getItem('timelineEvents');
        if (saved) {
            const parsed = JSON.parse(saved);
            return parsed.map((e: any) => ({ ...e, from: dayjs(e.from), to: dayjs(e.to) }));
        }
        const demo = generateDemoEvents();
        localStorage.setItem(
            'timelineEvents',
            JSON.stringify(demo.map(e => ({ ...e, from: e.from.toISOString(), to: e.to.toISOString() })))
        );
        return demo;
    });

    useEffect(() => {
        localStorage.setItem(
            'timelineEvents',
            JSON.stringify(events.map(e => ({ ...e, from: e.from.toISOString(), to: e.to.toISOString() })))
        );
    }, [events]);

    const [errors, setErrors] = useState<string[]>([]);
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            const demo = generateDemoEvents();
            setEvents(demo);
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
            <StudioClock />
            <Timeline events={events} onToggleComplete={toggleComplete} autoScrollEnabled={true} />
        </div>
    );
}

export default App;
