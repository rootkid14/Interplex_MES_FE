import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

const BarcodeScanner = ({ onScanSuccess, onClose }) => {
  const scannerRef = useRef(null);

  useEffect(() => {
    const readerElement = document.getElementById("reader");
    if (readerElement) {
      readerElement.innerHTML = "";
    }

    
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
        rememberLastUsedCamera: false 
      },
      /* verbose= */ false
    );
    
    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(err => console.error(err));
          scannerRef.current = null;
        }
        onScanSuccess(decodedText);
      }, 
      (errorMessage) => {
      }
    );

    return () => {
      if (scannerRef.current) {
        try {
            scannerRef.current.clear().catch(error => {
                console.warn("Scanner cleanup warning:", error);
            });
        } catch (e) {
            // Bỏ qua lỗi nếu scanner đã bị hủy từ trước
        }
        scannerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden relative shadow-2xl">
        
        <div className="bg-slate-900 p-4 flex justify-between items-center border-b border-slate-700">
          <h3 className="text-white font-bold">Scan Barcode</h3>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-1 rounded-full hover:bg-slate-700"
          >
            <X size={24} />
          </button>
        </div>

        
        <div className="p-4 bg-slate-100 min-h-[300px] flex flex-col justify-center">
          <div id="reader" className="rounded-lg overflow-hidden border-2 border-slate-300 bg-white"></div>
          <p className="text-center text-xs text-slate-500 mt-4">
             Point camera at a QR Code or Barcode
          </p>
        </div>

      </div>
    </div>
  );
};

export default BarcodeScanner;