import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Activity, Navigation, Phone, HeartPulse, Search } from 'lucide-react';

// --- CONFIGURATION ---
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

// --- SUB-COMPONENT: HELPLINES ---
const AmbulanceDirectory = () => {
    const helplines = [
        { state: "National", number: "108", service: "All Emergency" },
        { state: "Uttar Pradesh", number: "102", service: "Ambulance" },
        { state: "Delhi", number: "102", service: "CAT Ambulance" },
        { state: "Bihar", number: "1099", service: "Health Dept" },
        { state: "Odisha", number: "102", service: "Janani Express" },
        { state: "MP", number: "108", service: "Sanjeevani" }
    ];

    return (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {helplines.map((item, idx) => (
                <a key={idx} href={`tel:${item.number}`} 
                   className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-3xl hover:border-red-500 transition-all shadow-sm group">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.state}</p>
                        <p className="text-sm font-bold text-slate-800">{item.service}</p>
                    </div>
                    <div className="bg-red-50 p-2 rounded-xl text-red-600 font-black group-hover:bg-red-500 group-hover:text-white transition-colors">
                        {item.number}
                    </div>
                </a>
            ))}
        </div>
    );
};

// --- MAIN COMPONENT ---
const RuralDocHealthMap = () => {
    const [userPos, setUserPos] = useState([27.1767, 78.0081]); // Default Agra
    const [hospitals, setHospitals] = useState([]);
    const [selectedHosp, setSelectedHosp] = useState(null);
    const [routePath, setRoutePath] = useState([]);
    const [loading, setLoading] = useState(true);

    // 1. Find Hospitals via Geocoding (CORS-friendly)
    const findHospitals = useCallback(async (lat, lng) => {
        setLoading(true);
        const url = `https://graphhopper.com/api/1/geocode?q=hospital&point=${lat},${lng}&limit=5&key=${GRAPHHOPPER_KEY}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.hits) {
                const list = data.hits.map(h => ({
                    id: h.osm_id || Math.random(),
                    name: h.name || "Medical Facility",
                    lat: h.point.lat,
                    lng: h.point.lng,
                    address: h.street || h.city || "Nearby"
                }));
                setHospitals(list);
                if (list.length > 0) handleSelect(list[0], [lat, lng]);
            }
        } catch (e) { console.error("Search error"); }
        setLoading(false);
    }, []);

    // 2. Fetch Road Route
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
        } catch (e) { setRoutePath([]); }
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
        <div className="min-h-screen bg-slate-100 p-4 md:p-10 font-sans">
            <div className="max-w-6xl mx-auto space-y-6">
                
                {/* 1. APP HEADER */}
                <div className="flex items-center justify-between bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="bg-red-500 p-3 rounded-2xl shadow-lg shadow-red-200">
                            <HeartPulse className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">RuralDoc AI</h1>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Emergency Navigator</p>
                        </div>
                    </div>
                    {loading && <div className="hidden md:block animate-pulse text-blue-500 font-black text-xs uppercase">Updating Data...</div>}
                </div>

                {/* 2. MAP SECTION */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 relative h-[450px] rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl">
                        <MapContainer center={userPos} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <Marker position={userPos} icon={userIcon} />
                            {hospitals.map(h => (
                                <Marker 
                                    key={h.id} 
                                    position={[h.lat, h.lng]} 
                                    icon={hospitalIcon}
                                    eventHandlers={{ click: () => handleSelect(h) }} 
                                />
                            ))}
                            {routePath.length > 0 && <Polyline positions={routePath} color="#3b82f6" weight={6} opacity={0.8} />}
                        </MapContainer>
                    </div>

                    {/* 3. SELECTED HOSPITAL CARD */}
                    <div className="flex flex-col gap-4">
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white h-full flex flex-col justify-between shadow-2xl">
                            {selectedHosp ? (
                                <>
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target Facility</p>
                                        </div>
                                        <h2 className="text-2xl font-bold text-blue-400 leading-tight mb-2">{selectedHosp.name}</h2>
                                        <p className="text-slate-400 text-sm italic">{selectedHosp.address}</p>
                                    </div>
                                    <button 
                                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedHosp.lat},${selectedHosp.lng}`)}
                                        className="mt-6 w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02]"
                                    >
                                        OPEN NAVIGATION <Navigation size={18} />
                                    </button>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-4">
                                    <Search size={40} strokeWidth={1} />
                                    <p className="text-xs font-bold uppercase text-center">Select a hospital marker to see directions</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 4. EMERGENCY DIRECTORY */}
                <AmbulanceDirectory />
            </div>
        </div>
    );
};

export default RuralDocHealthMap;