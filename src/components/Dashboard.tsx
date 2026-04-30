import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import Calendar from './Calendar';
import Toast from './Toast';
import WorkerCalculator from './WorkerCalculator'; 

interface DashboardProps {
  user: any;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'form' | 'history' | 'calculator'>('form');
  const [userName, setUserName] = useState('Loading...');

  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [totalHours, setTotalHours] = useState('');
  const [comments, setComments] = useState('');

  const [myLogs, setMyLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  
  const [hasLoggedToday, setHasLoggedToday] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const showNotification = (message: string) => {
    setToastMessage(message);
  };

  const fetchUserName = async () => {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        setUserName(userDocSnap.data().fullName);
      } else {
        setUserName(user.email);
      }
    } catch (error) {
      console.error("Error fetching name:", error);
      setUserName(user.email);
    }
  };

  const fetchMyLogs = async () => {
    setLoadingLogs(true);
    try {
      const q = query(collection(db, 'timeLogs'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const logsData: any[] = [];
      let foundLogToday = false;
      const today = new Date();

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        logsData.push({ id: doc.id, ...data });

        if (data.timestamp) {
          const logDate = data.timestamp.toDate();
          if (
            logDate.getDate() === today.getDate() &&
            logDate.getMonth() === today.getMonth() &&
            logDate.getFullYear() === today.getFullYear()
          ) {
            foundLogToday = true;
          }
        }
      });

      logsData.sort((a, b) => {
        const timeA = a.timestamp?.toMillis() || 0;
        const timeB = b.timestamp?.toMillis() || 0;
        return timeB - timeA;
      });

      setHasLoggedToday(foundLogToday);
      setMyLogs(logsData);
    } catch (error: any) {
      console.error("Error loading history: ", error);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchUserName();
    fetchMyLogs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'timeLogs'), {
        userId: user.uid,
        userEmail: user.email,
        location: location,
        checkIn: checkIn,
        checkOut: checkOut,
        totalHours: Number(totalHours),
        comments: comments,
        timestamp: serverTimestamp()
      });
      
      showNotification('Log saved successfully! ✅');
      
      setLocation('');
      setCheckIn('');
      setCheckOut('');
      setTotalHours('');
      setComments('');

      setHasLoggedToday(true);
      fetchMyLogs(); 

    } catch (error: any) {
      showNotification("Error: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 relative">
      
      {toastMessage && (
        <Toast 
          message={toastMessage} 
          onClose={() => setToastMessage(null)} 
        />
      )}

      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        
        <div className="p-6 border-b flex justify-between items-center bg-gray-800 text-white">
          <div>
            <h1 className="text-xl font-bold">Worker Portal</h1>
            <p className="text-sm text-blue-300 font-semibold mt-1">{userName}</p>
          </div>
          <button onClick={handleLogout} className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-sm font-semibold">Log Out</button>
        </div>

        <div className="flex border-b">
          <button 
            onClick={() => setActiveTab('form')}
            className={`flex-1 py-3 px-2 text-sm font-semibold text-center transition-colors ${activeTab === 'form' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Log Hours
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-2 text-sm font-semibold text-center transition-colors ${activeTab === 'history' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Calendar
          </button>
          <button 
            onClick={() => setActiveTab('calculator')}
            className={`flex-1 py-3 px-2 text-sm font-semibold text-center transition-colors ${activeTab === 'calculator' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Calculator
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'form' && (
            loadingLogs ? (
              <p className="text-center text-gray-500 py-8 animate-pulse">Checking your logs for today...</p>
            ) : hasLoggedToday ? (
              <div className="text-center py-10 px-4 bg-green-50 rounded-xl border border-green-200 shadow-inner animate-fade-in">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-green-800 mb-2">Shift Logged!</h2>
                <p className="text-gray-600 mb-4">
                  Thank you for logging your hours today. Your information is now secure in the system.
                </p>
                <p className="text-sm font-semibold text-gray-500 bg-white inline-block px-4 py-2 rounded-full shadow-sm border border-gray-100">
                  Come back tomorrow for your next log
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location / Job Site</label>
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check In</label>
                    <input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check Out</label>
                    <input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Hours</label>
                  <input type="number" step="0.5" value={totalHours} onChange={(e) => setTotalHours(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
                  <textarea value={comments} onChange={(e) => setComments(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows={2} />
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg mt-4 transition-colors">
                  Submit Log
                </button>
              </form>
            )
          )}

          {activeTab === 'history' && (
            <div>
              {loadingLogs ? (
                <p className="text-center text-gray-500 py-8 animate-pulse">Loading your calendar...</p>
              ) : (
                <Calendar logs={myLogs} /> 
              )}
            </div>
          )}

          {activeTab === 'calculator' && (
            <div>
              {loadingLogs ? (
                <p className="text-center text-gray-500 py-8 animate-pulse">Loading your logs...</p>
              ) : (
                <WorkerCalculator logs={myLogs} />
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Dashboard;