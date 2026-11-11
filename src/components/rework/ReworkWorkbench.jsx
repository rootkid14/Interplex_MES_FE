import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, RefreshCcw, ScanLine, RotateCcw, CheckCircle, AlertTriangle } from 'lucide-react';
import BarcodeScanner from '../common/BarcodeScanner';
import { workstationAPI } from '../../api/workstationApi';
import { reworkAPI, rwApiError } from '../../api/reworkAPI';
import RWDetailsTables from './RWDetailsTables';

/** Whole-batch only; server owns FROZEN state and cumulative quantities. */
const ReworkWorkbench = ({ rw, onClose }) => {
  const wo = rw.WO;
  const [details, setDetails] = useState(null);
  const [inputBatch, setInputBatch] = useState('');
  const [rawBarcode, setRawBarcode] = useState('');
  const [completed, setCompleted] = useState(String(rw.CompletedQty ?? 0));
  const [actor, setActor] = useState('');
  const [remainder, setRemainder] = useState(null);
  const [remainingQty, setRemainingQty] = useState('');
  const [scanner, setScanner] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await reworkAPI.details(wo);
      if (!result.success) throw new Error(result.message || 'Không tải được Rework Details.');
      setDetails(result.data);
      setCompleted(String(result.data.CompletedQty ?? 0));
      setError('');
    } catch (e) { setError(rwApiError(e)); }
    finally { setLoading(false); }
  }, [wo]);
  useEffect(() => { refresh(); }, [refresh]);

  const perform = async (operation) => {
    if (busy) return;
    setBusy(true); setNotice(''); setError('');
    try {
      const res = await operation();
      if (!res?.success) throw new Error(res?.message || 'Server đã từ chối thao tác.');
      setNotice(res.message || 'Đã lưu.');
      await refresh();
    } catch (e) { setError(rwApiError(e)); }
    finally { setBusy(false); }
  };

  const addInput = async (batchValue = inputBatch) => {
    const batch = String(batchValue || '').trim();
    if (!batch || busy) return;
    if (!window.confirm(`ĐÓNG BĂNG VĨNH VIỄN toàn bộ Batch ${batch} và đưa vào RW ${wo}?\nBatch cũ sẽ không còn được phép sử dụng.`)) return;
    await perform(() => reworkAPI.addInput({ WO: wo, Batch: batch, Actor: actor.trim() || null }));
    setInputBatch('');
  };
  const addRaw = async (value = rawBarcode) => {
    const barcode = String(value || '').trim();
    if (!barcode || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await workstationAPI.logRawMaterial(wo, barcode);
      if (res?.success) {
        setRawBarcode(''); setRemainder(null);
        setNotice('Đã ghi nhận RAW Material.');
        await refresh();
      } else if (res?.data?.Code === 'RAW_REMAINDER_REQUIRED') {
        setRemainder({ ...res.data, RawMaterial: barcode });
        setRemainingQty('');
        setNotice('RAW đã được cấp cho JOB khác. Nhập phần dư còn lại cần chuyển qua RW.');
      } else throw new Error(res?.message || 'RAW không hợp lệ.');
    } catch (e) { setError(rwApiError(e)); }
    finally { setBusy(false); }
  };
  const transferRemainder = async () => {
    if (!remainder || busy) return;
    const qty = String(remainingQty).trim();
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/.test(qty) || Number(qty) <= 0 || Number(qty) > Number(remainder.PreviousQTY)) {
      setError('Remaining QTY phải > 0 và <= lượng hiện hành, tối đa 4 chữ số thập phân.'); return;
    }
    if (!window.confirm(`Chuyển ${qty} ${remainder.UOM} của RAW ${remainder.SerialNumber} từ WO ${remainder.PreviousWO} vào RW WO ${wo}?`)) return;
    await perform(() => workstationAPI.transferRawMaterial(wo, remainder.RawMaterial, qty, remainder.CurrentUsageID));
    setRemainder(null); setRawBarcode(''); setRemainingQty('');
  };
  const saveProgress = async () => {
    const qty = Number(completed);
    if (!/^\d+$/.test(completed.trim()) || !Number.isSafeInteger(qty)) { setError('Completed QTY phải là số nguyên không âm.'); return; }
    const prev = Number(details?.CompletedQty ?? rw.CompletedQty ?? 0);
    if (qty < prev) { setError('Không được giảm sản lượng lũy kế.'); return; }
    if (qty > Number(details?.InputQty ?? 0)) { setError('Completed QTY không được vượt Input QTY.'); return; }
    await perform(() => reworkAPI.progress({ WO: wo, CompletedQty: qty, Actor: actor.trim() || null }));
  };
  const changeStatus = async (action) => {
    if (!window.confirm(action === 'complete'
      ? 'Xác nhận HOÀN THÀNH Rework? Backend yêu cầu đã cấp phát hết tem RW.'
      : 'Mở lại Rework để tiếp tục nhận Batch và sửa hàng?')) return;
    await perform(() => reworkAPI[action]({ WO: wo, Actor: actor.trim() || null }));
  };
  const active = (details?.RW_Status || rw.RW_Status) === 'ACTIVE';
  const handleScan = (value) => {
    const kind = scanner; setScanner('');
    if (kind === 'input') { setInputBatch(value); addInput(value); }
    else if (kind === 'raw') { setRawBarcode(value); addRaw(value); }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-950 text-white">
      <header className="flex flex-wrap gap-3 items-center justify-between bg-slate-900 p-4 border-b border-slate-700">
        <div><h2 className="text-xl font-black flex gap-2 items-center text-purple-300"><RotateCcw size={22}/> REWORK WORKBENCH — {wo}</h2>
          <div className="text-xs text-slate-400 mt-1">{rw.RW_Type === 'BULK' ? 'BULK RW (JOB riêng; traceability root)' : 'RW 1-1 (Production JOB gốc)'}</div>
        </div>
        <div className="flex gap-2"><button disabled={busy || loading} onClick={refresh} className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 flex gap-2 items-center"><RefreshCcw size={16}/> Refresh</button>
          <button onClick={onClose} className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 flex gap-2 items-center"><ArrowLeft size={16}/> Thoát RW</button></div>
      </header>
      <div className="overflow-y-auto flex-1 p-4 md:p-6 custom-scrollbar max-w-6xl w-full mx-auto space-y-5">
        {error && <div role="alert" className="text-rose-300 bg-rose-900/20 border border-rose-500/50 rounded-xl p-3 flex gap-2 items-center"><AlertTriangle size={18}/>{error}</div>}
        {notice && <div role="status" className="text-emerald-300 bg-emerald-900/20 border border-emerald-500/40 rounded-xl p-3 flex gap-2 items-center"><CheckCircle size={18}/>{notice}</div>}
        <label className="block text-xs text-slate-400">Operator / Actor (tùy chọn)
          <input value={actor} maxLength={100} onChange={e=>setActor(e.target.value)} placeholder="Operator ID" className="mt-1 block w-full max-w-xs bg-slate-900 text-white rounded-lg border border-slate-700 p-2" />
        </label>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="bg-slate-900 border border-purple-500/30 rounded-xl p-4">
            <h3 className="font-black text-purple-200 mb-2">1. INPUT BATCH — RW NGUYÊN LÔ</h3>
            <p className="text-xs text-rose-300 mb-3">Thêm Batch là hành động không thể hoàn tác: Batch gốc chuyển FROZEN vĩnh viễn. Batch đã consumption bị Backend từ chối.</p>
            <div className="flex flex-wrap gap-2"><input aria-label="RW input batch" value={inputBatch} disabled={!active || busy} onChange={e=>setInputBatch(e.target.value)} onKeyDown={e=>e.key==='Enter' && addInput()} placeholder="Quét mã Batch (PN;serial)" className="flex-1 min-w-0 bg-slate-950 border border-slate-600 rounded-lg p-3 font-mono"/>
              <button type="button" onClick={()=>setScanner('input')} disabled={!active || busy} className="bg-purple-700 rounded-lg px-3"><ScanLine/></button>
              <button onClick={()=>addInput()} disabled={!active || busy || !inputBatch.trim()} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg px-4 font-bold">FROZEN + ADD</button>
            </div>
          </section>
          <section className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <h3 className="font-black text-purple-200 mb-2">2. ADDITIONAL RAW MATERIAL</h3>
            <p className="text-xs text-slate-400 mb-3">Barcode PN;QTY;UNIT;Serial. Áp dụng Model Config và quy tắc UOM đang có.</p>
            <div className="flex flex-wrap gap-2"><input aria-label="RW raw material barcode" value={rawBarcode} disabled={!active || busy} onChange={e=>setRawBarcode(e.target.value)} onKeyDown={e=>e.key==='Enter' && addRaw()} placeholder="PN;QTY;UNIT;SERIAL" className="flex-1 min-w-0 bg-slate-950 border border-slate-600 rounded-lg p-3 font-mono" />
              <button type="button" onClick={()=>setScanner('raw')} disabled={!active || busy} className="bg-slate-700 px-3 rounded-lg"><ScanLine/></button>
              <button onClick={()=>addRaw()} disabled={!active || busy || !rawBarcode.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 rounded-lg font-bold">GHI RAW</button>
            </div>
          </section>
        </div>
        {remainder && <section className="bg-amber-900/20 border border-amber-500/50 rounded-xl p-4 space-y-3">
          <h3 className="font-black text-amber-300">RAW MATERIAL — CHUYỂN PHẦN DƯ</h3>
          <p className="text-sm text-slate-300">RAW {remainder.PartNO} / Serial {remainder.SerialNumber}: đang thuộc WO {remainder.PreviousWO}, QTY hiện hành {remainder.PreviousQTY} {remainder.UOM}.</p>
          <label className="block text-xs text-slate-300">Remaining QTY muốn chuyển vào RW WO {wo}
            <input type="text" inputMode="decimal" value={remainingQty} onChange={e=>setRemainingQty(e.target.value)}
              className="mt-2 block w-full max-w-sm bg-slate-950 border border-amber-400/50 rounded-lg p-3 text-white font-mono" />
          </label>
          <div className="flex gap-2"><button disabled={busy || !active} onClick={transferRemainder} className="bg-amber-600 px-4 py-2 rounded-lg disabled:opacity-40">CHUYỂN PHẦN DƯ</button>
          <button onClick={()=>{setRemainder(null);setRemainingQty('');}} className="bg-slate-800 px-4 py-2 rounded-lg">HỦY</button></div>
        </section>}
        <section className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
          <h3 className="font-black text-purple-200">3. COMPLETED REWORK QTY — LŨY KẾ</h3>
          <div className="flex flex-wrap gap-3 items-end"><label className="text-xs text-slate-400">Tổng sản lượng đã sửa thành công
            <input type="number" min="0" step="1" value={completed} onChange={e=>setCompleted(e.target.value)} disabled={!active || busy} className="block mt-1 bg-slate-950 border border-slate-600 rounded-lg p-3 text-white font-mono text-xl w-48" />
          </label><button onClick={saveProgress} disabled={!active || busy || loading || !details} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg px-6 py-3 font-bold">LƯU TIẾN ĐỘ</button></div>
          <p className="text-xs text-slate-400">Đây là giá trị tích lũy, không phải số tăng thêm mỗi lần. Tem RW được cấp trong mục Batch Allocation → REWORK.</p>
          <div className="flex gap-2 flex-wrap"><button disabled={!active || busy || !details} onClick={()=>changeStatus('complete')} className="bg-slate-700 hover:bg-emerald-700 disabled:opacity-40 px-4 py-2 rounded-lg font-bold">HOÀN THÀNH RW</button>
          <button disabled={active || busy} onClick={()=>changeStatus('reopen')} className="bg-slate-700 hover:bg-purple-700 disabled:opacity-40 px-4 py-2 rounded-lg">MỞ LẠI RW</button></div>
        </section>
        <section><h3 className="text-sm font-black text-slate-300 mb-3 uppercase">4. Chi tiết / lịch sử Input & Output Batches</h3>
          {loading && !details ? <p className="text-slate-400">Đang tải hồ sơ...</p> : <RWDetailsTables data={details} />}
        </section>
      </div>
      {scanner && <BarcodeScanner onScan={handleScan} onClose={()=>setScanner('')} />}
    </div>
  );
};
export default ReworkWorkbench;
