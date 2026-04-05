import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine'; 
import 'leaflet/dist/leaflet.css';
import { Navigation, Loader2, Volume2, MapPin, PlusSquare } from 'lucide-react';

// --- ICONS ---
const userIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    iconSize: [25, 41], iconAnchor: [12, 41]
});

const hospitalIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    iconSize: [25, 41], iconAnchor: [12, 41]
});

// --- ROUTING ENGINE (FIXED & FREE) ---
const RoutingMachine = ({ userPos, targetPos, setInstructions, isAudioOn }) => {
    const map = useMap();
    const routingControlRef = useRef(null);

    useEffect(() => {
        if (!map || !userPos || !targetPos) return;

        // Cleanup to prevent "removeLayer" errors
        if (routingControlRef.current) {
            try { map.removeControl(routingControlRef.current); } catch (e) {}
        }

        routingControlRef.current = L.Routing.control({
            waypoints: [L.latLng(userPos[0], userPos[1]), L.latLng(targetPos[0], targetPos[1])],
            // Use direct OSRM to bypass demo warnings
            serviceUrl: 'https://router.project-osrm.org/route/v1',
            lineOptions: { 
                styles: [{ color: '#3b82f6', weight: 6, opacity: 0.8 }],
                addWaypoints: false 
            },
            showAlternatives: false,
            fitSelectedRoutes: true,
            show: false 
        }).addTo(map);

        routingControlRef.current.on('routesfound', (e) => {
            const routes = e.routes[0];
            setInstructions(routes.instructions);
            
            if (isAudioOn && routes.instructions.length > 0) {
                window.speechSynthesis.cancel(); 
                const msg = new SpeechSynthesisUtterance(routes.instructions[0].text);
                window.speechSynthesis.speak(msg);
            }
        });

        return () => {
            if (routingControlRef.current && map) {
                try { map.removeControl(routingControlRef.current); } catch (e) {}
            }
        };
    }, [map, userPos, targetPos, isAudioOn]);

    return null;
};

const HospitalMap = () => {
    const [userPos, setUserPos] = useState([28.6139, 77.2090]); // Default Delhi
    const [hospitals, setHospitals] = useState([]);
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [instructions, setInstructions] = useState([]);
    const [isAudioOn, setIsAudioOn] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 1. FORCE GPS (Agra detection)
    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
                () => setError("Location blocked. Showing default map."),
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }
    }, []);

    // 2. SEARCH WITH SERVER ROTATION (Fixes 429 Errors)
    const findHospitals = useCallback(async (lat, lng) => {
        setLoading(true);
        setError(null);
        
        const servers = [
            'https://overpass-api.de/api/interpreter',
            'https://lz4.overpass-api.de/api/interpreter',
            'https://overpass.kumi.systems/api/interpreter'
        ];
        
        const query = `[out:json][timeout:25];(node["amenity"~"hospital|clinic"](around:15000,${lat},${lng});way["amenity"~"hospital|clinic"](around:15000,${lat},${lng}););out center;`;
        
        let success = false;
        for (const url of servers) {
            try {
                const res = await fetch(`${url}?data=${encodeURIComponent(query)}`);
                if (res.status === 429) continue; 

                const data = await res.json();
                const list = data.elements.map(h => ({
                    name: h.tags.name || "Medical Center",
                    lat: h.lat || h.center.lat,
                    lng: h.lon || h.center.lon,
                    dist: (L.latLng(lat, lng).distanceTo(L.latLng(h.lat || h.center.lat, h.lon || h.center.lon)) / 1000).toFixed(1)
                })).sort((a, b) => a.dist - b.dist);
                
                setHospitals(list);
                if (list.length > 0) setSelectedHospital(list[0]);
                success = true;
                break;
            } catch (e) { console.error("Switching server..."); }
        }
        
        if (!success) setError("Map servers busy. Retrying...");
        setLoading(false);
    }, []);

    useEffect(() => { findHospitals(userPos[0], userPos[1]); }, [userPos, findHospitals]);

    return (
        <div className="flex flex-col gap-4 h-full font-sans">
            {/* Header / Audio Toggle */}
            <div className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 text-slate-500">
                    <div className={`w-2 h-2 rounded-full ${loading ? 'bg-orange-400 animate-ping' : 'bg-emerald-500'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Live Map</span>
                </div>
                <button 
                    onClick={() => setIsAudioOn(!isAudioOn)}
                    className={`p-2 rounded-xl transition-all ${isAudioOn ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}
                >
                    <Volume2 size={18} />
                </button>
            </div>

            {/* Map Area */}
            <div className="relative flex-1 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl min-h-[350px] bg-slate-200">
                {error && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white text-red-500 px-4 py-2 rounded-full text-[10px] font-bold shadow-lg">
                        {error}
                    </div>
                )}
                
                <MapContainer center={userPos} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                    <Marker position={userPos} icon={userIcon} />
                    
                    {hospitals.map((h, i) => (
                        <Marker key={i} position={[h.lat, h.lng]} icon={hospitalIcon} eventHandlers={{ click: () => setSelectedHospital(h) }} />
                    ))}

                    {selectedHospital && (
                        <RoutingMachine userPos={userPos} targetPos={[selectedHospital.lat, selectedHospital.lng]} setInstructions={setInstructions} isAudioOn={isAudioOn} />
                    )}
                </MapContainer>
            </div>

            {/* Instructions Box */}
            <div className="bg-slate-900 rounded-3xl p-5 text-white shadow-2xl">
                {selectedHospital ? (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <div className="flex gap-3">
                                <Navigation className="text-emerald-400" size={20} />
                                <div>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase">Heading To</p>
                                    <h4 className="font-bold text-sm truncate w-40">{selectedHospital.name}</h4>
                                </div>
                            </div>
                            <div className="bg-emerald-500/20 px-3 py-1 rounded-lg">
                                <span className="text-emerald-400 font-black">{selectedHospital.dist} KM</span>
                            </div>
                        </div>
                        
                        <div className="bg-white/5 rounded-2xl p-3 min-h-[50px]">
                            {instructions.length > 0 ? (
                                <p className="text-xs text-emerald-100 italic">" {instructions[0].text} "</p>
                            ) : (
                                <div className="flex items-center gap-2 text-slate-500 text-xs italic">
                                    <Loader2 className="animate-spin" size={12} /> Calculating path...
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4 text-slate-500 flex flex-col items-center gap-2">
                        <MapPin size={20} />
                        <p className="text-[10px] uppercase font-bold tracking-widest">Select a hospital marker</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HospitalMap;