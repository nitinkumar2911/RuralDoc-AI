import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine'; 
import 'leaflet/dist/leaflet.css';
import { Navigation, Volume2, Activity, MapPin, AlertCircle } from 'lucide-react';

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

// --- SAFE ROUTING ENGINE ---
const RoutingMachine = ({ userPos, targetPos, setInstructions }) => {
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
            lineOptions: { styles: [{ color: '#3b82f6', weight: 5, opacity: 0.8 }] },
            show: false, addWaypoints: false, draggableWaypoints: false, fitSelectedRoutes: true
        }).addTo(map);

        routingControlRef.current.on('routesfound', (e) => {
            if (e.routes?.[0]) setInstructions(e.routes[0].instructions);
        });

        return () => { if (routingControlRef.current) try { map.removeControl(routingControlRef.current); } catch(e){} };
    }, [map, userPos, targetPos]);

    return null;
};

const HospitalMap = () => {
    const [userPos, setUserPos] = useState([27.1767, 78.0081]);
    const [hospitals, setHospitals] = useState([]);
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [instructions, setInstructions] = useState([]);
    const [loading, setLoading] = useState(true);

    const MAPTILER_KEY = "PgnxR4LxF3YjTC0jAwtF";

    const fetchHospitals = useCallback(async (lat, lng) => {
        setLoading(true);
        const query = `[out:json][timeout:25];(node["amenity"~"hospital|clinic"](around:8000,${lat},${lng}););out center;`;
        try {
            const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
            const data = await res.json();
            const list = data.elements.map(h => ({
                name: h.tags.name || "Medical Clinic",
                lat: h.lat || h.center.lat,
                lng: h.lon || h.center.lon,
                dist: (L.latLng(lat, lng).distanceTo(L.latLng(h.lat || h.center.lat, h.lon || h.center.lon)) / 1000).toFixed(1)
            })).sort((a, b) => a.dist - b.dist);
            setHospitals(list);
            if (list.length > 0) setSelectedHospital(list[0]);
        } catch (e) { console.error("Busy"); }
        setLoading(false);
    }, []);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const p = [pos.coords.latitude, pos.coords.longitude];
                setUserPos(p);
                fetchHospitals(p[0], p[1]);
            },
            () => fetchHospitals(userPos[0], userPos[1])
        );
    }, []);

    return (
        <div className="flex flex-col gap-4 max-w-4xl mx-auto p-4 bg-white rounded-3xl shadow-lg border border-slate-100">
            {/* Header Section */}
            <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-3">
                    <div className="bg-red-50 p-2 rounded-xl">
                        <Activity className="text-red-500" size={20} />
                    </div>
                    <h2 className="font-bold text-slate-800 tracking-tight">Nearby Emergency Care</h2>
                </div>
                <div className="text-[10px] font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-500 uppercase">
                    Agra Region
                </div>
            </div>

            {/* THE MAP SECTION - Fixed height makes it visible */}
            <div className="relative w-full h-[450px] rounded-[2rem] overflow-hidden border-4 border-slate-50 shadow-inner bg-slate-100">
                <MapContainer center={userPos} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                    <TileLayer 
                        url={`https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`}
                        attribution='&copy; MapTiler'
                    />
                    
                    <Marker position={userPos} icon={userIcon}><Popup>You are here</Popup></Marker>
                    
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
                        />
                    )}
                </MapContainer>

                {loading && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-[1000] flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                        <span className="text-[10px] font-bold text-slate-600 uppercase">Updating Map...</span>
                    </div>
                )}
            </div>

            {/* Info Card Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedHospital ? (
                    <>
                        <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-md">
                            <p className="text-[10px] text-blue-400 font-bold uppercase mb-1">Selected Facility</p>
                            <h3 className="font-bold text-base truncate">{selectedHospital.name}</h3>
                            <div className="flex items-center gap-2 mt-2 text-slate-400 text-xs">
                                <MapPin size={12} /> {selectedHospital.dist} KM Away
                            </div>
                        </div>
                        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                            <div className="flex items-center gap-2 mb-1">
                                <Navigation size={14} className="text-blue-600" />
                                <span className="text-[10px] font-bold text-blue-600 uppercase">Live Directions</span>
                            </div>
                            <p className="text-sm font-medium text-slate-700 italic">
                                {instructions?.[0]?.text || "Checking fastest route..."}
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="col-span-2 py-4 flex items-center justify-center gap-2 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <AlertCircle size={16} />
                        <span className="text-xs font-medium italic">Click a red marker to see hospital details</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HospitalMap;