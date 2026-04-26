import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Phone, MapPin, Activity, Navigation, Search, AlertTriangle } from 'lucide-react';

const GRAPHHOPPER_KEY = "94238c37-b99e-4952-b1dc-1046b2193b3c";

const hospitalIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
});

const userIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    iconSize: [25, 41], iconAnchor: [12, 41]
});

const RuralHealthApp = () => {
    const [userPos, setUserPos] = useState([27.1767, 78.0081]); // Default Agra
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("idle"); // idle, loading, success, error

    // 1. Calculate Distance Locally (No API calls)
    const calculateKM = (lat1, lon1, lat2, lon2) => {
        const p = 0.017453292519943295; 
        const c = Math.cos;
        const a = 0.5 - c((lat2 - lat1) * p)/2 + 
                c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))/2;
        return (12742 * Math.asin(Math.sqrt(a))).toFixed(1); 
    };

    // 2. Fetching with manual trigger to save API quota
    const handleSearch = async () => {
        setLoading(true);
        setStatus("loading");
        try {
            // Search for hospitals strictly near the current map center
            const url = `https://graphhopper.com/api/1/geocode?q=hospital&point=${userPos[0]},${userPos[1]}&limit=10&key=${GRAPHHOPPER_KEY}`;
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.hits) {
                const list = data.hits
                    .map(h => ({
                        name: h.name || "Medical Clinic",
                        lat: h.point.lat,
                        lng: h.point.lng,
                        address: h.city || h.country || "Nearby",
                        dist: calculateKM(userPos[0], userPos[1], h.point.lat, h.point.lng)
                    }))
                    // Filter out results that are too far away (e.g. 4000km errors)
                    .filter(h => h.dist < 100) 
                    .sort((a, b) => a.dist - b.dist);

                setHospitals(list);
                setStatus(list.length > 0 ? "success" : "no-results");
            }
        } catch (e) {
            setStatus("error");
        }
        setLoading(false);
    };

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
            () => console.log("Defaulting to Agra")
        );
    }, []);

    return (
        <div className="max-w-4xl mx-auto p-4 font-sans text-slate-900">
            
            {/* Minimal Emergency Header */}
            <div className="flex justify-between items-center bg-white p-5 rounded-[2rem] shadow-sm mb-4 border border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="bg-red-500 p-2 rounded-xl text-white"><Activity size={20}/></div>
                    <span className="font-black tracking-tighter text-lg">RURAL-DOC AI</span>
                </div>
                <a href="tel:108" className="bg-red-600 text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 text-sm shadow-lg shadow-red-100">
                    <Phone size={16} /> AMBULANCE: 108
                </a>
            </div>

            {/* Map Area */}
            <div className="h-[350px] rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl mb-4">
                <MapContainer center={userPos} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={userPos} icon={userIcon} />
                    {hospitals.map((h, i) => (
                        <Marker key={i} position={[h.lat, h.lng]} icon={hospitalIcon}>
                            <Popup><div className="font-bold">{h.name}</div>{h.dist} km</Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            {/* Manual Search Button - Saves your API key from 429 errors */}
            <button 
                onClick={handleSearch}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
            >
                {loading ? "SEARCHING..." : <><Search size={22} strokeWidth={3}/> SCAN FOR NEARBY HOSPITALS</>}
            </button>

            {/* Results List */}
            <div className="mt-6 space-y-3">
                {status === "success" && hospitals.map((h, i) => (
                    <div key={i} className="bg-white p-4 rounded-3xl flex justify-between items-center border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-50 p-3 rounded-2xl text-blue-600"><MapPin size={20}/></div>
                            <div>
                                <h3 className="font-bold text-sm leading-none">{h.name}</h3>
                                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">{h.address}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-lg font-black text-blue-600">{h.dist}<span className="text-[10px] ml-1">KM</span></span>
                            <button onClick={() => window.open(`https://www.google.com/maps?q=${h.lat},${h.lng}`)} className="block text-[9px] font-black text-slate-400 hover:text-blue-600">NAVIGATE ↗</button>
                        </div>
                    </div>
                ))}

                {status === "no-results" && (
                    <div className="bg-amber-50 p-6 rounded-3xl text-center border border-amber-100">
                        <AlertTriangle className="mx-auto text-amber-500 mb-2" />
                        <p className="text-sm font-bold text-amber-800 uppercase">No hospitals found within 50km.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RuralHealthApp;