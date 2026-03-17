interface DailyData {
  date: string;
  search: number;
  chat: number;
  error: number;
}

interface DailyChartProps {
  data: DailyData[];
}

export function DailyChart({ data }: DailyChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-[#d0d8e0] p-6 text-center">
        <p className="text-sm text-[#667781]">No usage data yet</p>
      </div>
    );
  }

  const maxTotal = Math.max(
    ...data.map((d) => d.search + d.chat + d.error),
    1
  );

  return (
    <div className="bg-white rounded-lg border border-[#d0d8e0] p-4">
      <h3 className="text-sm font-medium text-[#1a2a3a] mb-4">Daily Breakdown</h3>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 text-xs text-[#667781]">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-[#1976d2]" /> Searches
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-[#4ba3f5]" /> Chats
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-red-400" /> Errors
        </span>
      </div>

      {/* Bars */}
      <div className="flex items-end gap-1" style={{ height: 160 }}>
        {data.map((day) => {
          const total = day.search + day.chat + day.error;
          const heightPct = (total / maxTotal) * 100;
          const searchPct = total > 0 ? (day.search / total) * 100 : 0;
          const chatPct = total > 0 ? (day.chat / total) * 100 : 0;
          const errorPct = total > 0 ? (day.error / total) * 100 : 0;

          return (
            <div
              key={day.date}
              className="flex-1 flex flex-col justify-end"
              title={`${day.date}: ${day.search} searches, ${day.chat} chats, ${day.error} errors`}
            >
              <div
                className="flex flex-col rounded-t-sm overflow-hidden"
                style={{ height: `${heightPct}%`, minHeight: total > 0 ? 4 : 0 }}
              >
                {errorPct > 0 && (
                  <div className="bg-red-400" style={{ flex: errorPct }} />
                )}
                {chatPct > 0 && (
                  <div className="bg-[#4ba3f5]" style={{ flex: chatPct }} />
                )}
                {searchPct > 0 && (
                  <div className="bg-[#1976d2]" style={{ flex: searchPct }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Date labels */}
      <div className="flex gap-1 mt-1">
        {data.map((day, i) => (
          <div key={day.date} className="flex-1 text-center">
            {/* Show label for first, last, and every ~5th day */}
            {(i === 0 || i === data.length - 1 || i % 5 === 0) ? (
              <span className="text-[9px] text-[#667781]">
                {day.date.slice(5)}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
