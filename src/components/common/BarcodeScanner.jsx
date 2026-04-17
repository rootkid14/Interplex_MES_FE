import React, { useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X } from 'lucide-react';

const BarcodeScanner = ({ onScanSuccess, onClose }) => {
    const [error, setError] = useState("");

    useEffect(() => {
        const html5QrCode = new Html5Qrcode("reader");
        const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

        html5QrCode.start(
            { facingMode: "environment" }, // Luôn ép buộc mở camera sau
            config,
            (decodedText) => {
                // Tắt máy quét ngay khi quét thành công
                if (html5QrCode.isScanning) {
                    html5QrCode.stop().then(() => {
                        onScanSuccess(decodedText);
                    }).catch(err => console.error("Lỗi khi tắt camera", err));
                }
            },
            (errorMessage) => {
                // Bỏ qua lỗi trong quá trình đang dò tìm mã
            }
        ).catch((err) => {
            console.error("Camera start error", err);
            setError("Không thể khởi động camera. Vui lòng cấp quyền hoặc đảm bảo thiết bị có camera sau.");
        });

        return () => {
            if (html5QrCode.isScanning) {
                html5QrCode.stop().catch(e => console.warn("Stop error on unmount", e));
            }
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden relative shadow-2xl">
                <div className="bg-slate-900 p-4 flex justify-between items-center border-b border-slate-700">
                    <h3 className="text-white font-bold">Quét Mã</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-1 rounded-full hover:bg-slate-700">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-4 bg-slate-100 min-h-[300px] flex flex-col justify-center">
                    {error ? (
                        <p className="text-red-500 text-center font-bold p-4 bg-red-100 rounded-lg">{error}</p>
                    ) : (
                        <div id="reader" className="rounded-lg overflow-hidden border-2 border-slate-300 bg-white shadow-inner"></div>
                    )}
                    <p className="text-center text-xs text-slate-500 mt-4 font-bold uppercase tracking-wider">
                        Vui lòng đưa mã vào khu vực Camera
                    </p>
                </div>
            </div>
        </div>
    );
};
export default BarcodeScanner;