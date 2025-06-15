import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, Loader2, ArrowRight, Sparkles, MapPin } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from 'react-router-dom';
import trafficLightLogo from '../assets/images/traffic_light_logo.png'; // Import the custom image
import { auth, provider } from '../firebase'; // Import auth and provider from centralized firebase.js

const MapBackground = () => {
  const [animatedNodes, setAnimatedNodes] = useState([]);

  useEffect(() => {
    const nodes = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 6 + 4,
      speed: Math.random() * 2 + 1,
      direction: Math.random() * 360,
      opacity: Math.random() * 0.3 + 0.1
    }));
    setAnimatedNodes(nodes);

    const interval = setInterval(() => {
      setAnimatedNodes(prev => prev.map(node => ({
        ...node,
        x: (node.x + Math.cos(node.direction * Math.PI / 180) * node.speed * 0.1) % 100,
        y: (node.y + Math.sin(node.direction * Math.PI / 180) * node.speed * 0.1) % 100,
        direction: node.direction + (Math.random() - 0.5) * 5
      })));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden opacity-20">
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#475569" strokeWidth="0.5" opacity="0.3"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <g>
          {/* Corrected paths: Removed percentages and assumed 0-100 coordinate system */}
          <path d="M 0 20 Q 25 40 50 20 T 100 30" fill="none" stroke="#64748b" strokeWidth="2" opacity="0.4">
            <animate attributeName="stroke-dasharray" values="0,100;20,80;0,100" dur="8s" repeatCount="indefinite"/>
          </path>
          <path d="M 0 60 Q 30 80 70 60 T 100 70" fill="none" stroke="#64748b" strokeWidth="2" opacity="0.3">
            <animate attributeName="stroke-dasharray" values="0,100;25,75;0,100" dur="10s" repeatCount="indefinite"/>
          </path>
          <path d="M 20 0 Q 40 30 20 60 T 30 100" fill="none" stroke="#64748b" strokeWidth="2" opacity="0.3">
            <animate attributeName="stroke-dasharray" values="0,100;15,85;0,100" dur="12s" repeatCount="indefinite"/>
          </path>
        </g>
      </svg>
      {animatedNodes.map(node => (
        <div
          key={node.id}
          className="absolute w-2 h-2 bg-slate-400 rounded-full transition-all duration-100"
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            opacity: node.opacity,
            transform: `scale(${node.size / 10})`
          }}
        />
      ))}
      <div className="absolute top-1/4 left-1/4 w-4 h-4 rounded-full bg-slate-500 opacity-30 animate-pulse" />
      <div className="absolute top-3/4 right-1/4 w-3 h-3 rounded-full bg-slate-500 opacity-25 animate-pulse" style={{animationDelay: '2s'}} />
      <div className="absolute bottom-1/4 left-1/3 w-5 h-5 rounded-full bg-slate-500 opacity-20 animate-pulse" style={{animationDelay: '4s'}} />
    </div>
  );
};

const LoginPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) navigate('/map');
    });
    return unsubscribe;
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Please enter a valid email';
    if (!formData.password || formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (isSignUp && formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailPasswordAuth = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      } else {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      }
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-slate-600 border-t-slate-300 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-slate-400 rounded-full animate-spin" style={{animationDelay: '0.15s'}}></div>
          </div>
          <span className="text-slate-300 font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <MapBackground />
      <div className="hidden lg:block fixed left-0 top-0 w-2/5 h-full bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-sm border-r border-slate-700/50">
        <div className="flex flex-col justify-center items-start h-full p-12 space-y-8">
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 flex items-center justify-center">
                <img src={trafficLightLogo} alt="Street Eye Logo" className="h-full w-full object-contain" />
              </div>
              <h2 className="text-3xl font-bold text-white">Street Eye</h2>
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold text-slate-200">Real-time Traffic Intelligence</h3>
              <p className="text-slate-400 text-lg leading-relaxed max-w-md">
                Monitor traffic patterns, optimize routes, and make data-driven decisions with our comprehensive traffic analytics platform.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-slate-300">
                <MapPin className="h-5 w-5 text-slate-400" />
                <span>Live traffic monitoring</span>
              </div>
              <div className="flex items-center space-x-3 text-slate-300">
                <img src={trafficLightLogo} alt="Street Eye Logo" className="h-5 w-5 object-contain" />
                <span>Smart route optimization</span>
              </div>
              <div className="flex items-center space-x-3 text-slate-300">
                <Sparkles className="h-5 w-5 text-slate-400" />
                <span>Predictive analytics</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center min-h-screen p-4 lg:ml-2/5">
        <div className="max-w-md w-full space-y-8 relative z-10">
          <div className="text-center lg:hidden">
            <div className="mx-auto relative group">
              <div className="h-16 w-16 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center mb-6 shadow-2xl border border-slate-600/50 backdrop-blur-sm transform transition-all duration-300 group-hover:scale-105 group-hover:rotate-3">
                <div className="text-white font-bold text-2xl">🚗</div>
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-2xl"></div>
              </div>
              <Sparkles className="absolute -top-2 -right-2 h-4 w-4 text-slate-400 animate-pulse" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-2">
              Street Eye
            </h1>
            <p className="text-slate-300 text-sm font-medium">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </p>
          </div>
          <div className="hidden lg:block text-center">
            <h1 className="text-3xl font-bold text-white mb-2">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </h1>
            <p className="text-slate-300 text-sm font-medium">
              {isSignUp ? 'Join Street Eye today' : 'Access your dashboard'}
            </p>
          </div>
          <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-600/50 rounded-2xl p-8 shadow-2xl">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="group relative w-full flex items-center justify-center py-4 px-6 border border-slate-500/50 rounded-xl text-sm font-medium text-slate-100 bg-slate-700/70 hover:bg-slate-600/80 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.02] backdrop-blur-sm"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-4">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
              </span>
              Continue with Google
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-500/50" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-slate-800 text-slate-300 font-medium">Or continue with email</span>
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-200">Email address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-slate-200 transition-colors" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className={`block w-full pl-12 pr-4 py-4 border ${
                      errors.email ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : 'border-slate-500/50 focus:border-slate-400 focus:ring-slate-400/20'
                    } rounded-xl placeholder-slate-400 text-slate-100 bg-slate-700/60 backdrop-blur-sm focus:outline-none focus:ring-2 sm:text-sm transition-all duration-300 hover:bg-slate-700/80`}
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                {errors.email && <p className="text-sm text-red-400 flex items-center"><span className="mr-1">⚠</span>{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-200">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-slate-200 transition-colors" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    required
                    className={`block w-full pl-12 pr-12 py-4 border ${
                      errors.password ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : 'border-slate-500/50 focus:border-slate-400 focus:ring-slate-400/20'
                    } rounded-xl placeholder-slate-400 text-slate-100 bg-slate-700/60 backdrop-blur-sm focus:outline-none focus:ring-2 sm:text-sm transition-all duration-300 hover:bg-slate-700/80`}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5 text-slate-400 hover:text-slate-200 transition-colors" /> : <Eye className="h-5 w-5 text-slate-400 hover:text-slate-200 transition-colors" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-red-400 flex items-center"><span className="mr-1">⚠</span>{errors.password}</p>}
              </div>
              {isSignUp && (
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-200">Confirm Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-slate-200 transition-colors" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      className={`block w-full pl-12 pr-4 py-4 border ${
                        errors.confirmPassword ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : 'border-slate-500/50 focus:border-slate-400 focus:ring-slate-400/20'
                      } rounded-xl placeholder-slate-400 text-slate-100 bg-slate-700/60 backdrop-blur-sm focus:outline-none focus:ring-2 sm:text-sm transition-all duration-300 hover:bg-slate-700/80`}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-sm text-red-400 flex items-center"><span className="mr-1">⚠</span>{errors.confirmPassword}</p>}
                </div>
              )}
              {errors.submit && (
                <div className="rounded-xl bg-red-900/30 border border-red-700/40 p-4 backdrop-blur-sm">
                  <p className="text-sm text-red-300 flex items-center"><span className="mr-2">⚠</span>{errors.submit}</p>
                </div>
              )}
              <button
                type="button"
                onClick={handleEmailPasswordAuth}
                disabled={isLoading}
                className="group relative w-full flex justify-center items-center py-4 px-6 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-xl"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setErrors({});
                    setFormData({ email: '', password: '', confirmPassword: '' });
                  }}
                  className="text-sm text-slate-300 hover:text-slate-100 transition-colors font-medium"
                >
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
