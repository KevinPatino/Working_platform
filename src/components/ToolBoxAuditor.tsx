import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore'; // <-- NUEVO: Importar 'where'
import MapLink from './MapLink';

interface Attendee {
  workerName: string;
  signature: string;
  signedAt: string;
}

interface ToolboxMeeting {
  id: string;
  companyId?: string; // <-- NUEVO: Añadido companyId a la interfaz
  dateStr: string;
  jobSite: string;
  topic: string;
  hazards: string[];
  notes?: string;
  leadId: string;
  leadName?: string;
  leadEmail?: string;
  attendees: Attendee[];
  createdAt?: any;
}

// <-- NUEVO: Interfaz para recibir el companyId desde AdminPanel
interface ToolboxAuditorProps {
  companyId: string | null;
}

// <-- MODIFICADO: El componente ahora recibe companyId
const ToolboxAuditor: React.FC<ToolboxAuditorProps> = ({ companyId }) => {
  const [meetings, setMeetings] = useState<ToolboxMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<ToolboxMeeting | null>(null);

  // Filtros de búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [leadFilter, setLeadFilter] = useState('all');

  // <-- MODIFICADO: Filtrar por companyId
  const fetchMeetings = async () => {
    if (!companyId) return; // Si no hay empresa, no hacemos nada

    setLoading(true);
    try {
      // Solo traemos las actas de ESTA empresa
      const q = query(
        collection(db, 'toolboxMeetings'), 
        where('companyId', '==', companyId)
      );
      const snapshot = await getDocs(q);
      
      const data: ToolboxMeeting[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<ToolboxMeeting, 'id'>),
      }));

      // Ordenamos las más recientes primero en JavaScript 
      // (evita tener que crear índices compuestos extra en Firebase)
      data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      
      setMeetings(data);
    } catch (err) {
      console.error('Error fetching toolbox meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  // <-- MODIFICADO: Añadir companyId como dependencia del useEffect
  useEffect(() => {
    fetchMeetings();
  }, [companyId]);

  // Lista única de Team Leads que han realizado charlas para el filtro
  const uniqueLeads = Array.from(
    new Set(meetings.map((m) => m.leadName || m.leadEmail || 'Unknown'))
  );

  // Filtrado reactivo multidimensional
  const filteredMeetings = meetings.filter((m) => {
    // 1. Filtro por fecha exacta
    if (dateFilter && m.dateStr !== dateFilter) {
      return false;
    }

    // 2. Filtro por Team Lead
    if (leadFilter !== 'all') {
      const leadIdentifier = m.leadName || m.leadEmail || 'Unknown';
      if (leadIdentifier !== leadFilter) return false;
    }

    // 3. Filtro por texto libre: busca en la obra, tema, notas o si algún firmante coincide
    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase();
      const matchSite = m.jobSite.toLowerCase().includes(queryLower);
      const matchTopic = m.topic.toLowerCase().includes(queryLower);
      const matchNotes = m.notes?.toLowerCase().includes(queryLower) || false;
      const matchWorker = m.attendees?.some((att) =>
        att.workerName.toLowerCase().includes(queryLower)
      );

      return matchSite || matchTopic || matchNotes || matchWorker;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Barra de Filtros */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:flex-1">
          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Search Site, Topic, or Worker
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-3 text-gray-400">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by address or worker name..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:border-purple-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="flex w-full md:w-auto gap-3 items-center">
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Date
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Conducted By (Lead)
            </label>
            <select
              value={leadFilter}
              onChange={(e) => setLeadFilter(e.target.value)}
              className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="all">All Team Leads</option>
              {uniqueLeads.map((lead, idx) => (
                <option key={idx} value={lead}>
                  {lead}
                </option>
              ))}
            </select>
          </div>

          {(searchQuery || dateFilter || leadFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setDateFilter('');
                setLeadFilter('all');
              }}
              className="self-end px-3 py-2.5 text-xs font-bold text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Lista de Reuniones */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm text-center text-sm font-semibold text-gray-400">
          Loading safety compliance records...
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm text-center">
          <p className="text-3xl mb-2">📋</p>
          <h4 className="text-sm font-bold text-gray-700">No Toolbox Meetings Found</h4>
          <p className="text-xs text-gray-400 mt-1">
            {meetings.length === 0
              ? 'No safety briefings have been submitted yet.'
              : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMeetings.map((meeting) => (
            <div
              key={meeting.id}
              onClick={() => setSelectedMeeting(meeting)}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 rounded-md border border-purple-200/50">
                    {meeting.dateStr}
                  </span>
                  <span className="text-xs font-bold text-gray-500">
                    👤 {meeting.leadName || meeting.leadEmail}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gray-900 leading-snug">
                    {meeting.topic}
                  </h4>
                  <div className="mt-1">
                    <MapLink location={meeting.jobSite} />
                  </div>
                </div>

                {/* Tags de Peligros Discutidos */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {meeting.hazards.slice(0, 3).map((h, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium"
                    >
                      {h.split('(')[0].trim()}
                    </span>
                  ))}
                  {meeting.hazards.length > 3 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold">
                      +{meeting.hazards.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Pie de tarjeta con contador de firmas */}
              <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  {meeting.attendees?.length || 0} Workers Signed
                </span>
                <span className="text-xs font-bold text-purple-600 hover:underline">
                  View Signatures & Details →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Detallado de Auditoría e Inspección de Firmas */}
      {selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 p-6 space-y-6 my-auto animate-fade-in">
            {/* Header del Modal */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div>
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 rounded-md">
                  Safety Meeting Report
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-1">
                  {selectedMeeting.topic}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Conducted by <span className="font-bold text-gray-800">{selectedMeeting.leadName || selectedMeeting.leadEmail}</span> on <span className="font-bold text-gray-800">{selectedMeeting.dateStr}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedMeeting(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Ubicación */}
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Job Site
              </p>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <MapLink location={selectedMeeting.jobSite} />
              </div>
            </div>

            {/* Peligros y Medidas */}
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Hazards & Safety Controls Discussed
              </p>
              <div className="space-y-1.5 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                {selectedMeeting.hazards.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-gray-700">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notas específicas */}
            {selectedMeeting.notes && (
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Supervisor Notes
                </p>
                <div className="p-3 bg-yellow-50/60 rounded-xl border border-yellow-200 text-xs text-yellow-900">
                  {selectedMeeting.notes}
                </div>
              </div>
            )}

            {/* Firmas Táctiles de los Operarios */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Crew Signatures ({selectedMeeting.attendees?.length || 0})
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {selectedMeeting.attendees?.map((att, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {att.workerName}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        Signed at {att.signedAt}
                      </p>
                    </div>
                    <img
                      src={att.signature}
                      alt={`Signature of ${att.workerName}`}
                      className="h-10 w-24 object-contain bg-white border border-gray-200 rounded-lg p-0.5"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                onClick={() => setSelectedMeeting(null)}
                className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolboxAuditor;