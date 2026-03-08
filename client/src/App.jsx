import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { 
  Activity, ShieldCheck, Stethoscope, Mail, Lock, User as UserIcon, 
  LogOut, Loader2, Search, Plus, X, History, 
  ChevronRight, Download, Keyboard, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- COMPONENTS ---
import HospitalMap from './components/HospitalMap';

// --- PRODUCTION CONFIG ---
const API_BASE_URL = "https://ruraldoc-ai.onrender.com"; 

const App = () => {
  // --- STATES ---
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [isRegistering, setIsRegistering] = useState(false);
  const [authData, setAuthData] = useState({ name: '', email: '', password: '' });
  const [authLoading, setAuthLoading] = useState(false);

  const [patientInfo, setPatientInfo] = useState({ age: '', duration: '1-2 Days' });
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [prediction, setPrediction] = useState("");
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const symptomsList = [
    "itching", "skin_rash", "nodal_skin_eruptions", "continuous_sneezing", "shivering", 
    "chills", "joint_pain", "stomach_pain", "acidity", "ulcers_on_tongue", "vomiting", 
    "fatigue", "weight_loss", "lethargy", "cough", "high_fever", "headache", "yellowish_skin", 
    "dark_urine", "nausea", "loss_of_appetite", "pain_behind_the_eyes", "back_pain", "constipation"
  ];

  // --- LOGIC ---
  const filteredSymptoms = useMemo(() => 
    symptomsList.filter(s => 
      s.toLowerCase().replace(/_/g, ' ').includes(searchTerm.toLowerCase()) && 
      !selectedSymptoms.includes(s)
    ),
    [searchTerm, selectedSymptoms]
  );

  const toggleSymptom = (s) => {
    setSelectedSymptoms(prev => prev.includes(s) ? prev.filter(i => i !== s) : [...prev, s]);
    setSearchTerm("");
  };

  // --- API CALLS ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const endpoint = isRegistering ? 'register' : 'login';
      const res = await axios.post(`${API_BASE_URL}/api/auth/${endpoint}`, authData);
      if (!isRegistering) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setIsLoggedIn(true);
      } else {
        alert("Account created! Please login.");
        setIsRegistering(false);
      }
    } catch (err) { 
      alert(err.response?.data?.message || "Auth Error: Connection failed."); 
    } finally { setAuthLoading(false); }
  };

  const fetchHistory = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      const user = JSON.parse(userStr);
      const userId = user.id || user._id; 
      const res = await axios.get(`${API_BASE_URL}/api/auth/user/${userId}`);
      setHistory(Array.isArray(res.data.history) ? res.data.history.reverse() : []);
    } catch (err) { console.error("History fetch failed."); }
  };

  useEffect(() => { if (isLoggedIn) fetchHistory(); }, [isLoggedIn, prediction]);

  const handleDiagnose = async () => {
    if (!patientInfo.age || selectedSymptoms.length === 0) return alert("Please provide Age and Symptoms");
    setLoading(true);
    setPrediction(""); 
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      // Increased timeout to 30s for Render cold starts
      const res = await axios.post(`${API_BASE_URL}/api/ai/diagnose`, { 
        symptoms: selectedSymptoms,
        userId: user?.id || user?._id,
        age: patientInfo.age,
        duration: patientInfo.duration
      }, { timeout: 30000 });
      setPrediction(res.data.prediction);
    } catch (err) { 
        const msg = err.response?.status === 502 ? "AI Engine is waking up. Try again in 10 seconds." : "AI Engine Offline.";
        alert(msg); 
    } finally { setLoading(false); }
  };

  // --- PDF GENERATION (FIXED) ---
  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      const user = JSON.parse(localStorage.getItem('user')) || { name: 'Patient' };
      
      // Header
      doc.setFillColor(16, 185, 129); 
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("RuralDoc AI Medical Report", 20, 25);

      // Patient Info
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(11);
      doc.text(`Patient: ${user.name}`, 20, 50);
      doc.text(`Age: ${patientInfo.age}`, 20, 57);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 64);

      // Table Content - Using latest prediction and symptoms
      if (typeof doc.autoTable === 'function') {
        doc.autoTable({
          startY: 75,
          head: [['Category', 'Details']],
          body: [
            ['Predicted Condition', prediction.toUpperCase()],
            ['Reported Symptoms', selectedSymptoms.join(', ').replace(/_/g, ' ')],
            ['Duration of Illness', patientInfo.duration],
          ],
          headStyles: { fillColor: [30, 41, 59] },
          theme: 'striped'
        });
      }
      doc.save(`RuralDoc_Report_${user.name}.pdf`);
    } catch (error) { alert("Failed to create PDF."); }
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setPrediction("");
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl">
          <div className="text-center mb-8">
            <div className="bg-emerald-500 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Activity className="text-white w-7 h-7" />
            </div>
            <h1 className="text-3xl font-black text-slate-800">RuralDoc AI</h1>
            <p className="text-slate-400 mt-2 italic">{isRegistering ? "Registration" : "Clinician Login"}</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            {isRegistering && (
              <div className="relative">
                <UserIcon className="absolute left-4 top-4 w-5 h-5 text-slate-300" />
                <input required type="text" placeholder="Full Name" className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none" 
                  onChange={(e) => setAuthData({...authData, name: e.target.value})} />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-4 w-5 h-5 text-slate-300" />
              <input required type="email" placeholder="Email" className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none" 
                onChange={(e) => setAuthData({...authData, email: e.target.value})} />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-300" />
              <input required type="password" placeholder="Password" className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none" 
                onChange={(e) => setAuthData({...authData, password: e.target.value})} />
            </div>
            <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all">
              {authLoading ? <Loader2 className="animate-spin mx-auto" /> : (isRegistering ? "Register" : "Sign In")}
            </button>
          </form>
          <button onClick={() => setIsRegistering(!isRegistering)} className="w-full mt-4 text-sm text-emerald-600 font-bold underline">
            {isRegistering ? "Back to Login" : "Create New Account"}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      {/* SIDEBAR HISTORY */}
      <motion.aside animate={{ width: showHistory ? "320px" : "80px" }} className="h-screen bg-white border-r border-slate-200 flex flex-col shadow-xl z-20">
        <div className="p-6 flex items-center justify-between">
          {showHistory && <h3 className="font-black text-slate-800 text-xs tracking-widest">RECORDS</h3>}
          <button onClick={() => setShowHistory(!showHistory)} className="p-3 rounded-2xl bg-slate-50 text-emerald-600 mx-auto">
            {showHistory ? <ChevronRight className="rotate-180" /> : <History />}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 space-y-3">
          {showHistory && (history.length > 0 ? history.map((item, i) => (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={i} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm text-xs">
              <div className="flex justify-between font-bold text-emerald-600 mb-1">
                <span className="capitalize">{item.prediction}</span>
                <span className="text-slate-400 font-normal">{new Date(item.date).toLocaleDateString()}</span>
              </div>
              <p className="text-slate-500 truncate">{item.symptoms.join(', ').replace(/_/g, ' ')}</p>
            </motion.div>
          )) : <div className="text-center py-10 opacity-20 text-[10px] font-bold">NO RECORDS</div>)}
        </div>
      </motion.aside>

      <main className="flex-1 h-screen overflow-y-auto p-6 lg:p-12">
        <div className="max-w-5xl mx-auto pb-20">
          <nav className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-3">
              <Activity className="text-emerald-500 w-8 h-8" />
              <span className="font-black text-2xl tracking-tighter">RURALDOC AI</span>
            </div>
            <button onClick={handleLogout} className="p-3 rounded-2xl text-slate-400 hover:text-red-500">
              <LogOut className="w-5 h-5" />
            </button>
          </nav>

          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              {/* INPUTS */}
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Patient Age</label>
                  <input type="number" className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none" 
                    value={patientInfo.age} onChange={(e) => setPatientInfo({...patientInfo, age: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Duration</label>
                  <select className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none"
                    value={patientInfo.duration} onChange={(e) => setPatientInfo({...patientInfo, duration: e.target.value})}>
                    <option>Less than 24h</option><option>1-2 Days</option><option>1 Week</option><option>Chronic</option>
                  </select>
                </div>
              </div>

              {/* SYMPTOM SEARCH */}
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-4 block">Select Symptoms</label>
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-4 w-5 h-5 text-slate-300" />
                  <input type="text" placeholder="Search..." className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none"
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  <AnimatePresence>
                    {searchTerm && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="absolute z-30 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto p-2">
                        {filteredSymptoms.map(s => (
                          <button key={s} onClick={() => toggleSymptom(s)} className="w-full text-left px-4 py-3 hover:bg-emerald-50 rounded-xl flex items-center justify-between group">
                            <span className="capitalize">{s.replace(/_/g, ' ')}</span>
                            <Plus className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100" />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex flex-wrap gap-2 p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 min-h-[100px]">
                  {selectedSymptoms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center w-full text-slate-300 py-4 opacity-40">
                        <Keyboard className="w-8 h-8 mb-2" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">Select symptoms above</p>
                    </div>
                  ) : selectedSymptoms.map(s => (
                    <motion.button initial={{ scale: 0.8 }} animate={{ scale: 1 }} key={s} onClick={() => toggleSymptom(s)} 
                      className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-red-500 transition-all shadow-md">
                      {s.replace(/_/g, ' ')} <X className="w-3 h-3" />
                    </motion.button>
                  ))}
                </div>

                <button onClick={handleDiagnose} disabled={selectedSymptoms.length === 0 || loading}
                  className="w-full mt-10 py-5 bg-emerald-500 text-white rounded-[2rem] font-black text-xl hover:bg-emerald-600 shadow-lg flex items-center justify-center gap-3 transition-all">
                  {loading ? <Loader2 className="animate-spin" /> : "Run AI Diagnosis"}
                </button>
              </div>

              {/* HOSPITAL MAP */}
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                   <div className="bg-emerald-100 p-2 rounded-xl">
                      <MapPin className="text-emerald-600 w-5 h-5" />
                   </div>
                   <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Nearby Facilities</h3>
                </div>
                {/* Passed prediction as key to force map refresh on new diagnosis */}
                <HospitalMap key={prediction} />
              </div>
            </div>

            {/* PREDICTION RESULT PANEL */}
            <div className="lg:col-span-4 bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-2xl text-center flex flex-col justify-center min-h-[500px]">
              <AnimatePresence mode="wait">
                {prediction ? (
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <ShieldCheck className="w-20 h-20 mb-6 text-emerald-500 mx-auto" />
                    <p className="text-slate-400 uppercase text-[10px] font-black mb-2 tracking-widest opacity-60">Result Found</p>
                    <h3 className="text-4xl font-black mb-10 tracking-tight leading-tight capitalize">{prediction}</h3>
                    <button onClick={generatePDF} className="flex items-center gap-2 bg-white/10 hover:bg-white text-white hover:text-slate-900 px-8 py-4 rounded-2xl text-sm font-bold transition-all mx-auto border border-white/10">
                      <Download className="w-4 h-4" /> Export PDF
                    </button>
                  </motion.div>
                ) : (
                  <div className="opacity-20 flex flex-col items-center">
                    <Stethoscope className="w-16 h-16 mb-4" />
                    <p className="font-black uppercase tracking-[0.2em] text-xs">Waiting for Analysis</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;