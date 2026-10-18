import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  X, 
  Clock, 
  ExternalLink, 
  FileText 
} from 'lucide-react';
import PhotoEvidenceUploader from './PhotoEvidence';
import PhotoModal from './PhotoModal';
import MapLink from './MapLink';

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
      {/* Controles de Navegación del Mes y Filtros */}
      <div className="flex justify-between items-center bg-[#F4F6F9] p-2 rounded-2xl border border-slate-200/60">
        <button 
          type="button"
          onClick={prevMonth} 
          className="w-9 h-9 flex items-center justify-center bg-white text-slate-700 hover:bg-[#FCEEE6] hover:text-[#8B4513] rounded-xl border border-slate-200/60 shadow-2xs transition-colors cursor-pointer"
          title="Previous Month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <div className="flex items-center gap-2">
          {/* Selector de Mes */}
          <div className="relative">
            <select 
              value={currentMonthValue}
              onChange={handleMonthChange}
              className="appearance-none bg-white border border-slate-200/80 text-slate-800 text-xs font-extrabold py-2 pl-3 pr-7 rounded-xl outline-none focus:ring-2 focus:ring-[#8B4513] shadow-2xs cursor-pointer"
            >
              {monthNames.map((month, index) => (
                <option key={month} value={index}>{month}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Selector de Año */}
          <div className="relative">
            <select 
              value={currentYearValue}
              onChange={handleYearChange}
              className="appearance-none bg-white border border-slate-200/80 text-slate-800 text-xs font-extrabold py-2 pl-3 pr-7 rounded-xl outline-none focus:ring-2 focus:ring-[#8B4513] shadow-2xs cursor-pointer"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <button 
          type="button"
          onClick={nextMonth} 
          className="w-9 h-9 flex items-center justify-center bg-white text-slate-700 hover:bg-[#FCEEE6] hover:text-[#8B4513] rounded-xl border border-slate-200/60 shadow-2xs transition-colors cursor-pointer"
          title="Next Month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Días de la Semana */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider py-1">
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
                p-2 rounded-xl text-center text-xs transition-all min-h-[52px] flex flex-col justify-between
                ${log ? 'cursor-pointer shadow-2xs border' : 'text-slate-400 bg-[#F4F6F9]/60 border border-slate-100'}
                ${log && !isSelected ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950 font-extrabold hover:bg-emerald-100/80' : ''}
                ${isSelected ? 'bg-[#8B3A0E] text-white font-extrabold ring-2 ring-[#8B3A0E]/30 shadow-sm border-transparent' : ''}
              `}
            >
              <span className="block leading-none">{day}</span>
              {log && (
                <span className={`text-[11px] font-black mt-1 ${isSelected ? 'text-[#FCEEE6]' : 'text-emerald-700'}`}>
                  {log.totalHours}h
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Tarjeta de Detalle del Registro Seleccionado (Nuevo Diseño UI) */}
      {selectedLog && (
        <div className="mt-4 p-5 bg-[#F4F6F9] rounded-2xl border border-slate-200/80 shadow-xs relative animate-fade-in space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#FCEEE6] text-[#8B4513] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                Log Details
              </h3>
            </div>

            <button 
              type="button"
              onClick={() => setSelectedLog(null)} 
              className="w-7 h-7 rounded-full bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/60"
              title="Close details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Información Principal en Caja Blanca */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/50 space-y-2.5 text-xs">
            <div className="flex items-start justify-between gap-4">
              <span className="text-slate-400 font-bold shrink-0">Location:</span>
              <div className="text-right flex justify-end">
                <MapLink location={selectedLog.location} compact />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <span className="text-slate-400 font-bold">Schedule:</span>
              <span className="font-extrabold text-slate-800">
                {selectedLog.checkIn} - {selectedLog.checkOut}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <span className="text-slate-400 font-bold">Total Hours:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#FCEEE6] text-[#8B4513] font-black text-xs">
                {selectedLog.totalHours} hrs
              </span>
            </div>
          </div>

          {selectedLog.comments && (
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/50 flex items-start gap-2.5">
              <FileText className="w-4 h-4 text-[#8B4513] shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">
                  Field Notes
                </p>
                <p className="text-xs text-slate-700 font-medium mt-0.5">
                  "{selectedLog.comments}"
                </p>
              </div>
            </div>
          )}

          {/* Gestión de Evidencias Fotográficas */}
          {role === 'teamlead' ? (
            <div className="pt-2 border-t border-slate-200/70 space-y-2.5">
              {selectedLog.photos && selectedLog.photos.length > 0 && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsPhotoModalOpen(true)}
                    className="text-xs font-extrabold text-[#8B4513] hover:text-[#722f0b] transition-colors cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>View Full Gallery</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <PhotoEvidenceUploader
                docId={selectedLog.id}
                photos={selectedLog.photos || []}
                onPhotosChange={handlePhotosChange}
              />

              {isUpdatingPhotos && (
                <p className="text-[11px] text-[#8B4513] font-bold animate-pulse">
                  Syncing photos...
                </p>
              )}
            </div>
          ) : (
            /* Modo solo lectura si es Worker y el turno tiene fotos */
            selectedLog.photos && selectedLog.photos.length > 0 && (
              <div className="pt-2 border-t border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Site Evidence
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPhotoModalOpen(true)}
                    className="text-xs font-extrabold text-[#8B4513] hover:text-[#722f0b] transition-colors cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>View Photos ({selectedLog.photos.length})</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex gap-2 overflow-x-auto py-1">
                  {selectedLog.photos.map((url: string, idx: number) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Evidence ${idx + 1}`}
                      onClick={() => setIsPhotoModalOpen(true)}
                      className="w-14 h-14 object-cover rounded-xl border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
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