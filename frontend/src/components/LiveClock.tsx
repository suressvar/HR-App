import React, { useEffect, useState } from 'react';

export const LiveClock: React.FC = () => {
  const [timeString, setTimeString] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      // Format options: "Sat, 08 Aug 2026 — 14:32:07"
      const dayName = now.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = now.toLocaleDateString('en-US', { day: '2-digit' });
      const month = now.toLocaleDateString('en-US', { month: 'short' });
      const year = now.getFullYear();

      const time = now.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      setTimeString(`${dayName}, ${dayNum} ${month} ${year} — ${time}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-ink-muted text-sm font-medium tracking-wide flex items-center gap-2">
      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
      {timeString}
    </div>
  );
};
