import React from 'react';
import { MapPin, ArrowUpRight } from 'lucide-react';

interface MapLinkProps {
  location: string;
  compact?: boolean;
  className?: string;
}

const MapLink: React.FC<MapLinkProps> = ({ location, compact = false, className = '' }) => {
  if (!location) return <span className="text-slate-300">—</span>;

  const sites = location.split(' / ').map((s) => s.trim()).filter(Boolean);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {sites.map((site, index) => {
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site)}`;
        const displayText = compact ? site.split(',')[0].trim() : site;

        return (
          <a
            key={index}
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-slate-800 hover:text-[#8B4513] transition-colors w-fit text-left group"
            title={`Open "${site}" in Google Maps`}
          >
            <MapPin className="w-3.5 h-3.5 text-[#8B4513] shrink-0" />
            <span className="font-bold text-xs underline decoration-slate-300 group-hover:decoration-[#8B4513] underline-offset-2">
              {displayText}
            </span>
            <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-[#8B4513] shrink-0" />
          </a>
        );
      })}
    </div>
  );
};

export default MapLink;