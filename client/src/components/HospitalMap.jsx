import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Activity, Navigation, Phone, HeartPulse, Search, AlertCircle } from 'lucide-react';

// --- CONFIGURATION ---
// Using your GraphHopper key for BOTH searching and routing to avoid CORS errors
const GRAPHHOPPER_KEY = "94238c37-b99e-4952-b1dc-1046b2193b3c";

// Fix Leaflet icons for production/Vercel
const userIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
});

const hospitalIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
});

// --- HELPLINE DATA ---
const helplines = [
    { state: "National", number: "108", service: "All Emergency" },
    { state: "Uttar Pradesh", number: "102", service: "Ambulance" },
    { state: "Delhi", number: "102", service: "CAT Ambulance" },
    { state: "Bihar", number: "1099", service: "Health Dept" },
    { state: "Odisha", number: "102", service: "Janani Express" },
    { state: "MP", number: "108", service: "Sanjeevani" }
];

const RuralDocHealthMap = () => {
    const [userPos, setUserPos] = useState([27.1767, 78.0081]); // Default Agra
    const [hospitals, setHospitals] = useState([]);
    const [selectedHosp, setSelectedHosp] = useState(null);
    const [routePath, setRoutePath] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 1. Find Hospitals via GraphHopper (Fixes CORS issue from image_aa9133.png)
    const findHospitals = useCallback(async (lat, lng) => {
        setLoading(true);
        setError(null);
        const url = `https://graphhopper.com/api/1/geocode?q=hospital&point=${lat},${lng}&limit=10&key=${GRAPHHOPPER_KEY}`;
        
        try {
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.hits && data.hits.length > 0) {
                const list = data.hits.map(h => ({
                    id: h.osm_id || Math.random(),
                    name: h.name || "Medical Facility",
                    lat: h.point.lat,
                    lng: h.point.lng,
                    address: h.street || h.city || "Agra Region"
                }));
                setHospitals(list);
                handleSelect(list[0], [lat, lng]); // Auto-route to nearest
            } else {
                setError("No facilities found nearby.");
            }
        } catch (e) { 
            setError("Network error. Please check connection.");
        }
        setLoading(false);
    }, []);

    // 2. Road Routing Logic
    const handleSelect = async (h, currentPos = userPos) => {
        setSelectedHosp(h);
        const url = `https://graphhopper.com/api/1/route?point=${currentPos[0]},${currentPos[1]}&point=${h.lat},${h.lng}&profile=car&points_encoded=false&key=${GRAPHHOPPER_KEY}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.paths) {
                const points = data.paths[0].points.coordinates.map(c => [c[1], c[0]]);
                setRoutePath(points);
            }
        } catch (e) { 
            setRoutePath([[currentPos[0], currentPos[1]], [h.lat, h.lng]]); // Straight line fallback
        }
    };

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const p = [pos.coords.latitude, pos.coords.longitude];
                setUserPos(p);
                findHospitals(p[0], p[1]);
            },
            () => findHospitals(27.1767, 78.0081),
            { enableHighAccuracy: true }
        );
    }, [findHospitals]);

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                
                {/* Responsive Header */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm flex items-center justify-between border border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="bg-red-500 p-3 rounded-2xl shadow-lg">
                            <HeartPulse className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-800 tracking-tight">RuralDoc Emergency</h1>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Agra Navigator</p>
                        </div>
                    </div>
                    {loading && <div className="text-blue-500 animate-pulse font-black text-xs">SCANNING...</div>}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Hospital List Sidebar */}
                    <div className="lg:col-span-1 bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
                        <div className="p-5 border-b bg-slate-50">
                            <h2 className="text-sm font-black text-red-600 uppercase flex items-center gap-2">
                                <Activity size={16} /> Hospital Directory
                            </h2>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {hospitals.length > 0 ? hospitals.map(h => (
                                <div 
                                    key={h.id}
                                    onClick={() => handleSelect(h)}
                                    className={`p-4 rounded-2xl cursor-pointer transition-all border-2 ${selectedHosp?.id === h.id ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-slate-50 hover:bg-slate-100'}`}
                                >
                                    <h3 className="font-bold text-slate-800 text-sm">{h.name}</h3>
                                    <p className="text-[10px] text-slate-500 mt-1">{h.address}</p>
                                </div>
                            )) : <p className="text-center py-10 text-xs font-bold text-slate-400">{error || "Searching..."}</p>}
                        </div>
                    </div>

                    {/* Map and Detail Card */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="h-[400px] rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl">
                            <MapContainer center={userPos} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <Marker position={userPos} icon={userIcon} />
                                {hospitals.map(h => (
                                    <Marker key={h.id} position={[h.lat, h.lng]} icon={hospitalIcon} eventHandlers={{ click: () => handleSelect(h) }} />
                                ))}
                                {routePath.length > 0 && <Polyline positions={routePath} color="#3b82f6" weight={6} opacity={0.8} />}
                            </MapContainer>
                        </div>

                        <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-blue-400">{selectedHosp?.name || "Select a Facility"}</h2>
                                <p className="text-slate-500 text-[10px] uppercase font-black">Live Navigation Active</p>
                            </div>
                            <button 
                                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedHosp?.lat},${selectedHosp?.lng}`)}
                                className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-2xl font-black text-xs flex items-center gap-2 transition-all"
                            >
                                START GPS <Navigation size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick-Dial Helplines */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    {helplines.map((h, i) => (
                        <a key={i} href={`tel:${h.number}`} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 text-center hover:border-red-500 transition-all group">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{h.state}</p>
                            <p className="text-sm font-black text-red-600 group-hover:scale-110 transition-transform">{h.number}</p>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RuralDocHealthMap;