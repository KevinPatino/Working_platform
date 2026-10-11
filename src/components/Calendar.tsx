import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import PhotoEvidenceUploader from './PhotoEvidence';
import PhotoModal from './PhotoModal';

interface CalendarProps {
  logs: any[]; 
  role?: string;
  onLogUpdated?: () => void;
}

const Calendar: React.FC<CalendarProps> = ({ logs, role = 'worker', onLogUpdated }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isUpdatingPhotos, setIsUpdatingPhotos] = useState(false);

  // Mantener sincronizado el registro seleccionado cuando cambien los logs
  useEffect(() => {
    if (selectedLog) {
      const updated = logs.find((l) => l.id === selectedLog.id);
      if (updated) setSelectedLog(updated);
    }
  }, [logs]);

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
    if (selectedLog && selectedLog.id === log?.id) {
      setSelectedLog(null);
    } else {
      setSelectedLog(log);
    }
  };

  // Guardar fotos añadidas o eliminadas directamente en Firestore
  const handlePhotosChange = async (updatedPhotos: string[]) => {
    if (!selectedLog) return;
    setIsUpdatingPhotos(true);
    try {
      const logRef = doc(db, 'timeLogs', selectedLog.id);
      await updateDoc(logRef, { photos: updatedPhotos });
      
      setSelectedLog((prev: any) => ({ ...prev, photos: updatedPhotos }));
      if (onLogUpdated) {
        onLogUpdated();
      }
    } catch (error) {
      console.error('Error updating photos in log:', error);
    } finally {
      setIsUpdatingPhotos(false);
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];
  
  const years = Array.from({ length: 7 }, (_, i) => 2024 + i);

  return (
    <div className="animate-fade-in space-y-4">
      {/* Controles de Navegación del Mes */}
      <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-200">
        <button 
          type="button"
          onClick={prevMonth} 
          className="px-3 py-1 text-gray-600 hover:bg-gray-200 rounded-lg font-bold transition-colors cursor-pointer"
        >
          &lt;
        </button>
        
        <div className="flex space-x-2">
          <select 
            value={currentMonthValue}
            onChange={handleMonthChange}
            className="bg-white border border-gray-300 text-gray-700 text-xs sm:text-sm font-semibold py-1.5 px-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {monthNames.map((month, index) => (
              <option key={month} value={index}>{month}</option>
            ))}
          </select>

          <select 
            value={currentYearValue}
            onChange={handleYearChange}
            className="bg-white border border-gray-300 text-gray-700 text-xs sm:text-sm font-semibold py-1.5 px-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <button 
          type="button"
          onClick={nextMonth} 
          className="px-3 py-1 text-gray-600 hover:bg-gray-200 rounded-lg font-bold transition-colors cursor-pointer"
        >
          &gt;
        </button>
      </div>

      {/* Días de la Semana */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-[11px] font-bold text-gray-400 uppercase py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Cuadrícula de Días */}
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="p-2 min-h-[52px]"></div>
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
                p-2 rounded-lg text-center text-xs transition-all min-h-[52px] flex flex-col justify-between
                ${log ? 'cursor-pointer shadow-xs border' : 'text-gray-400 bg-gray-50/70 border border-gray-100'}
                ${log && !isSelected ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold hover:bg-emerald-100' : ''}
                ${isSelected ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-400 shadow-md border-transparent' : ''}
              `}
            >
              <span className="block leading-none">{day}</span>
              {log && (
                <span className={`text-[11px] font-black mt-1 ${isSelected ? 'text-white' : 'text-emerald-700'}`}>
                  {log.totalHours}h
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Tarjeta de Detalle del Registro Seleccionado */}
      {selectedLog && (
        <div className="mt-4 p-4 border-l-4 border-blue-600 bg-blue-50/60 rounded-r-xl shadow-xs relative animate-fade-in border border-blue-100 space-y-3">
          <button 
            type="button"
            onClick={() => setSelectedLog(null)} 
            className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
            title="Close details"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h3 className="font-bold text-gray-800 text-sm pr-6">
            Log Details
          </h3>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <p className="text-gray-500 font-medium">Location:</p>
            <p className="font-semibold text-gray-800">{selectedLog.location}</p>
            <p className="text-gray-500 font-medium">Schedule:</p>
            <p className="font-semibold text-gray-800">{selectedLog.checkIn} - {selectedLog.checkOut}</p>
            <p className="text-gray-500 font-medium">Total Hours:</p>
            <p className="font-black text-blue-700">{selectedLog.totalHours} hrs</p>
          </div>

          {selectedLog.comments && (
            <div className="pt-2 border-t border-blue-200">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold">Comments</p>
              <p className="text-xs italic text-gray-700 mt-0.5">"{selectedLog.comments}"</p>
            </div>
          )}

          {/* Gestión de Evidencias Fotográficas */}
          {role === 'teamlead' ? (
            <div className="pt-3 border-t border-blue-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                  Site Evidence Photos
                </span>
                {selectedLog.photos && selectedLog.photos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsPhotoModalOpen(true)}
                    className="text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>View Gallery ↗</span>
                  </button>
                )}
              </div>

              {/* Uploader para ver miniaturas existentes y subir más fotos */}
              <PhotoEvidenceUploader
                docId={selectedLog.id}
                photos={selectedLog.photos || []}
                onPhotosChange={handlePhotosChange}
              />

              {isUpdatingPhotos && (
                <p className="text-[11px] text-blue-600 font-semibold animate-pulse">
                  Syncing photos...
                </p>
              )}
            </div>
          ) : (
            /* Modo solo lectura si es Worker y el turno tiene fotos */
            selectedLog.photos && selectedLog.photos.length > 0 && (
              <div className="pt-3 border-t border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    Site Evidence
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPhotoModalOpen(true)}
                    className="text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors cursor-pointer"
                  >
                    View Photos ({selectedLog.photos.length}) ↗
                  </button>
                </div>

                <div className="flex gap-2 overflow-x-auto py-1">
                  {selectedLog.photos.map((url: string, idx: number) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Evidence ${idx + 1}`}
                      onClick={() => setIsPhotoModalOpen(true)}
                      className="w-14 h-14 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Visor Modal en pantalla completa */}
      <PhotoModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        photos={selectedLog?.photos || []}
        title={`Evidence • ${selectedLog?.location || 'Job Site'}`}
      />
    </div>
  );
};

export default Calendar;