import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine'; // Install: npm install leaflet-routing-machine
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Navigation, Loader2, AlertCircle, Volume2 } from 'lucide-react';

// Custom Marker Icons
const userIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    iconSize: [25, 41], iconAnchor: [12, 41]
});

const hospitalIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    iconSize: [25, 41], iconAnchor: [12, 41]
});

// --- ROUTING ENGINE COMPONENT ---
const RoutingMachine = ({ userPos, targetPos, setInstructions }) => {
    const map = useMap();
    const routingControlRef = useRef(null);

    useEffect(() => {
        if (!map || !userPos || !targetPos) return;

        // Clean up old routes
        if (routingControlRef.current) {
            map.removeControl(routingControlRef.current);
        }

        // Create new route
        routingControlRef.current = L.Routing.control({
            waypoints: [L.latLng(userPos[0], userPos[1]), L.latLng(targetPos[0], targetPos[1])],
            lineOptions: { styles: [{ color: '#3b82f6', weight: 6, opacity: 0.8 }] },
            createMarker: () => null, // Hide default routing markers
            addWaypoints: false,
            routeWhileDragging: false,
            show: false // Hide the default text box (we will make our own)
        }).addTo(map);

        routingControlRef.current.on('routesfound', (e) => {
            const routes = e.routes[0];
            setInstructions(routes.instructions);
        });

        return () => map.removeControl(routingControlRef.current);
    }, [map, userPos, targetPos]);

    return null;
};

const HospitalMap = () => {
    const [userPos, setUserPos] = useState([28.6139, 77.2090]);
    const [hospitals, setHospitals] = useState([]);
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [instructions, setInstructions] = useState([]);
    const [isAudioOn, setIsAudioOn] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Audio Logic: Voice out the next direction
    const speakNextStep = () => {
        if (!isAudioOn || instructions.length === 0) return;
        const nextStep = instructions[0].text;
        const msg = new SpeechSynthesisUtterance(nextStep);
        window.speechSynthesis.speak(msg);
    };

    const findHospitals = useCallback(async (lat, lng) => {
        setLoading(true);
        const query = `[out:json][timeout:25];(node["amenity"~"hospital|clinic"](around:15000,${lat},${lng}););out center;`;
        try {
            const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
            const data = await res.json();
            const list = data.elements.map(h => ({
                name: h.tags.name || "Medical Center",
                lat: h.lat || h.center.lat,
                lng: h.lon || h.center.lon,
                dist: (L.latLng(lat, lng).distanceTo(L.latLng(h.lat || h.center.lat, h.lon || h.center.lon)) / 1000).toFixed(1)
            })).sort((a, b) => a.dist - b.dist);
            setHospitals(list);
            if (list.length > 0) setSelectedHospital(list[0]);
        } catch (e) { setError("Switching to backup servers..."); }
        setLoading(false);
    }, []);

    useEffect(() => { findHospitals(userPos[0], userPos[1]); }, [userPos]);

    return (
        <div className="flex flex-col gap-4 h-full font-sans">
            <div className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Live Directions</h3>
                <button 
                    onClick={() => { setIsAudioOn(!isAudioOn); speakNextStep(); }}
                    className={`p-2 rounded-xl transition-all ${isAudioOn ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}
                >
                    <Volume2 size={18} />
                </button>
            </div>

            <div className="relative flex-1 rounded-[2.5rem] overflow-hidden border-2 border-white shadow-xl min-h-[350px]">
                <MapContainer center={userPos} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                    <Marker position={userPos} icon={userIcon} />
                    
                    {hospitals.map((h, i) => (
                        <Marker key={i} position={[h.lat, h.lng]} icon={hospitalIcon} eventHandlers={{ click: () => setSelectedHospital(h) }} />
                    ))}

                    {selectedHospital && (
                        <RoutingMachine userPos={userPos} targetPos={[selectedHospital.lat, selectedHospital.lng]} setInstructions={setInstructions} />
                    )}
                </MapContainer>
            </div>

            {/* Instruction List / Directions Overlay */}
            <div className="bg-slate-900 rounded-3xl p-5 text-white shadow-2xl">
                {selectedHospital ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                            <Navigation className="text-emerald-400" size={20} />
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400">Destination</p>
                                <h4 className="font-bold text-sm truncate">{selectedHospital.name} ({selectedHospital.dist} km)</h4>
                            </div>
                        </div>
                        
                        <div className="max-h-24 overflow-y-auto space-y-2 scrollbar-hide">
                            {instructions.length > 0 ? (
                                <p className="text-xs text-emerald-100 font-medium animate-pulse">
                                    Next: {instructions[0].text}
                                </p>
                            ) : (
                                <p className="text-xs text-slate-500 italic">Calculating fastest path...</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-center py-4 text-slate-500 italic">Select a medical facility to start navigation</p>
                )}
            </div>
        </div>
    );
};

export default HospitalMap;