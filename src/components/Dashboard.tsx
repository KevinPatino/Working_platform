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
import { 
  ClipboardCheck, 
  Building2, 
  Timer, 
  MapPin, 
  Navigation, 
  Plus, 
  Calculator, 
  ArrowRight, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  X
} from 'lucide-react';

import Header from './Header';
import Toast from './Toast';
import Calendar from './Calendar';
import PhotoEvidenceUploader from './PhotoEvidence';
import LocationInput from './LocationInput';
import ToolboxMeetingModal from './ToolBoxMeetingModal';
import ProjectsManager from './ProjectsManager';

import { 
  getBaseCycleIndex, 
  getPeriodRangeByIndex, 
  formatPeriodLegend, 
  getLocalTodayString 
} from '../utils/payroll';

interface DashboardProps {
  user: any;
  role?: 'worker' | 'teamlead' | string;
}

const Dashboard: React.FC<DashboardProps> = ({ user, role = 'worker' }) => {
  const [userName, setUserName] = useState('');
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [hasLoggedToday, setHasLoggedToday] = useState(false);
  const [todayLoggedHours, setTodayLoggedHours] = useState<number | null>(null);
  const [myLogs, setMyLogs] = useState<any[]>([]);
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

  // Estados de los modales flotantes (Toolbox y Projects)
  const [isToolboxOpen, setIsToolboxOpen] = useState(false);
  const [showProjectsModal, setShowProjectsModal] = useState(false);

  // Estados para manejo de proyectos en el registro de horas (Custom Address por defecto)
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [locationType, setLocationType] = useState<'address' | 'project'>('address');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

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

  // Cargar nombre del usuario y su companyId
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserName(data.fullName || user.email);
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

  // Cargar proyectos activos de la empresa
  const fetchActiveProjects = async () => {
    if (!userCompanyId) return;
    try {
      const q = query(
        collection(db, 'projects'),
        where('companyId', '==', userCompanyId),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(q);
      const list: any[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setProjectsList(list);
    } catch (err) {
      console.error('Error fetching active projects for selection:', err);
    }
  };

  useEffect(() => {
    fetchActiveProjects();
  }, [userCompanyId, showProjectsModal]);

  // Consultar registros del trabajador
  const fetchMyLogs = async () => {
    if (!userCompanyId) return;

    try {
      const q = query(
        collection(db, 'timeLogs'),
        where('userId', '==', user.uid),
        where('companyId', '==', userCompanyId)
      );
      const querySnapshot = await getDocs(q);
      const logs: any[] = [];
      let foundToday = false;
      let hoursToday: number | null = null;
      const todayStr = getLocalTodayString();

      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        logs.push({ id: docSnapshot.id, ...data });

        if (data.dateStr === todayStr) {
          foundToday = true;
          hoursToday = Number(data.totalHours) || 0;
        } else if (data.timestamp) {
          const logDate = data.timestamp.toDate();
          const y = logDate.getFullYear();
          const m = String(logDate.getMonth() + 1).padStart(2, '0');
          const d = String(logDate.getDate()).padStart(2, '0');
          if (`${y}-${m}-${d}` === todayStr) {
            foundToday = true;
            hoursToday = Number(data.totalHours) || 0;
          }
        }
      });

      setMyLogs(logs);
      setHasLoggedToday(foundToday);
      setTodayLoggedHours(hoursToday);
    } catch (error: any) {
      showNotification('Error loading logs: ' + error.message);
    }
  };

  useEffect(() => {
    if (userCompanyId) {
      fetchMyLogs();
    }
  }, [user, userCompanyId]);

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

  const handleTotalHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(',', '.');
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setTotalHours(val);
    }
  };

  // Guardar turno del día
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userCompanyId) {
      showNotification('Error: Your account is not linked to a company.');
      return;
    }

    if (locationType === 'project' && !selectedProjectId) {
      showNotification('Please select an active project from the list.');
      return;
    }

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

    const selectedProjectObj = projectsList.find((p) => p.id === selectedProjectId);

    setSubmitting(true);
    try {
      await setDoc(doc(db, 'timeLogs', docId), {
        userId: user.uid,
        userEmail: user.email,
        companyId: userCompanyId,
        location: combinedLocation,
        locations: allLocations,
        projectId: locationType === 'project' && selectedProjectId ? selectedProjectId : null,
        projectName: locationType === 'project' && selectedProjectObj ? selectedProjectObj.name : null,
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
      setSelectedProjectId('');
      setLocationType('address');
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
    <div className="min-h-screen bg-[#F4F6F9] text-slate-900 pb-12">
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {/* BARRA SUPERIOR GLOBAL ESTANDARIZADA */}
      <Header 
        userName={userName} 
        role={role} 
        onLogout={handleLogout} 
      />

      {/* CONTENEDOR CENTRAL */}
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* ACCIONES RÁPIDAS DE TEAM LEAD */}
        {role === 'teamlead' && (
          <div className="grid grid-cols-2 gap-3.5 animate-fade-in">
            {/* Tarjeta 1: Daily Safety Briefing */}
            <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100 flex flex-col justify-between space-y-3">
              <div className="flex items-start justify-between gap-1">
                <div className="w-10 h-10 rounded-2xl bg-[#FCEEE6] text-[#8B4513] flex items-center justify-center shrink-0">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-[#FEF3C7] text-[#92400E] rounded-full">
                  Safety First
                </span>
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 leading-snug">
                  Daily Safety Briefing
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Start daily toolbox meeting & capture crew signatures.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsToolboxOpen(true)}
                className="w-full py-2.5 px-3 bg-[#8B3A0E] hover:bg-[#722f0b] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <span>Open Toolbox</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tarjeta 2: Manage Job Projects */}
            <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100 flex flex-col justify-between space-y-3">
              <div className="flex items-start justify-between gap-1">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-600 rounded-full">
                  Operations
                </span>
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 leading-snug">
                  Manage Job Projects
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Create active sites and manage ongoing project locations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProjectsModal(true)}
                className="w-full py-2.5 px-3 bg-[#8B3A0E] hover:bg-[#722f0b] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <span>Open Projects</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* TARJETA PRINCIPAL: REGISTRO DIARIO */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100 space-y-5">
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-[#8B4513]" />
            <h2 className="text-lg font-extrabold text-slate-900">Daily Log</h2>
          </div>

          {hasLoggedToday ? (
            <div className="p-5 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-emerald-900 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-extrabold">Shift logged for today</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  You have already submitted your daily hours ({todayLoggedHours} hrs).
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Píldora Conmutador: 1° Custom Address (Por defecto) | 2° Active Project */}
              <div className="grid grid-cols-2 p-1.5 bg-[#EEF2F6] rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setLocationType('address');
                    setSelectedProjectId('');
                    setMainLocation('');
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    locationType === 'address'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Navigation className={`w-4 h-4 ${locationType === 'address' ? 'text-[#8B4513]' : 'text-slate-400'}`} />
                  <span>Custom Address</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLocationType('project');
                    setSelectedProjectId(''); // Inicia en blanco al hacer clic
                    setMainLocation('');     // Inicia sin dirección prellenada
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    locationType === 'project'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MapPin className={`w-4 h-4 ${locationType === 'project' ? 'text-[#8B4513]' : 'text-slate-400'}`} />
                  <span>Active Project ({projectsList.length})</span>
                </button>
              </div>

              {/* Ubicación / Frente de Trabajo */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-500">
                  Location / Job Site
                </label>

                {locationType === 'address' ? (
                  <LocationInput
                    value={mainLocation}
                    onChange={(val) => setMainLocation(val)}
                    placeholder="Search job site address..."
                    className="w-full p-3.5 border border-slate-200 rounded-2xl text-sm bg-[#F4F6F9] focus:bg-white focus:ring-2 focus:ring-[#8B4513] outline-none font-semibold"
                    required
                  />
                ) : (
                  <div className="space-y-2">
                    {/* Contenedor completo interactivo para el select (cubre 100% del área) */}
                    <div className="relative bg-[#F4F6F9] hover:bg-[#edf1f5] transition-colors rounded-2xl p-3.5 border border-slate-200/80 flex items-center gap-3 cursor-pointer">
                      <MapPin className="w-5 h-5 text-[#8B4513] shrink-0 pointer-events-none" />
                      
                      <div className="flex-1 min-w-0 pointer-events-none">
                        <p className="text-xs font-extrabold text-slate-900 truncate">
                          {selectedProjectId 
                            ? projectsList.find((p) => p.id === selectedProjectId)?.name 
                            : 'Select an Active Project'}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {mainLocation || 'Click here to choose from list'}
                        </p>
                      </div>

                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 pointer-events-none" />

                      {/* El <select> invisible pero cubriendo 100% del cuadro para garantizar clic en cualquier parte */}
                      <select
                        value={selectedProjectId}
                        onChange={(e) => {
                          const projId = e.target.value;
                          setSelectedProjectId(projId);
                          const found = projectsList.find((p) => p.id === projId);
                          setMainLocation(found ? found.address : '');
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        required
                      >
                        <option value="">-- Select an Active Project --</option>
                        {projectsList.map((proj) => (
                          <option key={proj.id} value={proj.id}>
                            {proj.name} — {proj.address}
                          </option>
                        ))}
                      </select>
                    </div>

                    {projectsList.length === 0 && (
                      <p className="text-xs text-amber-700 font-semibold">
                        ⚠️ No active projects found. Please switch to "Custom Address".
                      </p>
                    )}
                  </div>
                )}

                {/* Sitios adicionales */}
                {extraLocations.map((extraLoc, index) => (
                  <div key={index} className="flex gap-2 items-center pt-1">
                    <LocationInput
                      value={extraLoc}
                      onChange={(val) => handleExtraLocationChange(index, val)}
                      placeholder={`Additional job site ${index + 2}`}
                      wrapperClassName="flex-1"
                      className="p-3 border border-slate-200 bg-[#F4F6F9] rounded-2xl text-sm outline-none focus:border-[#8B4513]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveExtraLocation(index)}
                      className="p-3 bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-2xl transition-colors cursor-pointer"
                      title="Remove site"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {extraLocations.length < 2 && (
                  <button
                    type="button"
                    onClick={handleAddLocation}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#F8F9FB] hover:bg-slate-100 border border-slate-200/70 text-xs font-extrabold text-[#8B4513] transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add another job site</span>
                  </button>
                )}
              </div>

              {/* Control de Asistencia: CHECK IN, CHECK OUT y TOTAL HOURS WORKED */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-500">
                  Attendance & Schedule
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {/* Tarjeta CHECK IN */}
                  <label className="bg-[#F4F6F9] rounded-2xl p-3.5 border border-slate-200/60 flex flex-col justify-center cursor-pointer focus-within:ring-2 focus-within:ring-[#8B4513] transition-all">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Check In
                    </span>
                    <input
                      type="time"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="mt-1 bg-transparent text-lg font-extrabold text-slate-900 outline-none w-full cursor-pointer"
                      required
                    />
                  </label>

                  {/* Tarjeta CHECK OUT */}
                  <label className="bg-[#F4F6F9] rounded-2xl p-3.5 border border-slate-200/60 flex flex-col justify-center cursor-pointer focus-within:ring-2 focus-within:ring-[#8B4513] transition-all">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Check Out
                    </span>
                    <input
                      type="time"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="mt-1 bg-transparent text-lg font-extrabold text-slate-900 outline-none w-full cursor-pointer"
                      required
                    />
                  </label>
                </div>

                {/* Banner Total Hours Worked (Ingreso Manual) */}
                <div className="bg-[#F4F6F9] rounded-2xl p-4 border border-slate-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white text-[#8B4513] flex items-center justify-center shadow-2xs">
                      <Calculator className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">Total Hours Worked</p>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      value={totalHours}
                      onChange={handleTotalHoursChange}
                      placeholder="0.0"
                      className="w-20 text-right bg-transparent text-2xl font-black text-[#8B4513] outline-none border-b-2 border-dashed border-[#8B4513]/40 focus:border-[#8B4513] pb-0.5"
                      required
                    />
                    <span className="text-xs font-extrabold text-slate-700">hrs</span>
                  </div>
                </div>
              </div>

              {/* Notas opcionales */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  Field Notes (Optional)
                </label>
                <input
                  type="text"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Tasks performed, delays, comments..."
                  className="w-full p-3.5 border border-slate-200/80 rounded-2xl text-sm bg-[#F4F6F9] focus:bg-white focus:ring-2 focus:ring-[#8B4513] outline-none"
                />
              </div>

              {/* Evidencias Fotográficas (Team Lead) */}
              {role === 'teamlead' && (
                <div className="pt-2 border-t border-slate-100">
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
                className="w-full py-4 bg-[#8B3A0E] hover:bg-[#722f0b] text-white rounded-2xl font-extrabold text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Submitting Shift...' : 'Submit Daily Log'}
              </button>
            </form>
          )}
        </div>

        {/* RESUMEN DE NÓMINA Y CALENDARIO */}
        <div className="bg-white rounded-3xl shadow-xs border border-slate-100 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Pay Period Summary</h3>
              <p className="text-xs text-[#8B4513] font-bold mt-0.5 flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>{formatPeriodLegend(periodRange.start, periodRange.end)}</span>
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevPeriod}
                className="w-8 h-8 flex items-center justify-center bg-[#F4F6F9] text-slate-700 hover:bg-[#FCEEE6] hover:text-[#8B4513] rounded-xl border border-slate-200/60 transition-colors cursor-pointer"
                title="Previous Pay Period"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleCurrentPeriod}
                className="px-3 h-8 flex items-center justify-center text-xs font-extrabold text-[#8B4513] bg-[#FCEEE6] hover:bg-[#f7decb] rounded-xl transition-colors cursor-pointer"
              >
                Current
              </button>
              <button
                type="button"
                onClick={handleNextPeriod}
                className="w-8 h-8 flex items-center justify-center bg-[#F4F6F9] text-slate-700 hover:bg-[#FCEEE6] hover:text-[#8B4513] rounded-xl border border-slate-200/60 transition-colors cursor-pointer"
                title="Next Pay Period"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-[#F4F6F9] rounded-2xl">
            <div>
              <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                Total Accumulated
              </span>
              <p className="text-2xl font-black text-slate-900 mt-0.5">
                {periodTotalHours} <span className="text-sm font-bold text-slate-500">hrs</span>
              </p>
              <p className="text-xs text-slate-500 font-medium">
                {periodLogs.length} shifts in this period
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="px-3.5 py-2.5 text-xs font-extrabold bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>{showDetails ? 'Hide' : 'Calendar'}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  showDetails ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>

          {showDetails && (
            <div className="pt-3 border-t border-slate-100 space-y-5 animate-fade-in">
              {/* Calculadora de Pago con el nuevo estilo UI */}
              <div className="bg-[#F4F6F9] p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white text-[#8B4513] flex items-center justify-center shadow-2xs shrink-0 font-black text-base">
                    $
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Hourly Rate Calculator
                    </label>
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={hourlyWage}
                        onChange={(e) => {
                          const val = e.target.value.replace(',', '.');
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setHourlyWage(val);
                          }
                        }}
                        placeholder="25.00"
                        className="w-20 px-2.5 py-1 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:border-[#8B4513] focus:ring-2 focus:ring-[#8B4513]/20 font-extrabold text-slate-900 transition-all"
                      />
                      <span className="text-xs font-bold text-slate-400">/ hr</span>
                    </div>
                  </div>
                </div>

                {estimatedPay ? (
                  <div className="text-right bg-white px-3.5 py-2 rounded-xl border border-slate-200/60 shadow-2xs">
                    <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider block">
                      Estimated Gross
                    </span>
                    <span className="text-lg font-black text-[#8B4513]">
                      ${estimatedPay}
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-400 bg-white/70 px-3 py-1.5 rounded-xl border border-slate-200/50">
                    Enter rate to estimate
                  </span>
                )}
              </div>

              <div>
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

      {/* Modal Flotante de Toolbox Meeting */}
      <ToolboxMeetingModal
        isOpen={isToolboxOpen}
        onClose={() => setIsToolboxOpen(false)}
        currentUser={user}
        userCompanyId={userCompanyId}
        showNotification={showNotification}
      />

      {/* Modal Flotante de Gestión de Proyectos (ProjectsManager) */}
      {showProjectsModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
          onClick={() => setShowProjectsModal(false)}
        >
          <div 
            className="bg-[#F4F6F9] w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Modal */}
            <div className="bg-white px-5 py-4 border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FCEEE6] text-[#8B4513] flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Manage Job Projects</h3>
                  <p className="text-[11px] text-slate-400">Create active sites & view project details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProjectsModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido con Scroll Interno */}
            <div className="p-4 sm:p-6 overflow-y-auto">
              <ProjectsManager
                companyId={userCompanyId}
                currentUser={user}
                showNotification={showNotification}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;