import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  setDoc, 
  doc, 
  Timestamp, 
  getDoc 
} from 'firebase/firestore';
import Toast from './Toast';
import Calendar from './Calendar';
import PhotoEvidenceUploader from './PhotoEvidence';
import LocationInput from './LocationInput';
import ToolboxMeetingModal from './ToolBoxMeetingModal';

interface DashboardProps {
  user: any;
  role?: 'worker' | 'teamlead' | string;
}

// Configuración de nómina bisemanal
const ANCHOR_DATE = new Date(2026, 7, 31);
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CYCLE_DAYS = 14;

const getBaseCycleIndex = () => {
  const now = new Date();
  const todayAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((todayAtMidnight.getTime() - ANCHOR_DATE.getTime()) / MS_PER_DAY);
  return Math.floor(diffDays / CYCLE_DAYS);
};

const getPeriodRangeByIndex = (cycleIndex: number) => {
  const currentStart = new Date(ANCHOR_DATE.getTime() + cycleIndex * CYCLE_DAYS * MS_PER_DAY);
  const currentEnd = new Date(ANCHOR_DATE.getTime() + (cycleIndex * CYCLE_DAYS + 13) * MS_PER_DAY);

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  return {
    start: formatDate(currentStart),
    end: formatDate(currentEnd),
  };
};

const formatPeriodLegend = (startStr: string, endStr: string) => {
  if (!startStr || !endStr) return "";
  const s = new Date(startStr + "T00:00:00");
  const e = new Date(endStr + "T00:00:00");
  const sMonth = s.toLocaleDateString("en-US", { month: "short" });
  const eMonth = e.toLocaleDateString("en-US", { month: "short" });
  const sDay = s.getDate();
  const eDay = e.getDate();
  const year = e.getFullYear();

  if (sMonth === eMonth) {
    return `${sMonth} ${sDay} – ${eDay}, ${year}`;
  }
  return `${sMonth} ${sDay} – ${eMonth} ${eDay}, ${year}`;
};

const getLocalTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Dashboard: React.FC<DashboardProps> = ({ user, role = 'worker' }) => {
  const [userName, setUserName] = useState('');
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [hasLoggedToday, setHasLoggedToday] = useState(false);
  const [myLogs, setMyLogs] = useState<any[]>([]);
  // const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Formulario diario de horas
  const [mainLocation, setMainLocation] = useState('');
  const [extraLocations, setExtraLocations] = useState<string[]>([]);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [totalHours, setTotalHours] = useState('');
  const [comments, setComments] = useState('');
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);

  // Estado del modal de Toolbox Meeting
  const [isToolboxOpen, setIsToolboxOpen] = useState(false);

  // Navegación de periodos
  const [activeCycleIndex, setActiveCycleIndex] = useState<number>(getBaseCycleIndex());
  const [periodRange, setPeriodRange] = useState(getPeriodRangeByIndex(getBaseCycleIndex()));

  // Control de vista desplegable y calculadora
  const [showDetails, setShowDetails] = useState(false);
  const [hourlyWage, setHourlyWage] = useState<string>('');

  const handleLogout = async () => {
    await signOut(auth);
  };

  const showNotification = (msg: string) => {
    setToastMessage(msg);
  };

  // Cargar nombre del usuario
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserName(userDoc.data().fullName || user.email);
          setUserCompanyId(data.companyId || null);
        } else {
          setUserName(user.email);
        }
      } catch (err) {
        setUserName(user.email);
      }
    };
    fetchUserData();
  }, [user]);

  // Consultar registros del trabajador
  const fetchMyLogs = async () => {
    // setLoading(true);
    try {
      const q = query(
        collection(db, 'timeLogs'),
        where('userId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const logs: any[] = [];
      let foundToday = false;
      const todayStr = getLocalTodayString();

      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        logs.push({ id: docSnapshot.id, ...data });

        if (data.dateStr === todayStr) {
          foundToday = true;
        } else if (data.timestamp) {
          const logDate = data.timestamp.toDate();
          const y = logDate.getFullYear();
          const m = String(logDate.getMonth() + 1).padStart(2, '0');
          const d = String(logDate.getDate()).padStart(2, '0');
          if (`${y}-${m}-${d}` === todayStr) {
            foundToday = true;
          }
        }
      });

      setMyLogs(logs);
      setHasLoggedToday(foundToday);
    } catch (error: any) {
      showNotification('Error loading logs: ' + error.message);
    } finally {
      // setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLogs();
  }, [user]);

  // Manejo de obras múltiples
  const handleAddLocation = () => {
    if (extraLocations.length < 2) {
      setExtraLocations([...extraLocations, '']);
    }
  };

  const handleExtraLocationChange = (index: number, val: string) => {
    const updated = [...extraLocations];
    updated[index] = val;
    setExtraLocations(updated);
  };

  const handleRemoveExtraLocation = (index: number) => {
    setExtraLocations(extraLocations.filter((_, i) => i !== index));
  };

  // Control estricto de entrada para horas: solo números y punto decimal
  const handleTotalHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(',', '.');
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setTotalHours(val);
    }
  };

  // Guardar turno del día
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMain = mainLocation.trim();
    const cleanExtras = extraLocations.map((l) => l.trim()).filter(Boolean);
    const cleanHours = totalHours.trim();

    if (!cleanMain || !checkIn || !checkOut || !cleanHours) {
      showNotification('Please fill in all required fields including total hours.');
      return;
    }

    const parsedHours = Number(cleanHours);
    if (isNaN(parsedHours) || parsedHours <= 0) {
      showNotification('Please enter a valid number of total hours (e.g. 8 or 8.5).');
      return;
    }

    const allLocations = [cleanMain, ...cleanExtras];
    const combinedLocation = allLocations.join(' / ');
    const todayStr = getLocalTodayString();
    const docId = `${user.uid}_${todayStr}`;

    setSubmitting(true);
    try {
      await setDoc(doc(db, 'timeLogs', docId), {
        userId: user.uid,
        userEmail: user.email,
        location: combinedLocation,
        locations: allLocations,
        checkIn,
        checkOut,
        totalHours: parsedHours,
        comments: comments.trim(),
        photos: evidencePhotos,
        dateStr: todayStr,
        timestamp: Timestamp.now(),
      });

      showNotification('Hours logged successfully!');
      setMainLocation('');
      setExtraLocations([]);
      setCheckIn('');
      setCheckOut('');
      setTotalHours('');
      setComments('');
      setEvidencePhotos([]);
      await fetchMyLogs();
    } catch (err: any) {
      showNotification('Error saving log: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Navegación de periodos
  const handlePrevPeriod = () => {
    const nextIdx = activeCycleIndex - 1;
    setActiveCycleIndex(nextIdx);
    setPeriodRange(getPeriodRangeByIndex(nextIdx));
  };

  const handleNextPeriod = () => {
    const nextIdx = activeCycleIndex + 1;
    setActiveCycleIndex(nextIdx);
    setPeriodRange(getPeriodRangeByIndex(nextIdx));
  };

  const handleCurrentPeriod = () => {
    const baseIdx = getBaseCycleIndex();
    setActiveCycleIndex(baseIdx);
    setPeriodRange(getPeriodRangeByIndex(baseIdx));
  };

  // Filtrado de horas de la quincena
  const periodLogs = myLogs.filter((log) => {
    if (!log.timestamp) return false;
    const logDate = log.timestamp.toDate();
    const start = new Date(periodRange.start + 'T00:00:00');
    const end = new Date(periodRange.end + 'T23:59:59');
    return logDate >= start && logDate <= end;
  });

  const periodTotalHours = periodLogs.reduce(
    (sum, log) => sum + (Number(log.totalHours) || 0),
    0
  );

  const estimatedPay = hourlyWage && Number(hourlyWage) > 0 
    ? (periodTotalHours * Number(hourlyWage)).toFixed(2) 
    : null;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Cabecera con Nombre y Etiqueta de Rol */}
        <div className="bg-gray-900 rounded-xl p-6 shadow-lg flex justify-between items-center text-white">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold">
                {userName || 'Loading...'}
              </h1>
              {role === 'teamlead' ? (
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-md">
                  Lead
                </span>
              ) : (
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-md">
                  Worker
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1 font-medium">
              {role === 'teamlead' ? 'Team Lead Portal' : 'Worker Portal'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-bold transition-colors cursor-pointer"
          >
            Log Out
          </button>
        </div>

        {/* Acceso a Toolbox Meeting exclusivo para Team Lead */}
        {role === 'teamlead' && (
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-4 sm:p-5 rounded-xl shadow-md flex items-center justify-between gap-4 animate-fade-in">
            <div>
              <span className="px-2 py-0.5 text-[10px] uppercase font-black tracking-wider bg-purple-700/60 text-purple-200 rounded border border-purple-400/30">
                Safety First
              </span>
              <h3 className="text-sm sm:text-base font-bold mt-1">Daily Safety Briefing</h3>
              <p className="text-xs text-purple-200 mt-0.5">Start daily toolbox meeting & capture crew signatures.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsToolboxOpen(true)}
              className="px-4 py-2.5 bg-white text-purple-950 hover:bg-purple-50 rounded-lg text-xs font-black shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <span>📋</span>
              <span>Open Toolbox</span>
            </button>
          </div>
        )}

        {/* Sección de Registro Diario de Horas */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Daily Time Entry</h2>

          {hasLoggedToday ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm font-semibold flex items-center gap-2">
              <span>✓</span>
              <span>You have already submitted your hours for today.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                  Primary Job Site
                </label>
                <LocationInput
                  value={mainLocation}
                  onChange={(val) => setMainLocation(val)}
                  placeholder="Search job site address..."
                  className="p-3 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />

                {extraLocations.map((extraLoc, index) => (
                  <div key={index} className="flex gap-2 mt-2 items-center">
                    <LocationInput
                      value={extraLoc}
                      onChange={(val) => handleExtraLocationChange(index, val)}
                      placeholder={`Additional job site ${index + 2}`}
                      wrapperClassName="flex-1"
                      className="p-3 border border-blue-200 bg-blue-50/30 rounded-lg text-sm outline-none focus:border-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveExtraLocation(index)}
                      className="px-3.5 py-3 bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg text-sm font-bold transition-colors cursor-pointer self-stretch flex items-center justify-center"
                      title="Remove site"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {extraLocations.length < 2 && (
                  <button
                    type="button"
                    onClick={handleAddLocation}
                    className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    + Add another job site
                  </button>
                )}
              </div>

              {/* Fila con Check In, Check Out y Total Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                    Check In
                  </label>
                  <input
                    type="time"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full p-3 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                    Check Out
                  </label>
                  <input
                    type="time"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full p-3 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                    Total Hours
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    value={totalHours}
                    onChange={handleTotalHoursChange}
                    placeholder=""
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Tasks performed, delays, comments..."
                  className="w-full p-3 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Módulo de Evidencias Fotográficas: solo para Team Leads */}
              {role === 'teamlead' && (
                <div className="pt-2 border-t border-gray-100">
                  <PhotoEvidenceUploader
                    docId={`${user.uid}_${getLocalTodayString()}`}
                    photos={evidencePhotos}
                    onPhotosChange={setEvidencePhotos}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-colors shadow-sm disabled:bg-blue-400 cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Daily Hours'}
              </button>
            </form>
          )}
        </div>

        {/* Resumen de Nómina y Calendario Desplegable */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 space-y-4">
          
          {/* Encabezado del Periodo con Navegación */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-base font-bold text-gray-800">Pay Period Summary</h3>
              <p className="text-xs text-purple-700 font-extrabold mt-0.5">
                📅 {formatPeriodLegend(periodRange.start, periodRange.end)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevPeriod}
                className="px-2.5 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors cursor-pointer"
                title="Previous Pay Period"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={handleCurrentPeriod}
                className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
              >
                Current
              </button>
              <button
                type="button"
                onClick={handleNextPeriod}
                className="px-2.5 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors cursor-pointer"
                title="Next Pay Period"
              >
                ▶
              </button>
            </div>
          </div>

          {/* Tarjeta Principal Compacta */}
          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-100">
            <div>
              <span className="text-xs uppercase font-bold text-purple-700 tracking-wider">
                Total Accumulated
              </span>
              <p className="text-2xl font-black text-purple-900 mt-0.5">
                {periodTotalHours}h
              </p>
              <p className="text-xs text-purple-600 font-medium">
                {periodLogs.length} shifts in this pay period
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="px-3.5 py-2 text-xs font-bold bg-white text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>{showDetails ? "Hide Calendar" : "View Calendar & Details"}</span>
              <span 
                className="text-[10px] transform transition-transform duration-200"
                style={{ transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                ▼
              </span>
            </button>
          </div>

          {/* SECCIÓN DESPLEGABLE: Calculadora y Calendario Modular */}
          {showDetails && (
            <div className="pt-4 border-t border-gray-100 space-y-6 animate-fade-in">
              
              {/* Calculadora de Pago Estimado */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="w-full sm:w-auto">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Hourly Wage Calculator
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-gray-400">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      value={hourlyWage}
                      onChange={(e) => {
                        const val = e.target.value.replace(',', '.');
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setHourlyWage(val);
                        }
                      }}
                      placeholder="e.g. 25"
                      className="w-24 p-1.5 border rounded-lg text-xs bg-white outline-none focus:border-blue-500 font-bold"
                    />
                    <span className="text-xs text-gray-400">/hr</span>
                  </div>
                </div>

                {estimatedPay ? (
                  <div className="text-right w-full sm:w-auto">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">
                      Estimated Gross Pay
                    </span>
                    <span className="text-lg font-black text-emerald-600">
                      ${estimatedPay}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    Enter your rate to calculate pay
                  </p>
                )}
              </div>

              {/* Calendario mensual modular */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Monthly Logs Calendar
                </h4>
                <Calendar 
                  logs={myLogs}
                  role={role}
                  onLogUpdated={fetchMyLogs}
                />
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Modal de Toolbox Meeting */}
      <ToolboxMeetingModal
        isOpen={isToolboxOpen}
        onClose={() => setIsToolboxOpen(false)}
        currentUser={user}
        userCompanyId={userCompanyId}
        showNotification={showNotification}
      />
    </div>
  );
};

export default Dashboard;