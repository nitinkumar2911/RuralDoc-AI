import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Navigation, Loader2 } from 'lucide-react';

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

// Haversine Distance Formula
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
    useEffect(() => { if (center) map.flyTo(center, 14); }, [center, map]);
    return null;
}

const HospitalMap = () => {
    const [userPos, setUserPos] = useState([28.6139, 77.2090]); // Default Delhi
    const [hospitals, setHospitals] = useState([]);
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition((pos) => {
            setUserPos([pos.coords.latitude, pos.coords.longitude]);
        });
    }, []);

    const findHospitals = async (lat, lng) => {
        setLoading(true);
        const query = `[out:json];(node["amenity"="hospital"](around:10000,${lat},${lng});way["amenity"="hospital"](around:10000,${lat},${lng}););out center;`;
        try {
            const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
            const data = await res.json();
            const list = data.elements.map(h => ({
                name: h.tags["name:en"] || h.tags.name || "Government Hospital",
                lat: h.lat || h.center.lat,
                lng: h.lon || h.center.lon,
                dist: getDist(lat, lng, h.lat || h.center.lat, h.lon || h.center.lon)
            })).sort((a, b) => a.dist - b.dist);
            setHospitals(list);
            if(list.length > 0) setSelectedHospital(list[0]); // Default path to nearest
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { findHospitals(userPos[0], userPos[1]); }, [userPos]);

    const handleSearch = async (e) => {
        e.preventDefault();
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}`);
        const data = await res.json();
        if (data[0]) setUserPos([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
    };

    return (
        <div className="space-y-4 font-sans">
            <form onSubmit={handleSearch} className="relative">
                <input 
                    className="w-full p-4 pl-12 bg-slate-50 border-2 border-emerald-50 rounded-2xl outline-none focus:border-emerald-400 shadow-sm"
                    placeholder="Search city..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-4 top-4 text-emerald-400" size={20} />
            </form>

            <div className="h-[400px] w-full rounded-[2.5rem] overflow-hidden border-8 border-white shadow-2xl relative">
                {loading && <div className="absolute inset-0 z-[1000] bg-white/60 flex items-center justify-center backdrop-blur-sm"><Loader2 className="animate-spin text-emerald-500" /></div>}
                <MapContainer center={userPos} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png" />
                    <MapController center={userPos} />
                    
                    <Marker position={userPos} icon={userIcon}><Popup>You are here</Popup></Marker>
                    
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
                                    <p className="text-emerald-500 font-bold">{h.dist} KM</p>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* THE BLUE PATH: Only shows for the selected/clicked hospital */}
                    {selectedHospital && (
                        <Polyline 
                            positions={[userPos, [selectedHospital.lat, selectedHospital.lng]]} 
                            color="#3b82f6" 
                            weight={5} 
                            opacity={0.7}
                            dashArray="10, 10"
                        />
                    )}
                </MapContainer>
            </div>

            {/* LIST OF HOSPITALS */}
            <div className="space-y-3">
                {hospitals.slice(0, 3).map((h, i) => (
                    <div 
                        key={i} 
                        onClick={() => setSelectedHospital(h)}
                        className={`p-4 rounded-3xl flex justify-between items-center border-2 cursor-pointer transition-all ${selectedHospital?.name === h.name ? 'border-blue-400 bg-blue-50' : 'border-slate-50 bg-white'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${selectedHospital?.name === h.name ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                <Navigation size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">{h.name}</h4>
                                <p className="text-[10px] text-slate-400 font-bold">CLICK TO VIEW PATH</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="block text-lg font-black text-slate-700">{h.dist}</span>
                            <span className="text-[10px] font-bold text-blue-500 uppercase">KM</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HospitalMap;