import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebaseConfig';
import { collection, getDocs, query, addDoc, Timestamp, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import Toast from './Toast';

interface AdminPanelProps {
  user: any;
}

const InlineEditForm = ({ workerId, dateObj, onSave, onCancel, showNotification }: any) => {
  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [totalHours, setTotalHours] = useState('');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!location || !checkIn || !checkOut || !totalHours) {
      showNotification("Please fill in all time and location fields.");
      return;
    }
    setIsSubmitting(true);
    await onSave(workerId, dateObj, { location, checkIn, checkOut, totalHours, comments });
    setIsSubmitting(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-blue-100 shadow-sm animate-fade-in w-full">
      <div>
        <label className="text-[10px] uppercase font-bold text-gray-400">Location</label>
        <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" placeholder="Job site" />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[10px] uppercase font-bold text-gray-400">Check In</label>
          <input type="time" value={checkIn} onChange={e => setCheckIn(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
        </div>
        <div className="flex-1">
          <label className="text-[10px] uppercase font-bold text-gray-400">Check Out</label>
          <input type="time" value={checkOut} onChange={e => setCheckOut(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="w-16">
          <label className="text-[10px] uppercase font-bold text-gray-400">Hrs</label>
          <input type="number" step="0.5" value={totalHours} onChange={e => setTotalHours(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" placeholder="0" />
        </div>
        <div className="flex-1">
          <label className="text-[10px] uppercase font-bold text-gray-400">Note</label>
          <input type="text" value={comments} onChange={e => setComments(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" placeholder="Optional" />
        </div>
      </div>
      
      <div className="flex gap-2 items-end justify-end">
        <button onClick={onCancel} className="p-2.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors" title="Cancel">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <button onClick={handleSave} disabled={isSubmitting} className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 shadow-sm" title="Save">
          {isSubmitting ? <span className="text-xs font-bold px-1">...</span> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
        </button>
      </div>
    </div>
  );
};

const getLocalTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getFirstDayOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const AdminPanel: React.FC<AdminPanelProps> = ({ user }) => {
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [allRegisteredUsers, setAllRegisteredUsers] = useState<any[]>([]);
  const [oldestLoadedDate, setOldestLoadedDate] = useState<Date>(getFirstDayOfMonth());
  const [selectedUser, setSelectedUser] = useState('All');
  const [startDate, setStartDate] = useState(getLocalTodayString());
  const [endDate, setEndDate] = useState('');
  const [expandedRangeUserId, setExpandedRangeUserId] = useState<string | null>(null);
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const showNotification = (message: string) => {
    setToastMessage(message);
  };

  const loadUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersList: any[] = [];
      
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.email !== user.email) {
          usersList.push({ id: doc.id, fullName: data.fullName, email: data.email });
        }
      });
      
      usersList.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setAllRegisteredUsers(usersList);
    } catch (error: any) {
      showNotification("Error loading users: " + error.message);
    }
  };

  const loadLogs = async (fromDate: Date) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'timeLogs'),
        where('timestamp', '>=', Timestamp.fromDate(fromDate))
      );
      const querySnapshot = await getDocs(q);
      
      const logsData: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.userEmail !== user.email) {
          logsData.push({ id: doc.id, ...data });
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
      await loadUsers();
      await loadLogs(getFirstDayOfMonth());
    };
    initData();
  }, []);

  useEffect(() => {
    if (startDate) {
      const selectedDate = new Date(startDate + 'T00:00:00');
      if (selectedDate < oldestLoadedDate) {
        loadLogs(selectedDate);
      }
    }
  }, [startDate]);

  const handleInlineSubmit = async (workerId: string, dateObj: Date, data: any) => {
    try {
      const targetWorker = allRegisteredUsers.find(w => w.id === workerId);
      const [hours, minutes] = data.checkIn.split(':');
      const finalDate = new Date(dateObj);
      finalDate.setHours(Number(hours), Number(minutes), 0, 0);

      await addDoc(collection(db, 'timeLogs'), {
        userId: targetWorker.id,
        userEmail: targetWorker.email,
        location: data.location,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        totalHours: Number(data.totalHours),
        timestamp: Timestamp.fromDate(finalDate)
      });
      
      showNotification('Log added successfully!');
      setEditingRowKey(null);
      loadLogs(oldestLoadedDate);
    } catch (error: any) {
      showNotification("Error saving: " + error.message);
    }
  };

  const toggleRangeRow = (userId: string) => {
    setExpandedRangeUserId(expandedRangeUserId === userId ? null : userId);
  };

  const getDatesInRange = (startStr: string, endStr: string) => {
    const dates = [];
    const current = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const filteredUsers = selectedUser === 'All' 
    ? allRegisteredUsers 
    : allRegisteredUsers.filter(worker => worker.id === selectedUser);

  const displayedUsers = [...filteredUsers].sort((a, b) => 
    a.fullName.localeCompare(b.fullName)
  );

  const handleClearFilters = () => {
    setSelectedUser('All');
    setStartDate(getLocalTodayString());
    setEndDate('');
    setExpandedRangeUserId(null);
    setEditingRowKey(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 relative">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-gray-900 rounded-xl p-6 shadow-lg flex justify-between items-center text-white">
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <button onClick={handleLogout} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-bold transition-colors">
            Log Out
          </button>
        </div>

        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Worker</label>
              <select 
                value={selectedUser} 
                onChange={(e) => { setSelectedUser(e.target.value); setExpandedRangeUserId(null); }}
                className="w-full p-3 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              >
                <option value="All">All workers</option>
                {allRegisteredUsers.map(worker => (
                  <option key={worker.id} value={worker.id}>{worker.fullName}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Specific Day / From</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-3 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">To (Optional)</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-3 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <button 
              onClick={handleClearFilters} 
              className="w-full md:w-auto px-6 py-3 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            {!startDate && (
              <div className="p-12 text-center flex flex-col items-center">
                <h3 className="text-lg font-bold text-gray-700">Select a date</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-md">Choose a 'From' date to view the details for that period.</p>
              </div>
            )}

            {startDate && (
              <div className="overflow-x-auto">
                <div className="p-4 bg-purple-50 border-b border-purple-100 text-purple-800 text-sm font-bold flex justify-between items-center">
                  <span>
                    Report: {new Date(startDate + 'T00:00:00').toLocaleDateString('en-US')} 
                    {endDate && endDate !== startDate ? ` to ${new Date(endDate + 'T23:59:59').toLocaleDateString('en-US')}` : ''}
                  </span>
                  <span className="bg-purple-200 text-purple-900 px-3 py-1 rounded-full text-xs">Active Data</span>
                </div>
                
                {loading ? (
                  <div className="p-12 text-center text-gray-400 animate-pulse">Querying Database...</div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider border-b">
                      <tr>
                        <th className="p-4">Worker</th>
                        <th className="p-4 text-center">Total Accumulated Hours</th>
                        <th className="p-4 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {displayedUsers.map(worker => {
                        const effectiveEndDate = endDate ? endDate : startDate;
                        const start = new Date(startDate + 'T00:00:00').getTime();
                        const end = new Date(effectiveEndDate + 'T23:59:59').getTime();
                        
                        const userLogsInRange = allLogs.filter(log => {
                          if (!log.timestamp || log.userId !== worker.id) return false;
                          const logTime = log.timestamp.toDate().getTime();
                          return logTime >= start && logTime <= end;
                        });

                        const totalWorkerHours = userLogsInRange.reduce((sum, log) => sum + (Number(log.totalHours) || 0), 0);
                        const isExpanded = expandedRangeUserId === worker.id;
                        const datesInRange = getDatesInRange(startDate, effectiveEndDate);

                        return (
                          <React.Fragment key={worker.id}>
                            <tr onClick={() => toggleRangeRow(worker.id)} className="transition-colors hover:bg-purple-50/50 cursor-pointer">
                              <td className="p-4">
                                <p className="font-bold text-gray-800 text-sm">{worker.fullName}</p>
                                <p className="text-xs text-purple-600">{userLogsInRange.length} of {datesInRange.length} days</p>
                              </td>
                              <td className="p-4 text-center">
                                <span className={`text-xl font-black ${totalWorkerHours > 0 ? 'text-purple-600' : 'text-gray-300'}`}>
                                  {totalWorkerHours}h
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <button className="text-gray-400 hover:text-purple-600 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                  ▼
                                </button>
                              </td>
                            </tr>
                            
                            {isExpanded && (
                              <tr className="bg-purple-50/30 border-b border-purple-100">
                                <td colSpan={3} className="p-0">
                                  <div className="p-4 md:p-6 shadow-inner">
                                    <h4 className="text-sm font-bold text-purple-800 mb-3">Detailed View</h4>
                                    <div className="overflow-x-auto rounded-lg border border-purple-100">
                                      <table className="w-full text-left text-sm bg-white">
                                        <thead className="bg-purple-50 text-xs font-bold text-purple-600 uppercase border-b border-purple-100">
                                          <tr>
                                            <th className="p-3">Date</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3">Location / Job Site</th>
                                            <th className="p-3 text-center">Schedule</th>
                                            <th className="p-3 text-center">Hours</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-purple-50">
                                          {datesInRange.map((dateObj, index) => {
                                            const logsForDay = userLogsInRange.filter(log => {
                                              const logDate = log.timestamp.toDate();
                                              return logDate.getDate() === dateObj.getDate() &&
                                                     logDate.getMonth() === dateObj.getMonth() &&
                                                     logDate.getFullYear() === dateObj.getFullYear();
                                            });

                                            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                                            const rowKey = `${worker.id}-${dateObj.getTime()}`;
                                            const isEditingThisRow = editingRowKey === rowKey;

                                            if (logsForDay.length > 0) {
                                              return logsForDay.map(log => (
                                                <tr key={log.id} className="hover:bg-gray-50">
                                                  <td className="p-3">
                                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${isWeekend ? 'bg-yellow-200 text-yellow-800 shadow-sm' : 'text-gray-700'}`}>
                                                      {dateObj.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' })}
                                                    </span>
                                                  </td>
                                                  <td className="p-3"><span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">Worked</span></td>
                                                  <td className="p-3 text-gray-700">{log.location}</td>
                                                  <td className="p-3 text-center text-gray-600">{log.checkIn} - {log.checkOut}</td>
                                                  <td className="p-3 text-center font-bold text-purple-700">{log.totalHours}h</td>
                                                </tr>
                                              ));
                                            } else if (isEditingThisRow) {
                                              return (
                                                <tr key={`edit-${index}`} className="bg-blue-50/50">
                                                  <td className="p-3 align-top">
                                                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-200 text-blue-800">
                                                      {dateObj.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' })}
                                                    </span>
                                                  </td>
                                                  <td colSpan={4} className="p-3">
                                                    <InlineEditForm 
                                                      workerId={worker.id} 
                                                      dateObj={dateObj} 
                                                      onSave={handleInlineSubmit} 
                                                      onCancel={() => setEditingRowKey(null)}
                                                      showNotification={showNotification}
                                                    />
                                                  </td>
                                                </tr>
                                              );
                                            } else {
                                              return (
                                                <tr key={`missing-${index}`} className="bg-red-50/40 hover:bg-red-50 transition-colors group">
                                                  <td className="p-3">
                                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${isWeekend ? 'bg-yellow-200 text-yellow-800 shadow-sm' : 'text-red-800'}`}>
                                                      {dateObj.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' })}
                                                    </span>
                                                  </td>
                                                  <td className="p-3"><span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded-full">No Log</span></td>
                                                  <td className="p-3 text-red-400 italic" colSpan={2}>
                                                    
                                                  </td>
                                                  <td className="p-3 text-center">
                                                    <button 
                                                      onClick={() => setEditingRowKey(rowKey)}
                                                      className="p-1.5 bg-white border border-red-200 text-red-500 rounded hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 shadow-sm"
                                                      title="Add missing hours"
                                                    >
                                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    </button>
                                                  </td>
                                                </tr>
                                              );
                                            }
                                          })}
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
                        <tr><td colSpan={3} className="p-8 text-center text-gray-500">No workers found.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;