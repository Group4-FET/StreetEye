import React from 'react';
import { Shield, Lightbulb, User, Car, Siren, CloudOff } from 'lucide-react';

const RoadSafetyEducationPage = () => {
  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 flex flex-col items-center">
      <h1 className="text-5xl font-extrabold text-white mb-8 flex items-center text-center">
        <Shield className="h-14 w-14 mr-4 text-orange-400" /> Road Safety Education
      </h1>

      <p className="text-lg text-slate-300 max-w-3xl text-center mb-10 leading-relaxed">
        Your safety on the road is paramount. Here are some essential tips to help you stay safe, whether you're driving, cycling, or walking.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl w-full">

        {/* Tip 1 */}
        <div className="bg-slate-700/40 border border-slate-600/50 p-6 rounded-xl shadow-lg flex flex-col items-center text-center hover:bg-slate-600/50 transition-colors duration-200">
          <Lightbulb className="h-12 w-12 text-blue-400 mb-4" />
          <h2 className="text-2xl font-semibold text-slate-200 mb-3">Stay Alert & Focused</h2>
          <p className="text-slate-300">
            <b>Avoid distractions</b><br /> like mobile phones, eating, or loud music. Keep your focus entirely on the road and your surroundings. Fatigue also impairs judgment; pull over if you're tired.
          </p>
        </div>

        {/* Tip 2 */}
        <div className="bg-slate-700/40 border border-slate-600/50 p-6 rounded-xl shadow-lg flex flex-col items-center text-center hover:bg-slate-600/50 transition-colors duration-200">
          <Car className="h-12 w-12 text-green-400 mb-4" />
          <h2 className="text-2xl font-semibold text-slate-200 mb-3">Maintain Safe Distances</h2>
          <p className="text-slate-300">
            Always keep a <b>safe following distance</b><br /> from the vehicle in front, especially in wet conditions or at high speeds. This gives you time to react to sudden stops.
          </p>
        </div>

        {/* Tip 3 */}
        <div className="bg-slate-700/40 border border-slate-600/50 p-6 rounded-xl shadow-lg flex flex-col items-center text-center hover:bg-slate-600/50 transition-colors duration-200">
          <User className="h-12 w-12 text-purple-400 mb-4" />
          <h2 className="text-2xl font-semibold text-slate-200 mb-3">Respect Traffic Laws</h2>
          <p className="text-slate-300">
            Adhere strictly to <b>speed limits, traffic signs, and signals</b><br />. Lane discipline and proper signaling are crucial for predictable and safe driving.
          </p>
        </div>

        {/* Tip 4 */}
        <div className="bg-slate-700/40 border border-slate-600/50 p-6 rounded-xl shadow-lg flex flex-col items-center text-center hover:bg-slate-600/50 transition-colors duration-200">
          <Siren className="h-12 w-12 text-red-400 mb-4" />
          <h2 className="text-2xl font-semibold text-slate-200 mb-3">Be Mindful of Others</h2>
          <p className="text-slate-300">
            Always <b>look out for pedestrians, cyclists, and motorcyclists</b><br />. Be prepared for unexpected movements and avoid aggressive driving behavior.
          </p>
        </div>

        {/* Tip 5 */}
        <div className="bg-slate-700/40 border border-slate-600/50 p-6 rounded-xl shadow-lg flex flex-col items-center text-center hover:bg-slate-600/50 transition-colors duration-200">
          <CloudOff className="h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-2xl font-semibold text-slate-200 mb-3">Adjust to Conditions</h2>
          <p className="text-slate-300">
            <b>Modify your driving</b><br /> for adverse weather (rain, fog) or road conditions (potholes, gravel). Reduce speed and increase following distance significantly.
          </p>
        </div>

      </div>

      <div className="mt-12 p-6 bg-slate-700/40 border border-slate-600/50 rounded-xl shadow-md text-slate-400 max-w-3xl text-center">
        <p className="text-sm">
          Remember, road safety is a shared responsibility. Drive defensively and prioritize safety at all times.
        </p>
      </div>
    </div>
  );
};

export default RoadSafetyEducationPage;