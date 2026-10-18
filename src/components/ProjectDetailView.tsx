import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore';
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
  FileText
} from 'lucide-react';
import type { Project } from './ProjectsManager';
import PhotoEvidenceUploader from './PhotoEvidence';
import ToolboxMeetingModal from './ToolBoxMeetingModal';

interface ProjectDetailViewProps {
  project: Project;
  companyId: string | null;
  currentUser: any;
  onBack: () => void;
  showNotification: (msg: string) => void;
}

const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  companyId,
  currentUser,
  onBack,
  showNotification,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'toolbox' | 'hours'>('overview');
  const [projectLogs, setProjectLogs] = useState<any[]>([]);
  const [projectMeetings, setProjectMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Evidencias y notas generales guardadas directamente dentro del documento del proyecto
  const [projectPhotos, setProjectPhotos] = useState<string[]>((project as any).photos || []);
  const [projectNotes, setProjectNotes] = useState<string>((project as any).notes || '');
  const [savingDetails, setSavingDetails] = useState(false);

  // Estado para abrir el Toolbox Meeting preasignado a este proyecto
  const [isToolboxOpen, setIsToolboxOpen] = useState(false);

  const fetchProjectData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      // 1. Cargar turnos de trabajo asociados a este proyecto
      const logsQ = query(
        collection(db, 'timeLogs'),
        where('companyId', '==', companyId),
        where('projectId', '==', project.id)
      );
      const logsSnap = await getDocs(logsQ);
      const logsList = logsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProjectLogs(logsList);

      // 2. Cargar Toolbox Meetings asociados a este proyecto
      const meetingsQ = query(
        collection(db, 'toolboxMeetings'),
        where('companyId', '==', companyId),
        where('projectId', '==', project.id)
      );
      const meetingsSnap = await getDocs(meetingsQ);
      const meetingsList = meetingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProjectMeetings(meetingsList);
    } catch (err: any) {
      console.error('Error loading project details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [project.id, companyId]);

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

  // Total de horas invertidas en la obra
  const totalProjectHours = projectLogs.reduce(
    (sum, log) => sum + (Number(log.totalHours) || 0),
    0
  );

  // Fotos que vienen de los turnos diarios en este proyecto
  const shiftPhotos = projectLogs.flatMap((log) => log.photos || []);

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

        {/* Botón directo para crear Toolbox Meeting preasignado a este proyecto */}
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
          <div className="w-11 h-11 rounded-2xl bg-[#FEF3C7] text-[#92400E] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Safety Briefings
            </span>
            <p className="text-xl font-black text-slate-900 mt-0.5">
              {projectMeetings.length}
            </p>
            <p className="text-[11px] text-slate-400 font-medium">
              Toolbox talks linked
            </p>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-100 rounded-3xl shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Site Evidence
            </span>
            <p className="text-xl font-black text-slate-900 mt-0.5">
              {projectPhotos.length + shiftPhotos.length}
            </p>
            <p className="text-[11px] text-slate-400 font-medium">
              Media files uploaded
            </p>
          </div>
        </div>
      </div>

      {/* Sub-pestañas del Expediente (Estilo Píldora) */}
      <div className="grid grid-cols-3 p-1.5 bg-[#EEF2F6] rounded-2xl gap-1">
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
          <span className="truncate">Evidence & Notes</span>
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

      {/* CONTENIDO DE SUB-PESTAÑA 1: Evidencias y Notas del Proyecto */}
      {activeSubTab === 'overview' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs space-y-5">
          <div>
            <label className="block text-xs font-extrabold text-slate-500 mb-2">
              Project Scope, Permits & Field Notes
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
              Upload Direct Project Photos / Documents
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
              <span>{savingDetails ? 'Saving...' : 'Save Project Folder Changes'}</span>
            </button>
          </div>

          {/* Galería automática de fotos subidas en los turnos diarios de esta obra */}
          {shiftPhotos.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">
                Photos Uploaded via Daily Time Logs ({shiftPhotos.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {shiftPhotos.map((url: string, idx: number) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-2xl overflow-hidden border border-slate-200 hover:opacity-90 transition-opacity shadow-2xs"
                  >
                    <img src={url} alt="Site shift evidence" className="w-full h-28 object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO DE SUB-PESTAÑA 2: Toolbox Meetings del Proyecto */}
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

      {/* CONTENIDO DE SUB-PESTAÑA 3: Horas registradas en el Proyecto */}
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