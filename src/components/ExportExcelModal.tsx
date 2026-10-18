import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { db } from '../firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';

interface ExportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminCompanyId: string | null;
  allRegisteredUsers: any[];
  initialStartDate: string;
  initialEndDate: string;
  initialSelectedUser: string;
  onExport: (params: {
    startDate: string;
    endDate: string;
    selectedUser: string;
    selectedProject: string;
  }) => void;
}

const ExportExcelModal: React.FC<ExportExcelModalProps> = ({
  isOpen,
  onClose,
  adminCompanyId,
  allRegisteredUsers,
  initialStartDate,
  initialEndDate,
  initialSelectedUser,
  onExport,
}) => {
  const [exportStartDate, setExportStartDate] = useState(initialStartDate);
  const [exportEndDate, setExportEndDate] = useState(initialEndDate);
  const [exportSelectedUser, setExportSelectedUser] = useState(initialSelectedUser);
  const [exportSelectedProject, setExportSelectedProject] = useState('All');
  const [projectsList, setProjectsList] = useState<any[]>([]);

  // Sincronizar estados cuando se abre el modal con los valores actuales del panel
  useEffect(() => {
    if (isOpen) {
      setExportStartDate(initialStartDate);
      setExportEndDate(initialEndDate);
      setExportSelectedUser(initialSelectedUser);
      setExportSelectedProject('All');
    }
  }, [isOpen, initialStartDate, initialEndDate, initialSelectedUser]);

  // Cargar proyectos activos de la empresa para el filtro
  useEffect(() => {
    const fetchProjectsForExport = async () => {
      if (!adminCompanyId) return;
      try {
        const q = query(collection(db, 'projects'), where('companyId', '==', adminCompanyId));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setProjectsList(list);
      } catch (err) {
        console.error('Error loading projects for export filter:', err);
      }
    };
    if (adminCompanyId && isOpen) {
      fetchProjectsForExport();
    }
  }, [adminCompanyId, isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-950">Export Payroll to Excel</h3>
              <p className="text-xs text-slate-400">Customize your report parameters before downloading</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Rango de Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">From Date</label>
              <input
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-2xl text-xs bg-[#F4F6F9] font-semibold text-slate-800 outline-none focus:border-[#8B4513]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">To Date (Optional)</label>
              <input
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-2xl text-xs bg-[#F4F6F9] font-semibold text-slate-800 outline-none focus:border-[#8B4513]"
              />
            </div>
          </div>

          {/* Filtrar por Trabajador */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Filter Worker</label>
            <select
              value={exportSelectedUser}
              onChange={(e) => setExportSelectedUser(e.target.value)}
              className="w-full p-3.5 border border-slate-200 rounded-2xl text-xs bg-[#F4F6F9] font-semibold text-slate-900 outline-none focus:border-[#8B4513] cursor-pointer"
            >
              <option value="All">All Workers</option>
              {allRegisteredUsers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Filtrar por Proyecto */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Filter Project</label>
            <select
              value={exportSelectedProject}
              onChange={(e) => setExportSelectedProject(e.target.value)}
              className="w-full p-3.5 border border-slate-200 rounded-2xl text-xs bg-[#F4F6F9] font-semibold text-slate-900 outline-none focus:border-[#8B4513] cursor-pointer"
            >
              <option value="All">All Projects</option>
              {projectsList.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name} — {proj.address}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-extrabold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onExport({
                startDate: exportStartDate,
                endDate: exportEndDate,
                selectedUser: exportSelectedUser,
                selectedProject: exportSelectedProject,
              });
            }}
            className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Download Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportExcelModal;