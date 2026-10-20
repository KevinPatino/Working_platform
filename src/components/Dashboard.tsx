import React, { useState, useEffect } from 'react';
import { auth, db, storage } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  setDoc, 
  doc, 
  Timestamp, 
  getDoc,
  updateDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from '../utils/imageCompressor';
import { 
  ClipboardCheck, 
  Building2, 
  Timer, 
  MapPin, 
  Navigation, 
  Plus, 
  Calculator, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  X,
  Clock,
  ShieldCheck,
  CheckSquare,
  Camera,
  Filter,
  ArrowRight
} from 'lucide-react';

import Header from './Header';
import Toast from './Toast';
import Calendar from './Calendar';
import PhotoEvidenceUploader from './PhotoEvidence';
import LocationInput from './LocationInput';
import ToolboxAuditor from './ToolBoxAuditor';
import ToolboxMeetingModal from './ToolBoxMeetingModal';
import ProjectsManager, { type Project } from './ProjectsManager';
import ProjectDetailView from './ProjectDetailView';
import PhotoModal from './PhotoModal';

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
  const [activeTab, setActiveTab] = useState<'hours' | 'safety' | 'projects' | 'mytasks'>('hours');

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

  // Tareas asignadas al trabajador y filtros
  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pending');

  // Estados para completar tarea con foto de evidencia desde el panel del trabajador
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [completionNote, setCompletionNote] = useState('');
  const [completionPhoto, setCompletionPhoto] = useState('');
  const [uploadingCompletion, setUploadingCompletion] = useState(false);

  // Visor PhotoModal con soporte dinámico
  const [modalPhotos, setModalPhotos] = useState<string[] | null>(null);
  const [modalTitles, setModalTitles] = useState<string[] | null>(null);
  const [modalTitleFallback, setModalTitleFallback] = useState<string>('Evidence');
  const [modalInitialIndex, setModalInitialIndex] = useState<number>(0);

  const openPhotoViewer = (photosArray: string[], titlesArray?: string[], fallbackTitle = 'Evidence', startIndex = 0) => {
    setModalPhotos(photosArray);
    setModalTitles(titlesArray || null);
    setModalTitleFallback(fallbackTitle);
    setModalInitialIndex(startIndex);
  };

  const [isToolboxOpen, setIsToolboxOpen] = useState(false);
  const [activeFullProject, setActiveFullProject] = useState<Project | null>(null);

  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [locationType, setLocationType] = useState<'address' | 'project'>('address');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const [activeCycleIndex, setActiveCycleIndex] = useState<number>(getBaseCycleIndex());
  const [periodRange, setPeriodRange] = useState(getPeriodRangeByIndex(getBaseCycleIndex()));

  const [showDetails, setShowDetails] = useState(false);
  const [hourlyWage, setHourlyWage] = useState<string>('');

  const handleLogout = async () => {
    await signOut(auth);
  };

  const showNotification = (msg: string) => {
    setToastMessage(msg);
  };

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

  const fetchCompanyData = async () => {
    if (!userCompanyId) return;
    try {
      const projQuery = query(
        collection(db, 'projects'),
        where('companyId', '==', userCompanyId)
      );
      const projSnap = await getDocs(projQuery);
      const projectsMap: { [key: string]: string } = {};
      const activeProjectsList: any[] = [];

      projSnap.docs.forEach((d) => {
        const data = d.data();
        projectsMap[d.id] = data.name || 'Project';
        if (data.status === 'active') {
          activeProjectsList.push({ id: d.id, ...data });
        }
      });
      setProjectsList(activeProjectsList);

      const userTasks: any[] = [];
      projSnap.docs.forEach((docSnap) => {
        const projData = docSnap.data();
        const projId = docSnap.id;
        const realProjectName = projectsMap[projId] || 'Project';

        if (projData.units && Array.isArray(projData.units)) {
          projData.units.forEach((unit: any) => {
            if (unit.tasks && Array.isArray(unit.tasks)) {
              unit.tasks.forEach((task: any) => {
                if (task.assignedToIds && task.assignedToIds.includes(user.uid)) {
                  userTasks.push({
                    ...task,
                    projectId: projId,
                    projectName: realProjectName,
                    unitId: unit.id,
                    unitName: unit.name,
                  });
                }
              });
            }
          });
        }
      });

      setAssignedTasks(userTasks);
    } catch (err) {
      console.error('Error fetching company projects/tasks:', err);
    }
  };

  useEffect(() => {
    if (userCompanyId) {
      fetchCompanyData();
    }
  }, [userCompanyId, activeFullProject]);

  const handleUploadWorkerCompletionPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCompletion(true);
    try {
      const compressedBlob = await compressImage(file, 1200, 0.75);
      const fileName = `worker_done_${user.uid}_${Date.now()}.jpg`;
      
      // Usamos una ruta general de subidas para trabajadores
      const storageRef = ref(storage, `evidences/worker_submissions/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, compressedBlob, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(snapshot.ref);
      setCompletionPhoto(url);
      showNotification('Photo attached successfully!');
    } catch (err: any) {
      showNotification('Error uploading completion photo: ' + err.message);
    } finally {
      setUploadingCompletion(false);
      e.target.value = '';
    }
  };

  const handleWorkerCompleteTask = async (task: any) => {
    try {
      const projRef = doc(db, 'projects', task.projectId);
      const projSnap = await getDoc(projRef);
      if (!projSnap.exists()) return;

      const projData = projSnap.data();
      const updatedUnits = (projData.units || []).map((u: any) => {
        if (u.id !== task.unitId) return u;
        return {
          ...u,
          tasks: (u.tasks || []).map((t: any) =>
            t.id === task.id
              ? {
                  ...t,
                  status: 'completed',
                  // Evitamos valores undefined para prevenir errores en updateDoc de Firestore
                  completionPhotoUrl: completionPhoto ? completionPhoto : null,
                  completionNote: completionNote ? completionNote.trim() : '',
                  completedBy: userName || user.email,
                  completedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                }
              : t
          ),
        };
      });

      await updateDoc(projRef, { units: updatedUnits });
      showNotification('Task completed successfully!');
      setCompletingTaskId(null);
      setCompletionPhoto('');
      setCompletionNote('');
      await fetchCompanyData();
    } catch (err: any) {
      showNotification('Error completing task: ' + err.message);
    }
  };

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

  const pendingAssignedTasksCount = assignedTasks.filter((t) => t.status !== 'completed').length;

  // Filtrado de tareas del trabajador
  const filteredTasks = assignedTasks.filter((task) => {
    const matchProj = filterProject === 'all' || task.projectId === filterProject;
    const matchStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'pending' && task.status !== 'completed') || 
      (filterStatus === 'completed' && task.status === 'completed');
    return matchProj && matchStatus;
  });

  // Lista única de proyectos generales del trabajador
  const workerProjects = Array.from(new Set(assignedTasks.map(t => t.projectId)))
    .map(id => {
      const found = assignedTasks.find(t => t.projectId === id);
      return { id, name: found ? found.projectName : 'Project' };
    });

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-900 pb-12">
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      <Header 
        userName={userName} 
        role={role} 
        onLogout={handleLogout} 
      />

      <div className={"max-w-5xl mx-auto px-4 pt-6 space-y-5"}>

        {activeFullProject ? (
          <div className="animate-fade-in">
            <ProjectDetailView
              project={activeFullProject}
              companyId={userCompanyId}
              currentUser={user}
              onBack={() => setActiveFullProject(null)}
              showNotification={showNotification}
            />
          </div>
        ) : (
          <>
            {role === 'teamlead' && (
              <div className="grid grid-cols-2 gap-3.5 animate-fade-in mb-2">
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
                    onClick={() => setActiveTab('projects')}
                    className="w-full py-2.5 px-3 bg-[#8B3A0E] hover:bg-[#722f0b] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <span>Open Projects</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {role === 'teamlead' ? (
              <div className="grid grid-cols-3 p-1.5 bg-[#EEF2F6] rounded-2xl gap-1 animate-fade-in">
                <button
                  type="button"
                  onClick={() => setActiveTab('hours')}
                  className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'hours'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Clock className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'hours' ? 'text-[#8B4513]' : 'text-slate-400'}`} />
                  <span className="truncate">Daily Log</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('safety')}
                  className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'safety'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'safety' ? 'text-[#8B4513]' : 'text-slate-400'}`} />
                  <span className="truncate">Safety Briefings</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('projects')}
                  className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'projects'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Building2 className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'projects' ? 'text-[#8B4513]' : 'text-slate-400'}`} />
                  <span className="truncate">Projects</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 p-1.5 bg-[#EEF2F6] rounded-2xl gap-1 animate-fade-in">
                <button
                  type="button"
                  onClick={() => setActiveTab('hours')}
                  className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'hours'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Clock className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'hours' ? 'text-[#8B4513]' : 'text-slate-400'}`} />
                  <span className="truncate">Daily Time Log</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('mytasks')}
                  className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
                    activeTab === 'mytasks'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <CheckSquare className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'mytasks' ? 'text-[#8B4513]' : 'text-slate-400'}`} />
                  <span className="truncate">My Assigned Tasks</span>
                  {pendingAssignedTasksCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-[#8B3A0E] text-white rounded-full text-[9px] font-black">
                      {pendingAssignedTasksCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            {activeTab === 'hours' && (
              <div className="space-y-4 animate-fade-in">
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
                            setSelectedProjectId('');
                            setMainLocation('');
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

                      <div className="space-y-2.5">
                        <label className="block text-xs font-bold text-slate-500">
                          Attendance & Schedule
                        </label>

                        <div className="grid grid-cols-2 gap-3">
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
            )}

            {/* PESTAÑA: MY ASSIGNED TASKS */}
            {role !== 'teamlead' && activeTab === 'mytasks' && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[#8B4513]" />
                    <span className="text-xs font-extrabold text-slate-700">Filter Tasks:</span>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    <select
                      value={filterProject}
                      onChange={(e) => setFilterProject(e.target.value)}
                      className="px-3 py-2 bg-[#F4F6F9] border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#8B4513] cursor-pointer"
                    >
                      <option value="all">All Projects</option>
                      {workerProjects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>

                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-3 py-2 bg-[#F4F6F9] border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#8B4513] cursor-pointer"
                    >
                      <option value="pending">Pending Only</option>
                      <option value="completed">Completed Only</option>
                      <option value="all">All Status</option>
                    </select>
                  </div>
                </div>

                {filteredTasks.length === 0 ? (
                  <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-2">
                    <CheckSquare className="w-8 h-8 text-slate-300 mx-auto" />
                    <h4 className="text-sm font-extrabold text-slate-700">No matching tasks found</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Try changing your filters above or check back when new assignments are made.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTasks.map((task) => {
                      const isDone = task.status === 'completed';
                      const isCompletingThis = completingTaskId === task.id;

                      return (
                        <div
                          key={task.id}
                          className={`p-5 rounded-3xl border transition-all space-y-3 ${
                            isDone
                              ? 'bg-emerald-50/40 border-emerald-200/80'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-0.5 bg-[#FCEEE6] text-[#8B4513] rounded-full text-[10px] font-extrabold">
                                  🏢 {task.projectName} • {task.unitName}
                                </span>
                                {isDone ? (
                                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold">
                                    ✓ Completed
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-extrabold">
                                    Pending
                                  </span>
                                )}
                              </div>
                              <h4 className={`text-sm font-extrabold ${isDone ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                                {task.title}
                              </h4>
                            </div>
                          </div>

                          {(task.referencePhotoUrl || task.completionPhotoUrl) && (
                            <div className="flex gap-4 pt-1">
                              {task.referencePhotoUrl && (
                                <div
                                  onClick={() =>
                                    openPhotoViewer(
                                      [task.referencePhotoUrl!],
                                      [`${task.projectName} • Before: ${task.title}`],
                                      'Reference Photo',
                                      0
                                    )
                                  }
                                  className="cursor-pointer group"
                                >
                                  <span className="text-[9px] font-extrabold uppercase text-amber-700 block mb-0.5">
                                    Before / Ref:
                                  </span>
                                  <img
                                    src={task.referencePhotoUrl}
                                    alt="Reference"
                                    className="w-20 h-20 object-cover rounded-xl border border-amber-200 group-hover:opacity-90 transition-opacity shadow-2xs"
                                  />
                                </div>
                              )}
                              {task.completionPhotoUrl && (
                                <div
                                  onClick={() =>
                                    openPhotoViewer(
                                      [task.completionPhotoUrl!],
                                      [`${task.projectName} • Completed: ${task.title}`],
                                      'Completed Photo',
                                      0
                                    )
                                  }
                                  className="cursor-pointer group"
                                >
                                  <span className="text-[9px] font-extrabold uppercase text-emerald-700 block mb-0.5">
                                    After (Done):
                                  </span>
                                  <img
                                    src={task.completionPhotoUrl}
                                    alt="Completed"
                                    className="w-20 h-20 object-cover rounded-xl border border-emerald-300 group-hover:opacity-90 transition-opacity shadow-2xs"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {isDone && task.completionNote && (
                            <p className="text-xs text-emerald-800 italic bg-emerald-50/60 p-2.5 rounded-xl">
                              "{task.completionNote}"
                            </p>
                          )}

                          {!isDone && !isCompletingThis && (
                            <button
                              type="button"
                              onClick={() => setCompletingTaskId(task.id)}
                              className="w-full py-2.5 bg-[#8B3A0E] hover:bg-[#722f0b] text-white rounded-xl text-xs font-extrabold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Mark as Completed & Add Evidence</span>
                            </button>
                          )}

                          {isCompletingThis && (
                            <div className="p-4 bg-[#F4F6F9] rounded-2xl border border-slate-200 space-y-3 animate-fade-in">
                              <p className="text-xs font-extrabold text-slate-800">
                                Complete Task & Upload Work Evidence
                              </p>
                              <input
                                type="text"
                                value={completionNote}
                                onChange={(e) => setCompletionNote(e.target.value)}
                                placeholder="Add completion notes (e.g. Painted and sealed)..."
                                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none"
                              />
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-[#8B4513] rounded-xl text-xs font-bold text-[#8B4513] cursor-pointer transition-colors">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleUploadWorkerCompletionPhoto(e)}
                                    disabled={uploadingCompletion}
                                    className="hidden"
                                  />
                                  <Camera className="w-4 h-4" />
                                  <span>
                                    {uploadingCompletion
                                      ? 'Compressing...'
                                      : completionPhoto
                                      ? 'Photo Attached ✓'
                                      : '+ Attach Finished Photo'}
                                  </span>
                                </label>

                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setCompletingTaskId(null)}
                                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleWorkerCompleteTask(task)}
                                    disabled={uploadingCompletion}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold cursor-pointer shadow-xs"
                                  >
                                    Confirm & Submit
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {role === 'teamlead' && activeTab === 'safety' && (
              <div className="animate-fade-in space-y-4">
                <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Safety Briefings & Toolbox Talks</h3>
                    <p className="text-xs text-slate-400">Review company safety records and capture crew meetings</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsToolboxOpen(true)}
                    className="px-4 py-2.5 bg-[#8B3A0E] hover:bg-[#722f0b] text-white rounded-2xl text-xs font-extrabold transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    <span>+ New Toolbox Talk</span>
                  </button>
                </div>
                <ToolboxAuditor companyId={userCompanyId} />
              </div>
            )}

            {role === 'teamlead' && activeTab === 'projects' && (
              <div className="animate-fade-in">
                <ProjectsManager
                  companyId={userCompanyId}
                  currentUser={user}
                  showNotification={showNotification}
                  onOpenProject={(proj) => setActiveFullProject(proj)}
                />
              </div>
            )}
          </>
        )}

      </div>

      <PhotoModal
        isOpen={modalPhotos !== null}
        onClose={() => setModalPhotos(null)}
        photos={modalPhotos || []}
        titles={modalTitles || undefined}
        title={modalTitleFallback}
        initialIndex={modalInitialIndex}
      />

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