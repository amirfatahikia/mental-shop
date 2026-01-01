"use client";
import React, { createContext, useContext, useState } from 'react';
import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react';

type ModalType = 'success' | 'error' | 'warning';
interface ModalContextType { showModal: (type: ModalType, title: string, message: string) => void; }
const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalData, setModalData] = useState({ type: 'warning' as ModalType, title: '', message: '' });

  const showModal = (type: ModalType, title: string, message: string) => {
    setModalData({ type, title, message });
    setIsOpen(true);
  };

  return (
    <ModalContext.Provider value={{ showModal }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl border border-gray-100 animate-in zoom-in duration-300 text-right">
            <button onClick={() => setIsOpen(false)} className="absolute top-6 left-6 text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
            <div className="flex flex-col items-center text-center mt-4">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
                modalData.type === 'success' ? 'bg-green-50 text-green-500' : 
                modalData.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'
              }`}>
                {modalData.type === 'success' && <CheckCircle2 size={40} />}
                {modalData.type === 'error' && <AlertCircle size={40} />}
                {modalData.type === 'warning' && <Info size={40} />}
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-3 italic">{modalData.title}</h2>
              <p className="text-gray-500 font-bold leading-7 text-sm mb-8 px-2">{modalData.message}</p>
              <button onClick={() => setIsOpen(false)} className={`w-full py-4 rounded-[1.5rem] font-black text-white shadow-lg transition-all active:scale-95 ${
                modalData.type === 'success' ? 'bg-green-600 shadow-green-100' : 
                modalData.type === 'error' ? 'bg-red-600 shadow-red-100' : 'bg-blue-600 shadow-blue-100'
              }`}>متوجه شدم</button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error('Error Modal Context');
  return context;
};