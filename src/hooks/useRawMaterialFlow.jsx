import React, { useRef, useState } from 'react';
import { workstationAPI } from '../api/workstationApi';

// Phase C: strict RAW code. The four fields are already on the supplier label.
// Quantity must never be typed manually on first scan.
const QTY_FORMAT = /^\d{1,14}(?:\.\d{1,4})?$/;
const decimalScaled = (value) => {
  if (!QTY_FORMAT.test(value)) throw new Error('QTY không đúng định dạng DECIMAL(18,4).');
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, '0') || '0');
};

export function parseRawBarcode(code) {
  const raw = String(code || '').trim();
  const parts = raw.split(';').map(x => x.trim());
  if (parts.length !== 4 || parts.some(x => !x)) {
    throw new Error('Tem RAW phải đúng 4 trường: PN;QTY;UOM;SERIAL.');
  }
  const [pn, qty, uom, serial] = parts;
  if (raw.length > 500 || pn.length > 100 || serial.length > 100 || uom.length > 10) {
    throw new Error('PN, Serial, UOM hoặc barcode quá dài.');
  }
  if (/[\x00-\x1f\x7f]/.test(raw)) throw new Error('RAW barcode chứa ký tự không hợp lệ.');
  if (decimalScaled(qty) <= 0n) throw new Error('QTY phải lớn hơn 0.');
  return { raw, pn, qty, uom: uom.toUpperCase(), serial };
}

const serverMessage = (error) => {
  const detail = error?.response?.data?.detail || error?.response?.data?.message;
  return typeof detail === 'string' ? detail : 'Không thể liên hệ server RAW Material.';
};

export default function useRawMaterialFlow({ wo, rules, onRefresh, onError }) {
  const [remainder, setRemainder] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false);

  const tryHandle = async (code) => {
    const raw = String(code || '').trim();
    const pn = raw.split(';', 1)[0].trim();
    const matches = (Array.isArray(rules) ? rules : []).filter(r =>
      String(r?.partNumber || '').trim().toUpperCase() === pn.toUpperCase());
    if (!matches.length) return false;
    if (busy.current) { onError('Đang xử lý mã RAW trước đó.'); return true; }
    if (matches.length !== 1) { onError('Model có nhiều RAW rules trùng Part Number.'); return true; }
    const rule = matches[0];
    try {
      const label = parseRawBarcode(raw);
      const expected = String(rule.expected_uom || '').trim().toUpperCase();
      if (!expected) throw new Error('Scan Rule chưa có expected_uom. Hãy lưu lại Model Config và tải lại JOB.');
      if (label.uom !== expected) throw new Error(`UOM sai: yêu cầu ${expected}, đã quét ${label.uom}.`);
      busy.current = true;
      const response = await workstationAPI.logRawMaterial(wo, label.raw);
      if (response.success) {
        await onRefresh();
      } else if ((response.data?.Code || response.data?.Action) === 'RAW_REMAINDER_REQUIRED') {
        setRemainder({ ...response.data, barcode: label.raw });
        setQuantity('');
        setModalError('');
      } else {
        onError(response.message || 'RAW Material không hợp lệ.');
      }
    } catch (error) {
      onError(error?.response ? serverMessage(error) : (error?.message || serverMessage(error)));
    } finally { busy.current = false; }
    return true;
  };

  const confirmTransfer = async () => {
    if (!remainder || submitting || busy.current) return;
    try {
      const value = quantity.trim();
      if (decimalScaled(value) <= 0n || decimalScaled(value) > decimalScaled(String(remainder.PreviousQTY))) {
        throw new Error(`Remaining QTY phải lớn hơn 0 và không vượt quá ${remainder.PreviousQTY} ${remainder.UOM}.`);
      }
      setSubmitting(true);
      busy.current = true;
      const response = await workstationAPI.transferRawMaterial(wo, remainder.barcode,
        value, remainder.CurrentUsageID);
      if (!response.success) throw new Error(response.message || 'Chuyển RAW remainder thất bại.');
      await onRefresh();
      setRemainder(null);
      setQuantity('');
      setModalError('');
    } catch (error) {
      setModalError(error?.response ? serverMessage(error) : (error.message || 'Lỗi khi chuyển RAW remainder.'));
    } finally {
      setSubmitting(false);
      busy.current = false;
    }
  };

  const modal = remainder ? (
    <div className="absolute inset-0 z-[85] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-slate-800 w-full max-w-md rounded-xl p-5 border border-amber-500/50 shadow-2xl text-white">
        <h2 className="font-bold text-lg text-amber-300 mb-3">RAW Material đã thuộc WO khác</h2>
        <div className="bg-slate-900 border border-slate-700 rounded p-3 text-sm space-y-1 break-words">
          <div>PN: <b>{remainder.PartNO}</b></div>
          <div>Serial: <b>{remainder.SerialNumber}</b></div>
          <div>WO trước: <b>{remainder.PreviousWO}</b></div>
          <div>WO hiện tại: <b>{remainder.RequestedWO}</b></div>
          <div>Số lượng WO trước đang giữ: <b>{remainder.PreviousQTY} {remainder.UOM}</b></div>
        </div>
        <label className="block text-sm text-slate-300 mt-4 mb-1">Remaining QTY chuyển sang WO mới ({remainder.UOM})</label>
        <input type="text" inputMode="decimal" autoFocus disabled={submitting}
          className="w-full rounded bg-slate-950 border border-amber-500/60 px-3 py-3 font-mono text-center text-lg"
          placeholder="Nhập phần dư" value={quantity} onChange={e => setQuantity(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && confirmTransfer()} />
        {modalError && <p className="text-red-400 text-sm mt-2">{modalError}</p>}
        <p className="text-xs text-slate-400 mt-2">Hệ thống sẽ xác thực lại số dư trước khi chuyển. Không tự cộng thêm QTY từ tem.</p>
        <div className="flex gap-3 mt-4">
          <button disabled={submitting} onClick={() => { setRemainder(null); setModalError(''); }}
            className="flex-1 rounded bg-slate-600 py-3 disabled:opacity-50">HỦY</button>
          <button disabled={submitting} onClick={confirmTransfer}
            className="flex-1 rounded bg-amber-600 py-3 font-bold disabled:opacity-50">
            {submitting ? 'ĐANG CHUYỂN...' : 'XÁC NHẬN'}</button>
        </div>
      </div>
    </div>
  ) : null;

  return { tryHandle, modal, modalOpen: Boolean(remainder) };
}
