import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet marker icons not showing up due to Webpack/Vite issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

import { MapPin, Search, Navigation, Clock, TrafficCone, Globe, RotateCcw, XCircle, ChevronDown } from 'lucide-react';

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoidGhpZXJyeXNveWFuZyIsImEiOiJjbWJ2bDQ3bnMwMWt1MnFzYmJjOXo2bWY0In0.oHlG45uicVdX9W7wwAOxrw';

const MapPage = () => {
    // --- State Variables ---
    const [startPoint, setStartPoint] = useState(null);
    const [endPoint, setEndPoint] = useState(null);
    const [routes, setRoutes] = useState([]); // Stores route details
    const [selectedRouteId, setSelectedRouteId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const mapRef = useRef(null); // Ref for MapContainer instance

    // Initial map center and zoom for Leaflet
    const [initialCenter, setInitialCenter] = useState([4.1560, 9.2312]); // Default to Buea
    const [initialZoom, setInitialZoom] = useState(13);

    // Mock data for cities for initial view settings.
    const cities = useMemo(() => ({
        Buea: { name: 'Buea', coords: { lat: 4.1560, lng: 9.2312 }, zoom: 13 },
        Yaounde: { name: 'Yaounde', coords: { lat: 3.8480, lng: 11.5021 }, zoom: 12 },
        Douala: { name: 'Douala', coords: { lat: 4.0410, lng: 9.7020 }, zoom: 12 },
    }), []);

    const [currentCityName, setCurrentCityName] = useState(cities.Buea.name);

    // Component to handle map instance for programmatic control and dynamic centering
    const MapController = ({ initialCenter, initialZoom, routeGeoJSON, startPoint, endPoint, selectedRouteId }) => {
        const map = useMap();

        // Effect for initial centering based on geolocation or default city on component mount
        useEffect(() => {
            let isMounted = true;
            if (navigator.geolocation) {
                const geoOptions = { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 };
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        if (isMounted) {
                            const newCenter = [position.coords.latitude, position.coords.longitude];
                            map.setView(newCenter, map.getZoom() < 10 ? 10 : map.getZoom());
                        }
                    },
                    (err) => {
                        console.warn(`Geolocation error (${err.code}): ${err.message}. Falling back to default city location.`);
                        if (isMounted) {
                            map.setView(initialCenter, initialZoom);
                        }
                    },
                    geoOptions
                );
            } else {
                console.warn("Geolocation not supported by this browser. Falling back to default city location.");
                if (isMounted) {
                    map.setView(initialCenter, initialZoom);
                }
            }
            return () => { isMounted = false; };
        }, [map, initialCenter, initialZoom]);

        // Effect for dynamic map centering based on various triggers
        useEffect(() => {
            // Priority 1: Fit map to calculated route when selectedRouteId changes
            if (routeGeoJSON && routeGeoJSON.geometry && routeGeoJSON.geometry.coordinates && routeGeoJSON.geometry.coordinates.length > 0) {
                // Mapbox GeoJSON is [lng, lat], Leaflet expects [lat, lng]
                const coordinates = routeGeoJSON.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                if (coordinates.length > 0) {
                    const bounds = L.latLngBounds(coordinates);
                    map.fitBounds(bounds, { padding: [70, 70], animate: true, duration: 0.5 });
                    return;
                }
            }

            // Priority 2: Center on selected start/end points
            if (startPoint && endPoint) {
                const bounds = L.latLngBounds([
                    [startPoint.coordinates.lat, startPoint.coordinates.lng],
                    [endPoint.coordinates.lat, endPoint.coordinates.lng]
                ]);
                map.fitBounds(bounds, { padding: [70, 70], animate: true, duration: 0.5 });
                return;
            } else if (startPoint) {
                map.setView([startPoint.coordinates.lat, startPoint.coordinates.lng], map.getZoom(), { animate: true, duration: 0.5 });
                return;
            } else if (endPoint) {
                map.setView([endPoint.coordinates.lat, endPoint.coordinates.lng], map.getZoom(), { animate: true, duration: 0.5 });
                return;
            }

            // Priority 3: Fallback to initial city center
            map.setView(initialCenter, initialZoom, { animate: true, duration: 0.5 });
        }, [map, initialCenter, initialZoom, routeGeoJSON, startPoint, endPoint]);

        return null;
    };

    // Geocoding (search for addresses) using OpenStreetMap Nominatim API
    const geocodeAddress = useCallback(async (query) => {
        if (!query) return [];
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`
            );
            if (!response.ok) {
                throw new Error(`Nominatim API error: ${response.statusText}`);
            }
            const data = await response.json();

            if (data && data.length > 0) {
                return data.map(feature => ({
                    name: feature.display_name,
                    coordinates: { lat: parseFloat(feature.lat), lng: parseFloat(feature.lon) }
                }));
            }
            return [];
        } catch (err) {
            console.error("Error geocoding address:", err);
            setError(`Failed to search for places: ${err.message}. Ensure your network is stable.`);
            return [];
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Calculate route using Mapbox Directions API
    const handleCalculateRoute = useCallback(async () => {
        if (!startPoint || !endPoint) {
            setError("Please select both start and end points.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setRoutes([]);

        const startCoords = `${startPoint.coordinates.lng},${startPoint.coordinates.lat}`;
        const endCoords = `${endPoint.coordinates.lng},${endPoint.coordinates.lat}`;

        try {
            const response = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving/${startCoords};${endCoords}?alternatives=true&geometries=geojson&steps=false&overview=full&access_token=${MAPBOX_ACCESS_TOKEN}`
            );
            if (!response.ok) {
                throw new Error(`Mapbox Directions API error: ${response.status} - ${response.statusText}`);
            }
            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const fetchedRoutes = data.routes.map((r, index) => {
                    let trafficStatus = 'Normal Traffic';
                    let trafficColor = '#8A2BE2'; // Default purple
                    // Check for duration_typical to avoid division by zero or NaN
                    if (r.duration_typical && r.duration_typical > 0) {
                        const ratio = r.duration / r.duration_typical;
                        if (ratio > 1.5) {
                            trafficStatus = 'Heavy Congestion';
                            trafficColor = '#EF4444'; // Red
                        } else if (ratio > 1.1) {
                            trafficStatus = 'Moderate Congestion';
                            trafficColor = '#F59E0B'; // Orange
                        }
                    }

                    return {
                        id: index,
                        summary: r.legs[0].summary,
                        travelTime: r.duration, // in seconds
                        distance: r.distance, // in meters
                        traffic: trafficStatus,
                        trafficColor: trafficColor,
                        geometry: r.geometry // GeoJSON LineString
                    };
                });
                setRoutes(fetchedRoutes);
                setSelectedRouteId(0); // Select the first route by default
            } else {
                setRoutes([]);
                setError("No routes found for the selected locations.");
            }
        } catch (err) {
            console.error("Error fetching routes:", err);
            setError(`Failed to calculate route: ${err.message}. Check your Mapbox token or network connection.`);
            setRoutes([]);
        } finally {
            setIsLoading(false);
        }
    }, [startPoint, endPoint]);

    const handleCityToggle = (cityKey) => {
        const newCityData = cities[cityKey];
        setCurrentCityName(newCityData.name);
        setStartPoint(null); // Clear points when switching city
        setEndPoint(null);    // Clear points when switching city
        setRoutes([]);
        setSelectedRouteId(null);
        setError(null);
        setShowCityDropdown(false);

        // Update initial center and zoom for MapContainer - MapController will react to this
        setInitialCenter([newCityData.coords.lat, newCityData.coords.lng]);
        setInitialZoom(newCityData.zoom);
    };

    // Style for the route line on the map
    const onEachFeature = (feature, layer) => {
        // No specific styling needed on feature iteration for simple line
    };

    // Determine which route to display as the currently selected route
    const selectedRouteGeoJSON = useMemo(() => {
        if (routes.length > 0 && selectedRouteId !== null) {
            return {
                type: 'Feature',
                geometry: routes[selectedRouteId].geometry,
            };
        }
        return null;
    }, [routes, selectedRouteId]);

    // Apply dynamic style for the selected route
    const selectedRouteStyle = useMemo(() => {
        if (routes.length > 0 && selectedRouteId !== null) {
            return {
                color: routes[selectedRouteId].trafficColor, // Use traffic color for selected route
                weight: 6,
                opacity: 0.8
            };
        }
        return { color: '#8A2BE2', weight: 6, opacity: 0.8 }; // Default style
    }, [routes, selectedRouteId]);

    // All alternative routes (including the selected one, but will be drawn underneath)
    const allRoutesGeoJSON = useMemo(() => {
        return {
            type: 'FeatureCollection',
            features: routes.map(r => ({
                type: 'Feature',
                geometry: r.geometry,
                properties: { id: r.id } // Add ID to properties for potential future use
            }))
        };
    }, [routes]);

    const alternativeRouteStyle = useCallback((feature) => {
        // Style alternatives differently from the currently selected one
        if (selectedRouteId !== null && feature.properties.id === selectedRouteId) {
            return {
                color: 'transparent', // Make the selected route's underlying alternative transparent
                weight: 0,
                opacity: 0
            };
        }
        return {
            color: '#4CAF50', // Green for alternative routes
            weight: 4,
            opacity: 0.6
        };
    }, [selectedRouteId]);


    // Custom DivIcons for start and end markers
    const startIcon = useMemo(() => L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div class="flex flex-col items-center"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin h-8 w-8 text-purple-600 animate-bounce-custom"><path d="M12 18.7l-6.5-6.5c-2.4-2.4-2.4-6.4 0-8.8s6.4-2.4 8.8 0c2.4 2.4 2.4 6.4 0 8.8L12 18.7z"/><circle cx="12" cy="10" r="3"/></svg><div class="text-xs font-bold text-white bg-purple-600 rounded-full px-2 py-0.5 mt-[-10px] z-10 shadow-lg">A</div></div>`,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
    }), []);

    const endIcon = useMemo(() => L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div class="flex flex-col items-center"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin h-8 w-8 text-green-500 animate-bounce-custom"><path d="M12 18.7l-6.5-6.5c-2.4-2.4-2.4-6.4 0-8.8s6.4-2.4 8.8 0c2.4 2.4 2.4 6.4 0 8.8L12 18.7z"/><circle cx="12" cy="10" r="3"/></svg><div class="text-xs font-bold text-white bg-green-500 rounded-full px-2 py-0.5 mt-[-10px] z-10 shadow-lg">B</div></div>`,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
    }), []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col lg:flex-row relative overflow-hidden font-inter text-slate-100">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #4a5568; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #a0aec0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e0; }
                @keyframes pulse-custom { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.7; } }
                .animate-pulse-custom { animation: pulse-custom 1.5s infinite ease-in-out; }
                @keyframes bounce-custom { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                .animate-bounce-custom { animation: bounce-custom 1.5s infinite ease-in-out; }
                .leaflet-marker-icon.custom-leaflet-marker {
                    background: transparent;
                    border: none;
                }
            `}</style>
            <div className="flex flex-1 flex-col lg:flex-row relative z-0">
                <aside className="w-full lg:w-96 bg-slate-800/80 backdrop-blur-xl p-6 shadow-lg lg:shadow-md z-10 overflow-y-auto h-full lg:h-auto custom-scrollbar">
                    <h2 className="text-2xl font-semibold text-slate-200 mb-6">Route & Traffic</h2>

                    <div className="space-y-4">
                        <div className="relative z-30">
                            <label htmlFor="city-select" className="text-sm font-medium text-slate-200 mb-2 block">
                                <Globe className="inline-block h-4 w-4 mr-1 text-slate-400" /> Select City
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowCityDropdown(!showCityDropdown)}
                                className="w-full flex justify-between items-center px-4 py-3 rounded-xl border border-slate-500/50 bg-slate-700/60 hover:bg-slate-700/80 text-slate-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-800"
                            >
                                <span>{currentCityName}</span>
                                <ChevronDown className={`h-5 w-5 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {showCityDropdown && (
                                <div className="absolute top-full left-0 mt-2 w-full bg-slate-700 rounded-xl shadow-xl border border-slate-600/50">
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

                        <SearchInput
                            placeholder="Start Point"
                            value={startPoint ? startPoint.name : ''}
                            onSelect={setStartPoint}
                            geocodeAddress={geocodeAddress}
                        />
                        <SearchInput
                            placeholder="End Point"
                            value={endPoint ? endPoint.name : ''}
                            onSelect={setEndPoint}
                            geocodeAddress={geocodeAddress}
                        />

                        <button
                            onClick={handleCalculateRoute}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg flex items-center justify-center space-x-2 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <RotateCcw className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    <Navigation className="h-5 w-5" />
                                    <span>Calculate Route</span>
                                </>
                            )}
                        </button>

                        {error && (
                            <div className="bg-red-900/30 border border-red-700/40 text-red-300 px-4 py-3 rounded-xl relative shadow-inner" role="alert">
                                <strong className="font-bold">Error!</strong>
                                <span className="block sm:inline ml-2">{error}</span>
                            </div>
                        )}

                        {routes.length > 0 && (
                            <div className="bg-slate-700/40 border border-slate-600/50 p-4 rounded-xl shadow-md">
                                <h3 className="text-lg font-semibold text-slate-200 mb-2">Available Routes:</h3>
                                <ul className="space-y-2">
                                    {routes.map((routeItem) => (
                                        <li
                                            key={routeItem.id}
                                            onClick={() => {
                                                setSelectedRouteId(routeItem.id);
                                                // Force map to re-center on route change
                                                if (mapRef.current && routeItem.geometry && routeItem.geometry.coordinates) {
                                                    const coordinates = routeItem.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                                                    if (coordinates.length > 0) {
                                                        const bounds = L.latLngBounds(coordinates);
                                                        mapRef.current.fitBounds(bounds, { padding: [70, 70], animate: true, duration: 0.5 });
                                                    }
                                                }
                                            }}
                                            className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                                                selectedRouteId === routeItem.id
                                                    ? 'bg-blue-700/50 border-blue-600 text-white shadow-lg'
                                                    : 'bg-slate-600/30 border-slate-500/50 hover:bg-slate-600/50 text-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium flex items-center">
                                                    Route {routeItem.id + 1}
                                                    {routeItem.id === 0 && <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded-full">Primary</span>}
                                                </span>
                                                <span className="flex items-center text-sm">
                                                    <Clock className="h-4 w-4 mr-1" /> {Math.round(routeItem.travelTime / 60)} min
                                                </span>
                                            </div>
                                            <div className="flex items-center text-xs mt-1">
                                                <TrafficCone className="h-4 w-4 mr-1" /> Traffic: {routeItem.traffic}
                                                <span className="ml-auto">{(routeItem.distance / 1000).toFixed(2)} km</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Map Container */}
                <main className="flex-1 min-h-[calc(100vh-4rem)] lg:min-h-screen relative z-0">
                    <MapContainer
                        center={initialCenter}
                        zoom={initialZoom}
                        scrollWheelZoom={true}
                        className="w-full h-full rounded-lg"
                        style={{ height: '100%', width: '100%', borderRadius: '8px', overflow: 'hidden' }}
                        ref={mapRef}
                    >
                        <MapController
                            initialCenter={initialCenter}
                            initialZoom={initialZoom}
                            routeGeoJSON={selectedRouteGeoJSON} // Pass the currently selected route
                            startPoint={startPoint}
                            endPoint={endPoint}
                            selectedRouteId={selectedRouteId}
                        />

                        <TileLayer
                            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {startPoint && (
                            <Marker position={[startPoint.coordinates.lat, startPoint.coordinates.lng]} icon={startIcon}>
                                <Popup>Start Point: {startPoint.name}</Popup>
                            </Marker>
                        )}

                        {endPoint && (
                            <Marker position={[endPoint.coordinates.lat, endPoint.coordinates.lng]} icon={endIcon}>
                                <Popup>End Point: {endPoint.name}</Popup>
                            </Marker>
                        )}

                        {/* Draw all routes with a default alternative style */}
                        {allRoutesGeoJSON.features.length > 0 && (
                            <GeoJSON
                                key={JSON.stringify(allRoutesGeoJSON) + selectedRouteId} // Add key to force redraw
                                data={allRoutesGeoJSON}
                                style={alternativeRouteStyle} // Apply the conditional style
                                onEachFeature={onEachFeature}
                            />
                        )}

                        {/* Draw the selected route on top with its specific style */}
                        {selectedRouteGeoJSON && (
                            <GeoJSON
                                key={JSON.stringify(selectedRouteGeoJSON)} // Add key to force redraw
                                data={selectedRouteGeoJSON}
                                style={selectedRouteStyle}
                                onEachFeature={onEachFeature}
                            />
                        )}
                    </MapContainer>
                </main>
            </div>
        </div>
    );
};

// SearchInput Component - Now uses OpenStreetMap Nominatim Geocoding
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
            if (debouncedSearchTerm.length > 2) {
                try {
                    const fetched = await geocodeAddress(debouncedSearchTerm);
                    setSuggestions(fetched);
                    setShowSuggestions(true);
                } catch (err) {
                    console.error("Error fetching suggestions:", err);
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

    const handleSelectSuggestion = useCallback((suggestion) => {
        setSearchTerm(suggestion.name);
        onSelect(suggestion);
        setSuggestions([]);
        setShowSuggestions(false);
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
                        // Only show suggestions if there are any or if a search term is present
                        if (suggestions.length > 0 || searchTerm.length > 0) {
                            setShowSuggestions(true);
                        }
                    }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 100)} // Delay hiding to allow click on suggestion
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
                            key={suggestion.name + index} // Unique key for list items
                            className="p-3 hover:bg-slate-600/70 cursor-pointer text-slate-100 border-b border-slate-600/50 last:border-b-0 rounded-xl"
                            onMouseDown={(e) => e.preventDefault()} // Prevent blur from firing before click
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

export default MapPage;