import React, { useState, useEffect, useCallback, useRef } from 'react';
import Map, { Marker, Popup, NavigationControl, ScaleControl, FullscreenControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { TrafficCone, Info, Clock, MapPin, Navigation, Globe, XCircle, ChevronDown, Siren, AlertTriangle, Car, Search } from 'lucide-react';
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
            <div className="flex items-center border border-slate-500/50 rounded-xl p-3 bg-slate-700/60 shadow-inner">
                <Search className="h-5 w-5 text-slate-400 mr-3" />
                <input
                    type="text"
                    placeholder={placeholder}
                    className="flex-1 bg-transparent text-slate-100 placeholder-slate-400 focus:outline-none"
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
                        className="ml-2 text-slate-400 hover:text-slate-200 focus:outline-none"
                    >
                        <XCircle className="h-5 w-5" />
                    </button>
                )}
            </div>
            {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-20 w-full bg-slate-700 rounded-xl shadow-xl border border-slate-600/50 mt-1 max-h-60 overflow-y-auto custom-scrollbar">
                    {suggestions.map((suggestion, index) => (
                        <li
                            key={suggestion.name + index}
                            className="p-3 hover:bg-slate-600/70 cursor-pointer text-slate-100 border-b border-slate-600/50 last:border-b-0 rounded-xl"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectSuggestion(suggestion)}
                        >
                            {suggestion.name}
                        </li>
                    ))}
                </ul>
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
                iconComponent = <Siren className="h-6 w-6" />;
                bgColorClass = 'bg-red-600';
                break;
            case 'Road Closure':
            case 'Construction':
                iconComponent = <TrafficCone className="h-6 w-6" />;
                bgColorClass = 'bg-orange-600';
                break;
            case 'Hazard':
                iconComponent = <AlertTriangle className="h-6 w-6" />;
                bgColorClass = 'bg-yellow-600';
                textColorClass = 'text-gray-900';
                break;
            case 'Traffic Jam':
                iconComponent = <Car className="h-6 w-6" />;
                bgColorClass = 'bg-blue-600';
                break;
            case 'Event':
                iconComponent = <Info className="h-6 w-6" />;
                bgColorClass = 'bg-purple-600';
                break;
            default:
                iconComponent = <MapPin className="h-6 w-6" />;
                bgColorClass = 'bg-gray-600';
        }

        return (
            <div className={`flex flex-col items-center animate-bounce-custom`}>
                <div className={`p-2 rounded-full shadow-lg ${bgColorClass} ${textColorClass} flex items-center justify-center`}>
                    {iconComponent}
                </div>
                <div className="text-xs font-bold text-white bg-slate-700/80 rounded-full px-2 py-0.5 mt-[-10px] z-10 shadow-lg capitalize">
                    {type}
                </div>
            </div>
        );
    }, []);

    return (
        <div className="h-screen flex flex-col relative overflow-hidden font-inter text-slate-100">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #4a5568; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #a0aec0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e0; }
                @keyframes bounce-custom { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                .animate-bounce-custom { animation: bounce-custom 1.5s infinite ease-in-out; }
                .mapboxgl-popup-content {
                    border-radius: 12px;
                    padding: 0;
                    background: #ffffff;
                    color: #333;
                }
                .mapboxgl-popup-tip {
                    border-top-color: #ffffff !important;
                    border-bottom-color: #ffffff !important;
                }
                .mapboxgl-popup-close-button {
                    color: #777;
                    font-size: 1.5rem;
                    top: 8px;
                    right: 8px;
                }
                .mapboxgl-ctrl-bottom-left, .mapboxgl-ctrl-bottom-right {
                    z-index: 20 !important;
                }
            `}</style>

            <header className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-4 shadow-lg z-30 flex items-center justify-between">
                <h1 className="text-2xl font-bold flex items-center">
                    <Navigation className="mr-2" /> Live Traffic Monitor
                </h1>
            </header>

            <main className="flex-1 relative">
                {error && (
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg z-40">
                        {error}
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
                            <div className="flex flex-col items-center">
                                <MapPin className="h-8 w-8 text-blue-500 animate-bounce-custom" />
                                <div className="text-xs font-bold text-white bg-blue-500 rounded-full px-2 py-0.5 mt-[-10px] z-10 shadow-lg">You</div>
                            </div>
                            <Popup offset={25} closeButton={false} closeOnClick={true}>
                                <div className="p-2 text-gray-800">Your current location</div>
                            </Popup>
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
                            <div className="p-4 text-gray-800">
                                <div className="font-semibold text-lg flex items-center mb-1">
                                    {getIncidentMarkerIcon(selectedIncident.type)}
                                    <span className="ml-2 capitalize">{selectedIncident.type}</span>
                                </div>
                                <p className="text-sm flex items-start mb-1">
                                    <Info className="mr-2 text-gray-500" size={16} />
                                    {selectedIncident.description}
                                </p>
                                <p className="text-sm flex items-center">
                                    <Clock className="mr-2 text-gray-500" size={16} />
                                    Reported{' '}
                                    {selectedIncident.timestamp && (
                                        <span className="font-medium">
                                            {formatDistanceStrict(new Date(selectedIncident.timestamp), new Date(), { addSuffix: true })}
                                        </span>
                                    )}
                                    {selectedIncident.timestamp && (
                                        <span className="ml-1 text-xs text-gray-500">
                                            ({format(new Date(selectedIncident.timestamp), 'MMM dd, HH:mm')})
                                        </span>
                                    )}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    By: {selectedIncident.reporterId ? selectedIncident.reporterId.substring(0, 8) + '...' : 'Anonymous'}
                                </p>
                            </div>
                        </Popup>
                    )}

                    <div className="absolute top-20 left-4 bg-slate-800/80 backdrop-blur-xl shadow-md rounded-xl p-4 w-72 z-30 text-slate-100 border border-slate-600/50">
                        <h2 className="text-xl font-semibold mb-3">Map Controls</h2>
                        <div className="mb-4">
                            <SearchInput
                                placeholder="Search for a town or location..."
                                onSelect={handleSearchSelect}
                                geocodeAddress={geocodeAddress}
                                value={""}
                            />
                        </div>
                        <div className="relative mb-2">
                            <label htmlFor="city-select" className="text-sm font-medium text-slate-200 mb-2 block">
                                <Globe className="inline-block h-4 w-4 mr-1 text-slate-400" /> Or Select City
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowCityDropdown(!showCityDropdown)}
                                className="w-full flex justify-between items-center px-4 py-3 rounded-xl border border-slate-500/50 bg-slate-700/60 hover:bg-slate-700/80 text-slate-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-800"
                            >
                                <span>{currentCityName}</span>
                                <ChevronDown className={`h-5 w-5 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {showCityDropdown && (
                                <div className="absolute top-full left-0 mt-2 w-full bg-slate-700 rounded-xl shadow-xl border border-slate-600/50 z-50">
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
                                            className="block w-full text-left px-4 py-3 text-slate-100 hover:bg-slate-600 rounded-xl transition-colors duration-200"
                                        >
                                            Current Location
                                        </button>
                                    )}
                                    {Object.keys(cities).map((cityKey) => (
                                        <button
                                            key={cityKey}
                                            onClick={() => { handleCityToggle(cityKey); }}
                                            className="block w-full text-left px-4 py-3 text-slate-100 hover:bg-slate-600 rounded-xl transition-colors duration-200"
                                        >
                                            {cities[cityKey].name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-xl z-30 text-gray-800">
                        <h3 className="text-sm font-semibold mb-2">Live Traffic Legend (Mapbox)</h3>
                        <p className="text-xs text-gray-700">Road colors indicate traffic flow directly from Mapbox's style:</p>
                        <ul className="text-xs text-gray-600 mt-1">
                            <li className="flex items-center"><span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>Smooth traffic</li>
                            <li className="flex items-center"><span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>Moderate traffic</li>
                            <li className="flex items-center"><span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>Heavy traffic/Congestion</li>
                        </ul>
                        <p className="text-xs text-gray-700 mt-2">Markers represent user-reported incidents.</p>
                    </div>
                </Map>
            </main>
        </div>
    );
};

export default TrafficLiveMonitorPage;