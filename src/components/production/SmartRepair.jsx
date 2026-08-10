import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Unlink,
    Loader2,
    RefreshCcw,
    RotateCcw,
    Search,
    ShieldAlert,
    Truck,
    XCircle,
} from "lucide-react";

import {smartRepairAPI} from "../../api/smartRepairAPI";


const ResultMessage = ({ result }) => {
    if (!result) return null;

    const success = result.type === "success";

    return (
        <div
            className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                success
                    ? "border-emerald-700 bg-emerald-950/40 text-emerald-300"
                    : "border-red-800 bg-red-950/40 text-red-300"
            }`}
        >
            <div className="flex items-start gap-2">
                {success ? (
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                ) : (
                    <XCircle size={18} className="mt-0.5 shrink-0" />
                )}
                <span>{result.message}</span>
            </div>
        </div>
    );
};


const WarningList = ({ warnings = [] }) => {
    if (!warnings.length) return null;

    return (
        <div className="space-y-2">
            {warnings.map((warning, index) => (
                <div
                    key={`${warning}-${index}`}
                    className="flex items-start gap-2 rounded-lg border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-300"
                >
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <span>{warning}</span>
                </div>
            ))}
        </div>
    );
};


const InfoRow = ({ label, value, mono = false }) => (
    <div className="flex items-center justify-between gap-4 border-b border-slate-800 py-2.5 last:border-b-0">
        <span className="text-sm text-slate-500">{label}</span>
        <span
            className={`text-right text-sm font-bold text-slate-200 ${
                mono ? "font-mono" : ""
            }`}
        >
            {value ?? "-"}
        </span>
    </div>
);


const SmartRepair = () => {
    const navigate = useNavigate();

    const [activeMode, setActiveMode] = useState("assy");

    const [assyWO, setAssyWO] = useState("");
    const [assyState, setAssyState] = useState(null);
    const [assyLoading, setAssyLoading] = useState(false);
    const [assyResult, setAssyResult] = useState(null);

    const [originalWO, setOriginalWO] = useState("");
    const [outsourceState, setOutsourceState] = useState(null);
    const [outsourceLoading, setOutsourceLoading] = useState(false);
    const [outsourceResult, setOutsourceResult] = useState(null);


    const resetAssy = () => {
        setAssyState(null);
        setAssyResult(null);
    };


    const resetOutsource = () => {
        setOutsourceState(null);
        setOutsourceResult(null);
    };


    const inspectAssy = async () => {
        const value = assyWO.trim();

        if (!value) {
            setAssyResult({
                type: "error",
                message: "Vui lòng nhập Assy WO.",
            });
            return;
        }

        setAssyLoading(true);
        setAssyState(null);
        setAssyResult(null);

        try {
            const response = await smartRepairAPI.inspectAssyPacking(value);

            if (!response?.success) {
                setAssyResult({
                    type: "error",
                    message: response?.message || "Không tìm thấy linkage.",
                });
                return;
            }

            setAssyState(response.data);
        } catch (error) {
            setAssyResult({
                type: "error",
                message: error.message,
            });
        } finally {
            setAssyLoading(false);
        }
    };


    const executeAssyUndo = async () => {
        if (!assyState?.CanUndo) return;

        const confirmed = window.confirm(
            `Xóa linkage Assy WO ${assyState.AssyWO} → Packing WO ${assyState.PackingWO}?\n\n`
            + "Packing data sẽ được giữ nguyên. Sau đó hãy scan lại Assy/Packing đúng."
        );

        if (!confirmed) return;

        setAssyLoading(true);
        setAssyResult(null);

        try {
            const response = await smartRepairAPI.undoAssyPacking({
                AssyWO: assyState.AssyWO,
                PackingWO: assyState.PackingWO,
            });

            if (!response?.success) {
                setAssyResult({
                    type: "error",
                    message: response?.message || "Undo thất bại.",
                });
                return;
            }

            setAssyResult({
                type: "success",
                message: response.message,
            });
            setAssyState(null);
        } catch (error) {
            setAssyResult({
                type: "error",
                message: error.message,
            });
        } finally {
            setAssyLoading(false);
        }
    };


    const inspectOutsource = async () => {
        const value = originalWO.trim();

        if (!value) {
            setOutsourceResult({
                type: "error",
                message: "Vui lòng nhập Original WO.",
            });
            return;
        }

        setOutsourceLoading(true);
        setOutsourceState(null);
        setOutsourceResult(null);

        try {
            const response = await smartRepairAPI.inspectOutsource(value);

            if (!response?.success) {
                setOutsourceResult({
                    type: "error",
                    message: response?.message || "Không thể kiểm tra Outsource.",
                });
                return;
            }

            setOutsourceState(response.data);
        } catch (error) {
            setOutsourceResult({
                type: "error",
                message: error.message,
            });
        } finally {
            setOutsourceLoading(false);
        }
    };


    const executeOutsourceUndo = async () => {
        if (!outsourceState?.CanUndo) return;

        const confirmed = window.confirm(
            `Reset toàn bộ Quick Outsource Allocation của WO ${outsourceState.OriginalWO}?\n\n`
            + `Sẽ xóa ${outsourceState.ConsumptionCount} consumption row và WO ${outsourceState.OutsourceWO}.\n`
            + "Batches_Master KHÔNG bị xóa.\n\n"
            + "Sau đó hãy thực hiện In-house Allocation lại từ đầu."
        );

        if (!confirmed) return;

        setOutsourceLoading(true);
        setOutsourceResult(null);

        try {
            const response = await smartRepairAPI.undoOutsource({
                OriginalWO: outsourceState.OriginalWO,
            });

            if (!response?.success) {
                setOutsourceResult({
                    type: "error",
                    message: response?.message || "Undo thất bại.",
                });

                if (response?.data) {
                    setOutsourceState(response.data);
                }

                return;
            }

            setOutsourceResult({
                type: "success",
                message: response.message,
            });
            setOutsourceState(null);
        } catch (error) {
            setOutsourceResult({
                type: "error",
                message: error.message,
            });
        } finally {
            setOutsourceLoading(false);
        }
    };


    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
            <div className="h-16 border-b border-slate-800 bg-slate-900 px-6 flex items-center">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-bold text-slate-400 hover:text-white"
                >
                    <ArrowLeft size={18} />
                    BACK
                </button>

                <div className="ml-6 flex items-center gap-3">
                    <div className="rounded-lg bg-amber-500/10 p-2">
                        <RefreshCcw className="text-amber-400" size={21} />
                    </div>

                    <div>
                        <h1 className="text-xl font-black uppercase tracking-widest text-white">
                            Smart Repair
                        </h1>
                        <p className="text-xs text-slate-500">
                            Quick Undo & Start Again
                        </p>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-6xl p-6">
                <div className="mb-6 rounded-xl border border-amber-800/50 bg-amber-950/20 p-4">
                    <div className="flex items-start gap-3">
                        <ShieldAlert className="mt-0.5 shrink-0 text-amber-400" size={20} />
                        <div>
                            <div className="font-black text-amber-300">
                                QUICK UNDO
                            </div>
                            <p className="mt-1 text-sm leading-6 text-slate-400">
                                Dùng khi operator vừa nhập nhầm và phát hiện ngay.
                                Hệ thống chỉ reset đúng trạng thái của lỗi đã chọn,
                                sau đó thao tác lại từ đầu.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-900 p-2">
                    <button
                        onClick={() => setActiveMode("assy")}
                        className={`rounded-lg px-4 py-3 text-sm font-black transition ${
                            activeMode === "assy"
                                ? "bg-blue-600 text-white"
                                : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                        }`}
                    >
                        <Unlink size={17} className="mr-2 inline" />
                        WRONG ASSY ↔ PACKING
                    </button>

                    <button
                        onClick={() => setActiveMode("outsource")}
                        className={`rounded-lg px-4 py-3 text-sm font-black transition ${
                            activeMode === "outsource"
                                ? "bg-orange-600 text-white"
                                : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                        }`}
                    >
                        <Truck size={17} className="mr-2 inline" />
                        WRONG OUTSOURCE ALLOCATION
                    </button>
                </div>

                {activeMode === "assy" && (
                    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
                        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                            <div className="mb-5">
                                <h2 className="text-lg font-black text-white">
                                    Undo Assy / Packing Link
                                </h2>
                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Nhập Assy WO. Backend sẽ tự tìm Packing WO
                                    đang được link active.
                                </p>
                            </div>

                            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                                Assy WO
                            </label>

                            <input
                                autoFocus
                                value={assyWO}
                                onChange={(event) => {
                                    setAssyWO(event.target.value);
                                    resetAssy();
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") inspectAssy();
                                }}
                                placeholder="Scan / nhập Assy WO..."
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-4 font-mono text-lg text-white outline-none focus:border-blue-500"
                            />

                            <button
                                onClick={inspectAssy}
                                disabled={assyLoading}
                                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {assyLoading ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Search size={18} />
                                )}
                                CHECK CURRENT LINK
                            </button>

                            <div className="mt-4">
                                <ResultMessage result={assyResult} />
                            </div>
                        </section>

                        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                            {!assyState ? (
                                <div className="flex min-h-[320px] items-center justify-center text-center">
                                    <div>
                                        <Unlink size={44} className="mx-auto mb-3 text-slate-700" />
                                        <p className="text-sm text-slate-600">
                                            Current linkage sẽ hiển thị ở đây.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-4 flex items-center justify-between">
                                        <div>
                                            <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                                                Current Active Link
                                            </div>
                                            <div className="mt-1 text-lg font-black text-white">
                                                {assyState.AssyWO}
                                                <span className="mx-3 text-slate-600">→</span>
                                                {assyState.PackingWO}
                                            </div>
                                        </div>

                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-black ${
                                                assyState.CanUndo
                                                    ? "bg-emerald-500/10 text-emerald-400"
                                                    : "bg-red-500/10 text-red-400"
                                            }`}
                                        >
                                            {assyState.CanUndo ? "UNDO READY" : "BLOCKED"}
                                        </span>
                                    </div>

                                    <div className="rounded-xl border border-slate-800 bg-slate-950 px-4">
                                        <InfoRow label="Assy WO" value={assyState.AssyWO} mono />
                                        <InfoRow label="Packing WO" value={assyState.PackingWO} mono />
                                        <InfoRow label="Packing Model" value={assyState.PackingModelNO} />
                                        <InfoRow label="Packing Status" value={assyState.PackingStatus} />
                                        <InfoRow label="Linked Time" value={assyState.LinkedTime} />
                                    </div>

                                    <div className="mt-4">
                                        <WarningList warnings={assyState.Warnings} />
                                    </div>

                                    <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-6 text-slate-400">
                                        <div className="font-bold text-slate-300">Undo sẽ làm:</div>
                                        <div>• Xóa active row trong AssyPackingLinkage.</div>
                                        <div>• Không xóa Packing production data.</div>
                                        <div>• Cho phép scan lại Assy/Packing đúng.</div>
                                    </div>

                                    <button
                                        onClick={executeAssyUndo}
                                        disabled={!assyState.CanUndo || assyLoading}
                                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-4 font-black text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-600"
                                    >
                                        {assyLoading ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <RotateCcw size={18} />
                                        )}
                                        UNDO LINK & START AGAIN
                                    </button>
                                </>
                            )}
                        </section>
                    </div>
                )}

                {activeMode === "outsource" && (
                    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
                        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                            <div className="mb-5">
                                <h2 className="text-lg font-black text-white">
                                    Undo Outsource Allocation
                                </h2>
                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Nhập WO gốc dương, ví dụ 777777. Không nhập WO âm.
                                </p>
                            </div>

                            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                                Original WO
                            </label>

                            <input
                                value={originalWO}
                                onChange={(event) => {
                                    setOriginalWO(event.target.value);
                                    resetOutsource();
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") inspectOutsource();
                                }}
                                placeholder="Scan / nhập Original WO..."
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-4 font-mono text-lg text-white outline-none focus:border-orange-500"
                            />

                            <button
                                onClick={inspectOutsource}
                                disabled={outsourceLoading}
                                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-3.5 font-black text-white hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {outsourceLoading ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Search size={18} />
                                )}
                                CHECK OUTSOURCE STATE
                            </button>

                            <div className="mt-4">
                                <ResultMessage result={outsourceResult} />
                            </div>
                        </section>

                        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                            {!outsourceState ? (
                                <div className="flex min-h-[320px] items-center justify-center text-center">
                                    <div>
                                        <Truck size={44} className="mx-auto mb-3 text-slate-700" />
                                        <p className="text-sm text-slate-600">
                                            Outsource state sẽ hiển thị ở đây.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-4 flex items-center justify-between">
                                        <div>
                                            <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                                                Quick Outsource State
                                            </div>
                                            <div className="mt-1 text-lg font-black text-white">
                                                {outsourceState.OriginalWO}
                                                <span className="mx-3 text-slate-600">→</span>
                                                <span className="text-orange-400">
                                                    {outsourceState.OutsourceWO}
                                                </span>
                                            </div>
                                        </div>

                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-black ${
                                                outsourceState.CanUndo
                                                    ? "bg-emerald-500/10 text-emerald-400"
                                                    : "bg-red-500/10 text-red-400"
                                            }`}
                                        >
                                            {outsourceState.CanUndo ? "UNDO READY" : "BLOCKED"}
                                        </span>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div className="rounded-xl border border-slate-800 bg-slate-950 px-4">
                                            <InfoRow label="Original WO" value={outsourceState.OriginalWO} mono />
                                            <InfoRow label="Outsource WO" value={outsourceState.OutsourceWO} mono />
                                            <InfoRow label="Consumption Rows" value={outsourceState.ConsumptionCount} />
                                            <InfoRow label="Non-current Rows" value={outsourceState.NonCurrentConsumptionCount} />
                                        </div>

                                        <div className="rounded-xl border border-slate-800 bg-slate-950 px-4">
                                            <InfoRow label="Output Batches" value={outsourceState.OutputBatchCount} />
                                            <InfoRow
                                                label="Oldest Age"
                                                value={
                                                    outsourceState.OldestAgeMinutes == null
                                                        ? "-"
                                                        : `${outsourceState.OldestAgeMinutes} min`
                                                }
                                            />
                                            <InfoRow label="Quick Undo Limit" value={`${outsourceState.MaxUndoMinutes} min`} />
                                            <InfoRow label="Looks Like [OS]" value={outsourceState.LooksLikeOutsource ? "YES" : "NO"} />
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <WarningList warnings={outsourceState.Warnings} />
                                    </div>

                                    {outsourceState.Consumptions?.length > 0 && (
                                        <div className="mt-5 overflow-hidden rounded-xl border border-slate-800">
                                            <div className="border-b border-slate-800 bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-500">
                                                Batch Ownership To Be Removed
                                            </div>

                                            <div className="max-h-52 overflow-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="sticky top-0 bg-slate-900 text-xs uppercase text-slate-500">
                                                        <tr>
                                                            <th className="px-4 py-2">Batch</th>
                                                            <th className="px-4 py-2">PN</th>
                                                            <th className="px-4 py-2 text-right">QTY</th>
                                                            <th className="px-4 py-2">Current</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {outsourceState.Consumptions.map((row) => (
                                                            <tr key={row.ID} className="border-t border-slate-800">
                                                                <td className="px-4 py-2 font-mono text-slate-200">
                                                                    {row.Batch}
                                                                </td>
                                                                <td className="px-4 py-2 text-slate-400">
                                                                    {row.PartNO}
                                                                </td>
                                                                <td className="px-4 py-2 text-right font-bold">
                                                                    {row.QTY}
                                                                </td>
                                                                <td className="px-4 py-2">
                                                                    {row.IsCurrent ? (
                                                                        <span className="text-emerald-400">YES</span>
                                                                    ) : (
                                                                        <span className="text-red-400">NO</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-6 text-slate-400">
                                        <div className="font-bold text-slate-300">Undo sẽ làm:</div>
                                        <div>• Xóa consumption rows thuộc WO {outsourceState.OutsourceWO}.</div>
                                        <div>• Xóa synthetic Outsource WO {outsourceState.OutsourceWO}.</div>
                                        <div>• Không xóa Batches_Master.</div>
                                        <div>• Batch được giải phóng để In-house Allocation lại.</div>
                                    </div>

                                    <button
                                        onClick={executeOutsourceUndo}
                                        disabled={!outsourceState.CanUndo || outsourceLoading}
                                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-4 font-black text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-600"
                                    >
                                        {outsourceLoading ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <RotateCcw size={18} />
                                        )}
                                        RESET OUTSOURCE & START AGAIN
                                    </button>
                                </>
                            )}
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
};


export default SmartRepair;
