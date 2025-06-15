import React, { useState, useEffect, useCallback, useRef } from 'react';
import Map, { Marker, Popup, NavigationControl, ScaleControl, FullscreenControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { TrafficCone, Info, Clock, MapPin, Navigation, Globe, XCircle, ChevronDown, Siren, AlertTriangle, Car, Search, Sparkles } from 'lucide-react';
import { formatDistanceStrict, format } from 'date-fns';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase'; // Import Firestore instance

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoidGhpZXJyeXNveWFuZyIsImEiOiJjbWJ2bDQ3bnMwMWt1MnFzYmJjOXo2bWY0In0.oHlG45uicVdX9W7wwAOxrw';

// SearchInput Component
const SearchInput = ({ placeholder, value, onSelect, geocodeAddress }) => {
    const [searchTerm, setSearchTerm] = useState(value || '');
    const [suggestions, setSuggestions] = useState([]);
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        setSearchTerm(value || '');
    }, [value]);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => { clearTimeout(handler); };
    }, [searchTerm]);

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (debouncedSearchTerm) {
                const results = await geocodeAddress(debouncedSearchTerm);
                if (results && results.length > 0) {
                    setSuggestions(results);
                    setShowSuggestions(true);
                } else {
                    setSuggestions([]);
                    setShowSuggestions(false);
                }
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        };
        fetchSuggestions();
    }, [debouncedSearchTerm, geocodeAddress]);

    const handleSelectSuggestion = useCallback(async (selected) => {
        setSearchTerm(selected.name);
        setSuggestions([]);
        setShowSuggestions(false);
        onSelect(selected);
    }, [onSelect]);

    const handleInputChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleClearInput = () => {
        setSearchTerm('');
        onSelect(null);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    return (
        <div className="relative">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400 group-focus-within:text-slate-200 transition-colors" />
                </div>
                <input
                    type="text"
                    placeholder={placeholder}
                    className="w-full pl-12 pr-12 py-4 border border-slate-500/50 rounded-xl placeholder-slate-400 text-slate-100 bg-slate-700/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:border-slate-400 focus:ring-slate-400/20 sm:text-sm transition-all duration-300 hover:bg-slate-700/80"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={() => {
                        if (suggestions.length > 0 || searchTerm.length > 0) {
                           setShowSuggestions(true);
                        }
                    }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
                />
                {searchTerm && (
                    <button
                        onClick={handleClearInput}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
                    >
                        <XCircle className="h-5 w-5" />
                    </button>
                )}
            </div>
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-20 w-full mt-2 bg-slate-800/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-600/50 max-h-60 overflow-y-auto custom-scrollbar">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={suggestion.name + index}
                            className="w-full text-left p-4 hover:bg-slate-700/70 text-slate-100 border-b border-slate-600/30 last:border-b-0 first:rounded-t-xl last:rounded-b-xl transition-colors duration-200 focus:outline-none focus:bg-slate-700/70"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectSuggestion(suggestion)}
                        >
                            <div className="flex items-center space-x-3">
                                <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                <span className="text-sm">{suggestion.name}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const TrafficLiveMonitorPage = ({ currentLocation: propCurrentLocation }) => {
    const initialCenter = propCurrentLocation || { lat: 4.1560, lng: 9.2312 };
    const mapRef = useRef(null);

    const [viewState, setViewState] = useState({
        longitude: initialCenter.lng,
        latitude: initialCenter.lat,
        zoom: 13,
        bearing: 0,
        pitch: 0,
        padding: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    const [selectedIncident, setSelectedIncident] = useState(null);
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [liveTrafficIncidents, setLiveTrafficIncidents] = useState([]);
    const [error, setError] = useState(null);

    const cities = {
        Buea: { name: 'Buea', coords: { lat: 4.1560, lng: 9.2312 }, zoom: 13 },
        Yaounde: { name: 'Yaounde', coords: { lat: 3.8480, lng: 11.5021 }, zoom: 12 },
        Douala: { name: 'Douala', coords: { lat: 4.0410, lng: 9.7020 }, zoom: 12 },
    };

    const [currentCityName, setCurrentCityName] = useState(cities.Buea.name);

    // Fetch incidents from Firestore
    useEffect(() => {
        const incidentsCollection = collection(db, 'incidents');
        const unsubscribe = onSnapshot(incidentsCollection, (snapshot) => {
            const incidents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setLiveTrafficIncidents(incidents);
        }, (err) => {
            console.error('Error fetching incidents:', err);
            setError('Failed to load incidents. Please try again later.');
        });

        return () => unsubscribe(); // Cleanup listener on unmount
    }, []);

    useEffect(() => {
        if (propCurrentLocation) {
            setViewState(prev => ({
                ...prev,
                longitude: propCurrentLocation.lng,
                latitude: propCurrentLocation.lat,
                zoom: prev.zoom < 10 ? 10 : prev.zoom,
                speed: 1
            }));
            setCurrentCityName('Current Location');
        }
    }, [propCurrentLocation]);

    const geocodeAddress = useCallback(async (query) => {
        if (!query) return [];
        try {
            const map = mapRef.current?.getMap();
            let proximity = '';
            if (map) {
                const center = map.getCenter();
                proximity = `&proximity=${center.lng},${center.lat}`;
            }

            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_ACCESS_TOKEN}${proximity}&country=cm`
            );
            if (!response.ok) {
                throw new Error(`Mapbox Geocoding API error: ${response.status} - ${response.statusText}`);
            }
            const data = await response.json();

            if (data.features && data.features.length > 0) {
                return data.features.map(feature => ({
                    name: feature.place_name,
                    coordinates: { lat: feature.center[1], lng: feature.center[0] }
                }));
            }
            return [];
        } catch (err) {
            console.error("Error geocoding address:", err);
            return [];
        }
    }, []);

    const handleSearchSelect = useCallback((selected) => {
        if (selected) {
            setViewState(prev => ({
                ...prev,
                longitude: selected.coordinates.lng,
                latitude: selected.coordinates.lat,
                zoom: 14,
                speed: 1
            }));
            setCurrentCityName(selected.name);
        }
    }, []);

    const handleCityToggle = useCallback((cityKey) => {
        const newCityData = cities[cityKey];
        setCurrentCityName(newCityData.name);
        setShowCityDropdown(false);

        setViewState(prev => ({
            ...prev,
            longitude: newCityData.coords.lng,
            latitude: newCityData.coords.lat,
            zoom: newCityData.zoom,
            speed: 1
        }));
    }, [cities]);

    const getIncidentMarkerIcon = useCallback((type) => {
        let iconComponent;
        let bgColorClass = '';
        let textColorClass = 'text-white';

        switch (type) {
            case 'Accident':
                iconComponent = <Siren className="h-5 w-5" />;
                bgColorClass = 'bg-gradient-to-br from-red-500 to-red-600';
                break;
            case 'Road Closure':
            case 'Construction':
                iconComponent = <TrafficCone className="h-5 w-5" />;
                bgColorClass = 'bg-gradient-to-br from-orange-500 to-orange-600';
                break;
            case 'Hazard':
                iconComponent = <AlertTriangle className="h-5 w-5" />;
                bgColorClass = 'bg-gradient-to-br from-yellow-500 to-yellow-600';
                textColorClass = 'text-gray-900';
                break;
            case 'Traffic Jam':
                iconComponent = <Car className="h-5 w-5" />;
                bgColorClass = 'bg-gradient-to-br from-blue-500 to-blue-600';
                break;
            case 'Event':
                iconComponent = <Info className="h-5 w-5" />;
                bgColorClass = 'bg-gradient-to-br from-purple-500 to-purple-600';
                break;
            default:
                iconComponent = <MapPin className="h-5 w-5" />;
                bgColorClass = 'bg-gradient-to-br from-gray-500 to-gray-600';
        }

        return (
            <div className="flex flex-col items-center animate-bounce-custom">
                <div className={`p-3 rounded-full shadow-2xl ${bgColorClass} ${textColorClass} flex items-center justify-center border-2 border-white/20 backdrop-blur-sm`}>
                    {iconComponent}
                </div>
                <div className="text-xs font-semibold text-white bg-slate-800/90 backdrop-blur-sm rounded-full px-3 py-1 mt-1 shadow-lg capitalize border border-slate-600/50">
                    {type}
                </div>
            </div>
        );
    }, []);

    return (
        <div className="h-screen flex flex-col relative overflow-hidden font-inter text-slate-100">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(71, 85, 105, 0.3); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.6); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(203, 213, 225, 0.8); }
                @keyframes bounce-custom { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
                .animate-bounce-custom { animation: bounce-custom 2s infinite ease-in-out; }
                .mapboxgl-popup-content {
                    border-radius: 16px;
                    padding: 0;
                    background: rgba(30, 41, 59, 0.95);
                    backdrop-filter: blur(12px);
                    color: #f1f5f9;
                    border: 1px solid rgba(71, 85, 105, 0.5);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }
                .mapboxgl-popup-tip {
                    border-top-color: rgba(30, 41, 59, 0.95) !important;
                    border-bottom-color: rgba(30, 41, 59, 0.95) !important;
                }
                .mapboxgl-popup-close-button {
                    color: #94a3b8;
                    font-size: 1.25rem;
                    top: 12px;
                    right: 12px;
                    background: rgba(71, 85, 105, 0.5);
                    border-radius: 50%;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .mapboxgl-popup-close-button:hover {
                    background: rgba(71, 85, 105, 0.8);
                    color: #f1f5f9;
                }
                .mapboxgl-ctrl-bottom-left, .mapboxgl-ctrl-bottom-right {
                    z-index: 20 !important;
                }
            `}</style>

            <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/50 backdrop-blur-xl text-white p-6 shadow-2xl z-30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center shadow-lg">
                            <Navigation className="h-6 w-6 text-slate-200" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                                Street Eye Monitor
                            </h1>
                            <p className="text-sm text-slate-400 font-medium">Real-time traffic intelligence</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-slate-300">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Live</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 relative">
                {error && (
                    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-red-900/90 backdrop-blur-xl border border-red-700/50 text-red-100 px-6 py-4 rounded-xl z-40 shadow-2xl">
                        <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-5 w-5" />
                            <span className="font-medium">{error}</span>
                        </div>
                    </div>
                )}
                
                <Map
                    ref={mapRef}
                    mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
                    {...viewState}
                    onMove={evt => setViewState(evt.viewState)}
                    style={{ width: '100%', height: '100%', borderRadius: '0px', overflow: 'hidden' }}
                    mapStyle="mapbox://styles/mapbox/dark-v11"
                    projection="globe"
                >
                    <NavigationControl position="bottom-right" />
                    <ScaleControl position="bottom-left" />
                    <FullscreenControl position="top-right" />

                    {propCurrentLocation && (
                        <Marker longitude={propCurrentLocation.lng} latitude={propCurrentLocation.lat} anchor="bottom">
                            <div className="flex flex-col items-center animate-bounce-custom">
                                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full shadow-2xl border-2 border-white/20 backdrop-blur-sm">
                                    <MapPin className="h-6 w-6 text-white" />
                                </div>
                                <div className="text-xs font-semibold text-white bg-blue-600/90 backdrop-blur-sm rounded-full px-3 py-1 mt-1 shadow-lg border border-blue-400/50">
                                    You
                                </div>
                            </div>
                        </Marker>
                    )}

                    {liveTrafficIncidents.map((incident) => (
                        <Marker
                            key={incident.id}
                            longitude={incident.location.lng}
                            latitude={incident.location.lat}
                            anchor="bottom"
                            onClick={() => setSelectedIncident(incident)}
                        >
                            {getIncidentMarkerIcon(incident.type)}
                        </Marker>
                    ))}

                    {selectedIncident && (
                        <Popup
                            longitude={selectedIncident.location.lng}
                            latitude={selectedIncident.location.lat}
                            anchor="top"
                            onClose={() => setSelectedIncident(null)}
                            closeButton={true}
                            closeOnClick={false}
                        >
                            <div className="p-6 text-slate-100">
                                <div className="font-bold text-xl flex items-center mb-4">
                                    <div className="mr-3">
                                        {getIncidentMarkerIcon(selectedIncident.type)}
                                    </div>
                                    <span className="capitalize">{selectedIncident.type}</span>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-start space-x-3">
                                        <Info className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-slate-200">{selectedIncident.description}</p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <Clock className="h-5 w-5 text-slate-400 flex-shrink-0" />
                                        <div className="text-sm">
                                            <span className="text-slate-300">Reported </span>
                                            {selectedIncident.timestamp && (
                                                <>
                                                    <span className="font-semibold text-slate-100">
                                                        {formatDistanceStrict(new Date(selectedIncident.timestamp), new Date(), { addSuffix: true })}
                                                    </span>
                                                    <div className="text-xs text-slate-400 mt-1">
                                                        {format(new Date(selectedIncident.timestamp), 'MMM dd, HH:mm')}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-slate-600/50">
                                        <p className="text-xs text-slate-400">
                                            Reporter: {selectedIncident.reporterId ? selectedIncident.reporterId.substring(0, 8) + '...' : 'Anonymous'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Popup>
                    )}

                    {/* Enhanced Control Panel */}
                    <div className="absolute top-6 left-6 w-80 z-30">
                        <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-600/50 rounded-2xl p-6 shadow-2xl">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="h-8 w-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center">
                                    <Globe className="h-5 w-5 text-slate-200" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-100">Navigation</h2>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-200 mb-2 block">
                                        Search Location
                                    </label>
                                    <SearchInput
                                        placeholder="Search for a town or location..."
                                        onSelect={handleSearchSelect}
                                        geocodeAddress={geocodeAddress}
                                        value=""
                                    />
                                </div>

                                <div className="relative">
                                    <label className="text-sm font-medium text-slate-200 mb-2 block">
                                        Quick Cities
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowCityDropdown(!showCityDropdown)}
                                        className="w-full flex justify-between items-center px-4 py-4 rounded-xl border border-slate-500/50 bg-slate-700/60 hover:bg-slate-700/80 text-slate-100 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 group"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <MapPin className="h-4 w-4 text-slate-400 group-hover:text-slate-300" />
                                            <span className="font-medium">{currentCityName}</span>
                                        </div>
                                        <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${showCityDropdown ? 'rotate-180' : ''}`} />
                                    </button>
                                    {showCityDropdown && (
                                        <div className="absolute top-full left-0 mt-2 w-full bg-slate-800/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-600/50 z-50 overflow-hidden">
                                            {propCurrentLocation && (
                                                <button
                                                    onClick={() => {
                                                        setViewState(prev => ({
                                                            ...prev,
                                                            longitude: propCurrentLocation.lng,
                                                            latitude: propCurrentLocation.lat,
                                                            zoom: prev.zoom < 10 ? 10 : prev.zoom,
                                                            speed: 1
                                                        }));
                                                        setCurrentCityName('Current Location');
                                                        setShowCityDropdown(false);
                                                    }}
                                                    className="block w-full text-left px-4 py-4 text-slate-100 hover:bg-slate-700/70 transition-colors duration-200 focus:outline-none focus:bg-slate-700/70"
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                        <span>Current Location</span>
                                                    </div>
                                                </button>
                                            )}
                                            {Object.keys(cities).map((cityKey) => (
                                                <button
                                                    key={cityKey}
                                                    onClick={() => { handleCityToggle(cityKey); }}
                                                    className="block w-full text-left px-4 py-4 text-slate-100 hover:bg-slate-700/70 transition-colors duration-200 focus:outline-none focus:bg-slate-700/70 border-t border-slate-600/30 first:border-t-0"
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                                                        <span>{cities[cityKey].name}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Legend */}
                    <div className="absolute bottom-6 right-6 bg-slate-800/90 backdrop-blur-xl border border-slate-600/50 rounded-2xl p-6 shadow-2xl z-30 text-slate-100 max-w-xs">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="h-6 w-6 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center">
                                <Sparkles className="h-4 w-4 text-slate-200" />
                            </div>
                            <h3 className="font-bold text-lg">Traffic Legend</h3>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-slate-300 mb-3 font-medium">Road Traffic Flow</p>
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-4 h-2 bg-green-500 rounded-full shadow-sm"></div>
                                        <span className="text-sm text-slate-200">Smooth traffic</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-4 h-2 bg-yellow-500 rounded-full shadow-sm"></div>
                                        <span className="text-sm text-slate-200">Moderate traffic</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-4 h-2 bg-red-500 rounded-full shadow-sm"></div>
                                        <span className="text-sm text-slate-200">Heavy congestion</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="border-t border-slate-600/50 pt-4">
                                <p className="text-sm text-slate-300 mb-2 font-medium">Incident Markers</p>
                                <p className="text-xs text-slate-400">
                                    Animated markers show real-time user-reported incidents and events.
                                </p>
                            </div>
                        </div>
                    </div>
                </Map>
            </main>
        </div>
    );
};

export default TrafficLiveMonitorPage;