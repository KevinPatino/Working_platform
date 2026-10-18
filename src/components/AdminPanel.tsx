import React, { useState, useEffect } from "react";
import { db, auth, firebaseConfig } from "../firebaseConfig";
import { initializeApp, deleteApp } from "firebase/app";
import {
  collection,
  getDocs,
  query,
  setDoc,
  doc,
  Timestamp,
  where,
  getDoc,
} from "firebase/firestore";
import { 
  signOut, 
  getAuth, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import {
  Clock,
  ShieldCheck,
  Building2,
  Users,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  X,
  Check,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";

import Toast from "./Toast";
import PhotoModal from "./PhotoModal";
import MapLink from "./MapLink";
import ToolboxAuditor from "./ToolBoxAuditor";
import ProjectsManager from "./ProjectsManager";
import LocationInput from "./LocationInput";
import Header from "./Header";
import ExportExcelModal from "./ExportExcelModal";

import { 
  getBaseCycleIndex, 
  getPeriodRangeByIndex, 
  formatPeriodLegend, 
  getLocalTodayString 
} from '../utils/payroll';

interface AdminPanelProps {
  user: any;
}

const InlineEditForm = ({
  workerId,
  dateObj,
  onSave,
  onCancel,
  showNotification,
}: any) => {
  const [location, setLocation] = useState("");
  const [extraLocations, setExtraLocations] = useState<string[]>([]);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [totalHours, setTotalHours] = useState("");
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddLocation = () => {
    if (extraLocations.length < 2) {
      setExtraLocations([...extraLocations, ""]);
    }
  };

  const handleExtraLocationChange = (index: number, val: string) => {
    const updated = [...extraLocations];
    updated[index] = val;
    setExtraLocations(updated);
  };

  const handleRemoveExtraLocation = (index: number) => {
    setExtraLocations(extraLocations.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const cleanMain = location.trim();
    const cleanExtras = extraLocations.map((l) => l.trim()).filter(Boolean);

    if (!cleanMain || !checkIn || !checkOut || !totalHours) {
      showNotification("Please fill in all time and location fields.");
      return;
    }

    const allLocations = [cleanMain, ...cleanExtras];
    const combinedLocation = allLocations.join(" / ");

    setIsSubmitting(true);
    await onSave(workerId, dateObj, {
      location: combinedLocation,
      locations: allLocations,
      checkIn,
      checkOut,
      totalHours,
      comments,
    });
    setIsSubmitting(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs animate-fade-in w-full items-start">
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] uppercase font-extrabold text-slate-400">
          Location
        </label>
        <LocationInput
          value={location}
          onChange={(val) => setLocation(val)}
          className="p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#8B4513] focus:ring-2 focus:ring-[#8B4513]/20 transition-all bg-[#F4F6F9] font-semibold text-slate-900"
          placeholder="Primary job site"
          required
        />

        {extraLocations.map((extraLoc, index) => (
          <div key={index} className="flex gap-1.5 animate-fade-in items-center">
            <LocationInput
              value={extraLoc}
              onChange={(val) => handleExtraLocationChange(index, val)}
              placeholder={`Additional job site ${index + 2}`}
              wrapperClassName="flex-1"
              className="p-3 border border-slate-200 bg-[#F4F6F9] rounded-xl text-xs outline-none focus:border-[#8B4513] font-semibold text-slate-900"
              required
            />
            <button
              type="button"
              onClick={() => handleRemoveExtraLocation(index)}
              className="p-2 bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="Remove site"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {extraLocations.length < 2 && (
          <button
            type="button"
            onClick={handleAddLocation}
            className="text-[11px] font-extrabold text-[#8B4513] hover:text-[#722f0b] transition-colors text-left cursor-pointer mt-0.5"
          >
            + Add another job site
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[10px] uppercase font-extrabold text-slate-400">
            Check In
          </label>
          <input
            type="time"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#8B4513] transition-all bg-[#F4F6F9] font-bold text-slate-900"
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] uppercase font-extrabold text-slate-400">
            Check Out
          </label>
          <input
            type="time"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#8B4513] transition-all bg-[#F4F6F9] font-bold text-slate-900"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <div className="w-20">
          <label className="text-[10px] uppercase font-extrabold text-slate-400">
            Hrs
          </label>
          <input
            type="number"
            step="0.5"
            value={totalHours}
            onChange={(e) => setTotalHours(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#8B4513] transition-all bg-[#F4F6F9] font-black text-[#8B4513]"
            placeholder="0"
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] uppercase font-extrabold text-slate-400">
            Note
          </label>
          <input
            type="text"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#8B4513] transition-all bg-[#F4F6F9] font-medium text-slate-800"
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="flex gap-2 items-center justify-end md:mt-5">
        <button
          onClick={onCancel}
          className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className="p-3 bg-[#8B3A0E] text-white rounded-xl hover:bg-[#722f0b] transition-colors disabled:opacity-50 shadow-xs cursor-pointer disabled:cursor-not-allowed"
          title="Save"
        >
          {isSubmitting ? (
            <span className="text-xs font-bold px-1">...</span>
          ) : (
            <Check className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};

const getFirstDayOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const AdminPanel: React.FC<AdminPanelProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'payroll' | 'safety' | 'team' | 'projects'>('payroll');
  const [adminCompanyId, setAdminCompanyId] = useState<string | null>(null);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [allRegisteredUsers, setAllRegisteredUsers] = useState<any[]>([]);
  const [oldestLoadedDate, setOldestLoadedDate] =
    useState<Date>(getFirstDayOfMonth());
  const [selectedUser, setSelectedUser] = useState("All");
  const [startDate, setStartDate] = useState(getLocalTodayString());
  const [endDate, setEndDate] = useState("");
  const [expandedRangeUserId, setExpandedRangeUserId] = useState<string | null>(
    null,
  );
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);

  // Estado para controlar el Modal de Exportación Avanzada
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [activeCycleIndex, setActiveCycleIndex] =
    useState<number>(getBaseCycleIndex());

  const [activeEvidencePhotos, setActiveEvidencePhotos] = useState<
    string[] | null
  >(null);
  const [evidenceModalTitle, setEvidenceModalTitle] = useState<string>("");

  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerEmail, setNewWorkerEmail] = useState("");
  const [newWorkerRole, setNewWorkerRole] = useState<"worker" | "teamlead">("worker");
  const [newWorkerPassword, setNewWorkerPassword] = useState("");
  const [creatingWorker, setCreatingWorker] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const showNotification = (message: string) => {
    setToastMessage(message);
  };

  const loadUsers = async (companyId: string) => {
    try {
      const q = query(collection(db, "users"), where("companyId", "==", companyId));
      const usersSnapshot = await getDocs(q);
      const usersList: any[] = [];

      usersSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.email !== user.email) {
          usersList.push({
            id: docSnap.id,
            fullName: data.fullName || data.email,
            email: data.email,
            role: data.role || "worker",
          });
        }
      });

      usersList.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setAllRegisteredUsers(usersList);
    } catch (error: any) {
      showNotification("Error loading users: " + error.message);
    }
  };

  const loadLogs = async (fromDate: Date, companyId: string) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "timeLogs"),
        where("companyId", "==", companyId),
        where("timestamp", ">=", Timestamp.fromDate(fromDate)),
      );
      const querySnapshot = await getDocs(q);

      const logsData: any[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.userEmail !== user.email) {
          logsData.push({ id: docSnap.id, ...data });
        }
      });

      setAllLogs(logsData);
      setOldestLoadedDate(fromDate);
    } catch (error: any) {
      showNotification("Error loading logs: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initData = async () => {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const companyId = userDoc.data().companyId;
        setAdminCompanyId(companyId);
        
        if (companyId) {
          await loadUsers(companyId);
          await loadLogs(getFirstDayOfMonth(), companyId);
        }
      }
    };
    initData();
  }, [user]);

  useEffect(() => {
    if (startDate && adminCompanyId) {
      const selectedDate = new Date(startDate + "T00:00:00");
      if (selectedDate < oldestLoadedDate) {
        loadLogs(selectedDate, adminCompanyId);
      }
    }
  }, [startDate, adminCompanyId]);

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminCompanyId) {
      showNotification("Error: Admin company ID not found.");
      return;
    }

    const cleanName = newWorkerName.trim();
    const cleanEmail = newWorkerEmail.trim().toLowerCase();
    const cleanPass = newWorkerPassword.trim();

    if (!cleanName || !cleanEmail || cleanPass.length < 6) {
      showNotification("Please fill all fields. Password must be at least 6 characters.");
      return;
    }

    setCreatingWorker(true);
    const tempAppName = `temp_worker_creation_${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, tempAppName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        cleanEmail,
        cleanPass
      );
      const newUid = userCredential.user.uid;

      await setDoc(doc(db, "users", newUid), {
        fullName: cleanName,
        email: cleanEmail,
        role: newWorkerRole,
        companyId: adminCompanyId,
        createdAt: Timestamp.now(),
      });

      await signOut(secondaryAuth);

      showNotification(`Employee "${cleanName}" created successfully!`);
      setNewWorkerName("");
      setNewWorkerEmail("");
      setNewWorkerRole("worker");
      setNewWorkerPassword("");

      await loadUsers(adminCompanyId);
    } catch (error: any) {
      console.error("Error creating employee:", error);
      showNotification("Error creating employee: " + error.message);
    } finally {
      await deleteApp(secondaryApp);
      setCreatingWorker(false);
    }
  };

  const handleInlineSubmit = async (
    workerId: string,
    dateObj: Date,
    data: any,
  ) => {
    try {
      const targetWorker = allRegisteredUsers.find((w) => w.id === workerId);
      if (!targetWorker) return;

      const [hours, minutes] = data.checkIn.split(":");
      const finalDate = new Date(dateObj);
      finalDate.setHours(Number(hours), Number(minutes), 0, 0);

      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      const docId = `${targetWorker.id}_${dateStr}`;

      await setDoc(
        doc(db, "timeLogs", docId),
        {
          userId: targetWorker.id,
          userEmail: targetWorker.email,
          companyId: adminCompanyId,
          location: data.location,
          locations: data.locations || [data.location],
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          totalHours: Number(data.totalHours),
          comments: data.comments || "",
          timestamp: Timestamp.fromDate(finalDate),
          dateStr: dateStr,
        },
        { merge: true },
      );

      showNotification("Log added successfully!");
      setEditingRowKey(null);
      loadLogs(oldestLoadedDate, adminCompanyId!);
    } catch (error: any) {
      showNotification("Error saving: " + error.message);
    }
  };

  const toggleRangeRow = (userId: string) => {
    setExpandedRangeUserId(expandedRangeUserId === userId ? null : userId);
  };

  const getDatesInRange = (startStr: string, endStr: string) => {
    const dates = [];
    const current = new Date(startStr + "T00:00:00");
    const end = new Date(endStr + "T00:00:00");
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const filteredUsers =
    selectedUser === "All"
      ? allRegisteredUsers
      : allRegisteredUsers.filter((worker) => worker.id === selectedUser);

  const displayedUsers = [...filteredUsers].sort((a, b) =>
    a.fullName.localeCompare(b.fullName),
  );

  // Función ejecutada desde el modal de exportación para generar el archivo Excel (.xlsx)
  const handleExecuteExportExcel = ({ startDate: expStart, endDate: expEnd, selectedUser: expUser, selectedProject: expProj }: any) => {
    if (!expStart) {
      showNotification("Please select a start date for the export.");
      return;
    }

    const effectiveEndDate = expEnd ? expEnd : expStart;
    const startMs = new Date(expStart + "T00:00:00").getTime();
    const endMs = new Date(effectiveEndDate + "T23:59:59").getTime();
    const datesInRange = getDatesInRange(expStart, effectiveEndDate);

    const targetWorkers =
      expUser === "All"
        ? allRegisteredUsers
        : allRegisteredUsers.filter((w) => w.id === expUser);

    const summaryRows: any[] = [];
    const detailedRows: any[] = [];
    let grandTotalHours = 0;

    targetWorkers.forEach((worker) => {
      const userLogsInRange = allLogs.filter((log) => {
        if (!log.timestamp || log.userId !== worker.id) return false;
        const logTime = log.timestamp.toDate().getTime();
        
        if (logTime < startMs || logTime > endMs) return false;
        if (expProj !== "All" && log.projectId !== expProj) return false;

        return true;
      });

      userLogsInRange.sort(
        (a, b) => a.timestamp.toDate().getTime() - b.timestamp.toDate().getTime()
      );

      const totalWorkerHours = userLogsInRange.reduce(
        (sum, log) => sum + (Number(log.totalHours) || 0),
        0
      );

      grandTotalHours += totalWorkerHours;

      summaryRows.push({
        "Worker Name": worker.fullName,
        "Email": worker.email,
        "Role": worker.role === "teamlead" ? "Team Lead" : "Worker",
        "Period Start": expStart,
        "Period End": effectiveEndDate,
        "Days Logged": userLogsInRange.length,
        "Total Days in Period": datesInRange.length,
        "Total Accumulated Hours": totalWorkerHours,
      });

      userLogsInRange.forEach((log) => {
        const logDateObj = log.timestamp.toDate();
        const y = logDateObj.getFullYear();
        const m = String(logDateObj.getMonth() + 1).padStart(2, "0");
        const d = String(logDateObj.getDate()).padStart(2, "0");
        const formattedDate = log.dateStr || `${y}-${m}-${d}`;
        const dayName = logDateObj.toLocaleDateString("en-US", { weekday: "short" });

        detailedRows.push({
          "Worker Name": worker.fullName,
          "Role": worker.role === "teamlead" ? "Team Lead" : "Worker",
          "Date": formattedDate,
          "Day": dayName,
          "Project": log.projectName || "Custom Address",
          "Location / Job Site": log.location || "",
          "Check In": log.checkIn || "",
          "Check Out": log.checkOut || "",
          "Hours Worked": Number(log.totalHours) || 0,
          "Field Notes": log.comments || "",
        });
      });
    });

    summaryRows.push({
      "Worker Name": "GRAND TOTAL",
      "Email": "",
      "Role": "",
      "Period Start": expStart,
      "Period End": effectiveEndDate,
      "Days Logged": "",
      "Total Days in Period": "",
      "Total Accumulated Hours": grandTotalHours,
    });

    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    summarySheet["!cols"] = [
      { wch: 25 }, { wch: 28 }, { wch: 14 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 24 },
    ];
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Payroll Summary");

    const detailedSheet = XLSX.utils.json_to_sheet(
      detailedRows.length > 0
        ? detailedRows
        : [{ Message: "No shifts found matching the selected filters." }]
    );
    detailedSheet["!cols"] = [
      { wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
      { wch: 22 }, { wch: 38 }, { wch: 12 }, { wch: 12 },
      { wch: 15 }, { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(workbook, detailedSheet, "Detailed Daily Logs");

    const fileName =
      expEnd && expEnd !== expStart
        ? `Payroll_Report_${expStart}_to_${expEnd}.xlsx`
        : `Payroll_Report_${expStart}.xlsx`;

    XLSX.writeFile(workbook, fileName);
    setIsExportModalOpen(false);
    showNotification("Custom Excel report downloaded successfully!");
  };

  const handleSelectToday = () => {
    setStartDate(getLocalTodayString());
    setEndDate("");
    setExpandedRangeUserId(null);
    setEditingRowKey(null);
  };

  const handleSelectPeriodToPay = () => {
    const payIndex = getBaseCycleIndex() - 1;
    setActiveCycleIndex(payIndex);
    const range = getPeriodRangeByIndex(payIndex);
    setStartDate(range.start);
    setEndDate(range.end);
    setExpandedRangeUserId(null);
    setEditingRowKey(null);
  };

  const handleSelectCurrentPeriod = () => {
    const baseIndex = getBaseCycleIndex();
    setActiveCycleIndex(baseIndex);
    const range = getPeriodRangeByIndex(baseIndex);
    setStartDate(range.start);
    setEndDate(range.end);
    setExpandedRangeUserId(null);
    setEditingRowKey(null);
  };

  const handlePrevPeriod = () => {
    const newIndex = activeCycleIndex - 1;
    setActiveCycleIndex(newIndex);
    const range = getPeriodRangeByIndex(newIndex);
    setStartDate(range.start);
    setEndDate(range.end);
    setExpandedRangeUserId(null);
    setEditingRowKey(null);
  };

  const handleNextPeriod = () => {
    const newIndex = activeCycleIndex + 1;
    setActiveCycleIndex(newIndex);
    const range = getPeriodRangeByIndex(newIndex);
    setStartDate(range.start);
    setEndDate(range.end);
    setExpandedRangeUserId(null);
    setEditingRowKey(null);
  };

  const handleClearFilters = () => {
    setSelectedUser("All");
    setStartDate(getLocalTodayString());
    setEndDate("");
    setExpandedRangeUserId(null);
    setEditingRowKey(null);
    setActiveCycleIndex(getBaseCycleIndex());
  };

  const isTodayActive =
    startDate === getLocalTodayString() && (!endDate || endDate === startDate);
  const isPeriodActive = Boolean(endDate && endDate !== startDate);

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-900 pb-12 relative">
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {/* Cabecera Principal Estandarizada */}
      <Header 
        userName="Wester Trades"  
        role="admin"                       
        onLogout={handleLogout} 
      />

      <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        
        {/* Selector de Pestañas Estilo Píldora */}
        <div className="grid grid-cols-2 sm:grid-cols-4 p-1.5 bg-[#EEF2F6] rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('payroll')}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'payroll'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${activeTab === 'payroll' ? 'text-[#8B4513]' : 'text-slate-400'}`} />
            <span>Hours & Payroll</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('safety')}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'safety'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${activeTab === 'safety' ? 'text-[#8B4513]' : 'text-slate-400'}`} />
            <span>Safety Briefings</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'projects'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className={`w-3.5 h-3.5 ${activeTab === 'projects' ? 'text-[#8B4513]' : 'text-slate-400'}`} />
            <span>Projects</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('team')}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'team'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className={`w-3.5 h-3.5 ${activeTab === 'team' ? 'text-[#8B4513]' : 'text-slate-400'}`} />
            <span>Team ({allRegisteredUsers.length})</span>
          </button>
        </div>

        {/* PESTAÑA 1: Horas y Nómina */}
        {activeTab === 'payroll' && (
          <div className="space-y-5 animate-fade-in">
            <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-100 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                    Quick View:
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectToday}
                    className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl border transition-colors cursor-pointer ${
                      isTodayActive
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                    }`}
                  >
                    📍 Today
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mr-1">
                    Pay Periods:
                  </span>

                  <button
                    type="button"
                    onClick={handlePrevPeriod}
                    className="w-8 h-8 flex items-center justify-center bg-[#F4F6F9] text-slate-700 hover:bg-[#FCEEE6] hover:text-[#8B4513] rounded-xl border border-slate-200/60 transition-colors cursor-pointer"
                    title="Previous Pay Period"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {isPeriodActive && (
                    <span className="text-xs font-extrabold text-[#8B4513] bg-[#FCEEE6] px-3 py-1.5 rounded-xl border border-[#8B4513]/20 tracking-wide">
                      📅 {formatPeriodLegend(startDate, endDate)}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleSelectPeriodToPay}
                    className="px-3.5 py-1.5 text-xs font-extrabold text-[#8B4513] bg-[#FCEEE6] hover:bg-[#f7decb] rounded-xl transition-colors cursor-pointer"
                  >
                    💰 Period to Pay
                  </button>

                  <button
                    type="button"
                    onClick={handleSelectCurrentPeriod}
                    className="px-3.5 py-1.5 text-xs font-extrabold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    📅 Current Period
                  </button>

                  <button
                    type="button"
                    onClick={handleNextPeriod}
                    className="w-8 h-8 flex items-center justify-center bg-[#F4F6F9] text-slate-700 hover:bg-[#FCEEE6] hover:text-[#8B4513] rounded-xl border border-slate-200/60 transition-colors cursor-pointer"
                    title="Next Pay Period"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">
                    Worker
                  </label>
                  <select
                    value={selectedUser}
                    onChange={(e) => {
                      setSelectedUser(e.target.value);
                      setExpandedRangeUserId(null);
                    }}
                    className="w-full p-3.5 border border-slate-200 rounded-2xl text-xs sm:text-sm bg-[#F4F6F9] focus:bg-white focus:ring-2 focus:ring-[#8B4513] outline-none font-semibold cursor-pointer"
                  >
                    <option value="All">All workers</option>
                    {allRegisteredUsers.map((worker) => (
                      <option key={worker.id} value={worker.id}>
                        {worker.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">
                    Specific Day / From
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-3.5 border border-slate-200 rounded-2xl text-xs sm:text-sm bg-[#F4F6F9] focus:bg-white focus:ring-2 focus:ring-[#8B4513] outline-none font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">
                    To (Optional)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-3.5 border border-slate-200 rounded-2xl text-xs sm:text-sm bg-[#F4F6F9] focus:bg-white focus:ring-2 focus:ring-[#8B4513] outline-none font-semibold text-slate-800"
                  />
                </div>
                <button
                  onClick={handleClearFilters}
                  className="w-full py-3.5 text-xs font-extrabold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xs border border-slate-100 overflow-hidden">
              {!startDate && (
                <div className="p-12 text-center flex flex-col items-center">
                  <h3 className="text-lg font-bold text-slate-700">
                    Select a date
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md">
                    Choose a 'From' date to view the details for that period.
                  </p>
                </div>
              )}

              {startDate && (
                <div>
                  <div className="p-4 bg-[#FCEEE6] border-b border-[#8B4513]/10 text-[#8B4513] text-xs font-extrabold flex flex-wrap justify-between items-center gap-3">
                    <span>
                      Report:{" "}
                      {new Date(startDate + "T00:00:00").toLocaleDateString(
                        "en-US",
                      )}
                      {endDate && endDate !== startDate
                        ? ` to ${new Date(endDate + "T23:59:59").toLocaleDateString("en-US")}`
                        : ""}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="bg-white text-[#8B4513] px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-2xs">
                        Active Data
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsExportModalOpen(true)}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition-colors shadow-xs cursor-pointer"
                        title="Open Export Options"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Excel</span>
                      </button>
                    </div>
                  </div>

                  {loading ? (
                    <div className="p-12 text-center text-slate-400 text-xs font-semibold animate-pulse">
                      Querying Database...
                    </div>
                  ) : (
                    <>
                      {/* VISTA MÓVIL: Tarjetas apiladas */}
                      <div className="block md:hidden divide-y divide-slate-100">
                        {displayedUsers.map((worker) => {
                          const effectiveEndDate = endDate ? endDate : startDate;
                          const start = new Date(startDate + "T00:00:00").getTime();
                          const end = new Date(effectiveEndDate + "T23:59:59").getTime();

                          const userLogsInRange = allLogs.filter((log) => {
                            if (!log.timestamp || log.userId !== worker.id) return false;
                            const logTime = log.timestamp.toDate().getTime();
                            return logTime >= start && logTime <= end;
                          });

                          const totalWorkerHours = userLogsInRange.reduce(
                            (sum, log) => sum + (Number(log.totalHours) || 0),
                            0
                          );

                          const totalWorkerPhotos = userLogsInRange.reduce(
                            (sum, log) => sum + (log.photos && Array.isArray(log.photos) ? log.photos.length : 0),
                            0
                          );

                          const isExpanded = expandedRangeUserId === worker.id;
                          const datesInRange = getDatesInRange(startDate, effectiveEndDate);

                          return (
                            <div key={`mob-${worker.id}`} className="p-4 bg-white space-y-3">
                              <div 
                                onClick={() => toggleRangeRow(worker.id)}
                                className="flex justify-between items-center cursor-pointer"
                              >
                                <div>
                                  <p className="font-extrabold text-slate-900 text-sm">{worker.fullName}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-xs text-slate-500 font-medium">
                                      {userLogsInRange.length} of {datesInRange.length} days
                                    </p>
                                    {totalWorkerPhotos > 0 && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#8B4513] bg-[#FCEEE6] px-2.5 py-0.5 rounded-full">
                                        📷 {totalWorkerPhotos}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`text-lg font-black ${totalWorkerHours > 0 ? "text-[#8B4513]" : "text-slate-300"}`}>
                                    {totalWorkerHours}h
                                  </span>
                                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="pt-3 border-t border-slate-100 space-y-2.5 bg-[#F4F6F9] p-3.5 rounded-2xl">
                                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">Detailed Daily Log</h4>
                                  {datesInRange.map((dateObj, index) => {
                                    const logsForDay = userLogsInRange.filter((log) => {
                                      const logDate = log.timestamp.toDate();
                                      return (
                                        logDate.getDate() === dateObj.getDate() &&
                                        logDate.getMonth() === dateObj.getMonth() &&
                                        logDate.getFullYear() === dateObj.getFullYear()
                                      );
                                    });

                                    const rowKey = `${worker.id}-${dateObj.getTime()}`;
                                    const isEditingThisRow = editingRowKey === rowKey;
                                    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                                    if (logsForDay.length > 0) {
                                      return logsForDay.map((log) => (
                                        <div key={log.id} className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                                          <div className="flex justify-between items-center text-xs">
                                            <span className="font-extrabold text-slate-800">
                                              {dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                            </span>
                                            <span className="font-black text-[#8B4513] bg-[#FCEEE6] px-2 py-0.5 rounded-full">
                                              {log.totalHours}h
                                            </span>
                                          </div>
                                          <div className="text-xs text-slate-600 space-y-1">
                                            {log.locations && Array.isArray(log.locations) && log.locations.length > 0 ? (
                                              log.locations.map((loc: string, idx: number) => (
                                                <MapLink key={idx} location={loc} />
                                              ))
                                            ) : (
                                              <MapLink location={log.location} />
                                            )}
                                          </div>
                                          <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
                                            <span className="font-medium">🕒 {log.checkIn} - {log.checkOut}</span>
                                            {log.photos && log.photos.length > 0 && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setActiveEvidencePhotos(log.photos);
                                                  setEvidenceModalTitle(`Evidence: ${worker.fullName}`);
                                                }}
                                                className="text-[#8B4513] font-bold underline"
                                              >
                                                📷 {log.photos.length} photos
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      ));
                                    } else if (isEditingThisRow) {
                                      return (
                                        <div key={`mob-edit-${index}`} className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
                                          <span className="text-xs font-extrabold text-slate-800">
                                            Add Hours for {dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                          </span>
                                          <InlineEditForm
                                            workerId={worker.id}
                                            dateObj={dateObj}
                                            onSave={handleInlineSubmit}
                                            onCancel={() => setEditingRowKey(null)}
                                            showNotification={showNotification}
                                          />
                                        </div>
                                      );
                                    } else {
                                      return (
                                        <div key={`mob-missing-${index}`} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-200/80 text-xs">
                                          <span className={`font-medium ${isWeekend ? "text-amber-700" : "text-red-600"}`}>
                                            {dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} (No Log)
                                          </span>
                                          <button
                                            onClick={() => setEditingRowKey(rowKey)}
                                            className="px-3 py-1 bg-red-50 text-red-600 font-extrabold rounded-xl hover:bg-red-100"
                                          >
                                            + Add
                                          </button>
                                        </div>
                                      );
                                    }
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* VISTA ESCRITORIO: Tabla clásica estilizada */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-[#F4F6F9] text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                            <tr>
                              <th className="p-4">Worker</th>
                              <th className="p-4 text-center">
                                Total Accumulated Hours
                              </th>
                              <th className="p-4 text-right">Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {displayedUsers.map((worker) => {
                              const effectiveEndDate = endDate ? endDate : startDate;
                              const start = new Date(
                                startDate + "T00:00:00",
                              ).getTime();
                              const end = new Date(
                                effectiveEndDate + "T23:59:59",
                              ).getTime();

                              const userLogsInRange = allLogs.filter((log) => {
                                if (!log.timestamp || log.userId !== worker.id)
                                  return false;
                                const logTime = log.timestamp.toDate().getTime();
                                return logTime >= start && logTime <= end;
                              });

                              const totalWorkerHours = userLogsInRange.reduce(
                                (sum, log) => sum + (Number(log.totalHours) || 0),
                                0,
                              );

                              const totalWorkerPhotos = userLogsInRange.reduce(
                                (sum, log) =>
                                  sum +
                                  (log.photos && Array.isArray(log.photos)
                                    ? log.photos.length
                                    : 0),
                                0,
                              );

                              const isExpanded = expandedRangeUserId === worker.id;
                              const datesInRange = getDatesInRange(
                                startDate,
                                effectiveEndDate,
                              );

                              return (
                                <React.Fragment key={worker.id}>
                                  <tr
                                    onClick={() => toggleRangeRow(worker.id)}
                                    className="transition-colors hover:bg-[#F4F6F9]/60 cursor-pointer"
                                  >
                                    <td className="p-4">
                                      <p className="font-extrabold text-slate-900 text-sm">
                                        {worker.fullName}
                                      </p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-xs text-slate-500 font-medium">
                                          {userLogsInRange.length} of{" "}
                                          {datesInRange.length} days
                                        </p>
                                        {totalWorkerPhotos > 0 && (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#8B4513] bg-[#FCEEE6] px-2.5 py-0.5 rounded-full">
                                            📷 {totalWorkerPhotos}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-4 text-center">
                                      <span
                                        className={`text-xl font-black ${totalWorkerHours > 0 ? "text-[#8B4513]" : "text-slate-300"}`}
                                      >
                                        {totalWorkerHours}h
                                      </span>
                                    </td>
                                    <td className="p-4 text-right">
                                      <ChevronDown
                                        className={`w-4 h-4 text-slate-400 inline-block transition-transform duration-200 ${
                                          isExpanded
                                            ? "rotate-180"
                                            : "rotate-0"
                                        }`}
                                      />
                                    </td>
                                  </tr>

                                  {isExpanded && (
                                    <tr className="bg-[#F4F6F9] border-b border-slate-200/60">
                                      <td colSpan={3} className="p-0">
                                        <div className="p-5 md:p-6 shadow-inner">
                                          <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-3">
                                            Detailed View
                                          </h4>
                                          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
                                            <table className="w-full text-left text-sm bg-white">
                                              <thead className="bg-[#F4F6F9] text-xs font-extrabold text-slate-400 uppercase border-b border-slate-200/60">
                                                <tr>
                                                  <th className="p-3.5">Date</th>
                                                  <th className="p-3.5">Status</th>
                                                  <th className="p-3.5">
                                                    Location / Job Site
                                                  </th>
                                                  <th className="p-3.5 text-center">
                                                    Schedule
                                                  </th>
                                                  <th className="p-3.5 text-center">
                                                    Hours
                                                  </th>
                                                  <th className="p-3.5 text-center">
                                                    Evidence
                                                  </th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-100">
                                                {datesInRange.map(
                                                  (dateObj, index) => {
                                                    const logsForDay =
                                                      userLogsInRange.filter(
                                                        (log) => {
                                                          const logDate =
                                                            log.timestamp.toDate();
                                                          return (
                                                            logDate.getDate() ===
                                                              dateObj.getDate() &&
                                                            logDate.getMonth() ===
                                                              dateObj.getMonth() &&
                                                            logDate.getFullYear() ===
                                                              dateObj.getFullYear()
                                                          );
                                                        },
                                                      );

                                                    const isWeekend =
                                                      dateObj.getDay() === 0 ||
                                                      dateObj.getDay() === 6;
                                                    const rowKey = `${worker.id}-${dateObj.getTime()}`;
                                                    const isEditingThisRow =
                                                      editingRowKey === rowKey;

                                                    if (logsForDay.length > 0) {
                                                      return logsForDay.map((log) => {
                                                        const hasPhotos =
                                                          log.photos &&
                                                          Array.isArray(log.photos) &&
                                                          log.photos.length > 0;

                                                        return (
                                                          <tr
                                                            key={log.id}
                                                            className="hover:bg-slate-50 transition-colors"
                                                          >
                                                            <td className="p-3.5">
                                                              <span
                                                                className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${isWeekend ? "bg-amber-100 text-amber-800" : "text-slate-700 font-semibold"}`}
                                                              >
                                                                {dateObj.toLocaleDateString(
                                                                  "en-US",
                                                                  {
                                                                    weekday: "short",
                                                                    day: "2-digit",
                                                                    month: "short",
                                                                  },
                                                                )}
                                                              </span>
                                                            </td>
                                                            <td className="p-3.5">
                                                              <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                                                                Worked
                                                              </span>
                                                            </td>
                                                            <td className="p-3.5 text-slate-700">
                                                              <MapLink
                                                                location={
                                                                  log.location
                                                                }
                                                              />
                                                            </td>
                                                            <td className="p-3.5 text-center text-slate-600 font-medium">
                                                              {log.checkIn} -{" "}
                                                              {log.checkOut}
                                                            </td>
                                                            <td className="p-3.5 text-center font-black text-[#8B4513]">
                                                              {log.totalHours}h
                                                            </td>
                                                            <td className="p-3.5 text-center">
                                                              {hasPhotos ? (
                                                                <button
                                                                  type="button"
                                                                  onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveEvidencePhotos(
                                                                      log.photos,
                                                                    );
                                                                    setEvidenceModalTitle(
                                                                      `Evidence: ${worker.fullName} • ${dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`,
                                                                    );
                                                                  }}
                                                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FCEEE6] text-[#8B4513] hover:bg-[#f7decb] border border-[#8B4513]/20 rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
                                                                  title="View site photos"
                                                                >
                                                                  <span>📷</span>
                                                                  <span>
                                                                    {
                                                                      log.photos
                                                                        .length
                                                                    }
                                                                  </span>
                                                                </button>
                                                              ) : (
                                                                <span className="text-slate-300 text-xs">
                                                                  —
                                                                </span>
                                                              )}
                                                            </td>
                                                          </tr>
                                                        );
                                                      });
                                                    } else if (isEditingThisRow) {
                                                      return (
                                                        <tr
                                                          key={`edit-${index}`}
                                                          className="bg-[#F4F6F9]"
                                                        >
                                                          <td className="p-3.5 align-top">
                                                            <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-slate-200 text-slate-700">
                                                              {dateObj.toLocaleDateString(
                                                                "en-US",
                                                                {
                                                                  weekday: "short",
                                                                  day: "2-digit",
                                                                  month: "short",
                                                                },
                                                              )}
                                                            </span>
                                                          </td>
                                                          <td
                                                            colSpan={5}
                                                            className="p-3.5"
                                                          >
                                                            <InlineEditForm
                                                              workerId={worker.id}
                                                              dateObj={dateObj}
                                                              onSave={
                                                                handleInlineSubmit
                                                              }
                                                              onCancel={() =>
                                                                setEditingRowKey(null)
                                                              }
                                                              showNotification={
                                                                showNotification
                                                              }
                                                            />
                                                          </td>
                                                        </tr>
                                                      );
                                                    } else {
                                                      return (
                                                        <tr
                                                          key={`missing-${index}`}
                                                          className="bg-red-50/30 hover:bg-red-50 transition-colors group"
                                                        >
                                                          <td className="p-3.5">
                                                            <span
                                                              className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold ${isWeekend ? "bg-amber-100 text-amber-800" : "text-red-700 bg-red-100"}`}
                                                            >
                                                              {dateObj.toLocaleDateString(
                                                                "en-US",
                                                                {
                                                                  weekday: "short",
                                                                  day: "2-digit",
                                                                  month: "short",
                                                                },
                                                              )}
                                                            </span>
                                                          </td>
                                                          <td className="p-3.5">
                                                            <span className="text-xs font-extrabold text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                                                              No Log
                                                            </span>
                                                          </td>
                                                          <td
                                                            className="p-3.5 text-slate-400 italic"
                                                            colSpan={3}
                                                          ></td>
                                                          <td className="p-3.5 text-center">
                                                            <button
                                                              onClick={() =>
                                                                setEditingRowKey(
                                                                  rowKey,
                                                                )
                                                              }
                                                              className="px-3 py-1 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-[#FCEEE6] hover:border-[#8B4513] transition-colors font-extrabold text-xs shadow-2xs cursor-pointer"
                                                              title="Add missing hours"
                                                            >
                                                              + Add
                                                            </button>
                                                          </td>
                                                        </tr>
                                                      );
                                                    }
                                                  },
                                                )}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                            {displayedUsers.length === 0 && (
                              <tr>
                                <td
                                  colSpan={3}
                                  className="p-8 text-center text-slate-400 text-xs"
                                >
                                  No workers found.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA 2: Charlas de Seguridad (Toolbox Meetings) */}
        {activeTab === 'safety' && (
          <div className="animate-fade-in">
            <ToolboxAuditor companyId={adminCompanyId} />
          </div>
        )}

        {/* PESTAÑA: Proyectos para el Administrador */}
        {activeTab === 'projects' && (
          <div className="animate-fade-in">
            <ProjectsManager
              companyId={adminCompanyId}
              currentUser={user}
              showNotification={showNotification}
            />
          </div>
        )}

        {/* PESTAÑA 3: Gestión de Equipo y Alta de Trabajadores */}
        {activeTab === 'team' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-in">
            
            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-100 h-fit">
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-[#FCEEE6] text-[#8B4513] rounded-full">
                Onboarding
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-1 mb-4">
                Register New Employee
              </h3>

              <form onSubmit={handleCreateWorker} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={newWorkerName}
                    onChange={(e) => setNewWorkerName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full p-3.5 border border-slate-200/80 rounded-2xl text-xs sm:text-sm bg-[#F4F6F9] focus:bg-white focus:ring-2 focus:ring-[#8B4513] outline-none font-semibold text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newWorkerEmail}
                    onChange={(e) => setNewWorkerEmail(e.target.value)}
                    placeholder="worker@company.com"
                    className="w-full p-3.5 border border-slate-200/80 rounded-2xl text-xs sm:text-sm bg-[#F4F6F9] focus:bg-white focus:ring-2 focus:ring-[#8B4513] outline-none font-semibold text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">
                    Role
                  </label>
                  <select
                    value={newWorkerRole}
                    onChange={(e) => setNewWorkerRole(e.target.value as "worker" | "teamlead")}
                    className="w-full p-3.5 border border-slate-200/80 rounded-2xl text-xs sm:text-sm bg-[#F4F6F9] focus:bg-white focus:ring-2 focus:ring-[#8B4513] outline-none font-semibold text-slate-950 cursor-pointer"
                  >
                    <option value="worker">Worker (Field Operatives)</option>
                    <option value="teamlead">Team Lead (Photos & Toolbox Talks)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">
                    Temporary Password
                  </label>
                  <input
                    type="text"
                    value={newWorkerPassword}
                    onChange={(e) => setNewWorkerPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    minLength={6}
                    className="w-full p-3.5 border border-slate-200/80 rounded-2xl text-xs sm:text-sm bg-[#F4F6F9] focus:bg-white focus:ring-2 focus:ring-[#8B4513] outline-none font-mono font-bold text-slate-900"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">
                    Share this password with the worker so they can log in.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={creatingWorker}
                  className="w-full py-4 bg-[#8B3A0E] hover:bg-[#722f0b] disabled:opacity-50 text-white rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{creatingWorker ? "Creating Account..." : "Add Employee to Company"}</span>
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white rounded-3xl shadow-xs border border-slate-100 overflow-hidden h-fit">
              <div className="p-5 bg-white border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Active Company Roster
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Company ID: <span className="font-mono font-extrabold text-slate-600">{adminCompanyId || "Loading..."}</span>
                  </p>
                </div>
                <span className="px-3.5 py-1 bg-[#FCEEE6] text-[#8B4513] rounded-full text-xs font-extrabold">
                  {allRegisteredUsers.length} Employees
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F4F6F9] text-[11px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4 text-center">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allRegisteredUsers.map((worker) => (
                      <tr key={worker.id} className="hover:bg-[#F4F6F9]/50 transition-colors">
                        <td className="p-4 font-extrabold text-slate-900">
                          {worker.fullName}
                        </td>
                        <td className="p-4 text-slate-500 text-xs font-medium">
                          {worker.email}
                        </td>
                        <td className="p-4 text-center">
                          {worker.role === "teamlead" ? (
                            <span className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-[#FEF3C7] text-[#92400E] rounded-full inline-block">
                              Team Lead
                            </span>
                          ) : (
                            <span className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100/80 text-emerald-800 rounded-full inline-block">
                              Worker
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}

                    {allRegisteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-10 text-center text-slate-400 text-xs font-medium">
                          No employees registered under this company yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

      <PhotoModal
        isOpen={activeEvidencePhotos !== null}
        onClose={() => setActiveEvidencePhotos(null)}
        photos={activeEvidencePhotos || []}
        title={evidenceModalTitle}
      />

      {/* Modal Independiente de Exportación a Excel */}
      <ExportExcelModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        adminCompanyId={adminCompanyId}
        allRegisteredUsers={allRegisteredUsers}
        initialStartDate={startDate}
        initialEndDate={endDate}
        initialSelectedUser={selectedUser}
        onExport={handleExecuteExportExcel}
      />
    </div>
  );
};

export default AdminPanel;