import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine'; 
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
const RoutingMachine = ({ userPos, targetPos, setInstructions, isAudioOn }) => {
    const map = useMap();
    const routingControlRef = useRef(null);

    useEffect(() => {
        if (!map || !userPos || !targetPos) return;

        if (routingControlRef.current) {
            map.removeControl(routingControlRef.current);
        }

        routingControlRef.current = L.Routing.control({
            waypoints: [L.latLng(userPos[0], userPos[1]), L.latLng(targetPos[0], targetPos[1])],
            lineOptions: { styles: [{ color: '#3b82f6', weight: 6, opacity: 0.8 }] },
            createMarker: () => null,
            addWaypoints: false,
            routeWhileDragging: false,
            show: false 
        }).addTo(map);

        routingControlRef.current.on('routesfound', (e) => {
            const routes = e.routes[0];
            setInstructions(routes.instructions);
            
            // Audio: Speak the first instruction automatically if audio is on
            if (isAudioOn && routes.instructions.length > 0) {
                const msg = new SpeechSynthesisUtterance(routes.instructions[0].text);
                window.speechSynthesis.speak(msg);
            }
        });

        return () => map.removeControl(routingControlRef.current);
    }, [map, userPos, targetPos, isAudioOn]); // Added isAudioOn to dependencies

    return null;
};

const HospitalMap = () => {
    // 1. Better initial state handling
    const [userPos, setUserPos] = useState([28.6139, 77.2090]);
    const [hospitals, setHospitals] = useState([]);
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [instructions, setInstructions] = useState([]);
    const [isAudioOn, setIsAudioOn] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 2. FORCE REAL LOCATION (Finds you in Agra)
    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserPos([pos.coords.latitude, pos.coords.longitude]);
                },
                (err) => {
                    setError("Location denied. Please allow GPS to see Agra hospitals.");
                },
                { enableHighAccuracy: true }
            );
        }
    }, []);

    const findHospitals = useCallback(async (lat, lng) => {
        setLoading(true);
        setError(null);
        
        // Multi-server rotation to prevent "Too Many Requests"
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
                if (res.status === 429) continue; // Try next server if busy

                const data = await res.json();
                const list = data.elements.map(h => ({
                    name: h.tags.name || h.tags["name:en"] || "Medical Center",
                    lat: h.lat || h.center.lat,
                    lng: h.lon || h.center.lon,
                    dist: (L.latLng(lat, lng).distanceTo(L.latLng(h.lat || h.center.lat, h.lon || h.center.lon)) / 1000).toFixed(1)
                })).sort((a, b) => a.dist - b.dist);
                
                setHospitals(list);
                if (list.length > 0) setSelectedHospital(list[0]);
                success = true;
                break; // Stop loop if successful
            } catch (e) {
                console.error("Server error, trying next...");
            }
        }
        
        if (!success) setError("All map servers are busy. Please wait 10 seconds.");
        setLoading(false);
    }, []);

    useEffect(() => { 
        if (userPos) findHospitals(userPos[0], userPos[1]); 
    }, [userPos, findHospitals]);

    return (
        <div className="flex flex-col gap-4 h-full font-sans">
            <div className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Live Navigation</h3>
                </div>
                <button 
                    onClick={() => setIsAudioOn(!isAudioOn)}
                    className={`p-2 rounded-xl transition-all ${isAudioOn ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-100 text-slate-400'}`}
                >
                    <Volume2 size={18} />
                </button>
            </div>

            <div className="relative flex-1 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl min-h-[350px] bg-slate-100">
                {error && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white text-red-500 px-4 py-2 rounded-full text-[10px] font-bold shadow-lg border border-red-100">
                        {error}
                    </div>
                )}
                
                <MapContainer center={userPos} zoom={13} style={{ height: '100%', width: '100%' }}>
                    {/* Using Voyager tiles - much more reliable than standard OSM */}
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                    
                    <Marker position={userPos} icon={userIcon}>
                        <Popup>Your Location</Popup>
                    </Marker>
                    
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
            </div>

            <div className="bg-slate-900 rounded-3xl p-5 text-white shadow-2xl">
                {selectedHospital ? (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <div className="flex items-center gap-3">
                                <Navigation className="text-emerald-400" size={20} />
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-500">Destination</p>
                                    <h4 className="font-bold text-sm truncate w-40">{selectedHospital.name}</h4>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-emerald-400 font-black text-lg leading-none">{selectedHospital.dist}</p>
                                <p className="text-[8px] font-bold text-slate-500 uppercase">Kilometers</p>
                            </div>
                        </div>
                        
                        <div className="bg-white/5 rounded-2xl p-3">
                            {instructions.length > 0 ? (
                                <p className="text-xs text-emerald-100 font-medium">
                                    <span className="text-emerald-500 mr-2">➔</span>
                                    {instructions[0].text}
                                </p>
                            ) : (
                                <p className="text-xs text-slate-500 italic">Calculating route...</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <MapPin className="mx-auto text-slate-700 mb-2" size={24} />
                        <p className="text-xs text-slate-500 italic">Select a red marker to start navigation</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HospitalMap;