import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, MapPin, Activity, Compass, ArrowUpRight, Clock } from 'lucide-react';

// --- MARKER SETUP ---
const userIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    iconSize: [25, 41], iconAnchor: [12, 41]
});

const hospitalIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    iconSize: [25, 41], iconAnchor: [12, 41]
});

// --- COMPONENT TO DRAW THE ROUTE LINE ---
const RouteLine = ({ path }) => {
    const map = useMap();
    const lineRef = useRef(null);

    useEffect(() => {
        if (!map || !path) return;
        if (lineRef.current) map.removeLayer(lineRef.current);

        lineRef.current = L.polyline(path, {
            color: '#3b82f6',
            weight: 6,
            opacity: 0.8,
            lineJoin: 'round'
        }).addTo(map);

        map.fitBounds(lineRef.current.getBounds(), { padding: [40, 40] });

        return () => { if (lineRef.current) map.removeLayer(lineRef.current); };
    }, [map, path]);

    return null;
};

const HospitalMap = () => {
    const [userPos, setUserPos] = useState([27.1767, 78.0081]); // Agra
    const [hospitals, setHospitals] = useState([]);
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [routeInfo, setRouteInfo] = useState({ distance: 0, duration: 0, nextStep: "" });
    const [routePath, setRoutePath] = useState(null);
    const [loading, setLoading] = useState(true);

    const MAPTILER_KEY = "PgnxR4LxF3YjTC0jAwtF";
    const GRAPHHOPPER_KEY = "94238c37-b99e-4952-b1dc-1046b2193b3c";

    // 1. Fetch Hospitals (Overpass API)
    const findHospitals = useCallback(async (lat, lng) => {
        setLoading(true);
        const query = `[out:json];(node["amenity"~"hospital|clinic"](around:8000,${lat},${lng}););out center;`;
        try {
            const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
            const data = await res.json();
            const list = data.elements.map(h => ({
                name: h.tags.name || "Medical Center",
                lat: h.lat || h.center.lat,
                lng: h.lon || h.center.lon,
            }));
            setHospitals(list);
            if (list.length > 0) handleSelect(list[0], [lat, lng]);
        } catch (e) { console.error("Data fetch error"); }
        setLoading(false);
    }, []);

    // 2. Fetch Professional Directions (GraphHopper)
    const getDirections = async (start, end) => {
        const url = `https://graphhopper.com/api/1/route?point=${start[0]},${start[1]}&point=${end[0]},${end[1]}&profile=car&locale=en&points_encoded=false&key=${GRAPHHOPPER_KEY}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.paths) {
                const path = data.paths[0];
                setRouteInfo({
                    distance: (path.distance / 1000).toFixed(2),
                    duration: Math.round(path.time / 60000),
                    nextStep: path.instructions[0].text
                });
                setRoutePath(path.points.coordinates.map(c => [c[1], c[0]]));
            }
        } catch (e) { console.error("Routing error"); }
    };

    const handleSelect = (h, currentPos = userPos) => {
        setSelectedHospital(h);
        getDirections(currentPos, [h.lat, h.lng]);
    };

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
        <div className="flex flex-col w-full max-w-5xl mx-auto h-[95vh] md:h-auto gap-3 p-2 md:p-6 bg-slate-50 rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Responsive Header */}
            <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="bg-red-500 p-2 rounded-xl md:rounded-2xl shadow-lg shadow-red-100">
                        <Activity className="text-white w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div>
                        <h1 className="text-sm md:text-lg font-black text-slate-800 tracking-tight">Agra HealthNav</h1>
                        <p className="hidden md:block text-[10px] text-slate-400 font-bold uppercase">Emergency Response System</p>
                    </div>
                </div>
                {loading && <div className="text-[10px] font-bold text-blue-500 animate-pulse uppercase">Updating...</div>}
            </div>

            {/* MAP CONTAINER - Height adjusts for Mobile (300px) vs Laptop (500px) */}
            <div className="relative w-full h-[350px] md:h-[500px] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border-4 border-white shadow-inner bg-slate-200">
                <MapContainer center={userPos} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                    <TileLayer url={`https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`} />
                    <Marker position={userPos} icon={userIcon} />
                    {hospitals.map((h, i) => (
                        <Marker 
                            key={i} 
                            position={[h.lat, h.lng]} 
                            icon={hospitalIcon} 
                            eventHandlers={{ click: () => handleSelect(h) }} 
                        />
                    ))}
                    {routePath && <RouteLine path={routePath} />}
                </MapContainer>
            </div>

            {/* INFO CARD - Responsive Grid */}
            <div className="bg-slate-900 rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 text-white shadow-2xl flex-shrink-0">
                {selectedHospital ? (
                    <div className="flex flex-col md:flex-row justify-between gap-4 md:gap-8">
                        <div className="flex-1 border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0 md:pr-8">
                            <h2 className="text-lg md:text-2xl font-bold text-blue-400 truncate mb-1">
                                {selectedHospital.name}
                            </h2>
                            <div className="flex items-center gap-2 text-slate-400 text-xs md:text-sm">
                                <MapPin size={14} />
                                <span className="font-medium">Direct Road Route Active</span>
                            </div>
                            
                            <div className="mt-4 flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                                <div className="bg-blue-500/20 p-2 rounded-lg">
                                    <ArrowUpRight className="text-blue-400" size={18} />
                                </div>
                                <p className="text-xs md:text-sm font-medium text-slate-200 italic leading-snug">
                                    {routeInfo.nextStep || "Calculating fastest path..."}
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-around md:flex-col md:justify-center gap-4 md:w-32">
                            <div className="text-center md:text-right">
                                <p className="text-xl md:text-3xl font-black text-white leading-none">
                                    {routeInfo.distance} <span className="text-blue-500 text-xs md:text-sm">KM</span>
                                </p>
                                <p className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Distance</p>
                            </div>
                            <div className="text-center md:text-right">
                                <p className="text-xl md:text-3xl font-black text-emerald-400 leading-none">
                                    {routeInfo.duration} <span className="text-slate-400 text-xs md:text-sm">MIN</span>
                                </p>
                                <p className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Travel Time</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-4 md:py-8 flex flex-col items-center gap-3 text-slate-500">
                        <Navigation size={32} strokeWidth={1} className="animate-bounce" />
                        <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-center">
                            Select a medical facility to start navigation
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HospitalMap;