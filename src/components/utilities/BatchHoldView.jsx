import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList,
  Clock3, Download, FilterX, LockKeyhole, RefreshCcw, Search, ShieldAlert, ShieldCheck, Unlock,
} from 'lucide-react';
import useAuthStore from '../../store/AuthStore';
import { useNavigate } from 'react-router-dom';
import { qcBatchAPI } from '../../api/qcBatchAPI';
import './BatchHoldWorkspace.css';

const PAGE_SIZE = 20;
const EMPTY_FILTERS = Object.freeze({
  Keyword: '', SearchBy: 'ALL', Scope: 'ALL', HoldFrom: '', HoldTo: '', Sort: 'NEWEST',
});
const permitted = (user) => [user?.dept, user?.role].some((value) =>
  ['qc', 'it', 'quality control'].includes(String(value || '').trim().toLowerCase()));

const errorText = (error) => {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? detail : (error?.message || 'Không thể hoàn tất thao tác.');
};

const when = (value) => value ? String(value).replace('T', ' ').replace(/\.\d+/, '') + ' UTC' : '—';

function Info({ title, value }) {
  return <div className="qchw-info"><span>{title}</span><strong title={String(value ?? '')}>{value ?? '—'}</strong></div>;
}

const BatchHoldView = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [code, setCode] = useState('');
  const [detail, setDetail] = useState(null);
  const [reason, setReason] = useState('');
  // Password exists in component memory ONLY, never in persistent store.
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [searchBy, setSearchBy] = useState('ALL');
  const [scope, setScope] = useState('ALL');
  const [holdFrom, setHoldFrom] = useState('');
  const [holdTo, setHoldTo] = useState('');
  const [sortOrder, setSortOrder] = useState('NEWEST');
  const [appliedFilters, setAppliedFilters] = useState({ ...EMPTY_FILTERS });
  const [exporting, setExporting] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState('');

  const actorId = Number(user?.id);
  const allowed = permitted(user);
  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const draftFilters = {
    Keyword: filter.trim(), SearchBy: searchBy, Scope: scope,
    HoldFrom: holdFrom, HoldTo: holdTo, Sort: sortOrder,
  };
  const filtersDirty = JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters);
  const dateError = !!(holdFrom && holdTo && holdFrom > holdTo);

  const loadHeld = useCallback(async (nextPage, nextFilters, credential) => {
    if (!credential || !Number.isSafeInteger(actorId) || actorId <= 0) {
      setListError('Nhập mật khẩu QC/IT hợp lệ để tải danh sách đang Hold.');
      return false;
    }
    setLoadingList(true);
    setListError('');
    try {
      const res = await qcBatchAPI.heldList({
        ActorID: actorId, Password: credential, ...nextFilters,
        Page: nextPage, PageSize: PAGE_SIZE,
      });
      if (!res.success) throw new Error(res.message || 'Không tải được danh sách.');
      const data = res.data || {};
      setRows(Array.isArray(data.Items) ? data.Items : []);
      setTotal(Number(data.Total) || 0);
      setPage(nextPage);
      setAppliedFilters({ ...nextFilters });
      setUnlocked(true);
      setLastRefreshed(new Date().toLocaleTimeString('vi-VN'));
      return true;
    } catch (error) {
      setListError(errorText(error));
      if ([401, 403].includes(error?.response?.status)) {
        setUnlocked(false);
        setRows([]);
        setTotal(0);
      }
      return false;
    } finally {
      setLoadingList(false);
    }
  }, [actorId]);

  // Any change of operator invalidates the unlocked list.
  useEffect(() => {
    setUnlocked(false);
    setRows([]);
    setTotal(0);
    setDetail(null);
    setPassword('');
  }, [actorId]);

  const lookup = async (raw) => {
    const selected = String(raw ?? code).trim();
    if (!selected) return;
    setCode(selected);
    setBusy(true); setFeedback(null); setDetail(null);
    try {
      const response = await qcBatchAPI.status(selected);
      if (!response.success) throw new Error(response.message || 'Không tìm thấy Batch.');
      setDetail(response.data);
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally { setBusy(false); }
  };

  const act = async (hold) => {
    if (!detail || !allowed || busy) return;
    if (detail.IsFrozen) {
      setFeedback({ type: 'error', text: 'RW FROZEN là vĩnh viễn; không thể QC Unhold.' });
      return;
    }
    if (reason.trim().length < 3 || !password || !Number.isSafeInteger(actorId)) {
      setFeedback({ type: 'error', text: 'Nhập lý do ít nhất 3 ký tự và mật khẩu tài khoản QC/IT.' });
      return;
    }
    if (!window.confirm(`Xác nhận ${hold ? 'QC HOLD' : 'QC UNHOLD'} toàn bộ Batch ${detail.Batch}?`)) return;
    setBusy(true); setFeedback(null);
    try {
      const response = await qcBatchAPI.change({
        Batch: detail.Batch, Hold: hold, Reason: reason.trim(),
        ActorID: actorId, Password: password,
      });
      if (!response.success) throw new Error(response.message || 'Thao tác thất bại.');
      setFeedback({ type: 'success', text: `${hold ? 'HOLD' : 'UNHOLD'} ${detail.Batch} thành công.` });
      setReason('');
      const refreshed = await qcBatchAPI.status(detail.Batch);
      if (refreshed.success) setDetail(refreshed.data);
      // Same credential, but never allow frontend state to be authoritative.
      if (unlocked) {
        const ok = await loadHeld(page, appliedFilters, password);
        if (ok && !hold && rows.length === 1 && page > 1) {
          await loadHeld(page - 1, appliedFilters, password);
        }
      }
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally { setBusy(false); }
  };

  const applyFilters = async (event) => {
    event?.preventDefault();
    if (dateError) {
      setListError('Ngày Hold bắt đầu không được sau ngày kết thúc.');
      return;
    }
    await loadHeld(1, draftFilters, password);
  };

  const clearFilters = async () => {
    setFilter(''); setSearchBy('ALL'); setScope('ALL');
    setHoldFrom(''); setHoldTo(''); setSortOrder('NEWEST');
    setListError('');
    if (password) await loadHeld(1, { ...EMPTY_FILTERS }, password);
  };

  const exportCsv = async () => {
    if (!unlocked || !password || exporting || loadingList || filtersDirty || dateError || total === 0) return;
    setExporting(true); setListError('');
    try {
      const blob = await qcBatchAPI.exportHeld({
        ActorID: actorId, Password: password, ...appliedFilters,
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      anchor.download = `QC_Held_Batches_${stamp}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (error) {
      setListError(errorText(error));
    } finally { setExporting(false); }
  };

  if (!allowed) return <main className="qchw-workspace"><div className="qchw-denied" role="alert">
    <ShieldAlert size={28} /> Chỉ tài khoản QC/IT được phép truy cập workspace này.
  </div></main>;

  return <main className="qchw-workspace">
    <header className="qchw-header">
      <div><div className="qchw-eyebrow"><ShieldCheck size={15} /> QUALITY CONTROL / UTILITIES</div>
        <h1><ShieldAlert size={29} /> Batch Hold Workspace</h1>
        <p>Quản lý lô hàng tạm giữ bởi QC. RW FROZEN là trạng thái vĩnh viễn, không thể thả bằng công cụ này.</p>
      </div>
      <div className="qchw-head-actions">
        <button type="button" className="qchw-back" onClick={() => navigate('/workstation')}>← Màn hình chính</button>
        <div className="qchw-head-stat"><strong>{unlocked ? total : '—'}</strong><span>Batch đang QC Hold</span></div>
      </div>
    </header>

    {feedback && <div className={`qchw-feedback ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
      {feedback.type === 'error' ? <AlertCircle size={18}/> : <CheckCircle2 size={18}/>}{feedback.text}
    </div>}

    <div className="qchw-columns">
      <section className="qchw-card qchw-action-panel" aria-label="Thao tác QC Hold">
        <div className="qchw-card-head"><div><span className="qchw-step">PANEL 01</span><h2>Hold / Unhold Batch</h2></div><LockKeyhole size={23} /></div>
        <form onSubmit={(event) => { event.preventDefault(); lookup(); }}>
          <label htmlFor="qchw-code">Batch ID / Barcode</label>
          <div className="qchw-inline">
            <input id="qchw-code" autoFocus value={code} onChange={(event) => setCode(event.target.value)}
              placeholder="Scan hoặc nhập Batch" autoComplete="off" spellCheck={false}/>
            <button type="submit" disabled={busy || !code.trim()} className="qchw-btn qchw-btn-blue" title="Tra cứu Batch"><Search size={17}/> Tra cứu</button>
          </div>
        </form>

        {detail ? <div className="qchw-selected">
          <div className="qchw-selected-heading"><strong>Batch được chọn</strong><span className={`qchw-status ${detail.IsFrozen ? 'frozen' : detail.IsQCHeld ? 'held' : 'released'}`}>
            {detail.IsFrozen ? 'RW FROZEN' : detail.IsQCHeld ? 'QC HOLD' : 'AVAILABLE'}
          </span></div>
          <div className="qchw-info-grid"><Info title="BATCH" value={detail.Batch}/><Info title="PART NO" value={detail.PartNO}/>
            <Info title="QTY" value={detail.QTY}/><Info title="BORN WO" value={detail.BornWO}/></div>
          {detail.IsFrozen && <div className="qchw-notice danger"><ShieldAlert size={18}/> Lô này đã RW FROZEN vĩnh viễn. Không thể Unhold.</div>}
          {detail.HasConsumption && <div className="qchw-notice warning"><AlertCircle size={18}/> Batch có lịch sử consumption; QC Hold không thu hồi việc sử dụng trước đây.</div>}
        </div> : <div className="qchw-placeholder"><Search size={24}/><span>Scan Batch hoặc chọn một dòng ở panel bên phải để xem chi tiết.</span></div>}

        <div className="qchw-rule"/>
        <label htmlFor="qchw-reason">Lý do Hold / Unhold <em>*</em></label>
        <textarea id="qchw-reason" rows={3} maxLength={500} value={reason}
          placeholder="Nhập lý do xử lý chất lượng (tối thiểu 3 ký tự)"
          onChange={(event) => setReason(event.target.value)}/>
        <label htmlFor="qchw-password">Xác thực mật khẩu QC / IT <em>*</em></label>
        <input id="qchw-password" type="password" autoComplete="off" value={password}
          placeholder="Mật khẩu tài khoản hiện tại" onChange={(event) => {
            setPassword(event.target.value); setUnlocked(false); setRows([]); setTotal(0); setListError('');
          }}/>
        <small className="qchw-helper">Mật khẩu chỉ giữ trong bộ nhớ trang này; dùng để xác thực thao tác và tải danh sách QC Hold.</small>
        <div className="qchw-actions">
          <button type="button" className="qchw-btn qchw-btn-amber"
            disabled={busy || !detail || !!detail?.IsFrozen || !!detail?.IsQCHeld || reason.trim().length < 3 || !password}
            onClick={() => act(true)}><LockKeyhole size={17}/> HOLD</button>
          <button type="button" className="qchw-btn qchw-btn-green"
            disabled={busy || !detail || !!detail?.IsFrozen || !detail?.IsQCHeld || reason.trim().length < 3 || !password}
            onClick={() => act(false)}><Unlock size={17}/> UNHOLD</button>
        </div>

        {!!detail?.Audit?.length && <details className="qchw-history"><summary>Lịch sử Hold/Unhold ({detail.Audit.length})</summary>
          <div className="qchw-history-scroll"><table><thead><tr><th>Action</th><th>Người thực hiện</th><th>Lý do</th><th>UTC</th></tr></thead><tbody>
            {detail.Audit.map((entry, index) => <tr key={index}><td>{entry.Action}</td><td>{entry.ActorName || entry.ActorID}</td>
              <td>{entry.Reason}</td><td>{when(entry.CreatedAtUTC)}</td></tr>)}
          </tbody></table></div>
        </details>}
      </section>

      <section className="qchw-card qchw-list-panel" aria-label="Danh sách Batch đang QC Hold">
        <div className="qchw-card-head"><div><span className="qchw-step">PANEL 02</span><h2><ClipboardList size={21}/> Currently Held Batches</h2></div>
          <div className="qchw-list-actions">
            <button type="button" className="qchw-btn qchw-btn-export" onClick={exportCsv}
              title="Xuất toàn bộ Batch khớp bộ lọc đã áp dụng, không chỉ trang hiện tại"
              disabled={!unlocked || !password || loadingList || exporting || filtersDirty || dateError || total === 0}>
              <Download size={16}/>{exporting ? 'Đang xuất…' : 'Export CSV'}</button>
            <button type="button" className="qchw-icon-btn" aria-label="Làm mới danh sách"
              title="Làm mới danh sách" disabled={loadingList || !password}
              onClick={() => loadHeld(page, appliedFilters, password)}><RefreshCcw size={18}/></button>
          </div></div>
        <form className="qchw-filters" onSubmit={applyFilters}>
          <div className="qchw-filter-search">
            <label htmlFor="qchw-search-field">Tìm theo</label>
            <select id="qchw-search-field" value={searchBy} onChange={(event) => setSearchBy(event.target.value)}>
              <option value="ALL">Batch / PN / WO</option>
              <option value="BATCH">Batch ID</option>
              <option value="PARTNO">Part Number</option>
              <option value="WO">Born WO</option>
            </select>
          </div>
          <div className="qchw-filter-keyword">
            <label htmlFor="qchw-search-term">Từ khóa</label>
            <input id="qchw-search-term" placeholder="Nhập Batch, PartNO hoặc WO"
              value={filter} maxLength={100} onChange={(event) => setFilter(event.target.value)}/>
          </div>
          <div>
            <label htmlFor="qchw-filter-scope">Trạng thái</label>
            <select id="qchw-filter-scope" value={scope} onChange={(event) => setScope(event.target.value)}>
              <option value="ALL">Tất cả QC Hold</option>
              <option value="QC_ONLY">QC Hold (không RW Frozen)</option>
              <option value="RW_FROZEN">QC Hold + RW Frozen</option>
            </select>
          </div>
          <div>
            <label htmlFor="qchw-filter-sort">Sắp xếp</label>
            <select id="qchw-filter-sort" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
              <option value="NEWEST">Hold gần nhất</option>
              <option value="OLDEST">Hold lâu nhất</option>
              <option value="BATCH">Batch ID (A → Z)</option>
            </select>
          </div>
          <div>
            <label htmlFor="qchw-date-from">Hold từ (UTC)</label>
            <input id="qchw-date-from" type="date" value={holdFrom} onChange={(event) => setHoldFrom(event.target.value)}/>
          </div>
          <div>
            <label htmlFor="qchw-date-to">Hold đến (UTC)</label>
            <input id="qchw-date-to" type="date" min={holdFrom || undefined}
              value={holdTo} onChange={(event) => setHoldTo(event.target.value)}/>
          </div>
          <div className="qchw-filter-actions">
            <button type="submit" className="qchw-btn qchw-btn-blue" disabled={loadingList || !password || dateError}>
              <Search size={16}/> Áp dụng</button>
            <button type="button" className="qchw-btn qchw-btn-clear" onClick={clearFilters} disabled={loadingList}>
              <FilterX size={16}/> Xóa lọc</button>
          </div>
          {dateError && <div className="qchw-filter-hint error" role="alert">Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.</div>}
          {filtersDirty && <div className="qchw-filter-hint">Bộ lọc đã thay đổi — nhấn <strong>Áp dụng</strong> trước khi xuất CSV.</div>}
        </form>
        <div className="qchw-list-meta"><span>{unlocked ? `${total} Batch khớp bộ lọc đang Hold` : 'Danh sách yêu cầu xác thực QC/IT'}</span>
          <span><Clock3 size={13}/> {lastRefreshed ? `Cập nhật: ${lastRefreshed}` : 'Chưa tải'}</span></div>
        {listError && <div role="alert" className="qchw-feedback error"><AlertCircle size={16}/>{listError}</div>}
        {!unlocked ? <div className="qchw-empty"><LockKeyhole size={32}/><strong>Danh sách được bảo vệ</strong>
          <span>Nhập mật khẩu ở panel trái, sau đó nhấn Tìm hoặc Làm mới để xem toàn bộ Batch đang QC Hold.</span></div>
          : loadingList ? <div className="qchw-empty"><RefreshCcw size={30}/><span>Đang tải danh sách…</span></div>
          : rows.length === 0 ? <div className="qchw-empty"><ShieldCheck size={32}/><strong>Không có Batch phù hợp</strong>
            <span>Hiện không tìm thấy Batch đang QC Hold theo bộ lọc này.</span></div>
          : <div className="qchw-table-wrap"><table className="qchw-table"><thead><tr>
            <th>Batch ID</th><th>PartNO</th><th>Born WO</th><th>QTY</th><th>Hold Since (UTC)</th><th>Trạng thái</th>
          </tr></thead><tbody>
            {rows.map((row) => <tr key={row.Batch} className={detail?.Batch === row.Batch ? 'selected' : ''}>
              <td><button type="button" className="qchw-row-link" title="Xem và xử lý Batch" onClick={() => lookup(row.Batch)}>{row.Batch}</button></td>
              <td>{row.PartNO || '—'}</td><td>{row.BornWO ?? '—'}</td><td className="qchw-num">{row.QTY}</td>
              <td className="qchw-date">{when(row.QCHeldAtUTC)}</td>
              <td><span className={`qchw-status ${row.IsFrozen ? 'frozen' : 'held'}`}>{row.IsFrozen ? 'RW FROZEN + HOLD' : 'QC HOLD'}</span></td>
            </tr>)}
          </tbody></table></div>}
        {unlocked && <div className="qchw-pagination"><span>Trang {page} / {maxPage} · {total} Batch</span>
          <div><button type="button" disabled={loadingList || page <= 1} onClick={() => loadHeld(page - 1, appliedFilters, password)}><ChevronLeft size={17}/> Trước</button>
            <button type="button" disabled={loadingList || page >= maxPage} onClick={() => loadHeld(page + 1, appliedFilters, password)}>Sau <ChevronRight size={17}/></button></div>
        </div>}
      </section>
    </div>
  </main>;
};

export default BatchHoldView;
