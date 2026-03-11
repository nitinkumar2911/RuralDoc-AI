import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { 
  Activity, ShieldCheck, Stethoscope, Mail, Lock, User as UserIcon, 
  LogOut, Loader2, Search, Plus, X, History, 
  ChevronRight, Keyboard, MapPin, Fingerprint
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- COMPONENTS ---
import HospitalMap from './components/HospitalMap';

// --- PRODUCTION CONFIG ---
const API_BASE_URL = "https://ruraldoc-ai.onrender.com"; 

// Configure Axios globally for this file
axios.defaults.withCredentials = true;

const App = () => {
  // --- STATES ---
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [isRegistering, setIsRegistering] = useState(false);
  const [step, setStep] = useState('auth'); // 'auth' or 'otp'
  const [otp, setOtp] = useState("");
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

  // --- AUTH FLOW ---

  // 1. Request OTP
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!authData.email.includes("@")) return alert("Please enter a valid email");
    setAuthLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/auth/send-otp`, { email: authData.email });
      setStep('otp');
      window.scrollTo(0,0);
    } catch (err) {
      alert(err.response?.data?.message || "Server connection failed. Check if Render is awake.");
    } finally { setAuthLoading(false); }
  };

  // 2. Verify & Register
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return alert("Please enter the 6-digit code");
    setAuthLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/auth/register`, { ...authData, otp });
      alert("Verification successful! You can now log in.");
      setStep('auth');
      setIsRegistering(false);
      setOtp("");
    } catch (err) {
      alert(err.response?.data?.message || "Invalid or expired OTP");
    } finally { setAuthLoading(false); }
  };

  // 3. Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, authData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setIsLoggedIn(true);
    } catch (err) { 
      alert(err.response?.data?.message || "Invalid credentials."); 
    } finally { setAuthLoading(false); }
  };

  const fetchHistory = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      const user = JSON.parse(userStr);
      const userId = user.id || user._id; 
      const res = await axios.get(`${API_BASE_URL}/api/auth/user/${userId}`);
      setHistory(Array.isArray(res.data.history) ? [...res.data.history].reverse() : []);
    } catch (err) { console.error("History fetch failed."); }
  };

  useEffect(() => { if (isLoggedIn) fetchHistory(); }, [isLoggedIn]);

  const handleDiagnose = async () => {
    if (!patientInfo.age || selectedSymptoms.length === 0) return alert("Please provide Age and Symptoms");
    setLoading(true);
    setPrediction(""); 
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const res = await axios.post(`${API_BASE_URL}/api/ai/diagnose`, { 
        symptoms: selectedSymptoms,
        userId: user?.id || user?._id,
        age: patientInfo.age,
        duration: patientInfo.duration
      }, { timeout: 45000 }); // Longer timeout for AI spin-up
      
      if (res.data.prediction) {
        setPrediction(res.data.prediction);
        await fetchHistory();
      }
    } catch (err) { 
        const msg = err.response?.status === 502 ? "AI Engine is waking up. Try again in 30 seconds." : "AI Engine Offline.";
        alert(msg); 
    } finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setPrediction("");
    setStep('auth');
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
            <p className="text-slate-400 mt-2 italic text-sm">
               {step === 'otp' ? "Email Verification" : (isRegistering ? "Registration" : "Clinician Login")}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === 'otp' ? (
              <motion.form key="otp-screen" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                onSubmit={handleVerifyAndRegister} className="space-y-4">
                <p className="text-xs text-center text-slate-500 mb-2 px-4 leading-relaxed">We sent a 6-digit code to <br/><span className="font-bold text-slate-800">{authData.email}</span></p>
                <div className="relative">
                  <Fingerprint className="absolute left-4 top-4 w-5 h-5 text-slate-300" />
                  <input required type="text" placeholder="000000" className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none font-bold text-center tracking-[0.5em] text-lg focus:ring-2 focus:ring-emerald-500 transition-all" 
                    value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g,''))} maxLength={6} />
                </div>
                <button type="submit" className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg">
                  {authLoading ? <Loader2 className="animate-spin mx-auto" /> : "Verify & Register"}
                </button>
                <button type="button" onClick={() => setStep('auth')} className="w-full text-xs text-slate-400 hover:text-emerald-600 transition-colors">Entered the wrong email?</button>
              </motion.form>
            ) : (
              <motion.form key="auth-screen" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                onSubmit={isRegistering ? handleRequestOTP : handleLogin} className="space-y-4">
                {isRegistering && (
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-4 w-5 h-5 text-slate-300" />
                    <input required type="text" placeholder="Full Name" className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-slate-200" 
                      onChange={(e) => setAuthData({...authData, name: e.target.value})} />
                  </div>
                )}
                <div className="relative">
                  <Mail className="absolute left-4 top-4 w-5 h-5 text-slate-300" />
                  <input required type="email" placeholder="Email Address" className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-slate-200" 
                    onChange={(e) => setAuthData({...authData, email: e.target.value})} />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-300" />
                  <input required type="password" placeholder="Password" className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-slate-200" 
                    onChange={(e) => setAuthData({...authData, password: e.target.value})} />
                </div>
                <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg">
                  {authLoading ? <Loader2 className="animate-spin mx-auto" /> : (isRegistering ? "Send Verification Code" : "Sign In")}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {step === 'auth' && (
            <button onClick={() => { setIsRegistering(!isRegistering); setAuthData({name:'', email:'', password:''}); }} className="w-full mt-4 text-sm text-emerald-600 font-bold underline">
              {isRegistering ? "Already have an account? Login" : "New clinician? Create Account"}
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden font-sans">
      {/* SIDEBAR HISTORY */}
      <motion.aside animate={{ width: showHistory ? "320px" : "80px" }} className="h-screen bg-white border-r border-slate-200 flex flex-col shadow-xl z-20 relative">
        <div className="p-6 flex items-center justify-between">
          {showHistory && <h3 className="font-black text-slate-800 text-xs tracking-widest">RECORDS</h3>}
          <button onClick={() => setShowHistory(!showHistory)} className="p-3 rounded-2xl bg-slate-50 text-emerald-600 hover:bg-emerald-50 transition-colors mx-auto">
            {showHistory ? <ChevronRight className="rotate-180" /> : <History />}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 space-y-3 scrollbar-hide">
          {showHistory && (history.length > 0 ? history.map((item, i) => (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={i} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm text-xs hover:border-emerald-200 transition-all cursor-default">
              <div className="flex justify-between font-bold text-emerald-600 mb-1">
                <span className="capitalize">{item.prediction || "Unknown"}</span>
                <span className="text-slate-400 font-normal">{new Date(item.date).toLocaleDateString()}</span>
              </div>
              <p className="text-slate-500 truncate">{(item.symptoms || []).join(', ').replace(/_/g, ' ')}</p>
            </motion.div>
          )) : <div className="text-center py-10 opacity-20 text-[10px] font-bold tracking-[0.2em]">NO RECORDS</div>)}
        </div>
      </motion.aside>

      <main className="flex-1 h-screen overflow-y-auto p-6 lg:p-12">
        <div className="max-w-5xl mx-auto pb-20">
          <nav className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 p-2 rounded-xl shadow-emerald-200 shadow-lg">
                <Activity className="text-white w-6 h-6" />
              </div>
              <span className="font-black text-2xl tracking-tighter text-slate-800">RURALDOC AI</span>
            </div>
            <button onClick={handleLogout} className="p-3 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
              <LogOut className="w-5 h-5" />
            </button>
          </nav>

          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm grid md:grid-cols-2 gap-6 border border-slate-100">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Patient Age</label>
                  <input type="number" className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-emerald-100" 
                    value={patientInfo.age} onChange={(e) => setPatientInfo({...patientInfo, age: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Duration</label>
                  <select className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-emerald-100"
                    value={patientInfo.duration} onChange={(e) => setPatientInfo({...patientInfo, duration: e.target.value})}>
                    <option>Less than 24h</option><option>1-2 Days</option><option>1 Week</option><option>Chronic</option>
                  </select>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-4 block tracking-widest">Identify Symptoms</label>
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-4 w-5 h-5 text-slate-300" />
                  <input type="text" placeholder="Search (e.g. fever, headache...)" className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  <AnimatePresence>
                    {searchTerm && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="absolute z-30 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-60 overflow-y-auto p-2 scrollbar-hide">
                        {filteredSymptoms.length > 0 ? filteredSymptoms.map(s => (
                          <button key={s} onClick={() => toggleSymptom(s)} className="w-full text-left px-4 py-3 hover:bg-emerald-50 rounded-xl flex items-center justify-between group transition-colors">
                            <span className="capitalize text-slate-700 font-medium">{s.replace(/_/g, ' ')}</span>
                            <Plus className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )) : <p className="p-4 text-center text-slate-400 text-xs">No matching symptoms found</p>}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex flex-wrap gap-2 p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 min-h-[120px]">
                  {selectedSymptoms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center w-full text-slate-300 py-4 opacity-40">
                        <Keyboard className="w-8 h-8 mb-2" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Select symptoms from search</p>
                    </div>
                  ) : selectedSymptoms.map(s => (
                    <motion.button initial={{ scale: 0.8 }} animate={{ scale: 1 }} key={s} onClick={() => toggleSymptom(s)} 
                      className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-red-500 transition-all shadow-md group">
                      {s.replace(/_/g, ' ')} <X className="w-3 h-3 group-hover:scale-125 transition-transform" />
                    </motion.button>
                  ))}
                </div>

                <button onClick={handleDiagnose} disabled={selectedSymptoms.length === 0 || loading}
                  className="w-full mt-10 py-5 bg-emerald-500 text-white rounded-[2rem] font-black text-xl hover:bg-emerald-600 shadow-lg shadow-emerald-200 flex items-center justify-center gap-3 transition-all disabled:bg-slate-200 disabled:shadow-none">
                  {loading ? <Loader2 className="animate-spin" /> : "Run AI Diagnosis"}
                </button>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                   <div className="bg-emerald-100 p-2 rounded-xl">
                      <MapPin className="text-emerald-600 w-5 h-5" />
                   </div>
                   <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Nearby Healthcare Facilities</h3>
                </div>
                <div className="rounded-[1.5rem] overflow-hidden border border-slate-100 h-[300px]">
                  <HospitalMap key={prediction} />
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-2xl text-center flex flex-col justify-center min-h-[500px] sticky top-12 border-4 border-slate-800">
              <AnimatePresence mode="wait">
                {prediction ? (
                  <motion.div key="result" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                    <div className="bg-emerald-500/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/20">
                      <ShieldCheck className="w-12 h-12 text-emerald-500" />
                    </div>
                    <p className="text-emerald-500 uppercase text-[10px] font-black mb-2 tracking-[0.3em]">AI Diagnosis Result</p>
                    <h3 className="text-4xl font-black tracking-tight leading-tight capitalize mb-6">{prediction}</h3>
                    <p className="text-slate-400 text-xs leading-relaxed px-4">This is an AI-generated suggestion based on reported symptoms. Please correlate with clinical findings.</p>
                  </motion.div>
                ) : (
                  <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="opacity-20 flex flex-col items-center">
                    <Stethoscope className="w-16 h-16 mb-4" />
                    <p className="font-black uppercase tracking-[0.2em] text-xs">Waiting for Analysis</p>
                  </motion.div>
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