import React, { useState } from 'react';

interface CalendarProps {
  logs: any[]; 
}

const Calendar: React.FC<CalendarProps> = ({ logs }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const currentYearValue = currentMonth.getFullYear();
  const currentMonthValue = currentMonth.getMonth();

  const daysInMonth = new Date(currentYearValue, currentMonthValue + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYearValue, currentMonthValue, 1).getDay();

  const prevMonth = () => {
    setCurrentMonth(new Date(currentYearValue, currentMonthValue - 1, 1));
    setSelectedLog(null);
  };
  
  const nextMonth = () => {
    setCurrentMonth(new Date(currentYearValue, currentMonthValue + 1, 1));
    setSelectedLog(null);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value, 10);
    setCurrentMonth(new Date(currentYearValue, newMonth, 1));
    setSelectedLog(null);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value, 10);
    setCurrentMonth(new Date(newYear, currentMonthValue, 1));
    setSelectedLog(null);
  };

  const getLogForDay = (day: number) => {
    return logs.find(log => {
      if (!log.timestamp) return false;
      const logDate = log.timestamp.toDate();
      return (
        logDate.getDate() === day &&
        logDate.getMonth() === currentMonthValue &&
        logDate.getFullYear() === currentYearValue
      );
    });
  };

  const handleDayClick = (log: any) => {
    if (!log) return; 
    if (selectedLog && selectedLog.id === log.id) {
      setSelectedLog(null);
    } else {
      setSelectedLog(log);
    }
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const years = Array.from({ length: 7 }, (_, i) => 2024 + i);

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4 bg-gray-50 p-2 rounded-lg border">
        <button onClick={prevMonth} className="px-3 py-1 text-gray-600 hover:bg-gray-300 rounded font-bold transition-colors">&lt;</button>
        
        <div className="flex space-x-2">
          <select 
            value={currentMonthValue}
            onChange={handleMonthChange}
            className="bg-white border border-gray-300 text-gray-700 text-sm font-semibold py-1 px-2 rounded outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {monthNames.map((month, index) => (
              <option key={month} value={index}>{month}</option>
            ))}
          </select>

          <select 
            value={currentYearValue}
            onChange={handleYearChange}
            className="bg-white border border-gray-300 text-gray-700 text-sm font-semibold py-1 px-2 rounded outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <button onClick={nextMonth} className="px-3 py-1 text-gray-600 hover:bg-gray-300 rounded font-bold transition-colors">&gt;</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-xs font-bold text-gray-500">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="p-2"></div>
        ))}
        
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const log = getLogForDay(day);
          const isSelected = selectedLog && selectedLog.id === log?.id;

          return (
            <div 
              key={day}
              onClick={() => handleDayClick(log)}
              className={`
                p-2 rounded-lg text-center text-sm transition-all
                ${log ? 'cursor-pointer shadow-sm' : 'text-gray-400 bg-gray-50'}
                ${log && !isSelected ? 'bg-blue-100 text-blue-800 font-bold hover:bg-blue-200 border border-blue-200' : ''}
                ${isSelected ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-300 ring-offset-1' : ''}
              `}
            >
              {day}
              {log && <div className="text-[10px] opacity-80 mt-1">{log.totalHours}h</div>}
            </div>
          );
        })}
      </div>

      {selectedLog && (
        <div className="mt-6 p-4 border-l-4 border-blue-600 bg-blue-50 rounded-r-lg shadow-sm relative animate-fade-in">
          <button 
            onClick={() => setSelectedLog(null)}
            className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
            title="Close details"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h3 className="font-bold text-gray-800 text-lg mb-2 pr-6">Log Details</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p className="text-gray-600">Location:</p>
            <p className="font-semibold">{selectedLog.location}</p>
            <p className="text-gray-600">Schedule:</p>
            <p className="font-semibold">{selectedLog.checkIn} - {selectedLog.checkOut}</p>
            <p className="text-gray-600">Total Hours:</p>
            <p className="font-semibold text-blue-700">{selectedLog.totalHours} hrs</p>
          </div>
          {selectedLog.comments && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Comments</p>
              <p className="text-sm italic text-gray-700 mt-1">"{selectedLog.comments}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Calendar;