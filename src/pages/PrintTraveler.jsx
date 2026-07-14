import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, Type, SlidersHorizontal, LayoutTemplate, Loader2, Save, RotateCcw, Plus, Minus, Trash2, PlusSquare } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { bomAPI } from '../api/bomAPI';

const PrintTravelerPage = () => {

  const [shiftOptions, setShiftOptions] = useState([]);
  const [machineOptions, setMachineOptions] = useState([]);

  const navigate = useNavigate();
  const printAreaRef = useRef(null);

  const [headerInfo, setHeaderInfo] = useState({ jobNo: '', fgPn: '', startJob: '', partNo: '', productName: '', truckingNo: '' });
  const [tableData, setTableData] = useState([]);
  
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);

  const [printConfig, setPrintConfig] = useState({ fontSize: 12, tableZoom: 90, orientation: 'landscape' });
  const [colWidths, setColWidths] = useState([45, 180, 140, 70, 70, 110, 50, 50, 50, 80, 150]); // Mở rộng cột Process một chút
  const [rowHeights, setRowHeights] = useState({});
  const [cellFontSizes, setCellFontSizes] = useState({}); 

  const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [shifts, machines] = await Promise.all([
          bomAPI.getShiftOptions(),
          bomAPI.getMachineOptions()
        ]);
        setShiftOptions(shifts);
        setMachineOptions(machines);
      } catch (err) {
        console.error("Lỗi khi tải danh mục:", err);
      }
    };
    fetchLookups();
  }, []);

  // --- HÀM TẢI DỮ LIỆU ---
  const handleGenerateClick = async (forceDynamic = false) => {
    if (!headerInfo.jobNo || !headerInfo.fgPn) {
        setErrorMessage('Vui lòng nhập Job No và Target PN (FG PN)');
        return;
    }

    setErrorMessage('');
    setIsLoading(true);
    
    try {
        let data;
        if (forceDynamic) {
            data = await bomAPI.generateDynamicRouting(headerInfo.jobNo, headerInfo.fgPn);
        } else {
            data = await bomAPI.fetchRoutingApi(headerInfo.jobNo, headerInfo.fgPn);
        }
        
        const mappedData = data.routingPath.map((step, idx) => ({
            no: idx + 1, // Luôn đánh số lại từ đầu để chắc chắn
            process: step.Process || step.process || '',
            component: Array.isArray(step.Components) ? step.Components.join(", ") : (step.component || step.Components || ''),
            shift: step.shift || '', machine: step.machine || '', date: step.date || '',
            ok: step.ok || '', ng: step.ng || '', hold: step.hold || ''
        }));

        setTableData(mappedData);
        // Kiểm tra xem dữ liệu này lấy từ DB ra hay mới gen? (Có thể dựa vào cờ truyền về từ backend, tạm mặc định nếu gọi fetch bình thường thì coi là đang custom)
        setIsCustomMode(!forceDynamic && data.routingPath.length > 0 && !!data.routingPath[0].no); 
        
        setHeaderInfo(prev => ({
            ...prev,
            startJob: data.startComponent || '',
            partNo: data.startComponent || '',
            productName: data.productName || 'N/A', 
            truckingNo: data.truckingNo || 'N/A'
        }));
        
        if(forceDynamic) alert("Đã khôi phục lại tuyến đường tự động nguyên bản!");
    } catch (err) {
        setErrorMessage(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  // --- HÀM LƯU CONFIG ---
  const handleSaveCustomRouting = async () => {
      setIsSaving(true);
      try {
          const payload = {
              start_pn: headerInfo.startJob,
              end_pn: headerInfo.fgPn,
              routing_data: tableData
          };
          await bomAPI.saveRoutingConfig(payload);
          setIsCustomMode(true);
          alert("Lưu biểu mẫu Custom Routing thành công!");
      } catch(err) {
          alert(`Lỗi khi lưu: ${err.message}`);
      } finally {
          setIsSaving(false);
      }
  };

  // --- XỬ LÝ DÒNG/CỘT ---
  const handleCellChange = (index, field, value) => {
    const newData = [...tableData];
    newData[index][field] = value;
    setTableData(newData);
  };

  const handleDeleteRow = (index) => {
      if(window.confirm(`Bạn có chắc muốn xóa công đoạn số ${tableData[index].no}?`)) {
          const newData = [...tableData];
          newData.splice(index, 1);
          setTableData(newData.map((row, i) => ({...row, no: i + 1}))); // Đánh lại số
      }
  };

  const handleInsertRow = (index) => {
      const newRow = { no: '', process: '', component: '', shift: '', machine: '', date: '', ok: '', ng: '', hold: '' };
      const newData = [...tableData];
      newData.splice(index + 1, 0, newRow); // Chèn xuống dưới dòng hiện tại
      setTableData(newData.map((row, i) => ({...row, no: i + 1})));
  };

  const adjustCellFontSize = (index, field, delta) => {
      const cellKey = `${index}-${field}`;
      setCellFontSizes(prev => {
          const currentSize = prev[cellKey] || printConfig.fontSize;
          return { ...prev, [cellKey]: Math.max(8, currentSize + delta) }; 
      });
  };

  // --- XỬ LÝ RESIZE KÉO THẢ ---
  const handleColResize = (e, index) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = colWidths[index];
    const scaleFactor = printConfig.tableZoom / 100;
    const onMouseMove = (moveEvent) => {
      const deltaX = (moveEvent.clientX - startX) / scaleFactor; 
      setColWidths(prev => { const upd = [...prev]; upd[index] = Math.max(30, startWidth + deltaX); return upd; });
    };
    const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
    document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp);
  };

  const handleRowResize = (e, index) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = rowHeights[index] || 60;
    const scaleFactor = printConfig.tableZoom / 100;
    const onMouseMove = (moveEvent) => {
      const deltaY = (moveEvent.clientY - startY) / scaleFactor;
      setRowHeights(prev => ({ ...prev, [index]: Math.max(30, startHeight + deltaY) }));
    };
    const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
    document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp);
  };

  // --- IN ẤN ---
  const handlePrintAsImage = async () => {
    if (!printAreaRef.current) return;
    try {
      setIsCapturing(true);
      await new Promise(resolve => setTimeout(resolve, 300)); // Đợi React render DIV thay cho TEXTAREA
      const canvas = await html2canvas(printAreaRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff', logging: false });
      const imgData = canvas.toDataURL('image/png');
      const iframe = document.createElement('iframe');
      Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: 'none' });
      document.body.appendChild(iframe);
      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(`
        <html><head><style>
          @page { size: A4 ${printConfig.orientation}; margin: 5mm; }
          body { margin: 0; padding: 0; background-color: white; }
          img { width: 100%; max-height: 100vh; object-fit: contain; }
        </style></head><body><img src="${imgData}" onload="window.print();" /></body></html>
      `);
      iframeDoc.close();
      setTimeout(() => { document.body.removeChild(iframe); setIsCapturing(false); }, 1000);
    } catch (error) {
      console.error("Lỗi in:", error);
      setIsCapturing(false);
    }
  };

  const isLandscape = printConfig.orientation === 'landscape';
  const paperDimensions = isLandscape ? { width: '297mm', minHeight: '210mm' } : { width: '210mm', minHeight: '297mm' };

  const renderCellTool = (index, field) => {
      if (isCapturing) return null;
      return (
          <div className="absolute top-0 right-0 hidden group-hover:flex bg-slate-800 text-white shadow-lg border border-slate-600 z-20 rounded-bl overflow-hidden">
              <button onClick={() => adjustCellFontSize(index, field, 1)} className="p-1 hover:bg-slate-600 transition" title="Tăng cỡ chữ"><Plus size={12} /></button>
              <button onClick={() => adjustCellFontSize(index, field, -1)} className="p-1 hover:bg-slate-600 transition" title="Giảm cỡ chữ"><Minus size={12} /></button>
          </div>
      )
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden">
      <header className="h-14 bg-slate-800 border-b border-slate-700 flex items-center px-4 shrink-0">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-700">
          <ArrowLeft size={18} /><span>Quay lại</span>
        </button>
        <h1 className="ml-6 text-lg font-bold text-white">CREATE PRODUCTION TRAVELLER</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* PANEL ĐIỀU KHIỂN TRÁI */}
        <div className="w-80 bg-slate-800 border-r border-slate-700 p-5 flex flex-col gap-6 overflow-y-auto shrink-0 shadow-xl relative z-10">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Thông tin Lệnh Sx</h3>
            <div className="space-y-1 text-sm">
              <label className="text-slate-400">Job No</label>
              <input type="text" value={headerInfo.jobNo} onChange={(e) => setHeaderInfo({...headerInfo, jobNo: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-blue-500" />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-400">Target PN (FG PN)</label>
              <input type="text" value={headerInfo.fgPn} onChange={(e) => setHeaderInfo({...headerInfo, fgPn: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-blue-500" />
            </div>
            <div className="pt-2">
                {errorMessage && <p className="text-red-400 text-xs mb-2 bg-red-400/10 p-2 rounded">⚠️ {errorMessage}</p>}
                
                <div className="flex flex-col gap-2">
                    <button onClick={() => handleGenerateClick(false)} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg flex justify-center gap-2">
                        {isLoading ? <Loader2 size={16} className="animate-spin"/> : "GET TRAVELLER"}
                    </button>
                    {/* Bổ sung nút Load Gốc */}
                    <button onClick={() => handleGenerateClick(true)} disabled={isLoading} className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-semibold py-2 rounded-lg flex justify-center items-center gap-2 border border-slate-600">
                        <RotateCcw size={14} /> AUTOMATIC TRAVELLER FORMAT
                    </button>
                </div>
            </div>
          </div>

          {tableData.length > 0 && (
              <>
                <hr className="border-slate-700" />
                <div className="space-y-3">
                    <button onClick={handleSaveCustomRouting} disabled={isSaving} className="w-full bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold py-2 rounded-lg flex justify-center items-center gap-2">
                        {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} 
                        SAVE TRAVELLER FORMAT
                    </button>
                </div>
              </>
          )}

          <hr className="border-slate-700" />
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Bố cục in</h3>
            <div className="space-y-2">
              <span className="flex items-center gap-2 text-sm"><LayoutTemplate size={14} /> Khổ giấy A4</span>
              <div className="flex gap-2">
                <button onClick={() => setPrintConfig({...printConfig, orientation: 'landscape'})} className={`flex-1 py-2 text-sm rounded ${isLandscape ? 'bg-blue-600 text-white' : 'bg-slate-700'}`}>Ngang</button>
                <button onClick={() => setPrintConfig({...printConfig, orientation: 'portrait'})} className={`flex-1 py-2 text-sm rounded ${!isLandscape ? 'bg-blue-600 text-white' : 'bg-slate-700'}`}>Dọc</button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2"><Type size={14} /> Cỡ chữ chung</span>
                <span className="text-blue-400 font-mono">{printConfig.fontSize}px</span>
              </div>
              <input type="range" min="8" max="24" value={printConfig.fontSize} onChange={(e) => setPrintConfig({...printConfig, fontSize: Number(e.target.value)})} className="w-full accent-blue-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2"><SlidersHorizontal size={14} /> Thu phóng</span>
                <span className="text-blue-400 font-mono">{printConfig.tableZoom}%</span>
              </div>
              <input type="range" min="50" max="150" value={printConfig.tableZoom} onChange={(e) => setPrintConfig({...printConfig, tableZoom: Number(e.target.value)})} className="w-full accent-blue-500" />
            </div>
          </div>

          <button onClick={handlePrintAsImage} disabled={isCapturing || tableData.length === 0} className={`mt-auto text-white py-3 rounded-lg font-bold flex justify-center gap-2 ${isCapturing || tableData.length === 0 ? 'bg-slate-600 opacity-50' : 'bg-green-600 hover:bg-green-500'}`}>
            {isCapturing ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />} Print
          </button>
        </div>

        {/* VÙNG HIỂN THỊ TRANG IN PHẢI */}
        <div className="flex-1 overflow-auto bg-gray-400 p-8 flex flex-col items-center justify-start relative">
          {tableData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-600 mt-20">
                  <LayoutTemplate size={80} className="mb-4 opacity-50" />
                  <h2 className="text-2xl font-bold mb-2">Trang in chưa có dữ liệu</h2>
                  <p>Nhập Job No và FG PN để lấy dữ liệu.</p>
              </div>
          ) : (
            <div 
              ref={printAreaRef}
              className="bg-white text-black relative origin-top-left overflow-hidden shadow-2xl transition-all"
              style={{ width: paperDimensions.width, minHeight: paperDimensions.minHeight, padding: '10mm', boxShadow: isCapturing ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: isCapturing ? 'none' : '1px solid #ccc' }}
            >
              <div style={{ transform: `scale(${printConfig.tableZoom / 100})`, transformOrigin: 'top left', fontSize: `${printConfig.fontSize}px`, width: `${100 / (printConfig.tableZoom / 100)}%` }}>
                
                <h1 className="font-extrabold text-2xl text-center uppercase tracking-widest mb-4">Production Traveler</h1>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-6 font-semibold border-b-2 border-black pb-4 text-[1em]">
                  <div className="flex items-center gap-2">
                    {headerInfo.truckingNo && <QRCodeSVG value={headerInfo.truckingNo} size={42} level="M" />}
                    <span className="text-[1.2em]">Trucking No: {headerInfo.truckingNo}</span>
                  </div>
                  <span>Part No: {headerInfo.partNo}</span>
                  <span>Product: {headerInfo.productName}</span>
                  <span className="border border-black px-2 py-1 bg-gray-100">Job No: {headerInfo.jobNo}</span>
                  {headerInfo.startJob && <span className="text-blue-800">Start Job: {headerInfo.startJob}</span>}
                  <span className="text-green-800">Finished Good: {headerInfo.fgPn}</span>
                </div>

                <table className="border-collapse border border-black table-fixed bg-white" style={{ width: `${tableWidth}px` }}>
                  <thead>
                    <tr>
                      {['No', 'Process', 'Component(s)', 'Shift/Ca', 'Machine', 'Ngay SX', 'OK', 'NG', 'Hold', 'QC Chop', 'Batch Label'].map((headerText, i) => (
                        <th 
                          key={i} 
                          className="border border-black bg-gray-100 relative group select-none font-bold p-1" 
                          style={{ width: `${colWidths[i]}px`, height: '50px' }} // Bạn có thể chỉnh height cố định nếu muốn
                        >
                          {/* Container flex để căn giữa tuyệt đối */}
                          <div className="flex items-center justify-center h-full w-full break-words whitespace-pre-wrap text-center">
                            {headerText}
                          </div>
                          
                          {/* Resize handle */}
                          {!isCapturing && (
                            <div 
                              className="absolute right-[-4px] top-0 w-3 h-full cursor-col-resize hover:bg-blue-500/80 z-10" 
                              onMouseDown={(e) => handleColResize(e, i)}
                            />
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, index) => (
                      <tr key={index} style={{ height: `${rowHeights[index] || 60}px` }}>
                        
                        <td className="border border-black text-center relative group p-1 break-words align-top">
                          {/* Sửa lại UI Nút Xóa/Thêm dòng để dễ bấm */}
                          {!isCapturing && (
                              <div className="absolute top-1 -left-6 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                  <button onClick={() => handleDeleteRow(index)} className="p-1 bg-red-100 text-red-600 rounded-full shadow hover:bg-red-200" title="Xóa dòng này">
                                      <Trash2 size={12} />
                                  </button>
                                  <button onClick={() => handleInsertRow(index)} className="p-1 bg-green-100 text-green-600 rounded-full shadow hover:bg-green-200" title="Chèn dòng trống xuống dưới">
                                      <PlusSquare size={12} />
                                  </button>
                              </div>
                          )}
                          <span>{row.no}</span>
                          {!isCapturing && <div className="absolute bottom-[-4px] left-0 w-full h-3 cursor-row-resize hover:bg-blue-500/80 z-10" onMouseDown={(e) => handleRowResize(e, index)}/>}
                        </td>
                        
                        {/* FIX TEXTAREA BUG ẨN CHỮ: Chuyển sang div khi in ấn để tự động bọc chữ hoàn hảo */}
                        <td className="border border-black p-1 relative group align-top" style={{ fontSize: cellFontSizes[`${index}-process`] ? `${cellFontSizes[`${index}-process`]}px` : 'inherit' }}>
                          {!isCapturing ? (
                             <textarea value={row.process} onChange={(e) => handleCellChange(index, 'process', e.target.value)} className="w-full h-full bg-transparent outline-none resize-none overflow-y-hidden text-inherit font-inherit whitespace-pre-wrap break-words" />
                          ) : (
                             <div className="w-full h-full whitespace-pre-wrap break-words">{row.process}</div>
                          )}
                          {renderCellTool(index, 'process')}
                        </td>

                        <td className="border border-black p-1 relative group align-top text-center" style={{ fontSize: cellFontSizes[`${index}-component`] ? `${cellFontSizes[`${index}-component`]}px` : 'inherit' }}>
                          {!isCapturing ? (
                             <textarea value={row.component} onChange={(e) => handleCellChange(index, 'component', e.target.value)} className="w-full h-full bg-transparent outline-none resize-none overflow-y-hidden text-center text-inherit font-inherit whitespace-pre-wrap break-words" />
                          ) : (
                             <div className="w-full h-full whitespace-pre-wrap break-words text-center">{row.component}</div>
                          )}
                           {renderCellTool(index, 'component')}
                        </td>
                        
                        {/* Cột Shift */}
                        <td className="border border-black relative group align-top p-0" style={{ height: `${rowHeights[index] || 60}px` }}>
                          {!isCapturing ? (
                            <select 
                              value={row.shift} 
                              onChange={(e) => handleCellChange(index, 'shift', e.target.value)} 
                              className="absolute inset-0 w-full h-full bg-transparent outline-none border-none cursor-pointer text-gray-900 font-semibold text-center hover:bg-blue-50 focus:bg-blue-100 transition-colors z-10"
                            >
                              {shiftOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          ) : <div className="w-full h-full flex items-center justify-center text-center">{row.shift}</div>}
                          {renderCellTool(index, 'shift')}
                        </td>

                        {/* Cột Machine */}
                        <td className="border border-black relative group align-top p-0" style={{ height: `${rowHeights[index] || 60}px` }}>
                          {!isCapturing ? (
                            <select 
                              value={row.machine} 
                              onChange={(e) => handleCellChange(index, 'machine', e.target.value)} 
                              className="absolute inset-0 w-full h-full bg-transparent outline-none border-none cursor-pointer text-gray-900 font-semibold text-center hover:bg-blue-50 focus:bg-blue-100 transition-colors z-10"
                            >
                              {machineOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          ) : <div className="w-full h-full flex items-center justify-center text-center">{row.machine}</div>}
                          {renderCellTool(index, 'machine')}
                        </td>
                        
                        <td className="border border-black p-1 relative group align-top" style={{ fontSize: cellFontSizes[`${index}-date`] ? `${cellFontSizes[`${index}-date`]}px` : 'inherit' }}>
                          {!isCapturing ? <input type="date" value={row.date} onChange={(e) => handleCellChange(index, 'date', e.target.value)} className="w-full h-full bg-transparent outline-none text-center text-inherit font-inherit" />
                          : <div className="w-full h-full flex items-center justify-center text-center">{row.date}</div>}
                           {renderCellTool(index, 'date')}
                        </td>

                        {['ok', 'ng', 'hold'].map((field) => (
                          <td key={field} className="border border-black p-1 relative group align-top" style={{ fontSize: cellFontSizes[`${index}-${field}`] ? `${cellFontSizes[`${index}-${field}`]}px` : 'inherit' }}>
                            {!isCapturing ? <input type="number" value={row[field]} onChange={(e) => handleCellChange(index, field, e.target.value)} className="w-full h-full bg-transparent outline-none text-center font-bold text-inherit font-inherit [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none" />
                            : <div className="w-full h-full flex items-center justify-center font-bold">{row[field]}</div>}
                            {renderCellTool(index, field)}
                          </td>
                        ))}

                        <td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrintTravelerPage;