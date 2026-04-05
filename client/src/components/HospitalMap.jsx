import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine'; 
import 'leaflet/dist/leaflet.css';
import { Navigation, Volume2, MapPin, Activity, Shield, Phone } from 'lucide-react';

// --- FIXED ASSETS (Prevents 404 Errors) ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const userIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const hospitalIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

// --- MAPTILER PROFESSIONAL ROUTING ---
const RoutingMachine = ({ userPos, targetPos, setInstructions, isAudioOn }) => {
    const map = useMap();
    const routingControlRef = useRef(null);

    useEffect(() => {
        if (!map || !userPos || !targetPos) return;

        if (routingControlRef.current) {
            try { map.removeControl(routingControlRef.current); } catch (e) {}
        }

        routingControlRef.current = L.Routing.control({
            waypoints: [L.latLng(userPos[0], userPos[1]), L.latLng(targetPos[0], targetPos[1])],
            serviceUrl: 'https://router.project-osrm.org/route/v1',
            lineOptions: { 
                styles: [{ color: '#ef4444', weight: 5, opacity: 0.7 }], // Emergency Red Path
                addWaypoints: false 
            },
            showAlternatives: false,
            fitSelectedRoutes: true,
            draggableWaypoints: false,
            show: false 
        }).addTo(map);

        routingControlRef.current.on('routesfound', (e) => {
            if (e.routes && e.routes[0]) {
                setInstructions(e.routes[0].instructions);
                if (isAudioOn) {
                    window.speechSynthesis.cancel();
                    const msg = new SpeechSynthesisUtterance(e.routes[0].instructions[0].text);
                    window.speechSynthesis.speak(msg);
                }
            }
        });

        return () => {
            if (routingControlRef.current && map) {
                try { map.removeControl(routingControlRef.current); } catch (e) {}
            }
        };
    }, [map, userPos, targetPos, isAudioOn, setInstructions]);

    return null;
};

const HospitalMap = () => {
    const [userPos, setUserPos] = useState([27.1767, 78.0081]); // Center of Agra
    const [hospitals, setHospitals] = useState([]);
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [instructions, setInstructions] = useState([]);
    const [isAudioOn, setIsAudioOn] = useState(false);
    const [loading, setLoading] = useState(true);

    const MAPTILER_KEY = "Vkj9ihO5OekbjdZzQ9ed";

    // 1. Get High Accuracy Location
    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
                null,
                { enableHighAccuracy: true }
            );
        }
    }, []);

    // 2. Fetch Hospitals with MapTiler-Compatible Overpass Query
    const findHospitals = useCallback(async (lat, lng) => {
        setLoading(true);
        const query = `[out:json][timeout:25];(node["amenity"~"hospital|clinic"](around:8000,${lat},${lng}););out center;`;
        try {
            const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
            const data = await res.json();
            const list = data.elements.map(h => ({
                name: h.tags.name || "Medical Facility",
                lat: h.lat || h.center.lat,
                lng: h.lon || h.center.lon,
                dist: (L.latLng(lat, lng).distanceTo(L.latLng(h.lat || h.center.lat, h.lon || h.center.lon)) / 1000).toFixed(1)
            })).sort((a, b) => a.dist - b.dist);
            setHospitals(list);
            if (list.length > 0) setSelectedHospital(list[0]);
        } catch (e) { console.error("Data error"); }
        setLoading(false);
    }, []);

    useEffect(() => { findHospitals(userPos[0], userPos[1]); }, [userPos, findHospitals]);

    return (
        <div className="flex flex-col gap-3 h-full bg-slate-50 font-sans">
            {/* Nav Header */}
            <div className="bg-white px-5 py-3 flex justify-between items-center border-b border-slate-100 shadow-sm">
                <div className="flex items-center gap-2">
                    <Activity className="text-red-500" size={18} />
                    <span className="text-sm font-black tracking-tight text-slate-800 uppercase">Emergency Map</span>
                </div>
                <button 
                    onClick={() => setIsAudioOn(!isAudioOn)}
                    className={`p-2 rounded-xl transition-all ${isAudioOn ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-slate-100 text-slate-400'}`}
                >
                    <Volume2 size={18} />
                </button>
            </div>

            {/* Professional Map Section */}
            <div className="relative flex-1 mx-2 rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-200">
                <MapContainer center={userPos} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                    {/* MAPTILER PROFESSIONAL TILES */}
                    <TileLayer 
                        url={`https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`}
                        attribution='&copy; MapTiler &copy; OpenStreetMap'
                    />
                    
                    <Marker position={userPos} icon={userIcon} />
                    
                    {hospitals.map((h, i) => (
                        <Marker 
                            key={i} 
                            position={[h.lat, h.lng]} 
                            icon={hospitalIcon} 
                            eventHandlers={{ click: () => setSelectedHospital(h) }} 
                        />
                    ))}

                    {selectedHospital && (
                        <RoutingMachine 
                            userPos={userPos} 
                            targetPos={[selectedHospital.lat, selectedHospital.lng]} 
                            setInstructions={setInstructions} 
                            isAudioOn={isAudioOn}
                        />
                    )}
                </MapContainer>
                
                {loading && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-md z-[1000] flex items-center justify-center font-bold text-slate-600 text-xs">
                        LOCATING NEARBY CLINICS...
                    </div>
                )}
            </div>

            {/* Direction Card */}
            <div className="mx-2 mb-2 bg-slate-900 rounded-[2rem] p-5 shadow-xl text-white">
                {selectedHospital ? (
                    <div className="space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="text-lg font-bold leading-tight">{selectedHospital.name}</h4>
                                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 uppercase font-bold tracking-widest">
                                    <MapPin size={10} /> {selectedHospital.dist} KM FROM YOUR LOCATION
                                </p>
                            </div>
                            <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-xl">
                                <Navigation size={20} />
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                            <p className="text-xs text-slate-400 mb-1 uppercase font-black tracking-tighter">Current Instruction</p>
                            <p className="text-sm font-medium italic">
                                {instructions.length > 0 ? instructions[0].text : "Calculating route..."}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4 text-slate-500 text-xs uppercase tracking-widest font-bold">
                        Choose a hospital to begin
                    </div>
                )}
            </div>
        </div>
    );
};

export default HospitalMap;