import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { 
  ClipboardCheck, 
  X, 
  MapPin, 
  Navigation, 
  ChevronDown, 
  PenTool, 
  CheckSquare, 
  Square,
  Building2,
  ShieldAlert
} from 'lucide-react';
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-[#F4F6F9] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Fija del Modal */}
        <div className="bg-white px-5 py-4 border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FCEEE6] text-[#8B4513] flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-slate-900">
                  Daily Toolbox Talk
                </h3>
                <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-[#FEF3C7] text-[#92400E] rounded-full">
                  Safety First
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Safety briefing & crew signature acknowledgment
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo con Scroll */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5">
          
          {/* Tarjeta 1: Ubicación y Tema */}
          <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-100 space-y-4">
            {defaultProject ? (
              <div className="p-4 bg-[#FCEEE6]/60 border border-[#8B4513]/20 rounded-2xl flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-white text-[#8B4513] flex items-center justify-center shrink-0 shadow-2xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8B4513] block">
                    Linked to Active Project
                  </span>
                  <p className="text-sm font-extrabold text-slate-900 truncate mt-0.5">
                    {defaultProject.name}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {defaultProject.address}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-500">
                  Job Site Location
                </label>

                {/* Píldora Conmutador: 1° Custom Address | 2° Active Project */}
                <div className="grid grid-cols-2 p-1.5 bg-[#EEF2F6] rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setLocationType('address');
                      setSelectedProjectId('');
                      setJobSite('');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      locationType === 'address'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Navigation className={`w-3.5 h-3.5 ${locationType === 'address' ? 'text-[#8B4513]' : 'text-slate-400'}`} />
                    <span>Custom Address</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLocationType('project');
                      setSelectedProjectId('');
                      setJobSite('');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      locationType === 'project'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <MapPin className={`w-3.5 h-3.5 ${locationType === 'project' ? 'text-[#8B4513]' : 'text-slate-400'}`} />
                    <span>Active Project ({projectsList.length})</span>
                  </button>
                </div>

                {locationType === 'address' ? (
                  <LocationInput
                    value={jobSite}
                    onChange={(val) => setJobSite(val)}
                    placeholder="Search or type site address..."
                    className="w-full p-3.5 border border-slate-200 rounded-2xl text-sm bg-[#F4F6F9] focus:bg-white focus:ring-2 focus:ring-[#8B4513] outline-none font-semibold"
                    required
                  />
                ) : (
                  <div className="relative bg-[#F4F6F9] hover:bg-[#edf1f5] transition-colors rounded-2xl p-3.5 border border-slate-200/80 flex items-center gap-3 cursor-pointer">
                    <MapPin className="w-5 h-5 text-[#8B4513] shrink-0 pointer-events-none" />
                    <div className="flex-1 min-w-0 pointer-events-none">
                      <p className="text-xs font-extrabold text-slate-900 truncate">
                        {selectedProjectId
                          ? projectsList.find((p) => p.id === selectedProjectId)?.name
                          : 'Select an Active Project'}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {jobSite || 'Click here to choose from list'}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 pointer-events-none" />
                    <select
                      value={selectedProjectId}
                      onChange={(e) => {
                        const projId = e.target.value;
                        setSelectedProjectId(projId);
                        const found = projectsList.find((p) => p.id === projId);
                        setJobSite(found ? found.address : '');
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
                )}
              </div>
            )}

            {/* Tema de Seguridad */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">
                Safety Topic
              </label>
              <div className="relative">
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full p-3.5 pr-9 border border-slate-200/80 rounded-2xl text-xs sm:text-sm font-extrabold text-slate-800 bg-[#F4F6F9] focus:bg-white focus:ring-2 focus:ring-[#8B4513] outline-none appearance-none cursor-pointer"
                >
                  {COMMON_TOPICS.map((t, idx) => (
                    <option key={idx} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Peligros y Notas */}
          <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-100 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <ShieldAlert className="w-4 h-4 text-[#8B4513]" />
                <label className="text-xs font-extrabold text-slate-800">
                  Hazards & Controls Discussed
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {COMMON_HAZARDS.map((h, idx) => {
                  const isChecked = selectedHazards.includes(h);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleHazard(h)}
                      className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-[#FCEEE6]/60 border-[#8B4513]/40 text-slate-900 font-bold'
                          : 'bg-[#F4F6F9] border-slate-200/60 text-slate-600 font-medium hover:bg-slate-100'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-[#8B4513] shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      )}
                      <span className="text-xs leading-snug">{h}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">
                Specific Controls & Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="E.g., Water mist active for dust suppression; 2nd floor hole covered and marked..."
                className="w-full p-3.5 border border-slate-200/80 rounded-2xl text-xs bg-[#F4F6F9] focus:bg-white focus:ring-2 focus:ring-[#8B4513] outline-none resize-none font-medium"
              />
            </div>
          </div>

          {/* Tarjeta 3: Captura de Firmas de la Cuadrilla */}
          <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-100 space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <PenTool className="w-4 h-4 text-[#8B4513]" />
                <span>Crew Signatures</span>
              </label>
              <span className="px-2.5 py-0.5 rounded-full bg-[#FCEEE6] text-[#8B4513] text-[11px] font-extrabold">
                {attendees.length} Signed
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={currentWorkerName}
                onChange={(e) => setCurrentWorkerName(e.target.value)}
                placeholder="Worker full name..."
                className="flex-1 p-3 border border-slate-200/80 rounded-2xl text-xs bg-[#F4F6F9] focus:bg-white focus:ring-2 focus:ring-[#8B4513] outline-none font-semibold"
              />
              <button
                type="button"
                onClick={handleStartSigning}
                className="px-4 py-3 bg-[#8B3A0E] hover:bg-[#722f0b] text-white rounded-2xl text-xs font-extrabold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Sign</span>
              </button>
            </div>

            {/* Listado de los que ya firmaron */}
            {attendees.length > 0 && (
              <div className="divide-y divide-slate-100 border border-slate-200/70 rounded-2xl overflow-hidden bg-[#F4F6F9] max-h-48 overflow-y-auto">
                {attendees.map((att, index) => (
                  <div key={index} className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={att.signature}
                        alt="Signature"
                        className="h-8 w-20 object-contain border border-slate-200 rounded-xl bg-white p-0.5"
                      />
                      <div className="truncate">
                        <p className="text-xs font-extrabold text-slate-900 truncate">
                          {att.workerName}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-400">
                          Signed at {att.signedAt}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttendee(index)}
                      className="w-7 h-7 rounded-full bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/60"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botones de Acción del Modal */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-2xl text-xs font-extrabold text-slate-500 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 sm:flex-initial px-6 py-3.5 bg-[#8B3A0E] hover:bg-[#722f0b] text-white rounded-2xl text-xs font-extrabold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
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