import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth'; // Only import onAuthStateChanged
import LogoNavButton from './components/LogoNavButton';
import CircularNavMenu from './components/CircularNavMenu';
// Assuming these pages exist and use `db` and `auth` via direct import from `../firebase`
import MapPage from './pages/Map';
import RoadSafetyEducationPage from './pages/RoadSafetyEducation';
import IncidentReportPage from './pages/IncidentReport';
import LoginPage from './pages/Login';
import TrafficLiveMonitorPage from './pages/TrafficMonitor';
import ReportIncidentPage from './pages/IncidentReport';

// Import the globally initialized auth instance
import { auth } from './firebase';

function App() {
    const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true); // New state to track auth loading

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsAuthLoading(false); // Auth state determined
        });
        return unsubscribe;
    }, []);

    const toggleNavMenu = () => setIsNavMenuOpen(!isNavMenuOpen);

    // Show a loading spinner or splash screen while authentication status is being checked
    if (isAuthLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-slate-600 border-t-slate-300 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-slate-400 rounded-full animate-spin" style={{animationDelay: '0.15s'}}></div>
                    </div>
                    <span className="text-slate-300 font-medium">Authenticating...</span>
                </div>
            </div>
        );
    }

    return (
        <Router>
            <div className="min-h-screen flex flex-col font-inter bg-slate-900 text-slate-100">
                {/* Render nav menu and button only if user is authenticated */}
                {user && <LogoNavButton onClick={toggleNavMenu} />}
                {user && <CircularNavMenu isOpen={isNavMenuOpen} onClose={toggleNavMenu} />}
                <main className="flex-1">
                    <Routes>
                        {/* Public route for Login */}
                        <Route
                            path="/login"
                            element={!user ? <LoginPage /> : <Navigate to="/monitor" replace />} // Redirect to /monitor after login
                        />
                        {/* Default route for authenticated users, redirects to /monitor */}
                        <Route
                            path="/"
                            element={user ? <Navigate to="/monitor" replace /> : <Navigate to="/login" replace />}
                        />
                        
                        {/* Protected Routes - only accessible if user is authenticated */}
                        <Route
                            path="/map"
                            element={user ? <MapPage /> : <Navigate to="/login" replace />}
                        />
                        <Route
                            path="/learn"
                            element={user ? <RoadSafetyEducationPage /> : <Navigate to="/login" replace />}
                        />
                        <Route
                            path="/report"
                            element={user ? <ReportIncidentPage /> : <Navigate to="/login" replace />}
                        />
                        <Route
                            path="/monitor"
                            element={user ? <TrafficLiveMonitorPage /> : <Navigate to="/login" replace />}
                        />
                        {/* Add more protected routes here */}
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
