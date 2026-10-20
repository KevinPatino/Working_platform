import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebaseConfig';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from '../utils/imageCompressor';
import { 
  ArrowLeft, 
  MapPin, 
  ClipboardCheck, 
  Clock, 
  ShieldCheck, 
  Camera, 
  Save, 
  Calendar as CalendarIcon, 
  PenTool, 
  Plus,
  FileText,
  Layers,
  FolderOpen,
  CheckCircle2,
  Circle,
  Trash2,
  UserCheck,
  Loader2,
  X,
  Tag,
  Maximize2
} from 'lucide-react';
import type { Project, ProjectUnit, UnitPhoto, UnitTask } from './ProjectsManager';
import PhotoEvidenceUploader from './PhotoEvidence';
import ToolboxMeetingModal from './ToolBoxMeetingModal';
import PhotoModal from './PhotoModal';

interface ProjectDetailViewProps {
  project: Project;
  companyId: string | null;
  currentUser: any;
  onBack: () => void;
  showNotification: (msg: string) => void;
}

const QUICK_AREA_TAGS = ['Living Room', 'Kitchen', 'Master Bedroom', 'Bathroom', 'Hallway', 'Balcony'];

const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  companyId,
  currentUser,
  onBack,
  showNotification,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'units' | 'overview' | 'toolbox' | 'hours'>('units');
  const [projectLogs, setProjectLogs] = useState<any[]>([]);
  const [projectMeetings, setProjectMeetings] = useState<any[]>([]);
  const [companyWorkers, setCompanyWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado para ver el álbum completo de la unidad en modo extendido
  const [showFullAlbumModal, setShowFullAlbumModal] = useState(false);

  // Estados del visor PhotoModal (Soporte para fotos, títulos dinámicos e índice inicial)
  const [modalPhotos, setModalPhotos] = useState<string[] | null>(null);
  const [modalTitles, setModalTitles] = useState<string[] | null>(null);
  const [modalTitleFallback, setModalTitleFallback] = useState<string>('Site Evidence');
  const [modalInitialIndex, setModalInitialIndex] = useState<number>(0); // <-- NUEVO: Controla el índice exacto de la foto clickeada

  // Unidades / Sub-carpetas del proyecto
  const [units, setUnits] = useState<ProjectUnit[]>(project.units || []);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [newUnitName, setNewUnitName] = useState('');
  const [savingUnits, setSavingUnits] = useState(false);

  // Estados dentro de una Unidad seleccionada (Fotos con nota)
  const [photoNoteInput, setPhotoNoteInput] = useState('');
  const [uploadingUnitPhoto, setUploadingUnitPhoto] = useState(false);

  // Estados dentro de una Unidad seleccionada (Nueva Tarea / Punch List)
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [newTaskRefPhoto, setNewTaskRefPhoto] = useState<string>('');
  const [uploadingTaskRef, setUploadingTaskRef] = useState(false);

  // Estado para completar una tarea con foto de evidencia ("Después")
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [completionNote, setCompletionNote] = useState('');
  const [completionPhoto, setCompletionPhoto] = useState('');
  const [uploadingCompletionPhoto, setUploadingCompletionPhoto] = useState(false);

  // Evidencias y notas generales del proyecto
  const [projectPhotos, setProjectPhotos] = useState<string[]>(project.photos || []);
  const [projectNotes, setProjectNotes] = useState<string>(project.notes || '');
  const [savingDetails, setSavingDetails] = useState(false);

  const [isToolboxOpen, setIsToolboxOpen] = useState(false);

  const activeUnit = units.find((u) => u.id === selectedUnitId) || null;

  // Función flexible para abrir el visor con índice inicial
  const openPhotoViewer = (photosArray: string[], titlesArray?: string[], fallbackTitle = 'Site Evidence', startIndex = 0) => {
    setModalPhotos(photosArray);
    setModalTitles(titlesArray || null);
    setModalTitleFallback(fallbackTitle);
    setModalInitialIndex(startIndex); // <-- Asigna el índice de la foto seleccionada
  };

  const fetchProjectData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const logsQ = query(
        collection(db, 'timeLogs'),
        where('companyId', '==', companyId),
        where('projectId', '==', project.id)
      );
      const logsSnap = await getDocs(logsQ);
      setProjectLogs(logsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const meetingsQ = query(
        collection(db, 'toolboxMeetings'),
        where('companyId', '==', companyId),
        where('projectId', '==', project.id)
      );
      const meetingsSnap = await getDocs(meetingsQ);
      setProjectMeetings(meetingsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const usersQ = query(
        collection(db, 'users'),
        where('companyId', '==', companyId)
      );
      const usersSnap = await getDocs(usersQ);
      
      const workersList = usersSnap.docs
        .map((d) => ({
          id: d.id,
          fullName: d.data().fullName || d.data().email,
          email: d.data().email,
          role: d.data().role || 'worker',
        }))
        .filter((w) => w.role !== 'admin');

      workersList.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setCompanyWorkers(workersList);
    } catch (err: any) {
      console.error('Error loading project details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [project.id, companyId]);

  const persistUnitsToFirestore = async (updatedUnits: ProjectUnit[], successMsg?: string) => {
    setSavingUnits(true);
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        units: updatedUnits,
      });
      setUnits(updatedUnits);
      if (successMsg) showNotification(successMsg);
    } catch (err: any) {
      showNotification('Error saving unit changes: ' + err.message);
    } finally {
      setSavingUnits(false);
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newUnitName.trim();
    if (!cleanName) return;

    const newUnit: ProjectUnit = {
      id: `unit_${Date.now()}`,
      name: cleanName,
      notes: '',
      photos: [],
      tasks: [],
    };

    const updated = [...units, newUnit];
    setNewUnitName('');
    await persistUnitsToFirestore(updated, `Unit "${cleanName}" created!`);
  };

  const handleDeleteUnit = async (unitId: string, unitName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${unitName}" and its contents?`)) return;
    const updated = units.filter((u) => u.id !== unitId);
    if (selectedUnitId === unitId) setSelectedUnitId(null);
    await persistUnitsToFirestore(updated, `Unit "${unitName}" removed.`);
  };

  const handleUploadUnitPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeUnit) return;

    setUploadingUnitPhoto(true);
    const noteText = photoNoteInput.trim() || 'General Unit Photo';
    const newUploadedPhotos: UnitPhoto[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedBlob = await compressImage(file, 1200, 0.75);
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const storageRef = ref(storage, `evidences/project_${project.id}/${activeUnit.id}/${fileName}`);

        const snapshot = await uploadBytes(storageRef, compressedBlob, { contentType: 'image/jpeg' });
        const downloadUrl = await getDownloadURL(snapshot.ref);

        newUploadedPhotos.push({
          id: `photo_${Date.now()}_${i}`,
          url: downloadUrl,
          note: noteText,
          uploadedBy: currentUser.email || 'Team',
          uploadedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        });
      }

      const updatedUnits = units.map((u) =>
        u.id === activeUnit.id ? { ...u, photos: [...(u.photos || []), ...newUploadedPhotos] } : u
      );
      await persistUnitsToFirestore(updatedUnits, 'Photos compressed & added to unit!');
      setPhotoNoteInput('');
    } catch (err: any) {
      showNotification('Error uploading unit photo: ' + err.message);
    } finally {
      setUploadingUnitPhoto(false);
      e.target.value = '';
    }
  };

  const handleRemoveUnitPhoto = async (photoId: string) => {
    if (!activeUnit) return;
    const updatedUnits = units.map((u) =>
      u.id === activeUnit.id ? { ...u, photos: u.photos.filter((p) => p.id !== photoId) } : u
    );
    await persistUnitsToFirestore(updatedUnits, 'Photo removed.');
  };

  const handleUploadTaskRefPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUnit) return;

    setUploadingTaskRef(true);
    try {
      const compressedBlob = await compressImage(file, 1200, 0.75);
      const fileName = `task_ref_${Date.now()}.jpg`;
      const storageRef = ref(storage, `evidences/project_${project.id}/${activeUnit.id}/${fileName}`);
      const snapshot = await uploadBytes(storageRef, compressedBlob, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(snapshot.ref);
      setNewTaskRefPhoto(url);
    } catch (err: any) {
      showNotification('Error uploading reference photo: ' + err.message);
    } finally {
      setUploadingTaskRef(false);
      e.target.value = '';
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUnit || !newTaskTitle.trim()) return;

    const assignedWorkers = companyWorkers.filter((w) => selectedWorkerIds.includes(w.id));
    const newTask: UnitTask = {
      id: `task_${Date.now()}`,
      title: newTaskTitle.trim(),
      assignedToIds: assignedWorkers.map((w) => w.id),
      assignedToNames: assignedWorkers.map((w) => w.fullName),
      referencePhotoUrl: newTaskRefPhoto || undefined,
      status: 'pending',
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };

    const updatedUnits = units.map((u) =>
      u.id === activeUnit.id ? { ...u, tasks: [...(u.tasks || []), newTask] } : u
    );

    setNewTaskTitle('');
    setSelectedWorkerIds([]);
    setNewTaskRefPhoto('');
    await persistUnitsToFirestore(updatedUnits, 'Task added to punch list!');
  };

  const handleUploadCompletionPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUnit) return;

    setUploadingCompletionPhoto(true);
    try {
      const compressedBlob = await compressImage(file, 1200, 0.75);
      const fileName = `task_done_${Date.now()}.jpg`;
      const storageRef = ref(storage, `evidences/project_${project.id}/${activeUnit.id}/${fileName}`);
      const snapshot = await uploadBytes(storageRef, compressedBlob, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(snapshot.ref);
      setCompletionPhoto(url);
    } catch (err: any) {
      showNotification('Error uploading completion photo: ' + err.message);
    } finally {
      setUploadingCompletionPhoto(false);
      e.target.value = '';
    }
  };

  const handleConfirmCompleteTask = async (taskId: string) => {
    if (!activeUnit) return;

    const updatedUnits = units.map((u) => {
      if (u.id !== activeUnit.id) return u;
      return {
        ...u,
        tasks: u.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: 'completed' as const,
                completionPhotoUrl: completionPhoto || undefined,
                completionNote: completionNote.trim() || undefined,
                completedBy: currentUser.email,
                completedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              }
            : t
        ),
      };
    });

    setCompletingTaskId(null);
    setCompletionPhoto('');
    setCompletionNote('');
    await persistUnitsToFirestore(updatedUnits, 'Task marked as completed!');
  };

  const handleReopenTask = async (taskId: string) => {
    if (!activeUnit) return;
    const updatedUnits = units.map((u) =>
      u.id === activeUnit.id
        ? {
            ...u,
            tasks: u.tasks.map((t) => (t.id === taskId ? { ...t, status: 'pending' as const } : t)),
          }
        : u
    );
    await persistUnitsToFirestore(updatedUnits, 'Task reopened.');
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!activeUnit) return;
    const updatedUnits = units.map((u) =>
      u.id === activeUnit.id ? { ...u, tasks: u.tasks.filter((t) => t.id !== taskId) } : u
    );
    await persistUnitsToFirestore(updatedUnits, 'Task deleted.');
  };

  const toggleWorkerSelection = (workerId: string) => {
    setSelectedWorkerIds((prev) =>
      prev.includes(workerId) ? prev.filter((id) => id !== workerId) : [...prev, workerId]
    );
  };

  const handleSaveProjectEvidence = async () => {
    setSavingDetails(true);
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        photos: projectPhotos,
        notes: projectNotes.trim(),
      });
      showNotification('Project folder updated successfully!');
    } catch (err: any) {
      showNotification('Error saving project evidence: ' + err.message);
    } finally {
      setSavingDetails(false);
    }
  };

  const totalProjectHours = projectLogs.reduce(
    (sum, log) => sum + (Number(log.totalHours) || 0),
    0
  );
  const shiftPhotos = projectLogs.flatMap((log) => log.photos || []);
  const unitPhotosCount = units.reduce((sum, u) => sum + (u.photos?.length || 0), 0);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Cabecera del Expediente de Obra */}
      <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-2xl bg-[#F4F6F9] hover:bg-[#FCEEE6] text-slate-700 hover:text-[#8B4513] flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-slate-200/60"
            title="Back to Projects"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">
                {project.name}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  project.status === 'active'
                    ? 'bg-emerald-100/80 text-emerald-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {project.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-[#8B4513] shrink-0" />
              <span className="truncate">{project.address}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsToolboxOpen(true)}
          className="w-full sm:w-auto px-4 py-3 bg-[#8B3A0E] hover:bg-[#722f0b] text-white rounded-2xl text-xs font-extrabold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>+ New Toolbox Talk</span>
        </button>
      </div>

      {/* Tarjetas de Resumen Rápido del Proyecto */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 bg-white border border-slate-100 rounded-3xl shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#FCEEE6] text-[#8B4513] flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Units / Sub-Folders
            </span>
            <p className="text-xl font-black text-slate-900 mt-0.5">
              {units.length}
            </p>
            <p className="text-[11px] text-slate-400 font-medium">
              Active areas in building
            </p>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-100 rounded-3xl shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#FEF3C7] text-[#92400E] flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Total Project Hours
            </span>
            <p className="text-xl font-black text-slate-900 mt-0.5">
              {totalProjectHours} <span className="text-xs font-bold text-slate-400">hrs</span>
            </p>
            <p className="text-[11px] text-slate-400 font-medium">
              {projectLogs.length} daily logs
            </p>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-100 rounded-3xl shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Total Site Photos
            </span>
            <p className="text-xl font-black text-slate-900 mt-0.5">
              {projectPhotos.length + shiftPhotos.length + unitPhotosCount}
            </p>
            <p className="text-[11px] text-slate-400 font-medium">
              Across units & general folder
            </p>
          </div>
        </div>
      </div>

      {/* Sub-pestañas del Expediente (Estilo Píldora) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 p-1.5 bg-[#EEF2F6] rounded-2xl gap-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('units')}
          className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === 'units'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className={`w-3.5 h-3.5 shrink-0 ${activeSubTab === 'units' ? 'text-[#8B4513]' : 'text-slate-400'}`} />
          <span className="truncate">Units & Tasks ({units.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('overview')}
          className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === 'overview'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Camera className={`w-3.5 h-3.5 shrink-0 ${activeSubTab === 'overview' ? 'text-[#8B4513]' : 'text-slate-400'}`} />
          <span className="truncate">General Photos ({projectPhotos.length + shiftPhotos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('toolbox')}
          className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === 'toolbox'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${activeSubTab === 'toolbox' ? 'text-[#8B4513]' : 'text-slate-400'}`} />
          <span className="truncate">Toolbox ({projectMeetings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('hours')}
          className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === 'hours'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className={`w-3.5 h-3.5 shrink-0 ${activeSubTab === 'hours' ? 'text-[#8B4513]' : 'text-slate-400'}`} />
          <span className="truncate">Hours ({projectLogs.length})</span>
        </button>
      </div>

      {/* CONTENIDO DE SUB-PESTAÑA 1: UNIDADES / SUB-CARPETAS Y PUNCH LIST */}
      {activeSubTab === 'units' && (
        <div className="space-y-5">
          {!activeUnit ? (
            <>
              <form
                onSubmit={handleCreateUnit}
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-end"
              >
                <div className="flex-1">
                  <label className="block text-xs font-extrabold text-slate-500 mb-1.5">
                    Add New Unit / Apartment / Area Sub-Folder
                  </label>
                  <input
                    type="text"
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                    placeholder="e.g. Unit 101, Penthouse B, Floor 2 Corridor..."
                    className="w-full p-3.5 border border-slate-200 rounded-2xl text-xs sm:text-sm bg-[#F4F6F9] focus:bg-white focus:ring-2 focus:ring-[#8B4513] outline-none font-semibold text-slate-900"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingUnits}
                  className="px-5 py-3.5 bg-[#8B3A0E] hover:bg-[#722f0b] disabled:opacity-50 text-white rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Unit Folder</span>
                </button>
              </form>

              {units.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-2">
                  <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-extrabold text-slate-700">No units or sub-folders created yet</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Create folders for each apartment, unit, or floor above to organize room photos with notes and assign punch-list tasks to workers.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {units.map((u) => {
                    const totalTasks = u.tasks?.length || 0;
                    const completedTasks = u.tasks?.filter((t) => t.status === 'completed').length || 0;
                    const pendingTasks = totalTasks - completedTasks;

                    return (
                      <div
                        key={u.id}
                        onClick={() => setSelectedUnitId(u.id)}
                        className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs hover:border-[#8B4513]/40 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-4 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[#FCEEE6] text-[#8B4513] flex items-center justify-center shrink-0">
                              <FolderOpen className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-[#8B4513] transition-colors">
                                {u.name}
                              </h4>
                              <p className="text-[11px] text-slate-400 font-semibold">
                                {u.photos?.length || 0} photos • {totalTasks} tasks
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteUnit(u.id, u.name);
                            }}
                            className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            title="Delete Unit"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          {totalTasks === 0 ? (
                            <span className="text-slate-400 font-medium">No tasks assigned</span>
                          ) : pendingTasks === 0 ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-extrabold text-[11px]">
                              ✓ All {totalTasks} tasks completed
                            </span>
                          ) : (
                            <span className="text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-full font-extrabold text-[11px]">
                              {pendingTasks} pending / {completedTasks} done
                            </span>
                          )}

                          <span className="text-[#8B4513] font-extrabold text-xs">Open →</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* VISTA ADENTRO DE UNA UNIDAD ESPECÍFICA */
            <div className="space-y-5 animate-fade-in">
              <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedUnitId(null)}
                    className="px-3.5 py-2 rounded-xl bg-[#F4F6F9] hover:bg-[#FCEEE6] text-slate-700 hover:text-[#8B4513] text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>All Units</span>
                  </button>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8B4513] block">
                      Unit Sub-Folder
                    </span>
                    <h3 className="text-base font-black text-slate-900">{activeUnit.name}</h3>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* COLUMNA IZQUIERDA: PUNCH LIST / TAREAS ASIGNADAS */}
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-5 h-fit">
                  <div>
                    <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-[#FCEEE6] text-[#8B4513] rounded-full">
                      Punch List & Assignments
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-900 mt-1">
                      Tasks for {activeUnit.name}
                    </h4>
                  </div>

                  <form onSubmit={handleAddTask} className="space-y-3 bg-[#F4F6F9] p-4 rounded-2xl border border-slate-200/70">
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
                        New Task / Pending Detail
                      </label>
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="e.g. Touch up paint in bedroom wall, install baseboards..."
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#8B4513]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1.5">
                        Assign to Worker(s) (Optional)
                      </label>
                      {/* Lista de trabajadores con scroll automático si hay muchos y sin admins */}
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-white rounded-xl border border-slate-200/60">
                        {companyWorkers.length === 0 ? (
                          <p className="text-xs text-slate-400 p-2">No active workers found.</p>
                        ) : (
                          companyWorkers.map((w) => {
                            const isSelected = selectedWorkerIds.includes(w.id);
                            return (
                              <button
                                key={w.id}
                                type="button"
                                onClick={() => toggleWorkerSelection(w.id)}
                                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                                  isSelected
                                    ? 'bg-[#8B3A0E] text-white border-[#8B3A0E]'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-[#8B4513]'
                                }`}
                              >
                                <UserCheck className="w-3 h-3" />
                                <span>{w.fullName}</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-[#8B4513] rounded-xl text-xs font-bold text-slate-700 cursor-pointer transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadTaskRefPhoto}
                          disabled={uploadingTaskRef}
                          className="hidden"
                        />
                        {uploadingTaskRef ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8B4513]" />
                            <span>Compressing...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-3.5 h-3.5 text-[#8B4513]" />
                            <span>{newTaskRefPhoto ? 'Change Reference Photo' : '+ Attach "Before" Photo'}</span>
                          </>
                        )}
                      </label>

                      {newTaskRefPhoto && (
                        <div className="flex items-center gap-1.5">
                          <img
                            src={newTaskRefPhoto}
                            alt="Ref"
                            onClick={() => openPhotoViewer([newTaskRefPhoto], [activeUnit.name + ' • Reference Photo (Before)'], 'Reference Photo', 0)}
                            className="w-9 h-9 rounded-lg object-cover border cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={() => setNewTaskRefPhoto('')}
                            className="p-1 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={savingUnits || uploadingTaskRef}
                      className="w-full py-2.5 bg-[#8B3A0E] hover:bg-[#722f0b] disabled:opacity-50 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      + Add Task to Unit
                    </button>
                  </form>

                  {/* Lista de tareas de la unidad */}
                  <div className="space-y-2.5">
                    {(!activeUnit.tasks || activeUnit.tasks.length === 0) ? (
                      <p className="text-xs text-slate-400 text-center py-6">
                        No pending tasks for this unit yet.
                      </p>
                    ) : (
                      activeUnit.tasks.map((task) => {
                        const isDone = task.status === 'completed';
                        const isCompletingThis = completingTaskId === task.id;

                        return (
                          <div
                            key={task.id}
                            className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                              isDone
                                ? 'bg-emerald-50/40 border-emerald-200/80'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isDone) {
                                      handleReopenTask(task.id);
                                    } else {
                                      setCompletingTaskId(isCompletingThis ? null : task.id);
                                    }
                                  }}
                                  className="mt-0.5 text-[#8B4513] cursor-pointer"
                                >
                                  {isDone ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-slate-400 hover:text-[#8B4513]" />
                                  )}
                                </button>
                                <div>
                                  <p
                                    className={`text-xs font-extrabold ${
                                      isDone ? 'line-through text-slate-500' : 'text-slate-900'
                                    }`}
                                  >
                                    {task.title}
                                  </p>
                                  {task.assignedToNames && task.assignedToNames.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {task.assignedToNames.map((name, i) => (
                                        <span
                                          key={i}
                                          className="px-2 py-0.5 bg-[#FCEEE6] text-[#8B4513] rounded-full text-[10px] font-extrabold"
                                        >
                                          👷 {name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task.id)}
                                className="text-slate-300 hover:text-red-600 p-1"
                                title="Delete task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Fotos de Antes y Después */}
                            {(task.referencePhotoUrl || task.completionPhotoUrl) && (
                              <div className="flex gap-3 pt-1 pl-7">
                                {task.referencePhotoUrl && (
                                  <div
                                    onClick={() =>
                                      openPhotoViewer(
                                        [task.referencePhotoUrl!],
                                        [`${activeUnit.name} • Before: ${task.title}`],
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
                                      className="w-16 h-16 object-cover rounded-xl border border-amber-200 group-hover:opacity-90 transition-opacity"
                                    />
                                  </div>
                                )}
                                {task.completionPhotoUrl && (
                                  <div
                                    onClick={() =>
                                      openPhotoViewer(
                                        [task.completionPhotoUrl!],
                                        [`${activeUnit.name} • Completed: ${task.title}`],
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
                                      className="w-16 h-16 object-cover rounded-xl border border-emerald-300 group-hover:opacity-90 transition-opacity"
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {isDone && task.completionNote && (
                              <p className="text-[11px] text-emerald-800 italic pl-7">
                                Note: "{task.completionNote}"
                              </p>
                            )}

                            {isCompletingThis && !isDone && (
                              <div className="ml-7 p-3 bg-[#F4F6F9] rounded-xl border border-slate-200 space-y-2.5">
                                <p className="text-[11px] font-extrabold text-slate-700">
                                  Complete Task & Upload Evidence (Optional)
                                </p>
                                <input
                                  type="text"
                                  value={completionNote}
                                  onChange={(e) => setCompletionNote(e.target.value)}
                                  placeholder="Completion note (optional)..."
                                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                                />
                                <div className="flex items-center justify-between gap-2">
                                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-[#8B4513] cursor-pointer">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={handleUploadCompletionPhoto}
                                      disabled={uploadingCompletionPhoto}
                                      className="hidden"
                                    />
                                    <Camera className="w-3.5 h-3.5" />
                                    <span>
                                      {uploadingCompletionPhoto
                                        ? 'Compressing...'
                                        : completionPhoto
                                        ? 'Photo Attached ✓'
                                        : '+ Completion Photo'}
                                    </span>
                                  </label>

                                  <button
                                    type="button"
                                    onClick={() => handleConfirmCompleteTask(task.id)}
                                    disabled={uploadingCompletionPhoto}
                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold cursor-pointer"
                                  >
                                    Confirm Done
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* COLUMNA DERECHA: ÁLBUM DE FOTOS OPTIMIZADO (Vista previa + Botón Ver Todo) */}
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4 h-fit">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-[#FCEEE6] text-[#8B4513] rounded-full">
                        Unit Photo Album
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-900 mt-1">
                        Room Photos ({activeUnit.photos?.length || 0})
                      </h4>
                    </div>

                    {activeUnit.photos && activeUnit.photos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowFullAlbumModal(true)}
                        className="px-3 py-1.5 bg-[#FCEEE6] hover:bg-[#f7decb] text-[#8B4513] rounded-xl text-xs font-extrabold transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>View Full Album</span>
                      </button>
                    )}
                  </div>

                  <div className="bg-[#F4F6F9] p-4 rounded-2xl border border-slate-200/70 space-y-3">
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
                        1. Room / Photo Note (Applied to next upload)
                      </label>
                      <input
                        type="text"
                        value={photoNoteInput}
                        onChange={(e) => setPhotoNoteInput(e.target.value)}
                        placeholder="e.g. Living Room - Drywall ready, Master Bath..."
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#8B4513]"
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {QUICK_AREA_TAGS.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setPhotoNoteInput(tag)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-colors cursor-pointer ${
                              photoNoteInput === tag
                                ? 'bg-[#8B4513] text-white'
                                : 'bg-white text-slate-600 border border-slate-200 hover:border-[#8B4513]'
                            }`}
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
                        2. Select or Take Photo(s)
                      </label>
                      <label
                        className={`flex items-center justify-center gap-2 p-3.5 border-2 border-dashed rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                          uploadingUnitPhoto
                            ? 'border-slate-200 bg-slate-100 text-slate-400'
                            : 'border-[#8B4513]/40 bg-white hover:bg-[#FCEEE6]/50 text-[#8B4513]'
                        }`}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={uploadingUnitPhoto}
                          onChange={handleUploadUnitPhotos}
                          className="hidden"
                        />
                        {uploadingUnitPhoto ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Compressing & Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-4 h-4" />
                            <span>Take Photo or Choose from Gallery</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Vista Previa Compacta (Máx 4 fotos con el índice exacto `idx`) */}
                  {(!activeUnit.photos || activeUnit.photos.length === 0) ? (
                    <p className="text-xs text-slate-400 text-center py-6">
                      No photos uploaded for {activeUnit.name} yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-2">
                        {activeUnit.photos.slice(0, 4).map((item, idx) => (
                          <div
                            key={item.id}
                            onClick={() =>
                              openPhotoViewer(
                                activeUnit.photos.map((p) => p.url),
                                activeUnit.photos.map((p) => `${activeUnit.name} • ${p.note} (${p.uploadedAt})`),
                                `${activeUnit.name} • ${item.note}`,
                                idx // <-- AQUÍ PASAMOS EL ÍNDICE EXACTO DE LA FOTO CLICKEADA
                              )
                            }
                            className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer group"
                            title={`${item.note} (${item.uploadedAt})`}
                          >
                            <img
                              src={item.url}
                              alt={item.note}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              loading="lazy"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveUnitPhoto(item.id);
                              }}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/75 hover:bg-red-600 text-white flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}

                        {activeUnit.photos.length > 4 && (
                          <div
                            onClick={() => setShowFullAlbumModal(true)}
                            className="aspect-square rounded-xl bg-[#FCEEE6] border border-[#8B4513]/30 text-[#8B4513] flex flex-col items-center justify-center cursor-pointer hover:bg-[#f7decb] transition-colors"
                          >
                            <span className="text-xs font-black">+{activeUnit.photos.length - 4}</span>
                            <span className="text-[9px] font-extrabold uppercase">More</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowFullAlbumModal(true)}
                        className="w-full py-2.5 bg-[#F4F6F9] hover:bg-[#EEF2F6] text-slate-700 rounded-xl text-xs font-extrabold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200/60"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-[#8B4513]" />
                        <span>View Full Album ({activeUnit.photos.length} photos)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE ÁLBUM COMPLETO DE LA UNIDAD */}
      {showFullAlbumModal && activeUnit && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
          onClick={() => setShowFullAlbumModal(false)}
        >
          <div 
            className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8B4513]">
                  {activeUnit.name}
                </span>
                <h3 className="text-base font-black text-slate-900">Complete Photo Album ({activeUnit.photos.length})</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFullAlbumModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {activeUnit.photos.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() =>
                      openPhotoViewer(
                        activeUnit.photos.map((p) => p.url),
                        activeUnit.photos.map((p) => `${activeUnit.name} • ${p.note} (${p.uploadedAt})`),
                        `${activeUnit.name} • ${item.note}`,
                        idx // <-- AQUÍ TAMBIÉN PASAMOS EL ÍNDICE EXACTO EN EL ÁLBUM COMPLETO
                      )
                    }
                    className="rounded-2xl overflow-hidden border border-slate-200 bg-[#F4F6F9] flex flex-col justify-between relative group cursor-pointer shadow-2xs hover:shadow-md transition-shadow"
                  >
                    <div className="overflow-hidden aspect-square">
                      <img
                        src={item.url}
                        alt={item.note}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveUnitPhoto(item.id);
                      }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-900/75 hover:bg-red-600 text-white flex items-center justify-center cursor-pointer shadow-xs"
                      title="Delete photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="p-3 bg-white">
                      <p className="text-xs font-extrabold text-slate-800 flex items-center gap-1 truncate">
                        <Tag className="w-3 h-3 text-[#8B4513] shrink-0" />
                        <span className="truncate">{item.note}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {item.uploadedAt}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resto de pestañas (Overview, Toolbox, Hours) */}
      {activeSubTab === 'overview' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs space-y-5">
          <div>
            <label className="block text-xs font-extrabold text-slate-500 mb-2">
              Project Scope, Permits & General Field Notes
            </label>
            <textarea
              value={projectNotes}
              onChange={(e) => setProjectNotes(e.target.value)}
              rows={3}
              placeholder="Add important site details, lockbox codes, blueprint links, or progress notes..."
              className="w-full p-3.5 border border-slate-200/80 rounded-2xl text-xs bg-[#F4F6F9] focus:bg-white focus:ring-2 focus:ring-[#8B4513] outline-none font-medium text-slate-800 transition-all"
            />
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-extrabold text-slate-500 mb-3">
              General Project Photos / Permits ({projectPhotos.length})
            </h4>
            <PhotoEvidenceUploader
              docId={`project_${project.id}`}
              photos={projectPhotos}
              onPhotosChange={setProjectPhotos}
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveProjectEvidence}
              disabled={savingDetails}
              className="w-full sm:w-auto px-5 py-3 bg-[#8B3A0E] hover:bg-[#722f0b] disabled:opacity-50 text-white rounded-2xl text-xs font-extrabold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{savingDetails ? 'Saving...' : 'Save General Project Info'}</span>
            </button>
          </div>

          {shiftPhotos.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">
                Photos Uploaded via Daily Time Logs ({shiftPhotos.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {shiftPhotos.map((url: string, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => openPhotoViewer(shiftPhotos, shiftPhotos.map(() => `${project.name} • Daily Shift Photos`), `${project.name} • Daily Shift Photos`, idx)}
                    className="block rounded-2xl overflow-hidden border border-slate-200 hover:opacity-90 transition-opacity shadow-2xs cursor-pointer"
                  >
                    <img src={url} alt="Site shift evidence" className="w-full h-28 object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'toolbox' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-400 font-semibold animate-pulse">
              Loading meetings...
            </div>
          ) : projectMeetings.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-xs text-slate-400">
                No Toolbox Meetings recorded for this project yet.
              </p>
              <button
                type="button"
                onClick={() => setIsToolboxOpen(true)}
                className="px-4 py-2.5 bg-[#8B3A0E] hover:bg-[#722f0b] text-white rounded-xl text-xs font-extrabold transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Toolbox Talk for {project.name}</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {projectMeetings.map((m) => (
                <div key={m.id} className="p-5 space-y-2 hover:bg-[#F4F6F9]/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#8B4513] bg-[#FCEEE6] px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span>{m.dateStr}</span>
                    </span>
                    <span className="text-xs font-extrabold text-slate-500 inline-flex items-center gap-1">
                      <PenTool className="w-3.5 h-3.5 text-[#8B4513]" />
                      <span>{m.attendees?.length || 0} Crew Signatures</span>
                    </span>
                  </div>
                  <p className="text-sm font-extrabold text-slate-900 pt-1">{m.topic}</p>
                  {m.notes && (
                    <p className="text-xs text-slate-600 italic bg-[#F4F6F9] p-2.5 rounded-xl">
                      "{m.notes}"
                    </p>
                  )}
                  <p className="text-[11px] font-semibold text-slate-400">
                    Lead: {m.leadName || m.leadEmail}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'hours' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-400 font-semibold animate-pulse">
              Loading hours...
            </div>
          ) : projectLogs.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">
              No worker hours have been logged under this project yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {projectLogs.map((log) => (
                <div key={log.id} className="p-5 flex items-center justify-between gap-4 hover:bg-[#F4F6F9]/50 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold text-slate-900 truncate">
                        {log.userEmail}
                      </span>
                      <span className="text-xs font-bold text-[#8B4513] bg-[#FCEEE6] px-2 py-0.5 rounded-full">
                        {log.dateStr}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Schedule: <strong className="text-slate-700">{log.checkIn} - {log.checkOut}</strong>
                    </p>
                    {log.comments && (
                      <p className="text-xs text-slate-600 mt-1.5 italic flex items-center gap-1">
                        <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>"{log.comments}"</span>
                      </p>
                    )}
                  </div>
                  <span className="px-3.5 py-1.5 bg-[#FCEEE6] text-[#8B4513] rounded-2xl text-sm font-black shrink-0">
                    {log.totalHours}h
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Visor PhotoModal con soporte de títulos dinámicos e índice inicial */}
      <PhotoModal
        isOpen={modalPhotos !== null}
        onClose={() => setModalPhotos(null)}
        photos={modalPhotos || []}
        titles={modalTitles || undefined}
        title={modalTitleFallback}
        initialIndex={modalInitialIndex}
      />

      {/* Modal de Toolbox Meeting Preasignado a este Proyecto */}
      <ToolboxMeetingModal
        isOpen={isToolboxOpen}
        onClose={() => setIsToolboxOpen(false)}
        currentUser={currentUser}
        userCompanyId={companyId}
        showNotification={showNotification}
        defaultProject={{
          id: project.id,
          name: project.name,
          address: project.address,
        }}
        onMeetingSaved={fetchProjectData}
      />
    </div>
  );
};

export default ProjectDetailView;