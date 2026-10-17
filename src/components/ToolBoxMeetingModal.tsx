import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import LocationInput from './LocationInput';
import SignaturePad from './SignaturePad';

interface Attendee {
  workerName: string;
  signature: string; // Base64 Data URL
  signedAt: string;
}

interface ToolboxMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  userCompanyId: string | null;
  showNotification: (msg: string) => void;
  // NUEVO: Si se abre desde dentro de un proyecto específico, viene preasignado
  defaultProject?: {
    id: string;
    name: string;
    address: string;
  } | null;
  onMeetingSaved?: () => void;
}

const COMMON_HAZARDS = [
  'PPE Inspection (Hard hat, hi-vis, steel toes, eye protection)',
  'Demolition Falling Debris & Exclusion Zones',
  'Silica Dust & Respirator Compliance',
  'Slips, Trips & Good Housekeeping',
  'Power Tools & Extension Cord Inspections',
  'Overhead Hazards & Scaffolding Stability',
  'Utility Locates (Power, Gas, Water) Verified',
];

const COMMON_TOPICS = [
  'Daily Site Safety Orientation & Hazards Review',
  'Interior Demolition & Structural Precautions',
  'Dust Suppression & Ventilation Protocols',
  'Material Handling & Ergonomics',
  'Emergency Action Plan & Evacuation Routes',
];

const ToolboxMeetingModal: React.FC<ToolboxMeetingModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userCompanyId,
  showNotification,
  defaultProject = null,
  onMeetingSaved,
}) => {
  const [jobSite, setJobSite] = useState('');
  const [topic, setTopic] = useState(COMMON_TOPICS[0]);
  const [selectedHazards, setSelectedHazards] = useState<string[]>([
    COMMON_HAZARDS[0],
    COMMON_HAZARDS[1],
  ]);
  const [notes, setNotes] = useState('');
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [currentWorkerName, setCurrentWorkerName] = useState('');
  const [signingWorkerName, setSigningWorkerName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Estados para el selector híbrido de proyectos
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [locationType, setLocationType] = useState<'address' | 'project'>('address');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Cargar proyectos activos cuando se abre el modal
  useEffect(() => {
    if (!isOpen || !userCompanyId) return;

    const fetchProjects = async () => {
      try {
        const q = query(
          collection(db, 'projects'),
          where('companyId', '==', userCompanyId),
          where('status', '==', 'active')
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProjectsList(list);
      } catch (err) {
        console.error('Error loading projects in Toolbox modal:', err);
      }
    };

    fetchProjects();
  }, [isOpen, userCompanyId]);

  // Si viene un defaultProject (abierto desde adentro del proyecto), preconfigurar todo
  useEffect(() => {
    if (isOpen) {
      if (defaultProject) {
        setLocationType('project');
        setSelectedProjectId(defaultProject.id);
        setJobSite(defaultProject.address);
      } else {
        setLocationType('address');
        setSelectedProjectId('');
        setJobSite('');
      }
    }
  }, [isOpen, defaultProject]);

  if (!isOpen) return null;

  const toggleHazard = (hazard: string) => {
    setSelectedHazards((prev) =>
      prev.includes(hazard) ? prev.filter((h) => h !== hazard) : [...prev, hazard]
    );
  };

  const handleStartSigning = () => {
    const cleanName = currentWorkerName.trim();
    if (!cleanName) {
      showNotification('Please enter a worker name to sign.');
      return;
    }
    setSigningWorkerName(cleanName);
  };

  const handleSaveSignature = (signatureDataUrl: string) => {
    if (!signingWorkerName) return;

    const newAttendee: Attendee = {
      workerName: signingWorkerName,
      signature: signatureDataUrl,
      signedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setAttendees((prev) => [...prev, newAttendee]);
    setSigningWorkerName(null);
    setCurrentWorkerName('');
  };

  const handleRemoveAttendee = (index: number) => {
    setAttendees((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (locationType === 'project' && !selectedProjectId) {
      showNotification('Please select an active project.');
      return;
    }

    if (!jobSite.trim()) {
      showNotification('Please provide the job site location.');
      return;
    }
    if (attendees.length === 0) {
      showNotification('At least one worker must sign the meeting acknowledgment.');
      return;
    }

    setSubmitting(true);
    try {
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // Identificar nombre del proyecto
      const projectObj = defaultProject || projectsList.find((p) => p.id === selectedProjectId);

      await addDoc(collection(db, 'toolboxMeetings'), {
        companyId: userCompanyId,
        dateStr,
        jobSite: jobSite.trim(),
        projectId: locationType === 'project' && selectedProjectId ? selectedProjectId : null,
        projectName: locationType === 'project' && projectObj ? projectObj.name : null,
        topic,
        hazards: selectedHazards,
        notes: notes.trim(),
        leadId: currentUser.uid,
        leadEmail: currentUser.email,
        leadName: currentUser.displayName || currentUser.email,
        attendees,
        createdAt: Timestamp.now(),
      });

      showNotification('Toolbox Meeting saved successfully!');
      // Reiniciar campos
      setAttendees([]);
      setNotes('');
      if (onMeetingSaved) onMeetingSaved();
      onClose();
    } catch (err: any) {
      showNotification('Error saving Toolbox Meeting: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 p-5 sm:p-7 space-y-5 animate-fade-in my-auto">
        
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 rounded-md">
              Safety Compliance
            </span>
            <h3 className="text-lg font-bold text-gray-800 mt-1">
              Daily Toolbox Talk & Safety Meeting
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Ubicación de la Obra: Fija si viene de un proyecto, o Selector Híbrido */}
          <div>
            {defaultProject ? (
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                  🏗️ Linked to Active Project
                </span>
                <p className="text-sm font-bold text-gray-900 mt-1">{defaultProject.name}</p>
                <p className="text-xs text-gray-600">📍 {defaultProject.address}</p>
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Job Site Location
                  </label>
                  <div className="flex gap-1.5 p-1 bg-gray-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setLocationType('address');
                        setSelectedProjectId('');
                        setJobSite('');
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        locationType === 'address'
                          ? 'bg-white text-gray-900 shadow-xs'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      📍 Custom Address
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLocationType('project');
                        setJobSite('');
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        locationType === 'project'
                          ? 'bg-white text-blue-900 shadow-xs'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      🏗️ Active Project ({projectsList.length})
                    </button>
                  </div>
                </div>

                {locationType === 'address' ? (
                  <LocationInput
                    value={jobSite}
                    onChange={(val) => setJobSite(val)}
                    placeholder="Search or type site address..."
                    className="p-3 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                ) : (
                  <div className="space-y-2">
                    <select
                      value={selectedProjectId}
                      onChange={(e) => {
                        const projId = e.target.value;
                        setSelectedProjectId(projId);
                        const found = projectsList.find((p) => p.id === projId);
                        setJobSite(found ? found.address : '');
                      }}
                      className="w-full p-3 border border-blue-200 rounded-lg text-sm bg-blue-50/30 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium text-gray-800"
                      required
                    >
                      <option value="">-- Select an Active Project --</option>
                      {projectsList.map((proj) => (
                        <option key={proj.id} value={proj.id}>
                          {proj.name} — {proj.address}
                        </option>
                      ))}
                    </select>
                    {selectedProjectId && jobSite && (
                      <p className="text-xs text-blue-800 bg-blue-50 p-2 rounded-lg border border-blue-100">
                        📍 <strong>Site Address:</strong> {jobSite}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tema de Seguridad */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
              Safety Topic
            </label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              {COMMON_TOPICS.map((t, idx) => (
                <option key={idx} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Lista de Peligros y Controles */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Hazards & Controls Discussed
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
              {COMMON_HAZARDS.map((h, idx) => {
                const isChecked = selectedHazards.includes(h);
                return (
                  <label
                    key={idx}
                    className="flex items-start gap-2 cursor-pointer text-xs font-medium text-gray-700 select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleHazard(h)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>{h}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Notas Adicionales */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
              Specific Controls & Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="E.g., Water mist active for dust suppression; 2nd floor hole covered and marked..."
              className="w-full p-3 border border-gray-300 rounded-lg text-xs bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          {/* Lista y Captura de Firmas */}
          <div className="pt-3 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Crew Signatures ({attendees.length} Signed)
              </label>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={currentWorkerName}
                onChange={(e) => setCurrentWorkerName(e.target.value)}
                placeholder="Worker full name..."
                className="flex-1 p-2.5 border border-gray-300 rounded-lg text-xs bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                type="button"
                onClick={handleStartSigning}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <span>✍️</span>
                <span>Sign</span>
              </button>
            </div>

            {/* Listado de los que ya firmaron */}
            {attendees.length > 0 && (
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white max-h-48 overflow-y-auto">
                {attendees.map((att, index) => (
                  <div key={index} className="p-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={att.signature}
                        alt="Signature"
                        className="h-7 w-20 object-contain border border-gray-200 rounded bg-gray-50"
                      />
                      <div className="truncate">
                        <p className="text-xs font-bold text-gray-800 truncate">
                          {att.workerName}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Signed at {att.signedAt}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttendee(index)}
                      className="text-gray-400 hover:text-red-500 p-1 text-xs font-bold transition-colors cursor-pointer"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botones de Envío */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm disabled:bg-emerald-400 cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : 'Save & Submit Toolbox Meeting'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal flotante de captura de firma */}
      {signingWorkerName && (
        <SignaturePad
          workerName={signingWorkerName}
          onSave={handleSaveSignature}
          onCancel={() => setSigningWorkerName(null)}
        />
      )}
    </div>
  );
};

export default ToolboxMeetingModal;