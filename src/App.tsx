import React, {useEffect, useRef, useState} from 'react';
import dayjs, {Dayjs} from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import CustomParseFormat from 'dayjs/plugin/customParseFormat'
import {useInterval} from 'react-use';
import {useXlsx} from './hooks/useXlsx';
import {TimelineEvent} from './hooks/useXlsx';
import {useAutoScroll} from './utils/useAutoScroll';
import StudioClock from './components/StudioClock';
import './App.scss';
import {stringToColor} from "./utils/color";

dayjs.extend(isBetween);
dayjs.extend(CustomParseFormat);

type TimelineItemRef = HTMLDivElement | null;

interface TimelineItemProps {
    event: TimelineEvent;
    isNow: boolean;
    isPast: boolean;
    onClick: () => void;
}

const TimelineItem = React.forwardRef<TimelineItemRef, TimelineItemProps>(
    ({event, isNow, isPast, onClick}, ref) => {
        const classes = ['timeline-item'];
        if (event.completed) classes.push('completed');
        else if (isNow) classes.push('current');
        else if (isPast) classes.push('past');

        return (
            <div
                ref={ref as React.Ref<HTMLDivElement>}
                className={classes.join(' ')}
                onClick={onClick}
            >
                <div className="col title">{event.title}</div>
                <div className="col time">
                    {event.from.format('HH:mm')}{!event.showTo && ` - ${event.to.format('HH:mm')}`}
                </div>
                <div className="col location">{event.location}</div>
                <div className="col description">{event.description}</div>
                <div className="col special">{event.special}</div>
                {event.category &&
                    <div className="col category">
                    <span className="category-pill" style={{
                        backgroundColor: stringToColor(event.category).bg,
                        borderColor: stringToColor(event.category).border,
                        color: stringToColor(event.category).text
                    }}>
                        {event.category}
                    </span>
                    </div>
                }
            </div>
        );
    }
);

interface TimelineProps {
    events: TimelineEvent[];
    onToggleComplete: (index: number) => void;
    autoScrollEnabled: boolean;
}

function Timeline({events, onToggleComplete, autoScrollEnabled}: TimelineProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [now, setNow] = useState<Dayjs>(dayjs());
    const [internalAutoScroll, setInternalAutoScroll] = useState(true);
    const itemRefs = useRef<TimelineItemRef[]>([]);

    useInterval(() => setNow(dayjs()), 1000);
    const effective = autoScrollEnabled && internalAutoScroll;
    useAutoScroll(containerRef, events, now, effective, setInternalAutoScroll);

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

    let idxCounter = 0;
    return (
        <div className="timeline" ref={containerRef}>
            <div className="timeline-header">
                <div className="col title">Title</div>
                <div className="col time">Time</div>
                <div className="col location">Location</div>
                <div className="col description">Description</div>
                <div className="col special">Special</div>
                <div className="col category">Category</div>
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
                                onClick={() => onToggleComplete(events.indexOf(e))}
                            />
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

function App() {
    const [file, setFile] = useState<File | null>(null);
    const {sheets, items: parsedEvents, errors, setSelectedSheet} = useXlsx(file, true);

    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

    // When parsedEvents change, update events
    useEffect(() => {
        setEvents(parsedEvents);
    }, [parsedEvents]);

    // Persist events
    useEffect(() => {
        if (events.length === 0) return;
        localStorage.setItem(
            'timelineEvents',
            JSON.stringify(
                events.map(e => ({...e, from: e.from.toISOString(), to: e.to.toISOString()}))
            )
        );
    }, [events]);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] || null;
        setFile(f);
    };

    const toggleComplete = (idx: number) => {
        setEvents(prev =>
            prev.map((e, i) => (i === idx ? {...e, completed: !e.completed} : e))
        );
    };

    return (
        <div className={`app-container ${darkMode ? 'dark' : ''}`}>
            <header className="app-header">
                <label className="theme-toggle">
                    <input
                        type="checkbox"
                        checked={darkMode}
                        onChange={() => setDarkMode(prev => !prev)}
                    />
                    <span>Dark Mode</span>
                </label>
                <label className="auto-scroll-toggle">
                    <input
                        type="checkbox"
                        checked={autoScrollEnabled}
                        onChange={() => setAutoScrollEnabled(prev => !prev)}
                    />
                    <span>Auto Scroll</span>
                </label>
                <input
                    type="file"
                    accept=".xlsx"
                    onChange={handleFileChange}
                    className="file-input"
                />
                {errors.length > 0 && (
                    <div className="error-list">
                        {errors.map((err, i) => (
                            <div key={i} className="error-item">
                                {err}
                            </div>
                        ))}
                    </div>
                )}
                {sheets.length > 0 && (
                    <select onChange={e => setSelectedSheet(e.target.value)}>
                        <option value="">Select sheet</option>
                        {sheets.map(name => (
                            <option key={name} value={name}>
                                {name}
                            </option>
                        ))}
                    </select>
                )}
            </header>
            <StudioClock showSecondsHand={true} size={128}/>
            <Timeline
                events={events}
                onToggleComplete={toggleComplete}
                autoScrollEnabled={autoScrollEnabled}
            />
        </div>
    );
}

export default App;
