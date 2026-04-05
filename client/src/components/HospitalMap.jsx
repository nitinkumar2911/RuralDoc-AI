import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine'; 
import 'leaflet/dist/leaflet.css';
import { Navigation, MapPin, Activity, Compass, ArrowUpRight } from 'lucide-react';

// --- MARKER SETUP (Prevents 404s) ---
const userIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const hospitalIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

// --- DYNAMIC ROUTING & DIRECTION COMPONENT ---
const RoutingEngine = ({ userPos, targetPos, setRouteInfo }) => {
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
            lineOptions: { styles: [{ color: '#3b82f6', weight: 6, opacity: 0.8 }] },
            show: false,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true
        }).addTo(map);

        routingControlRef.current.on('routesfound', (e) => {
            if (e.routes && e.routes[0]) {
                const route = e.routes[0];
                setRouteInfo({
                    distance: (route.summary.totalDistance / 1000).toFixed(2), // Convert to km
                    duration: Math.round(route.summary.totalTime / 60), // Convert to minutes
                    nextStep: route.instructions[0].text // First direction
                });
            }
        });

        return () => { if (routingControlRef.current) try { map.removeControl(routingControlRef.current); } catch(e){} };
    }, [map, userPos, targetPos, setRouteInfo]);

    return null;
};

const HospitalMap = () => {
    const [userPos, setUserPos] = useState([27.1767, 78.0081]); // Agra
    const [hospitals, setHospitals] = useState([]);
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [routeInfo, setRouteInfo] = useState({ distance: 0, duration: 0, nextStep: "" });
    const [loading, setLoading] = useState(true);

    const MAPTILER_KEY = "PgnxR4LxF3YjTC0jAwtF";

    // 1. Fetch Hospitals
    const findHospitals = useCallback(async (lat, lng) => {
        setLoading(true);
        const query = `[out:json][timeout:25];(node["amenity"~"hospital|clinic"](around:8000,${lat},${lng}););out center;`;
        try {
            const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
            const data = await res.json();
            const list = data.elements.map(h => ({
                name: h.tags.name || "Medical Emergency Center",
                lat: h.lat || h.center.lat,
                lng: h.lon || h.center.lon,
            }));
            setHospitals(list);
            if (list.length > 0) setSelectedHospital(list[0]);
        } catch (e) { console.error("Busy"); }
        setLoading(false);
    }, []);

    // 2. Track Real Location
    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const p = [pos.coords.latitude, pos.coords.longitude];
                setUserPos(p);
                findHospitals(p[0], p[1]);
            },
            () => findHospitals(userPos[0], userPos[1]),
            { enableHighAccuracy: true }
        );
    }, []);

    return (
        <div className="flex flex-col gap-4 max-w-4xl mx-auto p-4 bg-slate-50 rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden font-sans">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-2">
                <div className="flex items-center gap-3">
                    <div className="bg-red-500 p-2 rounded-2xl shadow-lg shadow-red-200">
                        <Activity className="text-white" size={20} />
                    </div>
                    <h1 className="text-lg font-black text-slate-800 tracking-tight">Agra HealthNav</h1>
                </div>
                {loading && <div className="text-[10px] font-bold text-blue-500 animate-pulse uppercase">Searching...</div>}
            </div>

            {/* MAP CONTAINER */}
            <div className="relative w-full h-[400px] rounded-[2rem] overflow-hidden border-4 border-white shadow-inner bg-slate-200">
                <MapContainer center={userPos} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                    <TileLayer url={`https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`} />
                    
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
                        <RoutingEngine 
                            userPos={userPos} 
                            targetPos={[selectedHospital.lat, selectedHospital.lng]} 
                            setRouteInfo={setRouteInfo} 
                        />
                    )}
                </MapContainer>
            </div>

            {/* LIVE DIRECTION & DISTANCE CARD */}
            <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl">
                {selectedHospital ? (
                    <div className="space-y-5">
                        <div className="flex justify-between items-start border-b border-white/10 pb-4">
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-blue-400 truncate">{selectedHospital.name}</h2>
                                <div className="flex items-center gap-2 mt-2">
                                    <MapPin size={14} className="text-slate-500" />
                                    <p className="text-xs text-slate-400 font-medium tracking-wide">Agra Medical Hub</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-black text-white">{routeInfo.distance} <span className="text-blue-400 text-sm">KM</span></p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Route Distance</p>
                            </div>
                        </div>

                        <div className="flex gap-4 items-center">
                            <div className="bg-blue-600/20 p-4 rounded-2xl border border-blue-500/30">
                                <Compass className="text-blue-400 animate-spin-slow" size={28} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <ArrowUpRight size={14} className="text-emerald-400" />
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Live Direction Instruction</p>
                                </div>
                                <p className="text-sm font-semibold text-slate-200 leading-relaxed italic">
                                    {routeInfo.nextStep || "Calculating fastest path..."}
                                </p>
                            </div>
                            <div className="text-center bg-white/5 px-4 py-2 rounded-2xl">
                                <p className="text-lg font-bold text-emerald-400">{routeInfo.duration}</p>
                                <p className="text-[8px] text-slate-500 font-bold uppercase">MINS</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-6 flex flex-col items-center gap-3 text-slate-500">
                        <Navigation size={32} strokeWidth={1} className="animate-bounce" />
                        <p className="text-xs font-bold uppercase tracking-widest">Select a hospital marker to begin navigation</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HospitalMap;