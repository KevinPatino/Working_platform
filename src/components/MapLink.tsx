import React from 'react';

interface MapLinkProps {
  location: string;
  compact?: boolean;
  className?: string;
}

const MapLink: React.FC<MapLinkProps> = ({ location, compact = false, className = '' }) => {
  if (!location) return <span className="text-gray-300">—</span>;

  const sites = location.split(' / ').map((s) => s.trim()).filter(Boolean);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {sites.map((site, index) => {
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site)}`;
        // Si compact es true, muestra únicamente el texto previo a la primera coma
        const displayText = compact ? site.split(',')[0].trim() : site;

        return (
          <a
            key={index}
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline transition-colors w-fit text-left"
            title={`Open "${site}" in Google Maps`}
          >
            <span>📍</span>
            <span className="font-semibold text-xs sm:text-sm">{displayText}</span>
            <span className="text-[10px] text-gray-400 no-underline">↗</span>
          </a>
        );
      })}
    </div>
  );
};

export default MapLink;