import React, { useState } from 'react';
import { ArrowLeft, Download, UploadCloud, ShieldCheck, AlertTriangle, RefreshCw, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/AuthStore';
import { masterDataCsvAPI } from '../../api/masterDataCsvAPI';

const TABLES = {
  WORKCENTER: { label: 'WorkCenter_Master', columns: ['ID', 'StationType', 'LineCode'], key: 'StationType + LineCode' },
  DEFECT: { label: 'Master_Defect_Codes', columns: ['ID', 'Code', 'Station', 'EnglishName', 'VietnameseName'], key: 'Code' },
};

const textErr = (err) => err?.response?.data?.detail || err?.message || 'Lỗi kết nối đến MES Backend';
const asCSV = (content) => new Blob(['\ufeff', content], { type: 'text/csv;charset=utf-8;' });

export default function MasterDataCSVView() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const [table, setTable] = useState('WORKCENTER');
  const [password, setPassword] = useState('');
  const [csvText, setCsvText] = useState('');
  const [csvName, setCsvName] = useState('');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const actorId = Number(user?.id ?? user?.Emp_ID);
  const eligible = ['admin', 'administrator'].includes(String(user?.role || '').trim().toLowerCase()) ||
    String(user?.dept || '').trim().toLowerCase() === 'it';
  const creds = () => ({ ActorID: actorId, Password: password, Table: table });

  const resetPreview = () => { setPreview(null); setConfirm(false); setMessage(''); setError(''); };
  const changeTable = (t) => { setTable(t); setCsvText(''); setCsvName(''); resetPreview(); };
  const ensureReady = () => {
    if (!eligible || !actorId || !password) { setError('Cần tài khoản Admin/IT và mật khẩu xác nhận.'); return false; }
    return true;
  };
  const exportCSV = async () => {
    resetPreview();
    if (!ensureReady()) return;
    setBusy(true);
    try {
      const res = await masterDataCsvAPI.exportCSV(creds());
      const content = res?.data?.CsvText ?? '';
      const url = URL.createObjectURL(asCSV(content));
      const a = document.createElement('a'); a.href = url;
      a.download = res?.data?.Filename || `${table}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setMessage(`Đã tải CSV hiện tại (${res?.data?.Rows ?? 0} dòng).`);
    } catch(e) { setError(textErr(e)); }
    finally { setBusy(false); }
  };
  const loadFile = async (file) => {
    resetPreview();
    if (!file) return;
    if (file.size > 2_500_000) { setError('CSV quá lớn. Giới hạn khoảng 1MB nội dung.'); return; }
    if (!/\.csv$/i.test(file.name)) { setError('Chỉ nhận file .csv, lưu dạng UTF-8.'); return; }
    try { const t = await file.text(); setCsvText(t); setCsvName(file.name); }
    catch { setError('Không đọc được file CSV.'); }
  };
  const previewCSV = async () => {
    resetPreview();
    if (!ensureReady()) return;
    if (!csvText) { setError('Hãy chọn file CSV trước.'); return; }
    setBusy(true);
    try { const res = await masterDataCsvAPI.previewCSV({ ...creds(), CsvText: csvText }); setPreview(res.data); }
    catch(e) { setError(textErr(e)); }
    finally { setBusy(false); }
  };
  const applyCSV = async () => {
    setError(''); setMessage('');
    if (!ensureReady() || !preview?.PreviewToken || !confirm) return;
    setBusy(true);
    try {
      const res = await masterDataCsvAPI.applyCSV({ ...creds(), CsvText: csvText, PreviewToken: preview.PreviewToken });
      const sum = res.data?.Summary || {};
      setMessage(`Đã Upsert: ${sum.INSERT || 0} thêm mới, ${sum.UPDATE || 0} cập nhật, ${sum.SKIP || 0} giữ nguyên. Không xóa dòng nào. ImportID: ${res.data?.ImportID}`);
      setPreview(null); setConfirm(false); setCsvText(''); setCsvName('');
    } catch(e) { setError(textErr(e)); setPreview(null); setConfirm(false); }
    finally { setBusy(false); }
  };
  const cfg = TABLES[table];
  const summary = preview?.Summary || {};

  return <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 md:px-10">
    <div className="max-w-7xl mx-auto">
      <div className="flex items-start gap-4 mb-7">
        <button type="button" onClick={() => navigate('/workstation')} className="rounded-lg p-3 bg-slate-800 hover:bg-slate-700" title="Quay lại"><ArrowLeft size={20}/></button>
        <div><h1 className="text-2xl font-bold">Master Data — CSV Export / Upsert</h1><p className="text-slate-400 text-sm mt-1">Quản lý Line và Defect Code, có kiểm tra dữ liệu trước khi ghi.</p></div>
      </div>
      {!eligible && <div role="alert" className="mb-5 p-4 rounded-xl bg-red-950 border border-red-700">Chỉ tài khoản Admin hoặc phòng IT được sử dụng. Backend vẫn xác thực riêng trước mỗi thao tác.</div>}
      <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-5">
        <section className="bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-5">
          <h2 className="font-semibold text-lg">1. Chọn bảng và xác thực</h2>
          <div><label htmlFor="md-table" className="block text-sm text-slate-300 mb-1">Bảng dữ liệu</label>
            <select id="md-table" value={table} onChange={e => changeTable(e.target.value)} className="w-full rounded-lg bg-slate-800 border border-slate-600 p-3 text-white">
              {Object.entries(TABLES).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
            </select>
          </div>
          <div><label className="block text-sm text-slate-300 mb-1">ID người thao tác</label><p className="p-3 rounded-lg bg-slate-800 border border-slate-700">{actorId || 'Chưa xác định'} — {user?.name || ''}</p></div>
          <div><label htmlFor="md-pass" className="block text-sm text-slate-300 mb-1">Xác nhận mật khẩu Admin/IT</label>
            <input id="md-pass" type="password" autoComplete="off" value={password} onChange={e => {setPassword(e.target.value);resetPreview();}} placeholder="Nhập mật khẩu để thao tác" className="w-full rounded-lg bg-slate-800 border border-slate-600 p-3 text-white" />
          </div>
          <div className="p-3 rounded-xl bg-slate-800 text-slate-300 text-sm leading-6"><b className="text-white">Cột CSV:</b> {cfg.columns.join(', ')}<br/><b className="text-white">Khóa tìm dòng:</b> ID có sẵn, hoặc {cfg.key} nếu ID trống.<br/>Dòng thêm mới để trống ID.</div>
          <button type="button" disabled={busy || !eligible} onClick={exportCSV} className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl p-3 font-bold"><Download size={18}/> Tải CSV hiện tại</button>
          <div className="border-t border-slate-700 pt-5">
            <h2 className="font-semibold text-lg mb-2">2. Upload CSV đã chỉnh sửa</h2>
            <label htmlFor="md-file" className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed border-slate-600 bg-slate-800/50 cursor-pointer hover:border-blue-400"><UploadCloud size={28}/><span className="text-sm text-center break-all">{csvName || 'Chọn file CSV UTF-8'}</span></label>
            <input id="md-file" type="file" accept=".csv,text/csv" className="sr-only" onChange={e => {loadFile(e.target.files?.[0]);e.target.value='';}} />
            <button type="button" disabled={busy || !eligible || !csvText} onClick={previewCSV} className="w-full mt-3 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl p-3 font-bold"><RefreshCw size={17}/> Xem trước Upsert</button>
          </div>
        </section>
        <section className="min-w-0 bg-slate-900 border border-slate-700 rounded-2xl p-5">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3"><FileSpreadsheet size={20}/> 3. Kiểm tra thay đổi</h2>
          <p className="text-sm text-slate-400 mb-5">Các dòng bị xóa khỏi file CSV sẽ <b className="text-slate-200">không bị xóa</b> khỏi database. File trùng dữ liệu không tạo bản ghi mới.</p>
          {message && <p role="status" className="mb-4 p-4 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-200 break-words">{message}</p>}
          {error && <p role="alert" className="mb-4 p-4 rounded-lg bg-red-950 border border-red-700 text-red-200 break-words">{error}</p>}
          {!preview && <div className="text-slate-400 text-sm py-10 text-center">Chọn CSV và nhấn “Xem trước Upsert” để kiểm tra nội dung trước khi ghi.</div>}
          {preview && <>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[['Thêm mới',summary.INSERT,'text-sky-300'],['Cập nhật',summary.UPDATE,'text-amber-300'],['Không đổi',summary.SKIP,'text-emerald-300']].map(([name, number, color]) => <div key={name} className="bg-slate-800 rounded-xl p-4"><div className={`text-2xl font-bold ${color}`}>{number || 0}</div><div className="text-xs text-slate-400 mt-1">{name}</div></div>)}
            </div>
            <p className="text-sm text-slate-400 mb-3">Đang xem {preview.PlanPreview?.length || 0}/{preview.CsvRows} dòng. {preview.Truncated ? 'Danh sách xem trước rút gọn còn 200 dòng.' : ''}</p>
            <div className="overflow-x-auto border border-slate-700 rounded-xl"><table className="min-w-full text-left text-xs"><thead className="bg-slate-800 text-slate-300"><tr><th className="p-3">Action</th><th className="p-3">ID</th>{cfg.columns.slice(1).map(n => <th className="p-3" key={n}>{n}</th>)}</tr></thead>
            <tbody>{(preview.PlanPreview || []).map((p,i) => <tr key={i} className="border-t border-slate-800"><td className="p-3 font-semibold">{p.Action}</td><td className="p-3">{p.ID || 'NEW'}</td>{cfg.columns.slice(1).map(n => <td key={n} className="p-3 max-w-xs whitespace-normal break-words">{p.Action === 'UPDATE' && String(p.Before?.[n]) !== String(p.After?.[n]) && <div className="text-rose-300 line-through mb-1">{p.Before?.[n]}</div>}<div>{p.After?.[n]}</div></td>)}</tr>)}</tbody></table></div>
            <p className="mt-4 text-xs text-slate-400">Preview có kiểm tra số lượng, ID, trùng mã, dữ liệu vượt độ dài cột SQL và trạng thái bảng. Khi dữ liệu DB đổi trước Apply, thao tác sẽ bị từ chối.</p>
            <label className="flex items-start gap-3 mt-5 p-4 bg-slate-800 rounded-xl cursor-pointer"><input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} className="mt-1 w-5 h-5"/><span className="text-sm">Tôi đã kiểm tra CSV và xác nhận Upsert các dòng mới/thay đổi trên database. Tôi hiểu thao tác không tự xóa dòng cũ.</span></label>
            <button type="button" disabled={!confirm || busy || !eligible} onClick={applyCSV} className="w-full mt-4 flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-xl p-3 font-bold"><ShieldCheck size={19}/> Xác nhận Apply Upsert</button>
          </>}
        </section>
      </div>
      <p className="text-sm text-slate-500 mt-5 flex items-start gap-2"><AlertTriangle size={16} className="flex-none"/> CSV phải có đúng header do công cụ xuất. Mở CSV bằng Excel có thể tự đổi định dạng mã; hãy đặt cột mã thành Text trước khi lưu lại. Dùng HTTPS khi thao tác từ máy khác.</p>
    </div>
  </div>;
}
