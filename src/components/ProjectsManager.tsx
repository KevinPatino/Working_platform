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
import LocationInput from './LocationInput';

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
}

const ProjectsManager: React.FC<ProjectsManagerProps> = ({
  companyId,
  currentUser,
  showNotification,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

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

      // Ordenar por fecha de creación descendente
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Formulario para Crear Nuevo Proyecto */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 h-fit">
          <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 rounded-md border border-blue-200">
            Site Management
          </span>
          <h3 className="text-base font-bold text-gray-800 mt-1 mb-4">
            Create New Project / Obra
          </h3>

          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Torre Central - Fase 2"
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Project Official Address
              </label>
              <LocationInput
                value={projectAddress}
                onChange={(val) => setProjectAddress(val)}
                placeholder="Search job site address..."
                className="p-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating Project...' : '+ Create Active Project'}
            </button>
          </form>
        </div>

        {/* Listado de Proyectos de la Empresa */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden h-fit">
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">
              Company Projects Roster
            </h3>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-200">
              {projects.length} Total Projects
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-400 text-xs">
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-xs">
              No projects created yet. Use the form on the left to add one.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {projects.map((proj) => (
                <div key={proj.id} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-gray-900 text-sm truncate">
                        {proj.name}
                      </h4>
                      {proj.status === 'active' ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-black uppercase tracking-wider">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px] font-black uppercase tracking-wider">
                          Completed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      📍 {proj.address}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleStatus(proj.id, proj.status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                      proj.status === 'active'
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {proj.status === 'active' ? 'Mark Completed' : 'Reactivate'}
                  </button>
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