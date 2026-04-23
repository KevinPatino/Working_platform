import React, { useState, useEffect } from 'react';

interface WorkerCalculatorProps {
  logs: any[];
}

const WorkerCalculator: React.FC<WorkerCalculatorProps> = ({ logs }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalHours, setTotalHours] = useState(0);

  // Efecto para calcular automáticamente cuando cambian las fechas
  useEffect(() => {
    if (!startDate || !endDate) {
      setTotalHours(0);
      return;
    }

    const start = new Date(startDate + 'T00:00:00').getTime();
    const end = new Date(endDate + 'T23:59:59').getTime();

    // Filtramos los registros que caen en ese rango de fechas
    const filteredLogs = logs.filter(log => {
      if (!log.timestamp) return false;
      const logTime = log.timestamp.toDate().getTime();
      return logTime >= start && logTime <= end;
    });

    // Sumamos las horas de los registros filtrados
    const sum = filteredLogs.reduce((acc, log) => acc + (Number(log.totalHours) || 0), 0);
    setTotalHours(sum);
  }, [startDate, endDate, logs]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Desde</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            className="w-full p-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Hasta</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            className="w-full p-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
          />
        </div>
      </div>

      {startDate && endDate && (
        <div className="bg-white border-2 border-gray-100 rounded-xl p-6 text-center shadow-sm mt-6 animate-fade-in">
          <p className="text-gray-500 text-sm font-bold uppercase mb-2">Tu Total de Horas</p>
          <p className="text-5xl font-black text-blue-600">{totalHours}</p>
          <p className="text-xs text-gray-400 mt-2">Del {new Date(startDate + 'T00:00:00').toLocaleDateString()} al {new Date(endDate + 'T23:59:59').toLocaleDateString()}</p>
        </div>
      )}
      
      {(!startDate || !endDate) && (
        <div className="py-8 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl mt-6">
          <p className="text-sm">Ingresa ambas fechas para ver el resultado.</p>
        </div>
      )}
    </div>
  );
};

export default WorkerCalculator;