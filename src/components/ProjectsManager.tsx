import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  Timestamp 
} from 'firebase/firestore';
import { 
  MapPin, 
  FolderOpen, 
  Plus, 
  CheckCircle2, 
  RotateCcw, 
  Building2 
} from 'lucide-react';
import LocationInput from './LocationInput';
import ProjectDetailView from './ProjectDetailView';

interface ProjectsManagerProps {
  companyId: string | null;
  currentUser: any;
  showNotification: (msg: string) => void;
}

export interface Project {
  id: string;
  companyId: string;
  name: string;
  address: string;
  status: 'active' | 'completed';
  createdBy: string;
  createdAt?: any;
  photos?: string[];
  notes?: string;
}

const ProjectsManager: React.FC<ProjectsManagerProps> = ({
  companyId,
  currentUser,
  showNotification,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado para abrir el expediente de un proyecto específico
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Formulario de nuevo proyecto
  const [projectName, setProjectName] = useState('');
  const [projectAddress, setProjectAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProjects = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'projects'),
        where('companyId', '==', companyId)
      );
      const snapshot = await getDocs(q);
      const list: Project[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Project, 'id'>),
      }));

      list.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });

      setProjects(list);
    } catch (err: any) {
      console.error('Error loading projects:', err);
      showNotification('Error loading projects: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [companyId]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      showNotification('Error: Company ID missing.');
      return;
    }
    const cleanName = projectName.trim();
    const cleanAddress = projectAddress.trim();

    if (!cleanName || !cleanAddress) {
      showNotification('Please enter a project name and select a valid address.');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'projects'), {
        companyId,
        name: cleanName,
        address: cleanAddress,
        status: 'active',
        createdBy: currentUser.uid,
        createdAt: Timestamp.now(),
        photos: [],
        notes: '',
      });

      showNotification('Project created successfully!');
      setProjectName('');
      setProjectAddress('');
      await fetchProjects();
    } catch (err: any) {
      showNotification('Error creating project: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (projectId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'completed' : 'active';
    try {
      await updateDoc(doc(db, 'projects', projectId), {
        status: newStatus,
      });
      showNotification(`Project marked as ${newStatus}.`);
      await fetchProjects();
    } catch (err: any) {
      showNotification('Error updating project status: ' + err.message);
    }
  };

  // Si el usuario hizo clic en "Open Project", mostramos la vista de detalle de esa obra
  if (selectedProject) {
    return (
      <ProjectDetailView
        project={selectedProject}
        companyId={companyId}
        currentUser={currentUser}
        onBack={() => {
          setSelectedProject(null);
          fetchProjects();
        }}
        showNotification={showNotification}
      />
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid grid-cols-1 gap-5">
        
        {/* Tarjeta 1: Formulario para Crear Nuevo Proyecto */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-[#FCEEE6] text-[#8B4513] rounded-full">
              Site Management
            </span>
          </div>

          <h3 className="text-base font-extrabold text-slate-900 mb-4">
            Create New Project / Obra
          </h3>

          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Torre Central - Fase 2"
                className="w-full p-3.5 border border-slate-200/80 rounded-2xl text-sm bg-[#F4F6F9] focus:bg-white focus:ring-2 focus:ring-[#8B4513] outline-none font-semibold text-slate-900 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">
                Project Official Address
              </label>
              <LocationInput
                value={projectAddress}
                onChange={(val) => setProjectAddress(val)}
                placeholder="Search job site address..."
                className="w-full p-3.5 border border-slate-200/80 rounded-2xl text-sm bg-[#F4F6F9] focus:bg-white focus:ring-2 focus:ring-[#8B4513] outline-none font-semibold text-slate-900 transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-[#8B3A0E] hover:bg-[#722f0b] disabled:opacity-50 text-white rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{submitting ? 'Creating Project...' : 'Create Active Project'}</span>
            </button>
          </form>
        </div>

        {/* Tarjeta 2: Listado de Proyectos de la Empresa */}
        <div className="bg-white rounded-3xl shadow-xs border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#8B4513]" />
              <h3 className="text-sm font-extrabold text-slate-900">
                Company Projects Roster
              </h3>
            </div>
            <span className="px-3 py-1 bg-[#FCEEE6] text-[#8B4513] rounded-full text-xs font-extrabold">
              {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
            </span>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-400 text-xs font-semibold animate-pulse">
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              No projects created yet. Use the form above to add your first job site.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F4F6F9]/50 transition-colors"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="font-extrabold text-slate-900 text-base truncate">
                        {proj.name}
                      </h4>
                      {proj.status === 'active' ? (
                        <span className="px-2.5 py-0.5 bg-emerald-100/80 text-emerald-800 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-slate-200 text-slate-600 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                          Completed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#8B4513] shrink-0" />
                      <span className="truncate">{proj.address}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                    {/* Botón para entrar al expediente del proyecto */}
                    <button
                      type="button"
                      onClick={() => setSelectedProject(proj)}
                      className="flex-1 sm:flex-initial justify-center px-4 py-2.5 bg-[#8B3A0E] hover:bg-[#722f0b] text-white rounded-xl text-xs font-extrabold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Open Project</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(proj.id, proj.status)}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer flex items-center gap-1.5 ${
                        proj.status === 'active'
                          ? 'bg-[#EEF2F6] text-slate-700 hover:bg-red-50 hover:text-red-700'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {proj.status === 'active' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Completed</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reactivate</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ProjectsManager;