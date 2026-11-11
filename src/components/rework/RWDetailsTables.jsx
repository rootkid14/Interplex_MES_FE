import React from 'react';

/** Read-only evidence display shared by Production RW Workbench and Traceability. */
const RWDetailsTables = ({ data }) => {
  if (!data) return <p className="text-slate-400 p-3">Không có hồ sơ RW.</p>;
  const inputs = Array.isArray(data.InputBatches) ? data.InputBatches : [];
  const outputs = Array.isArray(data.OutputBatchesReworked) ? data.OutputBatchesReworked : [];
  const materials = Array.isArray(data.RawMaterials) ? data.RawMaterials : [];
  const section = (title, records, isInput) => (
    <section className="rounded-xl border border-slate-700 overflow-hidden bg-slate-900/70 mb-4" key={title}>
      <h4 className="font-black text-sm text-purple-200 bg-purple-500/10 px-4 py-3 border-b border-slate-700">{title} ({records.length})</h4>
      {records.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left whitespace-nowrap text-slate-200">
            <thead className="text-slate-400 bg-slate-800/70"><tr><th className="p-3">Batch</th><th className="p-3">PN</th><th className="p-3 text-right">QTY</th><th className="p-3">Lifecycle</th></tr></thead>
            <tbody className="divide-y divide-slate-800">{records.map((row, i) => (
              <tr key={`${row.Batch}-${i}`} className="hover:bg-slate-800/50">
                <td className={`p-3 font-mono font-bold ${row.IsFrozen ? 'line-through text-slate-500' : 'text-blue-300'}`}>{row.Batch}</td>
                <td className="p-3">{row.PartNO || '-'}</td>
                <td className="p-3 text-right font-mono">{isInput ? row.InputQty : row.QTY}</td>
                <td className="p-3">{row.IsFrozen ? <span className="text-rose-400 font-black">FROZEN</span> : <span className="text-emerald-400">ACTIVE</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <p className="text-slate-500 italic p-4">Chưa có Batch.</p>}
    </section>
  );
  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-3 items-center mb-4 text-xs">
        <span className="font-bold px-3 py-1.5 rounded bg-purple-500/20 text-purple-200 border border-purple-500/30">{data.RW_Type === 'BULK' ? 'BULK REWORK — ROOT' : 'REWORK 1-1'}</span>
        <span className="text-slate-400">WO: <b className="text-white">{data.WO}</b></span>
        <span className="text-slate-400">Status: <b className="text-white">{data.RW_Status}</b></span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-xs">
        {[
          ['Input Qty', data.InputQty], ['Completed', data.CompletedQty],
          ['RW Allocated', data.ReworkedAllocated], ['RW Available', data.ReworkedAvailable],
        ].map(([label, value]) => <div key={label} className="bg-slate-800 p-3 rounded-lg border border-slate-700"><span className="text-slate-400 block">{label}</span><b className="text-lg text-white">{value ?? '-'}</b></div>)}
      </div>
      {section('INPUT BATCHES', inputs, true)}
      {section('OUTPUT BATCHES (REWORKED)', outputs, false)}
      <section className="bg-slate-900/70 rounded-xl border border-slate-700 overflow-hidden">
        <h4 className="font-black text-sm text-slate-300 px-4 py-3 bg-slate-800 border-b border-slate-700">ADDITIONAL RAW MATERIAL ({materials.length})</h4>
        {materials.length ? <div className="overflow-x-auto max-h-48"><table className="w-full text-xs text-left text-slate-300 whitespace-nowrap">
          <thead className="bg-slate-800 text-slate-400"><tr><th className="p-3">PN</th><th className="p-3">Serial</th><th className="p-3 text-right">Net QTY</th><th className="p-3">UOM</th></tr></thead>
          <tbody>{materials.map((row, index) => <tr key={row.id || index} className="border-t border-slate-800"><td className="p-3">{row.pn || '-'}</td><td className="p-3 font-mono">{row.serial || '-'}</td><td className="p-3 text-right">{row.qty ?? '-'}</td><td className="p-3">{row.uom || '-'}</td></tr>)}</tbody>
        </table></div> : <p className="p-4 text-sm text-slate-500">Chưa có RAW được ghi nhận.</p>}
      </section>
      {data.RW_Type === 'BULK' && <p className="text-xs text-slate-500 mt-3">Bulk RW là điểm bắt đầu của cây phả hệ; nguồn gốc Batch vẫn xem được trong danh sách Input ở đây.</p>}
    </div>
  );
};

export default RWDetailsTables;
