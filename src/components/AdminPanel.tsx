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
import Toast from "./Toast";
import PhotoModal from "./PhotoModal";
import MapLink from "./MapLink";
import ToolboxAuditor from "./ToolBoxAuditor";
import ProjectsManager from "./ProjectsManager";
import LocationInput from "./LocationInput";
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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-blue-100 shadow-sm animate-fade-in w-full items-start">
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] uppercase font-bold text-gray-400">
          Location
        </label>
        <LocationInput
          value={location}
          onChange={(val) => setLocation(val)}
          className="p-2.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-white"
          placeholder="Primary job site"
          required
        />

        {extraLocations.map((extraLoc, index) => (
          <div key={index} className="flex gap-1 animate-fade-in">
            <LocationInput
              value={extraLoc}
              onChange={(val) => handleExtraLocationChange(index, val)}
              placeholder={`Additional job site ${index + 2}`}
              wrapperClassName="flex-1"
              className="p-2 border border-blue-200 bg-blue-50/30 rounded-lg text-xs outline-none focus:border-blue-500"
              required
            />
            <button
              type="button"
              onClick={() => handleRemoveExtraLocation(index)}
              className="px-2 py-1 bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded text-xs font-bold transition-colors cursor-pointer"
              title="Remove site"
            >
              ✕
            </button>
          </div>
        ))}

        {extraLocations.length < 2 && (
          <button
            type="button"
            onClick={handleAddLocation}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors text-left cursor-pointer mt-0.5"
          >
            + Add another job site
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[10px] uppercase font-bold text-gray-400">
            Check In
          </label>
          <input
            type="time"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="w-full p-2.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] uppercase font-bold text-gray-400">
            Check Out
          </label>
          <input
            type="time"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="w-full p-2.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <div className="w-16">
          <label className="text-[10px] uppercase font-bold text-gray-400">
            Hrs
          </label>
          <input
            type="number"
            step="0.5"
            value={totalHours}
            onChange={(e) => setTotalHours(e.target.value)}
            className="w-full p-2.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            placeholder="0"
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] uppercase font-bold text-gray-400">
            Note
          </label>
          <input
            type="text"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full p-2.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="flex gap-2 items-center justify-end md:mt-4">
        <button
          onClick={onCancel}
          className="p-2.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
          title="Cancel"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 shadow-sm cursor-pointer disabled:cursor-not-allowed"
          title="Save"
        >
          {isSubmitting ? (
            <span className="text-xs font-bold px-1">...</span>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M5 13l4 4L19 7"
              />
            </svg>
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
  // <-- PASO 4.1: Nueva pestaña 'team'
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

  const [activeCycleIndex, setActiveCycleIndex] =
    useState<number>(getBaseCycleIndex());

  // Estados para el visor modal de fotos de evidencias
  const [activeEvidencePhotos, setActiveEvidencePhotos] = useState<
    string[] | null
  >(null);
  const [evidenceModalTitle, setEvidenceModalTitle] = useState<string>("");

  // <-- PASO 4.2: Estados para el formulario de alta de empleados
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

  // <-- PASO 4.2: Función para registrar un nuevo trabajador sin cerrar la sesión del Admin
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
    // Creamos una app secundaria temporal para que Firebase no reemplace la sesión del Admin
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

      // Guardamos el documento en la colección 'users' usando la sesión del Admin (db principal)
      await setDoc(doc(db, "users", newUid), {
        fullName: cleanName,
        email: cleanEmail,
        role: newWorkerRole,
        companyId: adminCompanyId,
        createdAt: Timestamp.now(),
      });

      // Cerramos sesión en la instancia temporal
      await signOut(secondaryAuth);

      showNotification(`Employee "${cleanName}" created successfully!`);
      setNewWorkerName("");
      setNewWorkerEmail("");
      setNewWorkerRole("worker");
      setNewWorkerPassword("");

      // Recargamos la lista de trabajadores
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
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 relative">
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Cabecera Principal */}
        <div className="bg-gray-900 rounded-xl p-6 shadow-lg flex justify-between items-center text-white">
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-bold transition-colors cursor-pointer"
          >
            Log Out
          </button>
        </div>

        {/* Selector de Pestañas: Nómina, Seguridad y Equipo */}
        <div className="flex flex-wrap gap-2 p-1 bg-gray-200/80 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('payroll')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'payroll'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ⏱️ Hours & Payroll
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('safety')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'safety'
                ? 'bg-white text-purple-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🛡️ Safety & Toolbox Meetings
          </button>
          {/* NUEVO BOTÓN DE PROYECTOS PARA EL ADMIN */}
          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'projects' ? 'bg-white text-blue-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🏗️ Projects
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('team')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'team'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            👥 Team / Employees ({allRegisteredUsers.length})
          </button>
        </div>

        {/* PESTAÑA 1: Horas y Nómina */}
        {activeTab === 'payroll' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100 space-y-4">
              {/* Barra de accesos rápidos con leyenda de fechas */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Quick View:
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectToday}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                      isTodayActive
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    }`}
                  >
                    📍 Today
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">
                    Pay Periods:
                  </span>

                  <button
                    type="button"
                    onClick={handlePrevPeriod}
                    className="px-2.5 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors cursor-pointer"
                    title="Previous Pay Period"
                  >
                    ◀
                  </button>

                  {isPeriodActive && (
                    <span className="text-xs font-extrabold text-purple-900 bg-purple-100 px-3 py-1.5 rounded-lg border border-purple-200 tracking-wide shadow-xs">
                      📅 {formatPeriodLegend(startDate, endDate)}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleSelectPeriodToPay}
                    className="px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors cursor-pointer"
                  >
                    💰 Period to Pay
                  </button>

                  <button
                    type="button"
                    onClick={handleSelectCurrentPeriod}
                    className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                  >
                    📅 Current Period
                  </button>

                  <button
                    type="button"
                    onClick={handleNextPeriod}
                    className="px-2.5 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors cursor-pointer"
                    title="Next Pay Period"
                  >
                    ▶
                  </button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                    Worker
                  </label>
                  <select
                    value={selectedUser}
                    onChange={(e) => {
                      setSelectedUser(e.target.value);
                      setExpandedRangeUserId(null);
                    }}
                    className="w-full p-3 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    <option value="All">All workers</option>
                    {allRegisteredUsers.map((worker) => (
                      <option key={worker.id} value={worker.id}>
                        {worker.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                    Specific Day / From
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-3 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                    To (Optional)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-3 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <button
                  onClick={handleClearFilters}
                  className="w-full md:w-auto px-6 py-3 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              {!startDate && (
                <div className="p-12 text-center flex flex-col items-center">
                  <h3 className="text-lg font-bold text-gray-700">
                    Select a date
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 max-w-md">
                    Choose a 'From' date to view the details for that period.
                  </p>
                </div>
              )}

              {startDate && (
                <div className="overflow-x-auto">
                  <div className="p-4 bg-purple-50 border-b border-purple-100 text-purple-800 text-sm font-bold flex justify-between items-center">
                    <span>
                      Report:{" "}
                      {new Date(startDate + "T00:00:00").toLocaleDateString(
                        "en-US",
                      )}
                      {endDate && endDate !== startDate
                        ? ` to ${new Date(endDate + "T23:59:59").toLocaleDateString("en-US")}`
                        : ""}
                    </span>
                    <span className="bg-purple-200 text-purple-900 px-3 py-1 rounded-full text-xs">
                      Active Data
                    </span>
                  </div>

                  {loading ? (
                    <div className="p-12 text-center text-gray-400 animate-pulse">
                      Querying Database...
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider border-b">
                        <tr>
                          <th className="p-4">Worker</th>
                          <th className="p-4 text-center">
                            Total Accumulated Hours
                          </th>
                          <th className="p-4 text-right">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
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
                                className="transition-colors hover:bg-purple-50/50 cursor-pointer"
                              >
                                <td className="p-4">
                                  <p className="font-bold text-gray-800 text-sm">
                                    {worker.fullName}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-xs text-purple-600">
                                      {userLogsInRange.length} of{" "}
                                      {datesInRange.length} days
                                    </p>
                                    {totalWorkerPhotos > 0 && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                        📷 {totalWorkerPhotos}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-4 text-center">
                                  <span
                                    className={`text-xl font-black ${totalWorkerHours > 0 ? "text-purple-600" : "text-gray-300"}`}
                                  >
                                    {totalWorkerHours}h
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <button
                                    className="text-gray-400 hover:text-purple-600 transition-transform duration-200 cursor-pointer"
                                    style={{
                                      transform: isExpanded
                                        ? "rotate(180deg)"
                                        : "rotate(0deg)",
                                    }}
                                  >
                                    ▼
                                  </button>
                                </td>
                              </tr>

                              {isExpanded && (
                                <tr className="bg-purple-50/30 border-b border-purple-100">
                                  <td colSpan={3} className="p-0">
                                    <div className="p-4 md:p-6 shadow-inner">
                                      <h4 className="text-sm font-bold text-purple-800 mb-3">
                                        Detailed View
                                      </h4>
                                      <div className="overflow-x-auto rounded-lg border border-purple-100">
                                        <table className="w-full text-left text-sm bg-white">
                                          <thead className="bg-purple-50 text-xs font-bold text-purple-600 uppercase border-b border-purple-100">
                                            <tr>
                                              <th className="p-3">Date</th>
                                              <th className="p-3">Status</th>
                                              <th className="p-3">
                                                Location / Job Site
                                              </th>
                                              <th className="p-3 text-center">
                                                Schedule
                                              </th>
                                              <th className="p-3 text-center">
                                                Hours
                                              </th>
                                              <th className="p-3 text-center">
                                                Evidence
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-purple-50">
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
                                                        className="hover:bg-gray-50"
                                                      >
                                                        <td className="p-3">
                                                          <span
                                                            className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${isWeekend ? "bg-yellow-200 text-yellow-800 shadow-sm" : "text-gray-700"}`}
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
                                                        <td className="p-3">
                                                          <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                                                            Worked
                                                          </span>
                                                        </td>
                                                        <td className="p-3 text-gray-700">
                                                          <MapLink
                                                            location={
                                                              log.location
                                                            }
                                                          />
                                                        </td>
                                                        <td className="p-3 text-center text-gray-600">
                                                          {log.checkIn} -{" "}
                                                          {log.checkOut}
                                                        </td>
                                                        <td className="p-3 text-center font-bold text-purple-700">
                                                          {log.totalHours}h
                                                        </td>
                                                        <td className="p-3 text-center">
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
                                                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
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
                                                            <span className="text-gray-300 text-xs">
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
                                                      className="bg-blue-50/50"
                                                    >
                                                      <td className="p-3 align-top">
                                                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-200 text-blue-800">
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
                                                        className="p-3"
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
                                                      className="bg-red-50/40 hover:bg-red-50 transition-colors group"
                                                    >
                                                      <td className="p-3">
                                                        <span
                                                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${isWeekend ? "bg-yellow-200 text-yellow-800 shadow-sm" : "text-red-800"}`}
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
                                                      <td className="p-3">
                                                        <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded-full">
                                                          No Log
                                                        </span>
                                                      </td>
                                                      <td
                                                        className="p-3 text-red-400 italic"
                                                        colSpan={3}
                                                      ></td>
                                                      <td className="p-3 text-center">
                                                        <button
                                                          onClick={() =>
                                                            setEditingRowKey(
                                                              rowKey,
                                                            )
                                                          }
                                                          className="p-1.5 bg-white border border-red-200 text-red-500 rounded hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 shadow-sm cursor-pointer"
                                                          title="Add missing hours"
                                                        >
                                                          <svg
                                                            className="w-4 h-4"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                          >
                                                            <path
                                                              strokeLinecap="round"
                                                              strokeLinejoin="round"
                                                              strokeWidth="2"
                                                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                                            />
                                                          </svg>
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
                              className="p-8 text-center text-gray-500"
                            >
                              No workers found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
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

        {/* PESTAÑA 3: Gestión de Equipo y Alta de Trabajadores (Actividades 4.1 y 4.2) */}
        {activeTab === 'team' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            
            {/* Formulario para dar de alta un nuevo trabajador */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 h-fit">
              <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                Onboarding
              </span>
              <h3 className="text-base font-bold text-gray-800 mt-1 mb-4">
                Register New Employee
              </h3>

              <form onSubmit={handleCreateWorker} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={newWorkerName}
                    onChange={(e) => setNewWorkerName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newWorkerEmail}
                    onChange={(e) => setNewWorkerEmail(e.target.value)}
                    placeholder="worker@company.com"
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Role
                  </label>
                  <select
                    value={newWorkerRole}
                    onChange={(e) => setNewWorkerRole(e.target.value as "worker" | "teamlead")}
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    <option value="worker">Worker (Field Operatives)</option>
                    <option value="teamlead">Team Lead (Photos & Toolbox Talks)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Temporary Password
                  </label>
                  <input
                    type="text"
                    value={newWorkerPassword}
                    onChange={(e) => setNewWorkerPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    minLength={6}
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    required
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Share this password with the worker so they can log in.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={creatingWorker}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed"
                >
                  {creatingWorker ? "Creating Account..." : "+ Add Employee to Company"}
                </button>
              </form>
            </div>

            {/* Lista de empleados actuales de la compañía */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden h-fit">
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">
                    Active Company Roster
                  </h3>
                  <p className="text-xs text-gray-400">
                    Company ID: <span className="font-mono font-semibold text-gray-600">{adminCompanyId || "Loading..."}</span>
                  </p>
                </div>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-200">
                  {allRegisteredUsers.length} Employees
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/60 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4 text-center">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allRegisteredUsers.map((worker) => (
                      <tr key={worker.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="p-4 font-bold text-gray-800">
                          {worker.fullName}
                        </td>
                        <td className="p-4 text-gray-500 text-xs">
                          {worker.email}
                        </td>
                        <td className="p-4 text-center">
                          {worker.role === "teamlead" ? (
                            <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 rounded-md border border-purple-200">
                              Team Lead
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200">
                              Worker
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}

                    {allRegisteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-gray-400 text-xs">
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

      {/* Visor Modal de Evidencias Fotográficas */}
      <PhotoModal
        isOpen={activeEvidencePhotos !== null}
        onClose={() => setActiveEvidencePhotos(null)}
        photos={activeEvidencePhotos || []}
        title={evidenceModalTitle}
      />
    </div>
  );
};

export default AdminPanel;