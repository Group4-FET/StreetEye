import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
// Removed Mapbox GL JS map related imports as map is no longer displayed here
import {
    TrafficCone, Info, Clock, MapPin, Navigation, Globe,
    XCircle, ChevronDown, Siren, AlertTriangle, Car, Search, PlusCircle, CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';

// Import db and auth directly from your centralized firebase.js file
import { db, auth } from '../firebase'; 
import { collection, addDoc, Timestamp } from 'firebase/firestore';

// IMPORTANT: Replace with your Mapbox Access Token (still needed for geocoding in SearchInput)
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoidGhpZXJyeXNveWFuZyIsImEiOiJjbWJ2bDQ3bnMwMWt1MnFzYmJjOXo2bWY0In0.oHlG45uicVdX9W7wwAOxrw'; // Replace with your actual token

// SearchInput Component (re-defined locally for self-containment)
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
            if (debouncedSearchTerm.length > 2) { // Require at least 3 characters for suggestions
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

    const handleSelectSuggestion = useCallback((selected) => {
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


const ReportIncidentPage = () => {
    // No need for local db, auth, userId, isAuthReady states as they are managed globally
    // We can get userId directly from auth.currentUser when needed

    // Form State
    const [incidentType, setIncidentType] = useState('');
    const [description, setDescription] = useState('');
    const [selectedLocation, setSelectedLocation] = useState(null);

    // UI State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' }); // 'success' or 'error'
    const messageTimeoutRef = useRef(null); // Ref for clearing message timeout

    // --- Mapbox Geocoding for Search Input (No map dependency for proximity now) ---
    const geocodeAddress = useCallback(async (query) => {
        if (!query) return [];
        try {
            const proximity = ''; // Or set a default proximity for Cameroon if desired: '&proximity=9.2312,4.1560'

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

    // Handle selection from search input for location
    const handleLocationSearchSelect = useCallback((selected) => {
        if (selected) {
            setSelectedLocation(selected);
        } else {
            setSelectedLocation(null);
        }
    }, []);


    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitMessage({ type: '', text: '' }); // Clear previous messages
        clearTimeout(messageTimeoutRef.current); // Clear any existing timeout

        // Ensure db and auth are available (from global firebase.js)
        if (!db || !auth) {
            console.error("Firebase DB or Auth not initialized. Ensure firebase.js is correctly set up.");
            setSubmitMessage({ type: 'error', text: 'Firebase not initialized. Please try again later.' });
            messageTimeoutRef.current = setTimeout(() => setSubmitMessage({ type: '', text: '' }), 5000);
            return;
        }

        const currentUserId = auth.currentUser?.uid;

        if (!incidentType || !description || !selectedLocation) {
            setSubmitMessage({ type: 'error', text: 'Please fill all required fields (Type, Description, Location).' });
            messageTimeoutRef.current = setTimeout(() => setSubmitMessage({ type: '', text: '' }), 5000);
            return;
        }

        if (!currentUserId) {
            setSubmitMessage({ type: 'error', text: 'User not authenticated. Please wait or refresh.' });
            messageTimeoutRef.current = setTimeout(() => setSubmitMessage({ type: '', text: '' }), 5000);
            return;
        }

        setIsSubmitting(true);

        try {
            // Updated to match TrafficLiveMonitorPage collection
            const incidentsCollectionRef = collection(db, 'incidents');

            const newIncident = {
                type: incidentType,
                description: description,
                location: selectedLocation.coordinates, // Store lat/lng directly
                timestamp: Timestamp.now(), // Use Firestore Timestamp
                reporterId: currentUserId, // Automatically use authenticated userId
            };

            await addDoc(incidentsCollectionRef, newIncident);
            setSubmitMessage({ type: 'success', text: 'Incident reported successfully! Redirecting...' });

            // Reset form
            setIncidentType('');
            setDescription('');
            setSelectedLocation(null);

            // Redirect after a short delay to allow message to be read
            setTimeout(() => {
                window.location.href = '/monitor'; // Redirect to the monitor page
            }, 1500); // 1.5 second delay

        } catch (error) {
            console.error("Error adding document: ", error);
            setSubmitMessage({ type: 'error', text: `Failed to report incident: ${error.message}` });
        } finally {
            setIsSubmitting(false);
            // Message timeout is handled by the redirect timeout for success, or separate timeout for error
            if (submitMessage.type === 'error') {
                messageTimeoutRef.current = setTimeout(() => setSubmitMessage({ type: '', text: '' }), 5000);
            }
        }
    };

    // Clean up message timeout on unmount
    useEffect(() => {
        return () => {
            if (messageTimeoutRef.current) {
                clearTimeout(messageTimeoutRef.current);
            }
        };
    }, []);


    return (
        <div className="h-screen flex flex-col relative overflow-hidden font-inter text-slate-100 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Custom CSS for animations and scrollbar */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #4a5568; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #a0aec0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e0; }
                @keyframes bounce-custom { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                .animate-bounce-custom { animation: bounce-custom 1.5s infinite ease-in-out; }
            `}</style>

            <header className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-4 shadow-lg flex items-center justify-between">
                <h1 className="text-2xl font-bold flex items-center">
                    <PlusCircle className="mr-2" /> Report New Incident
                </h1>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-6 overflow-auto custom-scrollbar"> {/* Centered layout */}
                {/* Incident Reporting Form */}
                <div className="w-full max-w-lg bg-slate-800/80 backdrop-blur-xl shadow-md rounded-xl p-6 text-slate-100 border border-slate-600/50">
                    <h2 className="text-xl font-semibold mb-6">Incident Details</h2>

                    {submitMessage.text && (
                        <div className={`mb-4 p-3 rounded-lg flex items-center ${
                            submitMessage.type === 'success' ? 'bg-green-600/30 text-green-300 border border-green-700/40' :
                            'bg-red-600/30 text-red-300 border border-red-700/40'
                        }`}>
                            {submitMessage.type === 'success' ? <CheckCircle className="h-5 w-5 mr-2" /> : <Info className="h-5 w-5 mr-2" />}
                            {submitMessage.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
                        <div>
                            <label htmlFor="incidentType" className="block text-sm font-medium text-slate-300 mb-2">Incident Type <span className="text-red-400">*</span></label>
                            <select
                                id="incidentType"
                                value={incidentType}
                                onChange={(e) => setIncidentType(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-500/50 bg-slate-700/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                required
                            >
                                <option value="">Select a type</option>
                                <option value="Accident">Accident</option>
                                <option value="Road Closure">Road Closure</option>
                                <option value="Construction">Construction</option>
                                <option value="Hazard">Hazard</option>
                                <option value="Traffic Jam">Traffic Jam</option>
                                <option value="Event">Event</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">Description <span className="text-red-400">*</span></label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows="4"
                                className="w-full px-4 py-3 rounded-xl border border-slate-500/50 bg-slate-700/60 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                placeholder="Describe the incident briefly..."
                                required
                            ></textarea>
                        </div>

                        <div>
                            <label htmlFor="locationSearch" className="block text-sm font-medium text-slate-300 mb-2">Location <span className="text-red-400">*</span></label>
                            <SearchInput
                                placeholder="Search location for the incident..."
                                onSelect={handleLocationSearchSelect}
                                geocodeAddress={geocodeAddress}
                                value={selectedLocation ? selectedLocation.name : ''}
                            />
                            {selectedLocation && (
                                <p className="text-sm text-slate-400 mt-2">
                                    Selected: Lat: {selectedLocation.coordinates.lat.toFixed(4)}, Lng: {selectedLocation.coordinates.lng.toFixed(4)}
                                </p>
                            )}
                            {!selectedLocation && (
                                <p className="text-sm text-red-400 mt-2">Please search and select a location for the incident.</p>
                            )}
                        </div>

                        {/* Reporter ID will now be automatically filled from Firebase Auth */}
                        <div className="text-sm text-slate-400 flex items-center justify-between">
                            <span>Reporter ID:</span>
                            <span className="font-mono text-slate-300 bg-slate-700/60 px-2 py-1 rounded-md">
                                {auth && auth.currentUser ? (auth.currentUser.uid || 'Anonymous') : 'Authenticating...'}
                            </span>
                        </div>

                        <button
                            type="submit"
                            className="w-full mt-auto bg-green-600 text-white py-3 rounded-lg flex items-center justify-center space-x-2 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200"
                            disabled={isSubmitting || !auth?.currentUser || !selectedLocation} // Check auth.currentUser directly
                        >
                            {isSubmitting ? (
                                <Navigation className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    <PlusCircle className="h-5 w-5" />
                                    <span>Report Incident</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default ReportIncidentPage;