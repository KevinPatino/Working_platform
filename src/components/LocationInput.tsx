import React, { useEffect, useRef, useState } from 'react';

export interface LocationMetadata {
  address: string;
  lat?: number;
  lng?: number;
  placeId?: string;
}

interface LocationInputProps {
  value: string;
  onChange: (value: string, metadata?: LocationMetadata) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

declare global {
  interface Window {
    google: any;
  }
}

const LocationInput: React.FC<LocationInputProps> = ({
  value,
  onChange,
  placeholder = 'Search job site address...',
  className = '',
  required = false,
}) => {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);
  const sessionTokenRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Cargar el script moderno de Google Maps con soporte para Places (New)
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    if (window.google?.maps?.importLibrary) {
      setIsApiReady(true);
      return;
    }

    const scriptId = 'google-maps-new-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=places`;
      script.async = true;
      script.onload = () => setIsApiReady(true);
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', () => setIsApiReady(true));
    }
  }, []);

  // 2. Cerrar el menú desplegable si se hace clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 3. Consultar sugerencias con debouncing al escribir
  useEffect(() => {
    if (!isApiReady || !value || value.trim().length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const { AutocompleteSuggestion, AutocompleteSessionToken } =
          await window.google.maps.importLibrary('places');

        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new AutocompleteSessionToken();
        }

        const request = {
          input: value,
          includedRegionCodes: ['ca'], // Prioriza obras en Canadá
          sessionToken: sessionTokenRef.current,
        };

        const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        if (response && response.suggestions) {
          setPredictions(response.suggestions);
          setShowDropdown(response.suggestions.length > 0);
        }
      } catch (err) {
        console.warn('Error buscando sugerencias:', err);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [value, isApiReady]);

  // 4. Procesar el lugar seleccionado y extraer detalles (coordenadas y dirección formal)
  const handleSelectPrediction = async (suggestion: any) => {
    try {
      setShowDropdown(false);
      const prediction = suggestion.placePrediction;
      const place = prediction.toPlace();

      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location', 'id'],
      });

      const formattedAddress =
        place.formattedAddress ||
        place.displayName ||
        prediction.text?.toString() ||
        value;

      const lat = place.location ? place.location.lat() : undefined;
      const lng = place.location ? place.location.lng() : undefined;
      const placeId = place.id || prediction.placeId;

      // Renovar el session token para la siguiente búsqueda
      sessionTokenRef.current = null;

      onChange(formattedAddress, {
        address: formattedAddress,
        lat,
        lng,
        placeId,
      });
    } catch (err) {
      console.error('Error al obtener detalles del lugar:', err);
      const fallbackText = suggestion.placePrediction?.text?.toString() || value;
      onChange(fallbackText);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => {
          if (predictions.length > 0) setShowDropdown(true);
        }}
        placeholder={placeholder}
        className={className}
        required={required}
        autoComplete="off"
      />

      {/* Lista desplegable flotante de resultados sugeridos */}
      {showDropdown && predictions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-gray-100 text-left">
          {predictions.map((item, idx) => {
            const pred = item.placePrediction;
            const mainText = pred.mainText?.toString() || pred.text?.toString() || '';
            const secondaryText = pred.secondaryText?.toString() || '';

            return (
              <li
                key={pred.placeId || idx}
                onClick={() => handleSelectPrediction(item)}
                className="p-3 hover:bg-blue-50 cursor-pointer transition-colors flex items-start gap-2.5"
              >
                <span className="text-blue-500 text-sm mt-0.5">📍</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">
                    {mainText}
                  </p>
                  {secondaryText && (
                    <p className="text-[11px] text-gray-500 truncate">
                      {secondaryText}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default LocationInput;