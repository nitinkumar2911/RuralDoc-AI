import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Navigation, Loader2, AlertCircle } from 'lucide-react';

// Marker Icons
const userIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    shadowSize: [41, 41]
});

const hospitalIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    shadowSize: [41, 41]
});

const getDist = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);
};

function MapController({ center }) {
    const map = useMap();
    useEffect(() => { if (center) map.setView(center, 13); }, [center, map]);
    return null;
}

const HospitalMap = () => {
    const [userPos, setUserPos] = useState([28.6139, 77.2090]); // Default Delhi
    const [hospitals, setHospitals] = useState([]);
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Get User Location on Mount
    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
                (err) => {
                    console.warn("Location denied. Using default.");
                    setError("Location access denied. Showing default area.");
                }
            );
        }
    }, []);

    const findHospitals = async (lat, lng) => {
        setLoading(true);
        setError(null);
        // Expanded query to include clinics and doctors for rural support
        const query = `
            [out:json][timeout:25];
            (
              node["amenity"~"hospital|clinic|doctors"](around:20000,${lat},${lng});
              way["amenity"~"hospital|clinic|doctors"](around:20000,${lat},${lng});
            );
            out center;`;
        
        try {
            const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
            if (!res.ok) throw new Error("API Limit Reached");
            
            const data = await res.json();
            const list = data.elements.map(h => ({
                name: h.tags["name:en"] || h.tags.name || "Medical Center",
                lat: h.lat || h.center.lat,
                lng: h.lon || h.center.lon,
                type: h.tags.amenity,
                dist: getDist(lat, lng, h.lat || h.center.lat, h.lon || h.center.lon)
            })).sort((a, b) => a.dist - b.dist);

            setHospitals(list);
            if(list.length === 0) setError("No medical facilities found within 20km.");
            if(list.length > 0) setSelectedHospital(list[0]);
        } catch (e) { 
            setError("Map service busy. Please try again.");
            console.error(e); 
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { findHospitals(userPos[0], userPos[1]); }, [userPos]);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery) return;
        setLoading(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}`);
            const data = await res.json();
            if (data[0]) {
                setUserPos([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
                setSearchQuery(""); // Clear search after finding
            } else {
                setError("Location not found.");
            }
        } catch (err) {
            setError("Search failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4 font-sans">
            {/* Search Input */}
            <form onSubmit={handleSearch} className="relative">
                <input 
                    className="w-full p-4 pl-12 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-400 shadow-sm transition-all"
                    placeholder="Enter city or area name..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-4 top-4 text-slate-400" size={20} />
                {loading && <Loader2 className="absolute right-4 top-4 animate-spin text-blue-500" size={20} />}
            </form>

            {/* Map Container */}
            <div className="h-[400px] w-full rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl relative">
                {error && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-50 text-red-600 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 border border-red-200 shadow-lg">
                        <AlertCircle size={14} /> {error}
                    </div>
                )}
                
                <MapContainer center={userPos} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapController center={userPos} />
                    
                    <Marker position={userPos} icon={userIcon}><Popup>Your Search Location</Popup></Marker>
                    
                    {hospitals.map((h, i) => (
                        <Marker 
                            key={i} 
                            position={[h.lat, h.lng]} 
                            icon={hospitalIcon}
                            eventHandlers={{ click: () => setSelectedHospital(h) }}
                        >
                            <Popup>
                                <div className="p-1 text-center">
                                    <p className="font-bold text-slate-800">{h.name}</p>
                                    <p className="text-blue-500 font-bold">{h.dist} KM</p>
                                    <span className="text-[10px] uppercase bg-slate-100 px-2 py-1 rounded-md">{h.type}</span>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {selectedHospital && (
                        <Polyline 
                            positions={[userPos, [selectedHospital.lat, selectedHospital.lng]]} 
                            color="#3b82f6" 
                            weight={4} 
                            opacity={0.6}
                            dashArray="10, 10"
                        />
                    )}
                </MapContainer>
            </div>

            {/* Quick Actions / Results */}
            <div className="grid grid-cols-1 gap-3">
                {hospitals.slice(0, 3).map((h, i) => (
                    <div 
                        key={i} 
                        onClick={() => setSelectedHospital(h)}
                        className={`p-4 rounded-3xl flex justify-between items-center border-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${selectedHospital?.name === h.name ? 'border-blue-400 bg-blue-50' : 'border-slate-50 bg-white'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${selectedHospital?.name === h.name ? 'bg-blue-500 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400'}`}>
                                <Navigation size={18} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">{h.name}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    {h.type} • Tap to view route
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="block text-lg font-black text-slate-700 leading-none">{h.dist}</span>
                            <span className="text-[10px] font-bold text-blue-500 uppercase">KM</span>
                        </div>
                    </div>
                ))}
                {hospitals.length === 0 && !loading && (
                    <div className="text-center p-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <MapPin className="mx-auto text-slate-300 mb-2" size={32} />
                        <p className="text-slate-500 text-sm">Try searching for a different city or area.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HospitalMap;