import React from 'react';

interface RobotHeroProps {
  isSpeaking?: boolean;
}

export const RobotHero: React.FC<RobotHeroProps> = ({ isSpeaking = false }) => {
  return (
    <div className="constellation-bg w-full py-6 sm:py-8 flex flex-col items-center justify-center relative border-b border-blue-200/60 overflow-hidden select-none">
      {/* Subtle background network constellation lines SVG */}
      <svg className="absolute inset-0 w-full h-full opacity-35 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.6"/>
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="15%" cy="30%" r="3" fill="#60a5fa" />
        <circle cx="28%" cy="65%" r="4" fill="#93c5fd" />
        <circle cx="40%" cy="20%" r="3" fill="#3b82f6" />
        <circle cx="65%" cy="25%" r="3" fill="#60a5fa" />
        <circle cx="82%" cy="45%" r="4" fill="#93c5fd" />
        <circle cx="75%" cy="75%" r="3" fill="#3b82f6" />
        <circle cx="20%" cy="85%" r="2" fill="#60a5fa" />
        <circle cx="88%" cy="20%" r="2" fill="#60a5fa" />

        <line x1="15%" y1="30%" x2="28%" y2="65%" stroke="#93c5fd" strokeWidth="1" strokeDasharray="3 3"/>
        <line x1="28%" y1="65%" x2="40%" y2="20%" stroke="#93c5fd" strokeWidth="1" strokeDasharray="3 3"/>
        <line x1="65%" y1="25%" x2="82%" y2="45%" stroke="#93c5fd" strokeWidth="1" strokeDasharray="3 3"/>
        <line x1="82%" y1="45%" x2="75%" y2="75%" stroke="#93c5fd" strokeWidth="1" strokeDasharray="3 3"/>
        <line x1="40%" y1="20%" x2="65%" y2="25%" stroke="#bfdbfe" strokeWidth="0.8"/>
      </svg>

      {/* Floating 3D Robot Avatar Card */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative group">
          {/* Glowing pulse ring around avatar */}
          <div className={`absolute -inset-2 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition duration-700 ${isSpeaking ? 'animate-pulse scale-105' : ''}`}></div>
          
          {/* Avatar Image */}
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-white/70 backdrop-blur-xs p-1 shadow-2xl shadow-blue-500/20 border-2 border-white animate-float overflow-hidden flex items-center justify-center">
            <img
              src="/robot_avatar.jpg"
              alt="Buji / Agent 40 Fee Assistant"
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                // Fallback SVG if image is loading
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* Live Assistant Tag */}
        <div className="mt-3 flex items-center space-x-2 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full border border-blue-200/80 shadow-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
          </span>
          <span className="text-xs font-semibold text-blue-900 tracking-tight">
            BUJI <span className="font-normal text-blue-700">| Financial Operations Agent</span>
          </span>
        </div>
      </div>
    </div>
  );
};
