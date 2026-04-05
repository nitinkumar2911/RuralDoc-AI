import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Navigation, Loader2, AlertCircle, RefreshCw, PlusSquare } from 'lucide-react';

// Fix for default Leaflet icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Medical Icon
const hospitalIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const MapController = ({ center }) => {
    const map = useMap();
    useEffect(() => { if (center) map.flyTo(center, 13); }, [center, map]);
    return null;
};

const HospitalMap = () => {
    const [userPos, setUserPos] = useState([28.6139, 77.2090]); 
    const [hospitals, setHospitals] = useState([]);
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 1. Get Location with High Accuracy
    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
                () => setError("Using default location (Delhi). Search for your area below.")
            );
        }
    }, []);

    // 2. The "Never-Fail" Fetch Function
    const findHospitals = useCallback(async (lat, lng) => {
        setLoading(true);
        setError(null);

        // We use multiple Overpass servers to avoid "Busy" errors
        const servers = [
            'https://overpass-api.de/api/interpreter',
            'https://overpass.kumi.systems/api/interpreter',
            'https://lz4.overpass-api.de/api/interpreter'
        ];
        
        const query = `[out:json][timeout:15];(node["amenity"~"hospital|clinic|doctors|pharmacy"](around:20000,${lat},${lng});way["amenity"~"hospital|clinic|doctors|pharmacy"](around:20000,${lat},${lng}););out center;`;

        let success = false;
        for (const server of servers) {
            if (success) break;
            try {
                const res = await fetch(`${server}?data=${encodeURIComponent(query)}`);
                if (!res.ok) continue; 
                
                const data = await res.json();
                const list = data.elements.map(h => ({
                    name: h.tags.name || h.tags["name:en"] || "Rural Health Center",
                    lat: h.lat || h.center.lat,
                    lng: h.lon || h.center.lon,
                    type: (h.tags.amenity || "Medical").toUpperCase(),
                    dist: (L.latLng(lat, lng).distanceTo(L.latLng(h.lat || h.center.lat, h.lon || h.center.lon)) / 1000).toFixed(1)
                })).sort((a, b) => a.dist - b.dist);

                setHospitals(list.slice(0, 10));
                if (list.length > 0) setSelectedHospital(list[0]);
                success = true;
            } catch (e) {
                console.warn(`Server ${server} failed, trying next...`);
            }
        }

        if (!success) setError("All map servers are busy. Please retry in a moment.");
        setLoading(false);
    }, []);

    useEffect(() => { findHospitals(userPos[0], userPos[1]); }, [userPos, findHospitals]);

    // 3. Search Logic
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery) return;
        setLoading(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            if (data[0]) {
                setUserPos([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
                setSearchQuery("");
            } else { setError("Location not found."); }
        } catch (err) { setError("Search service busy."); }
        setLoading(false);
    };

    return (
        <div className="flex flex-col gap-4 w-full h-full">
            {/* Minimal Search Bar */}
            <form onSubmit={handleSearch} className="relative">
                <input 
                    className="w-full p-3 pl-10 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    placeholder="Search village or town..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                {loading && <Loader2 className="absolute right-3 top-3 animate-spin text-emerald-500" size={16} />}
            </form>

            {/* Map Container */}
            <div className="flex-1 rounded-3xl overflow-hidden border border-slate-200 relative min-h-[300px]">
                {error && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-white border-2 border-red-100 p-2 rounded-xl shadow-lg flex items-center gap-2">
                        <span className="text-[10px] font-bold text-red-500 uppercase">{error}</span>
                        <button onClick={() => findHospitals(userPos[0], userPos[1])} className="p-1 bg-red-500 text-white rounded-lg">
                            <RefreshCw size={12} />
                        </button>
                    </div>
                )}
                
                <MapContainer center={userPos} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                    <TileLayer 
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        attribution='&copy; OpenStreetMap contributors'
                    />
                    <MapController center={userPos} />
                    <Marker position={userPos} />
                    
                    {hospitals.map((h, i) => (
                        <Marker key={i} position={[h.lat, h.lng]} icon={hospitalIcon}>
                            <Popup>
                                <div className="text-center font-sans">
                                    <p className="font-bold">{h.name}</p>
                                    <p className="text-emerald-600 font-bold">{h.dist} KM</p>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            {/* Top 3 Result List */}
            <div className="space-y-2">
                {hospitals.slice(0, 3).map((h, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-emerald-500 transition-all cursor-pointer" onClick={() => setSelectedHospital(h)}>
                        <div className="flex items-center gap-3">
                            <PlusSquare className="text-red-500" size={20} />
                            <div>
                                <h4 className="text-xs font-bold text-slate-800 truncate w-32">{h.name}</h4>
                                <p className="text-[9px] text-slate-400 uppercase tracking-tighter">{h.type}</p>
                            </div>
                        </div>
                        <div className="bg-emerald-50 px-2 py-1 rounded-lg">
                            <span className="text-[10px] font-black text-emerald-600">{h.dist} KM</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HospitalMap;