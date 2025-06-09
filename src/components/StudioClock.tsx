import React, { useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { useInterval } from 'react-use';

interface StudioClockProps {
    showSecondsHand?: boolean;
    size?: number;
}

function StudioClock({ showSecondsHand = true, size = 128 }: StudioClockProps) {
    const [now, setNow] = useState<Dayjs>(dayjs());
    useInterval(() => setNow(dayjs()), 1000);
    const seconds = now.second();
    const radius = size / 2 - 4;
    const center = size / 2;
    const cardinalMarkerRadius = radius - 8; // Radius for 15-minute markers

    return (
        <div 
            className="studio-clock"
            style={{ width: `${size}px`, height: `${size}px` }}
        >
            <div className="clock-time">{now.format('HH:mm:ss')}</div>
            {/* Regular minute markers */}
            {[...Array(60)].map((_, i) => {
                const angle = ((i * 6) - 90) * (Math.PI / 180);
                const dotRadius = showSecondsHand ? radius : radius - 10;
                const x = center + dotRadius * Math.cos(angle);
                const y = center + dotRadius * Math.sin(angle);
                const isActive = showSecondsHand ? i <= seconds : false;

                return (
                    <div 
                        key={i} 
                        className={`dot ${isActive ? 'active' : ''}`} 
                        style={{ left: x, top: y }} 
                    />
                );
            })}

            {/* 15-minute cardinal markers */}
            {[0, 15, 30, 45].map((minute) => {
                const angle = ((minute * 6) - 90) * (Math.PI / 180);
                const x = center + cardinalMarkerRadius * Math.cos(angle);
                const y = center + cardinalMarkerRadius * Math.sin(angle);
                const isActive = showSecondsHand ? minute <= seconds && seconds < minute + 15 : false;

                return (
                    <div 
                        key={`cardinal-${minute}`} 
                        className={`dot cardinal ${isActive ? 'active' : ''}`} 
                        style={{ left: x, top: y }} 
                    />
                );
            })}
        </div>
    );
}

export default StudioClock;
