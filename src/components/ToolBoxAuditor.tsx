import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import { 
  Search, 
  User, 
  X, 
  FileDown, 
  CheckCircle2, 
  ChevronRight,
  ClipboardCheck
} from 'lucide-react';
import MapLink from './MapLink';
import { currentTenant } from '../config/tenant.config';

interface Attendee {
  workerName: string;
  signature: string;
  signedAt: string;
}

interface ToolboxMeeting {
  id: string;
  companyId?: string;
  dateStr: string;
  jobSite: string;
  projectId?: string;
  projectName?: string;
  topic: string;
  hazards: string[];
  notes?: string;
  leadId: string;
  leadName?: string;
  leadEmail?: string;
  attendees: Attendee[];
  createdAt?: any;
}

interface ToolboxAuditorProps {
  companyId: string | null;
}

const ToolboxAuditor: React.FC<ToolboxAuditorProps> = ({ companyId }) => {
  const [meetings, setMeetings] = useState<ToolboxMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<ToolboxMeeting | null>(null);

  // Filtros de búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [leadFilter, setLeadFilter] = useState('all');

  const fetchMeetings = async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      const q = query(
        collection(db, 'toolboxMeetings'), 
        where('companyId', '==', companyId)
      );
      const snapshot = await getDocs(q);
      
      const data: ToolboxMeeting[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<ToolboxMeeting, 'id'>),
      }));

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

  useEffect(() => {
    fetchMeetings();
  }, [companyId]);

  // Generador de PDF formal para cumplimiento con WorkSafeBC
  const handleExportPDF = (meeting: ToolboxMeeting) => {
    const docPdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = docPdf.internal.pageSize.getWidth();
    const margin = 15;
    let y = 18;

    // Encabezado corporativo
    docPdf.setFillColor(15, 23, 42); // slate-900
    docPdf.rect(0, 0, pageWidth, 32, 'F');

    docPdf.setTextColor(255, 255, 255);
    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(15);
    docPdf.text('TOOLBOX SAFETY MEETING RECORD', margin, 14);

    docPdf.setFont('helvetica', 'normal');
    docPdf.setFontSize(9);
    docPdf.setTextColor(209, 213, 219);
    docPdf.text(
      `${currentTenant.company.name} • OHS / WorkSafeBC Compliance Documentation`,
      margin,
      21
    );
    docPdf.text(`Document ID: ${meeting.id}`, margin, 26);

    y = 42;

    // Caja de Metadatos de la Reunión
    docPdf.setFillColor(244, 246, 249);
    docPdf.setDrawColor(229, 231, 235);
    docPdf.roundedRect(margin, y, pageWidth - margin * 2, 28, 2, 2, 'FD');

    docPdf.setTextColor(15, 23, 42);
    docPdf.setFontSize(9);

    docPdf.setFont('helvetica', 'bold');
    docPdf.text('Date:', margin + 4, y + 7);
    docPdf.setFont('helvetica', 'normal');
    docPdf.text(meeting.dateStr, margin + 22, y + 7);

    docPdf.setFont('helvetica', 'bold');
    docPdf.text('Supervisor / Lead:', pageWidth / 2, y + 7);
    docPdf.setFont('helvetica', 'normal');
    docPdf.text(
      meeting.leadName || meeting.leadEmail || 'N/A',
      pageWidth / 2 + 32,
      y + 7
    );

    docPdf.setFont('helvetica', 'bold');
    docPdf.text('Job Site:', margin + 4, y + 15);
    docPdf.setFont('helvetica', 'normal');
    const siteLines = docPdf.splitTextToSize(meeting.jobSite, pageWidth - margin * 2 - 28);
    docPdf.text(siteLines, margin + 22, y + 15);

    docPdf.setFont('helvetica', 'bold');
    docPdf.text('Topic:', margin + 4, y + 23);
    docPdf.setFont('helvetica', 'normal');
    docPdf.text(meeting.topic, margin + 22, y + 23);

    y += 36;

    // Sección: Peligros y Controles Discutidos
    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(11);
    docPdf.setTextColor(15, 23, 42);
    docPdf.text('1. Hazards & Safety Controls Discussed', margin, y);
    y += 6;

    docPdf.setFont('helvetica', 'normal');
    docPdf.setFontSize(9.5);
    docPdf.setTextColor(55, 65, 81);

    meeting.hazards.forEach((hazard) => {
      const splitHazard = docPdf.splitTextToSize(`[X]  ${hazard}`, pageWidth - margin * 2 - 4);
      docPdf.text(splitHazard, margin + 2, y);
      y += splitHazard.length * 5 + 1.5;
    });

    y += 4;

    // Sección: Notas del Supervisor (si existen)
    if (meeting.notes && meeting.notes.trim() !== '') {
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(11);
      docPdf.setTextColor(15, 23, 42);
      docPdf.text('2. Specific Site Controls & Supervisor Notes', margin, y);
      y += 6;

      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(9.5);
      docPdf.setTextColor(55, 65, 81);
      const noteLines = docPdf.splitTextToSize(meeting.notes, pageWidth - margin * 2 - 4);
      docPdf.text(noteLines, margin + 2, y);
      y += noteLines.length * 5 + 6;
    }

    // Sección: Firmas de los Trabajadores
    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(11);
    docPdf.setTextColor(15, 23, 42);
    docPdf.text(
      `3. Crew Attendance & Digital Signatures (${meeting.attendees?.length || 0} Workers)`,
      margin,
      y
    );
    y += 4;

    docPdf.setFont('helvetica', 'italic');
    docPdf.setFontSize(8);
    docPdf.setTextColor(107, 114, 128);
    docPdf.text(
      'By signing below, workers acknowledge they attended the briefing and understand the hazards and controls for today.',
      margin,
      y + 3
    );
    y += 8;

    // Cabecera de la tabla de firmas
    docPdf.setFillColor(244, 246, 249);
    docPdf.setDrawColor(209, 213, 219);
    docPdf.rect(margin, y, pageWidth - margin * 2, 8, 'FD');

    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(9);
    docPdf.setTextColor(31, 41, 55);
    docPdf.text('#', margin + 3, y + 5.5);
    docPdf.text('Worker Full Name', margin + 14, y + 5.5);
    docPdf.text('Time Signed', margin + 95, y + 5.5);
    docPdf.text('Signature', margin + 135, y + 5.5);
    y += 8;

    // Filas de cada firmante
    const rowHeight = 16;
    meeting.attendees?.forEach((att, idx) => {
      if (y + rowHeight > 275) {
        docPdf.addPage();
        y = 20;
      }

      docPdf.setDrawColor(229, 231, 235);
      docPdf.rect(margin, y, pageWidth - margin * 2, rowHeight, 'S');

      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(9.5);
      docPdf.setTextColor(15, 23, 42);
      docPdf.text(`${idx + 1}`, margin + 3, y + 9.5);

      docPdf.setFont('helvetica', 'bold');
      docPdf.text(att.workerName, margin + 14, y + 9.5);

      docPdf.setFont('helvetica', 'normal');
      docPdf.setTextColor(107, 114, 128);
      docPdf.text(att.signedAt || '—', margin + 95, y + 9.5);

      if (att.signature && att.signature.startsWith('data:image')) {
        try {
          docPdf.addImage(att.signature, 'PNG', margin + 130, y + 1.5, 42, 13);
        } catch (err) {
          console.warn('Could not embed signature image:', err);
        }
      }

      y += rowHeight;
    });

    docPdf.setFont('helvetica', 'normal');
    docPdf.setFontSize(7.5);
    docPdf.setTextColor(156, 163, 175);
    docPdf.text(
      `Generated on ${new Date().toLocaleString('en-CA')} • Verified Digital Record`,
      margin,
      287
    );

    const safeSiteName = meeting.jobSite
      .split(',')[0]
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 25);

    docPdf.save(`Toolbox_Meeting_${meeting.dateStr}_${safeSiteName}.pdf`);
  };

  const uniqueLeads = Array.from(
    new Set(meetings.map((m) => m.leadName || m.leadEmail || 'Unknown'))
  );

  const filteredMeetings = meetings.filter((m) => {
    if (dateFilter && m.dateStr !== dateFilter) {
      return false;
    }

    if (leadFilter !== 'all') {
      const leadIdentifier = m.leadName || m.leadEmail || 'Unknown';
      if (leadIdentifier !== leadFilter) return false;
    }

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
    <div className="space-y-5 animate-fade-in">
      {/* Barra de Filtros Estilizada */}
      <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:flex-1">
          <label className="block text-xs font-bold text-slate-500 mb-1.5">
            Search Site, Topic, or Worker
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by address or worker name..."
              className="w-full pl-10 pr-4 py-3 bg-[#F4F6F9] border border-slate-200/80 rounded-2xl text-xs sm:text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#8B4513] font-medium transition-all text-slate-900"
            />
          </div>
        </div>

        <div className="flex w-full md:w-auto gap-3 items-end flex-wrap">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3.5 py-3 bg-[#F4F6F9] border border-slate-200/80 rounded-2xl text-xs sm:text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#8B4513] font-medium text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">
              Conducted By (Lead)
            </label>
            <select
              value={leadFilter}
              onChange={(e) => setLeadFilter(e.target.value)}
              className="px-3.5 py-3 bg-[#F4F6F9] border border-slate-200/80 rounded-2xl text-xs sm:text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#8B4513] font-medium text-slate-800 cursor-pointer"
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
              className="px-4 py-3 text-xs font-extrabold text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Lista de Reuniones */}
      {loading ? (
        <div className="bg-white p-12 rounded-3xl shadow-xs text-center text-xs font-semibold text-slate-400 animate-pulse">
          Loading safety compliance records...
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl shadow-xs text-center border border-slate-100">
          <ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-extrabold text-slate-800">No Toolbox Meetings Found</h4>
          <p className="text-xs text-slate-400 mt-1">
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
              className="bg-white p-5 rounded-3xl shadow-xs border border-slate-100 hover:border-[#8B4513]/40 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-[#FCEEE6] text-[#8B4513] rounded-full">
                    {meeting.dateStr}
                  </span>
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{meeting.leadName || meeting.leadEmail}</span>
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                    {meeting.topic}
                  </h4>
                  <div className="mt-1 space-y-1">
                    {meeting.projectName && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                        🏗️ {meeting.projectName}
                      </span>
                    )}
                    <MapLink location={meeting.jobSite} />
                  </div>
                </div>

                {/* Tags de Peligros Discutidos */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {meeting.hazards.slice(0, 3).map((h, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-[#F4F6F9] text-slate-600 rounded-xl text-[10px] font-bold"
                    >
                      {h.split('(')[0].trim()}
                    </span>
                  ))}
                  {meeting.hazards.length > 3 && (
                    <span className="px-2.5 py-1 bg-[#F4F6F9] text-slate-400 rounded-xl text-[10px] font-black">
                      +{meeting.hazards.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Pie de tarjeta con contador de firmas */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-extrabold text-emerald-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  {meeting.attendees?.length || 0} Workers Signed
                </span>
                <span className="text-xs font-extrabold text-[#8B4513] hover:underline flex items-center gap-0.5">
                  <span>View Signatures & Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Detallado de Auditoría e Inspección de Firmas */}
      {selectedMeeting && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in"
          onClick={() => setSelectedMeeting(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-5 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-[#FCEEE6] text-[#8B4513] rounded-full">
                  Safety Meeting Report
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1.5">
                  {selectedMeeting.topic}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Conducted by <span className="font-extrabold text-slate-800">{selectedMeeting.leadName || selectedMeeting.leadEmail}</span> on <span className="font-extrabold text-slate-800">{selectedMeeting.dateStr}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedMeeting(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ubicación */}
            <div>
              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                Job Site
              </p>
              <div className="p-3.5 bg-[#F4F6F9] rounded-2xl border border-slate-200/80">
                <MapLink location={selectedMeeting.jobSite} />
              </div>
            </div>

            {/* Peligros y Medidas */}
            <div>
              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                Hazards & Safety Controls Discussed
              </p>
              <div className="space-y-1.5 bg-[#F4F6F9] p-4 rounded-2xl border border-slate-200/80">
                {selectedMeeting.hazards.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notas específicas */}
            {selectedMeeting.notes && (
              <div>
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                  Supervisor Notes
                </p>
                <div className="p-3.5 bg-[#FEF3C7]/60 rounded-2xl border border-[#FEF3C7] text-xs font-medium text-amber-950">
                  {selectedMeeting.notes}
                </div>
              </div>
            )}

            {/* Firmas Táctiles de los Operarios */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Crew Signatures ({selectedMeeting.attendees?.length || 0})
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {selectedMeeting.attendees?.map((att, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-[#F4F6F9] border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-900 truncate">
                        {att.workerName}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400">
                        Signed at {att.signedAt}
                      </p>
                    </div>
                    <img
                      src={att.signature}
                      alt={`Signature of ${att.workerName}`}
                      className="h-9 w-24 object-contain bg-white border border-slate-200 rounded-xl p-1 shadow-2xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones: Botón Export to PDF + Cerrar */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleExportPDF(selectedMeeting)}
                className="px-4 py-3 bg-[#8B3A0E] hover:bg-[#722f0b] text-white text-xs font-extrabold rounded-2xl transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
              >
                <FileDown className="w-4 h-4" />
                <span>Export to PDF (WorkSafeBC)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMeeting(null)}
                className="px-5 py-3 bg-slate-900 hover:bg-black text-white text-xs font-extrabold rounded-2xl transition-colors cursor-pointer"
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