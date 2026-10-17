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
    <div className="space-y-6 animate-fade-in">
      {/* Barra superior con botón para regresar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>←</span>
            <span>Back to Projects</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-gray-900">{project.name}</h2>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                  project.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {project.status}
              </span>
            </div>
            <p className="text-xs text-gray-500">📍 {project.address}</p>
          </div>
        </div>

        {/* Botón directo para crear Toolbox Meeting preasignado a este proyecto */}
        <button
          type="button"
          onClick={() => setIsToolboxOpen(true)}
          className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black shadow-sm transition-colors cursor-pointer flex items-center gap-2"
        >
          <span>📋</span>
          <span>+ New Project Toolbox Talk</span>
        </button>
      </div>

      {/* Tarjetas de Resumen Rápido del Proyecto */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">
            Total Project Hours
          </span>
          <p className="text-2xl font-black text-blue-950 mt-0.5">{totalProjectHours}h</p>
          <p className="text-xs text-blue-600">{projectLogs.length} daily logs recorded</p>
        </div>

        <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-xl">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-700">
            Safety Briefings
          </span>
          <p className="text-2xl font-black text-purple-950 mt-0.5">{projectMeetings.length}</p>
          <p className="text-xs text-purple-600">Toolbox meetings linked</p>
        </div>

        <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
            Site Photos & Evidence
          </span>
          <p className="text-2xl font-black text-emerald-950 mt-0.5">
            {projectPhotos.length + shiftPhotos.length}
          </p>
          <p className="text-xs text-emerald-600">Accumulated media files</p>
        </div>
      </div>

      {/* Sub-pestañas del Expediente */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveSubTab('overview')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'overview'
              ? 'bg-white text-gray-900 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📸 Evidence & Site Notes
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('toolbox')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'toolbox'
              ? 'bg-white text-purple-900 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🛡️ Toolbox Meetings ({projectMeetings.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('hours')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'hours'
              ? 'bg-white text-blue-900 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          ⏱️ Crew Hours ({projectLogs.length})
        </button>
      </div>

      {/* CONTENIDO DE SUB-PESTAÑA 1: Evidencias y Notas del Proyecto */}
      {activeSubTab === 'overview' && (
        <div className="bg-white p-5 rounded-xl border border-gray-200 space-y-5">
          <div>
            <h4 className="text-sm font-bold text-gray-800 mb-1">
              Project Scope, Permits & Field Notes
            </h4>
            <textarea
              value={projectNotes}
              onChange={(e) => setProjectNotes(e.target.value)}
              rows={3}
              placeholder="Add important site details, lockbox codes, blueprint links, or progress notes..."
              className="w-full p-3 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="pt-3 border-t border-gray-100">
            <h4 className="text-sm font-bold text-gray-800 mb-2">
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
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              {savingDetails ? 'Saving...' : '💾 Save Project Folder Changes'}
            </button>
          </div>

          {/* Galería automática de fotos subidas en los turnos diarios de esta obra */}
          {shiftPhotos.length > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Photos Uploaded via Daily Time Logs ({shiftPhotos.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {shiftPhotos.map((url: string, idx: number) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
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
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-gray-400">Loading meetings...</div>
          ) : projectMeetings.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-xs text-gray-400">
                No Toolbox Meetings recorded for this project yet.
              </p>
              <button
                type="button"
                onClick={() => setIsToolboxOpen(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                + Create First Toolbox Talk for {project.name}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {projectMeetings.map((m) => (
                <div key={m.id} className="p-4 space-y-2 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200">
                      📅 {m.dateStr}
                    </span>
                    <span className="text-xs font-bold text-gray-500">
                      ✍️ {m.attendees?.length || 0} Crew Signatures
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{m.topic}</p>
                  {m.notes && <p className="text-xs text-gray-600 italic">"{m.notes}"</p>}
                  <p className="text-[11px] text-gray-400">Lead: {m.leadName || m.leadEmail}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO DE SUB-PESTAÑA 3: Horas registradas en el Proyecto */}
      {activeSubTab === 'hours' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-gray-400">Loading hours...</div>
          ) : projectLogs.length === 0 ? (
            <div className="p-10 text-center text-xs text-gray-400">
              No worker hours have been logged under this project yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {projectLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900">{log.userEmail}</span>
                      <span className="text-xs text-gray-400">• {log.dateStr}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Clock: {log.checkIn} - {log.checkOut}
                    </p>
                    {log.comments && (
                      <p className="text-xs text-gray-600 mt-1 italic">"{log.comments}"</p>
                    )}
                  </div>
                  <span className="px-3 py-1 bg-blue-50 text-blue-800 rounded-lg text-sm font-black">
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