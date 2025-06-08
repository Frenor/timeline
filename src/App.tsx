import React, {useEffect, useRef, useState} from 'react';
import dayjs, {Dayjs} from 'dayjs';
import {useInterval} from 'react-use';
import {parseXlsxFile, TimelineEvent} from './utils/fileUtils';
import {useAutoScroll} from './utils/useAutoScroll';

function StudioClock(): JSX.Element {
    const [now, setNow] = useState<Dayjs>(dayjs());
    useInterval(() => setNow(dayjs()), 1000);
    const seconds = now.second();

    return (
        <div
            className="fixed top-4 right-4 w-24 h-24 rounded-full border-4 border-red-500 flex items-center justify-center relative">
            <div className="text-red-600 text-lg font-bold">
                {now.format('HH:mm:ss')}
            </div>
            {[...Array(60)].map((_, i) => {
                const angle = (i * 6) * (Math.PI / 180);
                const radius = 44;
                const x = 48 + radius * Math.cos(angle);
                const y = 48 + radius * Math.sin(angle);
                return (
                    <div
                        key={i}
                        className={`absolute w-1 h-1 rounded-full ${i <= seconds ? 'bg-red-500' : 'bg-gray-300'}`}
                        style={{top: y, left: x}}
                    />
                );
            })}
        </div>
    );
}

interface TimelineItemProps {
    event: TimelineEvent;
    top: number;
    isNow: boolean;
    onClick: () => void;
}

function TimelineItem({event, top, isNow, onClick}: TimelineItemProps): JSX.Element {
    return (
        <div className="absolute left-6" style={{top}}>
            <div
                className={`p-3 border rounded shadow text-sm transition-colors duration-300 cursor-pointer space-y-1 ${
                    event.completed
                        ? 'bg-green-100 border-green-500 line-through'
                        : isNow
                            ? 'bg-red-100 border-red-500'
                            : 'bg-white'
                }`}
                onClick={onClick}
            >
                <div className="font-semibold text-base">{event.title}</div>
                <div className="text-xs text-gray-500">
                    {event.time.format('HH:mm:ss')} • {event.location}
                </div>
                <div className="text-sm text-gray-800">{event.description}</div>
                {event.special && (
                    <div className="text-sm text-red-700 font-semibold">⚠️ {event.special}</div>
                )}
            </div>
        </div>
    );
}

interface TimelineProps {
    events: TimelineEvent[];
    onToggleComplete: (index: number) => void;
}

function Timeline({events, onToggleComplete}: TimelineProps): JSX.Element {
    const containerRef = useRef<HTMLDivElement>(null);
    const [now, setNow] = useState<Dayjs>(dayjs());
    const [autoScroll, setAutoScroll] = useState(true);

    useInterval(() => setNow(dayjs()), 1000);
    useAutoScroll(containerRef, events, now, autoScroll, setAutoScroll);

    return (
        <div ref={containerRef} className="overflow-y-scroll h-[90vh] border-l-4 border-red-600 relative">
            {events.map((event, i) => {
                const top = event.time.diff(events[0].time, 'second') * 2;
                const isNow = now.isSame(event.time, 'second');
                return (
                    <TimelineItem
                        key={i}
                        event={event}
                        top={top}
                        isNow={isNow}
                        onClick={() => onToggleComplete(i)}
                    />
                );
            })}
            <div
                className="absolute left-0 w-full h-0.5 bg-red-600"
                style={{top: now.diff(events[0].time, 'second') * 2}}
            />
        </div>
    );
}

function App(): JSX.Element {
    const [events, setEvents] = useState<TimelineEvent[]>(() => {
        const saved = localStorage.getItem('timelineEvents');
        if (saved) {
            const parsed = JSON.parse(saved);
            return parsed.map((e: any) => ({...e, time: dayjs(e.time)}));
        }
        const start = dayjs().startOf('hour');
        return Array.from({length: 10}).map((_, i) => ({
            title: `Demo Event ${i + 1}`,
            time: start.add(i * 2, 'minute'),
            location: `Location ${i + 1}`,
            description: `Description for event ${i + 1}.`,
            special: i % 3 === 0 ? 'Special attention required' : '',
            completed: false
        }));
    });
    const [errors, setErrors] = useState<string[]>([]);

    useEffect(() => {
        if (events.length > 0) {
            const serialized = JSON.stringify(events.map(e => ({...e, time: e.time.toISOString()})));
            localStorage.setItem('timelineEvents', serialized);
        }
    }, [events]);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const {items, errors} = await parseXlsxFile(file, true);
        setEvents(items);
        setErrors(errors);
    };

    const toggleComplete = (index: number) => {
        setEvents(prev =>
            prev.map((e, i) => (i === index ? {...e, completed: !e.completed} : e))
        );
    };

    return (
        <div className="p-4">
            <StudioClock/>
            <input type="file" accept=".xlsx" onChange={handleFile} className="mb-4"/>

            {errors.length > 0 && (
                <div className="mb-4 text-sm text-red-600">
                    <strong>Import Warnings:</strong>
                    <ul className="list-disc ml-5">
                        {errors.map((err, i) => (
                            <li key={i}>{err}</li>
                        ))}
                    </ul>
                </div>
            )}

            {events.length > 0 && <Timeline events={events} onToggleComplete={toggleComplete}/>}
        </div>
    );
}

export default App;
