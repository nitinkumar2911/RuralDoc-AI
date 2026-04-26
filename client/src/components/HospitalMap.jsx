import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Activity, Navigation, Phone, Info } from 'lucide-react';

// --- ICONS ---
const createIcon = (color) => new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const userIcon = createIcon('blue');
const hospitalIcon = createIcon('red');

// --- HELPER: Zoom map to show both points ---
const AutoZoom = ({ points }) => {
    const map = useMap();
    useEffect(() => {
        if (points && points.length > 0) {
            const bounds = L.latLngBounds(points);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [points, map]);
    return null;
};

const HospitalMap = () => {
    const [userPos, setUserPos] = useState([27.1767, 78.0081]); // Default Agra
    const [hospitals, setHospitals] = useState([]);
    const [selectedHosp, setSelectedHosp] = useState(null);
    const [routePath, setRoutePath] = useState([]);
    const [loading, setLoading] = useState(true);

    const GRAPHHOPPER_KEY = "94238c37-b99e-4952-b1dc-1046b2193b3c";

    // 1. Calculate Straight Distance (Instant Feedback)
    const getStraightDistance = (p1, p2) => {
        const d = L.latLng(p1).distanceTo(L.latLng(p2));
        return (d / 1000).toFixed(1); // Return in KM
    };

    // 2. Search Hospitals & Find Nearest
    const searchHospitals = useCallback(async (lat, lng) => {
        setLoading(true);
        const query = `[out:json];node["amenity"~"hospital|clinic"](around:5000,${lat},${lng});out;`;
        try {
            const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
            const data = await res.json();
            
            const results = data.elements.map(h => ({
                id: h.id,
                name: h.tags.name || "Unnamed Medical Center",
                phone: h.tags.phone || h.tags['contact:phone'] || "No contact info",
                lat: h.lat,
                lng: h.lon,
                dist: getStraightDistance([lat, lng], [h.lat, h.lon])
            })).sort((a, b) => a.dist - b.dist);

            setHospitals(results);
            if (results.length > 0) handleSelect(results[0], [lat, lng]);
        } catch (e) {
            console.error("Failed to fetch hospitals");
        }
        setLoading(false);
    }, []);

    // 3. Handle Hospital Selection & Road Routing
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
            setRoutePath([[currentPos[0], currentPos[1]], [h.lat, h.lng]]); // Fallback to straight line
        }
    };

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const p = [pos.coords.latitude, pos.coords.longitude];
                setUserPos(p);
                searchHospitals(p[0], p[1]);
            },
            () => searchHospitals(userPos[0], userPos[1]),
            { enableHighAccuracy: true }
        );
    }, []);

    return (
        <div className="flex flex-col md:flex-row h-[90vh] w-full max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            
            {/* Sidebar: List of Nearest Hospitals */}
            <div className="w-full md:w-80 bg-slate-50 border-r border-slate-200 flex flex-col">
                <div className="p-6 bg-white border-b border-slate-100">
                    <div className="flex items-center gap-2 text-red-600 mb-1">
                        <Activity size={20} className="animate-pulse" />
                        <h2 className="font-black uppercase tracking-tight">Nearby Help</h2>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Emergency Quick-Access</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {hospitals.map(h => (
                        <div 
                            key={h.id}
                            onClick={() => handleSelect(h)}
                            className={`p-4 rounded-2xl cursor-pointer transition-all border-2 ${selectedHosp?.id === h.id ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-transparent bg-white hover:border-slate-200'}`}
                        >
                            <h3 className="font-bold text-slate-800 text-sm leading-tight mb-1">{h.name}</h3>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{h.dist} KM</span>
                                <Navigation size={14} className={selectedHosp?.id === h.id ? 'text-blue-500' : 'text-slate-300'} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Map Area */}
            <div className="flex-1 relative">
                <MapContainer center={userPos} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    
                    <Marker position={userPos} icon={userIcon}>
                        <Popup>You are here</Popup>
                    </Marker>

                    {hospitals.map(h => (
                        <Marker 
                            key={h.id} 
                            position={[h.lat, h.lng]} 
                            icon={hospitalIcon}
                            eventHandlers={{ click: () => handleSelect(h) }}
                        />
                    ))}

                    {routePath.length > 0 && <Polyline positions={routePath} color="#3b82f6" weight={5} opacity={0.7} />}
                    <AutoZoom points={selectedHosp ? [userPos, [selectedHosp.lat, selectedHosp.lng]] : [userPos]} />
                </MapContainer>

                {/* Bottom Floating Info Card */}
                {selectedHosp && (
                    <div className="absolute bottom-6 left-6 right-6 z-[1000] bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-emerald-500 w-2 h-2 rounded-full animate-ping" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Navigation</p>
                                </div>
                                <h2 className="text-xl font-bold truncate">{selectedHosp.name}</h2>
                                <p className="text-slate-400 text-xs flex items-center gap-2 mt-1">
                                    <Phone size={12} /> {selectedHosp.phone}
                                </p>
                            </div>
                            <div className="flex gap-4 items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                                <div className="text-center pr-4 border-r border-white/10">
                                    <p className="text-2xl font-black">{selectedHosp.dist}</p>
                                    <p className="text-[8px] font-bold text-slate-500 uppercase">KM Away</p>
                                </div>
                                <button 
                                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedHosp.lat},${selectedHosp.lng}`)}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                                >
                                    GO <Navigation size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HospitalMap;