import React, { useEffect } from 'react';

// Le decimos qué datos necesita recibir
interface ToastProps {
  message: string;
  onClose: () => void; // Una función para avisar que ya se debe cerrar
}

const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  
  // El propio componente controla su reloj de 3 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    
    // Esto es una buena práctica de seguridad en React (limpiar el reloj)
    return () => clearTimeout(timer); 
  }, [onClose]);

  return (
    <div className="fixed top-5 left-1/2 transform -translate-x-1/2 md:left-auto md:right-5 md:translate-x-0 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl flex items-center justify-between space-x-3 transition-all duration-300 ease-in-out w-max max-w-[90vw] sm:max-w-sm">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="font-semibold">{message}</span>
      
      {/* Botón opcional de X para cerrarlo antes de los 3 segundos */}
      <button onClick={onClose} className="ml-4 hover:text-gray-200">
         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
};

export default Toast;