import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Search,
    Package,
    GitMerge,
    FileBox,
    Database,
    ChevronRight,
    ChevronDown,
    AlertTriangle,
    ArrowUpRight,
    CheckSquare,
    Square,
    Loader2,
    ArrowLeftRight,
    ArrowDownRight,
    Download,
    ShieldAlert,
    Truck,
    RotateCcw,
    Box,
} from 'lucide-react';

import { traceabilityApi } from '../../api/traceabilityAPI';


const exportToCSV = (data, filename) => {
    if (!Array.isArray(data) || data.length === 0) return;

    const headers = Object.keys(data[0]);

    const csvRows = [
        headers.join(','),
        ...data.map((row) => (
            headers
                .map((header) => {
                    const value = row[header] ?? '';
                    return `"${String(value).replace(/"/g, '""')}"`;
                })
                .join(',')
        )),
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob(
        ['\ufeff' + csvString],
        { type: 'text/csv;charset=utf-8;' },
    );

    const link = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);

    link.href = objectUrl;
    link.download = `${filename}.csv`;
    link.click();

    URL.revokeObjectURL(objectUrl);
};


const WOTreeNode = ({
    node,
    level = 0,
    selectedWOs,
    onToggleWO,
    onViewDetails,
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const hasChildren = Boolean(
        node.children && node.children.length > 0,
    );

    const isSelected = selectedWOs.includes(node.WO);

    let displayConfig = {
        icon: FileBox,
        iconColor: 'text-blue-400',
        label: `WO: ${node.WO}`,
        bgColor: 'bg-slate-800/40',
        borderColor: 'border-l-transparent',
        textColor: 'text-slate-200',
    };

    if (node.WO < 0) {
        displayConfig = {
            icon: Truck,
            iconColor: 'text-orange-400',
            label: `OutSource: ${node.WO}`,
            bgColor: 'bg-orange-500/10',
            borderColor: 'border-l-orange-500',
            textColor: 'text-orange-400',
        };
    } else if (node.Type === 'Rework') {
        displayConfig = {
            icon: RotateCcw,
            iconColor: 'text-purple-400',
            label: `Rework: ${node.WO}`,
            bgColor: 'bg-purple-500/10',
            borderColor: 'border-l-purple-500',
            textColor: 'text-purple-400',
        };
    } else if (node.Type === 'Packing') {
        displayConfig = {
            icon: Box,
            iconColor: 'text-emerald-400',
            label: `Packing: ${node.WO}`,
            bgColor: 'bg-emerald-500/10',
            borderColor: 'border-l-emerald-500',
            textColor: 'text-emerald-400',
        };
    }

    const activeBg = (
        isSelected
            ? 'bg-rose-500/20'
            : displayConfig.bgColor
    );

    const activeBorder = (
        isSelected
            ? 'border-l-rose-500'
            : displayConfig.borderColor
    );

    const activeText = (
        isSelected
            ? 'text-rose-400'
            : displayConfig.textColor
    );

    const activeIconColor = (
        isSelected
            ? 'text-rose-400'
            : displayConfig.iconColor
    );

    const NodeIcon = displayConfig.icon;
    const modelValue = node.Model || node.ModelNO;

    return (
        <div className="w-full">
            <div
                className={`
                    flex items-center py-3 pr-4 pl-2
                    border-b border-slate-700/50
                    hover:bg-slate-700/30 transition-all
                    group border-l-4
                    ${activeBg}
                    ${activeBorder}
                `}
                style={{
                    paddingLeft: `${level * 24 + 8}px`,
                }}
            >
                <div className="w-6 flex justify-center mr-1">
                    {hasChildren ? (
                        <button
                            type="button"
                            onClick={() => (
                                setIsExpanded((previous) => !previous)
                            )}
                            className="text-slate-400 hover:text-white"
                        >
                            {isExpanded ? (
                                <ChevronDown size={18} />
                            ) : (
                                <ChevronRight size={18} />
                            )}
                        </button>
                    ) : (
                        <div className="w-[1px] h-full bg-slate-600 ml-3 opacity-30" />
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => onToggleWO(node.WO)}
                    className="mr-3 text-slate-400 hover:text-rose-400 transition-colors"
                >
                    {isSelected ? (
                        <CheckSquare
                            size={20}
                            className="text-rose-500"
                        />
                    ) : (
                        <Square size={20} />
                    )}
                </button>

                <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0">
                    <div className="flex items-center gap-2">
                        <NodeIcon
                            size={16}
                            className={activeIconColor}
                        />

                        <span className={`font-bold tracking-wide ${activeText}`}>
                            {displayConfig.label}
                        </span>
                    </div>

                    {modelValue && (
                        <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded truncate">
                            Model: {modelValue}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button
                        type="button"
                        onClick={() => (
                            onViewDetails('batches', node.WO)
                        )}
                        className="
                            flex items-center gap-1.5 px-3 py-1.5
                            bg-slate-800 hover:bg-emerald-600/20
                            text-slate-300 hover:text-emerald-400
                            text-xs font-bold rounded border
                            border-slate-600 hover:border-emerald-500/50
                            transition-colors
                        "
                    >
                        <Package size={14} />
                        Batches
                    </button>

                    <button
                        type="button"
                        onClick={() => (
                            onViewDetails('materials', node.WO)
                        )}
                        className="
                            flex items-center gap-1.5 px-3 py-1.5
                            bg-slate-800 hover:bg-amber-600/20
                            text-slate-300 hover:text-amber-400
                            text-xs font-bold rounded border
                            border-slate-600 hover:border-amber-500/50
                            transition-colors
                        "
                    >
                        <Database size={14} />
                        Materials
                    </button>

                    <button
                        type="button"
                        onClick={() => (
                            onViewDetails('defects', node.WO)
                        )}
                        className="
                            flex items-center gap-1.5 px-3 py-1.5
                            bg-slate-800 hover:bg-rose-600/20
                            text-slate-300 hover:text-rose-400
                            text-xs font-bold rounded border
                            border-slate-600 hover:border-rose-500/50
                            transition-colors
                        "
                    >
                        <ShieldAlert size={14} />
                        Defects
                    </button>
                </div>
            </div>

            {isExpanded && hasChildren && (
                <div className="relative">
                    <div
                        className="
                            absolute top-0 bottom-0
                            border-l border-slate-600/30
                            border-dashed z-0
                        "
                        style={{
                            left: `${level * 24 + 19}px`,
                        }}
                    />

                    <div className="relative z-10">
                        {node.children.map((childNode, index) => (
                            <WOTreeNode
                                key={`${childNode.WO}-${index}`}
                                node={childNode}
                                level={level + 1}
                                selectedWOs={selectedWOs}
                                onToggleWO={onToggleWO}
                                onViewDetails={onViewDetails}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


const ReverseTraceNode = ({
    node,
    level = 0,
    onViewDetails,
    onTraceBox,
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const children = node.children || [];
    const boxes = node.boxes || [];
    const viaBatches = node.viaBatches || [];

    const hasContent = (
        children.length > 0
        || boxes.length > 0
        || viaBatches.length > 0
    );

    const modelValue = node.Model || node.ModelNO || 'Unknown';

    return (
        <div className="relative">
            <div
                className={`
                    bg-slate-800/80 border rounded-xl mb-3 overflow-hidden
                    ${
                        node.cycleDetected
                            ? 'border-red-500/70'
                            : 'border-slate-700'
                    }
                `}
                style={{
                    marginLeft: `${level * 24}px`,
                }}
            >
                <div className="flex items-start gap-3 p-4">
                    <button
                        type="button"
                        onClick={() => (
                            setIsExpanded((previous) => !previous)
                        )}
                        className="mt-0.5 text-slate-400 hover:text-white"
                        disabled={!hasContent}
                    >
                        {hasContent ? (
                            isExpanded ? (
                                <ChevronDown size={18} />
                            ) : (
                                <ChevronRight size={18} />
                            )
                        ) : (
                            <span className="block w-[18px]" />
                        )}
                    </button>

                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-blue-300 font-mono">
                                WO: {node.WO}
                            </span>

                            <span className="text-xs bg-slate-900 px-2 py-1 rounded text-slate-400">
                                {modelValue}
                            </span>

                            {node.Type && (
                                <span className="
                                    text-xs bg-purple-500/10
                                    border border-purple-500/30
                                    px-2 py-1 rounded text-purple-300
                                ">
                                    {node.Type}
                                </span>
                            )}

                            {node.WO < 0 && (
                                <span className="
                                    text-xs bg-orange-500/10
                                    border border-orange-500/30
                                    px-2 py-1 rounded text-orange-300
                                ">
                                    Outsource
                                </span>
                            )}
                        </div>

                        {viaBatches.length > 0 && (
                            <div className="mt-3 space-y-2">
                                <p className="text-xs uppercase font-bold text-slate-500">
                                    Batch dẫn tới WO này
                                </p>

                                {viaBatches.map((edge, index) => (
                                    <div
                                        key={`${edge.Batch}-${index}`}
                                        className="
                                            bg-slate-900/70
                                            border border-slate-700
                                            rounded-lg p-3
                                        "
                                    >
                                        <div className="flex flex-wrap justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-emerald-300 font-mono font-bold break-all">
                                                    {edge.Batch}
                                                </p>

                                                <p className="text-xs text-slate-500 mt-1">
                                                    PN: {edge.PartNO || 'N/A'}
                                                </p>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <p className="text-emerald-400 font-black">
                                                    {edge.UsedQTY ?? 0} PCS
                                                </p>

                                                <p className="text-xs text-slate-500">
                                                    Born: {edge.BornQTY ?? 0} PCS
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-2 flex flex-wrap gap-2 items-center">
                                            {edge.IsCurrent ? (
                                                <span className="
                                                    text-xs px-2 py-1 rounded
                                                    bg-amber-500/10 text-amber-400
                                                    border border-amber-500/30
                                                ">
                                                    Đang giữ remainder
                                                </span>
                                            ) : (
                                                <span className="
                                                    text-xs px-2 py-1 rounded
                                                    bg-slate-700 text-slate-400
                                                    border border-slate-600
                                                ">
                                                    Đã chốt nhánh
                                                </span>
                                            )}

                                            {edge.UsedTime && (
                                                <span className="text-xs text-slate-500">
                                                    {edge.UsedTime}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {boxes.length > 0 && (
                            <div className="mt-3">
                                <p className="text-xs uppercase font-bold text-rose-400 mb-2">
                                    Box sinh ra từ WO này
                                </p>

                                <div className="space-y-2">
                                    {boxes.map((boxItem) => (
                                        <div
                                            key={boxItem.BoxID}
                                            className="
                                                flex flex-wrap items-center
                                                justify-between gap-2
                                                bg-rose-500/10
                                                border border-rose-500/30
                                                rounded-lg px-3 py-2
                                            "
                                        >
                                            <span className="font-mono text-sm text-rose-300">
                                                {boxItem.BoxID}
                                            </span>

                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => (
                                                        onViewDetails(
                                                            'box_items',
                                                            boxItem.BoxID,
                                                        )
                                                    )}
                                                    className="
                                                        text-xs bg-slate-700
                                                        hover:bg-emerald-600
                                                        text-white px-3 py-1.5
                                                        rounded transition-colors
                                                    "
                                                >
                                                    XEM ITEMS
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => (
                                                        onTraceBox(boxItem.BoxID)
                                                    )}
                                                    className="
                                                        text-xs bg-slate-700
                                                        hover:bg-blue-600
                                                        text-white px-3 py-1.5
                                                        rounded transition-colors
                                                    "
                                                >
                                                    XEM PHẢ HỆ
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {node.cycleDetected && (
                            <p className="mt-3 text-red-400 text-sm font-bold">
                                Phát hiện vòng lặp dữ liệu tại WO này.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {isExpanded && children.length > 0 && (
                <div className="relative">
                    <div
                        className="
                            absolute top-0 bottom-3
                            border-l border-dashed border-slate-600
                        "
                        style={{
                            left: `${level * 24 + 12}px`,
                        }}
                    />

                    {children.map((childNode, index) => (
                        <ReverseTraceNode
                            key={`${node.WO}-${childNode.WO}-${index}`}
                            node={childNode}
                            level={level + 1}
                            onViewDetails={onViewDetails}
                            onTraceBox={onTraceBox}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};


const TraceabilityView = () => {
    const { t } = useTranslation();

    const [searchMode, setSearchMode] = useState('BOX');
    const [searchInput, setSearchInput] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [targetBoxId, setTargetBoxId] = useState(null);
    const [treeData, setTreeData] = useState(null);
    const [selectedWOs, setSelectedWOs] = useState([]);
    const [detailPanel, setDetailPanel] = useState(null);


    const executeForwardTrace = async (boxId) => {
        setIsSearching(true);
        setTreeData(null);
        setSelectedWOs([]);
        setDetailPanel(null);
        setErrorMsg('');

        try {
            setTargetBoxId(boxId);

            const response = await traceabilityApi.boxForwardTrace(
                boxId,
            );

            if (!response.success) {
                throw new Error(
                    response.message
                    || 'Không tìm thấy thông tin cấu thành Box này.',
                );
            }

            setTreeData(response.data);
        } catch (error) {
            setErrorMsg(
                error.message
                || 'Lỗi kết nối đến máy chủ truy xuất.',
            );
        } finally {
            setIsSearching(false);
        }
    };


    const executeWOTrace = async (wo) => {
        setIsSearching(true);
        setTreeData(null);
        setSelectedWOs([]);
        setDetailPanel(null);
        setErrorMsg('');

        try {
            setTargetBoxId(wo);

            const response = await traceabilityApi.woTrace(wo);

            if (!response.success) {
                throw new Error(
                    response.message
                    || 'Không tìm thấy thông tin WO này.',
                );
            }

            setTreeData(response.data);
            handleViewDetails('batches', wo);
        } catch (error) {
            setErrorMsg(
                error.message
                || 'Lỗi kết nối đến máy chủ truy xuất WO.',
            );
        } finally {
            setIsSearching(false);
        }
    };


    const handleSearch = async (event) => {
        if (event) event.preventDefault();

        const query = searchInput.trim();

        if (!query) return;

        if (searchMode === 'BOX') {
            executeForwardTrace(query);
            return;
        }

        if (searchMode === 'WO') {
            executeWOTrace(query);
            return;
        }

        setIsSearching(true);
        setErrorMsg('');
        setTreeData(null);
        setSelectedWOs([]);
        setDetailPanel(null);
        setTargetBoxId(null);

        try {
            const response = (
                await traceabilityApi.searchBoxByProduct(query)
            );

            if (!response.success) {
                throw new Error(response.message);
            }

            const {
                boxes,
                warning,
            } = response.data;

            setDetailPanel({
                type: 'product_search',
                loading: false,
                data: {
                    boxes,
                    warning,
                },
                title: `Kết quả tra cứu '${query}'`,
            });
        } catch (error) {
            setErrorMsg(
                error.message
                || 'Lỗi truy xuất mã sản phẩm.',
            );
        } finally {
            setIsSearching(false);
        }
    };


    const handleToggleWO = (woId) => {
        setSelectedWOs((previous) => (
            previous.includes(woId)
                ? previous.filter((id) => id !== woId)
                : [...previous, woId]
        ));
    };


    const handleViewDetails = async (type, payload) => {
        setDetailPanel({
            type,
            loading: true,
            data: [],
            title: 'Đang tải dữ liệu...',
        });

        try {
            let apiCall;
            let title = '';

            if (type === 'batches') {
                apiCall = traceabilityApi.getBatchesByWO(payload);
                title = `Input Batches (WO: ${payload})`;
            } else if (type === 'materials') {
                apiCall = traceabilityApi.getMaterialsByWO(payload);
                title = `Raw Materials (WO: ${payload})`;
            } else if (type === 'defects') {
                apiCall = traceabilityApi.getDefectsByWO(payload);
                title = `Defects Log (WO: ${payload})`;
            } else if (type === 'box_items') {
                apiCall = traceabilityApi.getItemsByBox(payload);
                title = `Products in Box: ${payload}`;
            } else {
                throw new Error('Loại dữ liệu không được hỗ trợ.');
            }

            const response = await apiCall;

            if (!response.success) {
                throw new Error(
                    response.message || 'Không có dữ liệu.',
                );
            }

            setDetailPanel({
                type,
                loading: false,
                data: response.data || [],
                title,
            });
        } catch (error) {
            setDetailPanel({
                type,
                loading: false,
                data: [],
                title: `Lỗi: ${error.message}`,
            });
        }
    };


    const handleExecuteReverseTrace = async () => {
        if (selectedWOs.length === 0) return;

        setDetailPanel({
            type: 'reverse_graph',
            loading: true,
            data: null,
            title: (
                `Đang quét toàn hệ thống cho `
                + `${selectedWOs.length} WO(s)...`
            ),
        });

        try {
            const response = (
                await traceabilityApi.reverseTrace(selectedWOs)
            );

            if (!response.success) {
                throw new Error(
                    response.message
                    || 'Thất bại khi quét ngược.',
                );
            }

            setDetailPanel({
                type: 'reverse_graph',
                loading: false,
                data: response.data || {
                    graph: [],
                    boxes: [],
                    affectedWOs: [],
                },
                title: 'KẾT QUẢ KHOANH VÙNG THEO NHÁNH',
            });
        } catch (error) {
            setDetailPanel({
                type: 'reverse_graph',
                loading: false,
                data: null,
                title: `Lỗi truy xuất: ${error.message}`,
            });
        }
    };


    const flattenTree = (node, result = []) => {
        result.push({
            Lệnh_Sản_Xuất: node.WO,
            Mã_Sản_Phẩm: (
                node.Model
                || node.ModelNO
                || 'Unknown'
            ),
            Loại_Lệnh: node.Type || 'Unknown',
        });

        if (node.children) {
            node.children.forEach((childNode) => (
                flattenTree(childNode, result)
            ));
        }

        return result;
    };


    const flattenReverseGraph = (
        node,
        parentWO = null,
        result = [],
    ) => {
        const edgeRows = (
            node.viaBatches && node.viaBatches.length > 0
                ? node.viaBatches
                : [null]
        );

        edgeRows.forEach((edge) => {
            result.push({
                ParentWO: parentWO ?? '',
                WO: node.WO,
                Model: node.Model || node.ModelNO || 'Unknown',
                Type: node.Type || 'Unknown',
                Batch: edge?.Batch ?? '',
                PartNO: edge?.PartNO ?? '',
                BornQTY: edge?.BornQTY ?? '',
                UsedQTY: edge?.UsedQTY ?? '',
                IsCurrent: edge?.IsCurrent ?? '',
                UsedTime: edge?.UsedTime ?? '',
                Boxes: (node.boxes || [])
                    .map((item) => item.BoxID)
                    .join(' | '),
            });
        });

        (node.children || []).forEach((childNode) => (
            flattenReverseGraph(
                childNode,
                node.WO,
                result,
            )
        ));

        return result;
    };


    const handleExportTree = () => {
        if (!treeData) return;

        const flatData = Array.isArray(treeData)
            ? treeData.flatMap((node) => flattenTree(node))
            : flattenTree(treeData);

        exportToCSV(
            flatData,
            `TraceTree_${targetBoxId}`,
        );
    };


    const handleExportDetails = () => {
        if (!detailPanel?.data) return;

        if (detailPanel.type === 'reverse_graph') {
            const graphRows = (
                detailPanel.data.graph || []
            ).flatMap((rootNode) => (
                flattenReverseGraph(rootNode)
            ));

            exportToCSV(
                graphRows,
                'Reverse_Trace_Graph',
            );

            return;
        }

        if (Array.isArray(detailPanel.data)) {
            exportToCSV(
                detailPanel.data,
                `Export_${detailPanel.type}_Data`,
            );
        }
    };


    const hasExportableDetails = (() => {
        if (!detailPanel || detailPanel.type === 'product_search') {
            return false;
        }

        if (detailPanel.type === 'reverse_graph') {
            return Boolean(
                detailPanel.data
                && Array.isArray(detailPanel.data.graph)
                && detailPanel.data.graph.length > 0,
            );
        }

        return (
            Array.isArray(detailPanel.data)
            && detailPanel.data.length > 0
        );
    })();


    return (
        <div className="h-full flex flex-col bg-slate-900 overflow-hidden">
            <div className="
                bg-slate-800 border-b border-slate-700
                p-4 sm:p-6 shrink-0 z-10 shadow-lg
            ">
                <div className="max-w-4xl">
                    <h1 className="text-2xl font-black text-white mb-1 flex items-center gap-2">
                        <GitMerge className="text-blue-400" />
                        Traceability
                    </h1>

                    <p className="text-slate-400 text-sm mb-6">
                        {t('traceability.Explaination')}
                    </p>

                    <form
                        onSubmit={handleSearch}
                        className="flex flex-col sm:flex-row gap-3"
                    >
                        <div className="
                            flex bg-slate-900 rounded-xl
                            border border-slate-600 p-1 flex-wrap
                        ">
                            <button
                                type="button"
                                onClick={() => setSearchMode('BOX')}
                                className={`
                                    px-4 py-2 rounded-lg text-sm
                                    font-bold transition-all
                                    ${
                                        searchMode === 'BOX'
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'text-slate-400 hover:text-white'
                                    }
                                `}
                            >
                                {(
                                    t('traceability.tracebybox')
                                    || 'Mã Thùng'
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setSearchMode('PRODUCT')}
                                className={`
                                    px-4 py-2 rounded-lg text-sm
                                    font-bold transition-all
                                    ${
                                        searchMode === 'PRODUCT'
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'text-slate-400 hover:text-white'
                                    }
                                `}
                            >
                                {(
                                    t('traceability.tracebyprd')
                                    || 'Mã Sản Phẩm'
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setSearchMode('WO')}
                                className={`
                                    px-4 py-2 rounded-lg text-sm
                                    font-bold transition-all
                                    ${
                                        searchMode === 'WO'
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'text-slate-400 hover:text-white'
                                    }
                                `}
                            >
                                Trace by WO
                            </button>
                        </div>

                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(event) => (
                                    setSearchInput(event.target.value)
                                )}
                                placeholder={
                                    searchMode === 'BOX'
                                        ? (
                                            t('traceability.EnterBoxID')
                                            || 'Nhập mã Thùng...'
                                        )
                                        : searchMode === 'PRODUCT'
                                            ? (
                                                t('traceability.EnterProductID')
                                                || 'Nhập mã Sản Phẩm...'
                                            )
                                            : 'Enter JOB NO'
                                }
                                className="
                                    w-full bg-slate-900
                                    border border-slate-600
                                    text-white pl-4 pr-12 py-3.5
                                    rounded-xl focus:ring-2
                                    focus:ring-blue-500 outline-none
                                    font-mono text-lg
                                "
                            />

                            <Search className="absolute right-4 top-4 text-slate-500" />
                        </div>

                        <button
                            type="submit"
                            disabled={
                                isSearching
                                || !searchInput.trim()
                            }
                            className="
                                bg-blue-600 hover:bg-blue-500
                                disabled:bg-slate-700 text-white
                                px-8 py-3.5 rounded-xl font-bold
                                transition-all flex items-center
                                justify-center gap-2 min-w-[140px]
                            "
                        >
                            {isSearching ? (
                                <Loader2
                                    size={20}
                                    className="animate-spin"
                                />
                            ) : (
                                t('traceability.Trace')
                            )}
                        </button>
                    </form>

                    {errorMsg && (
                        <p className="
                            text-red-400 mt-3 font-semibold
                            flex items-center gap-1.5
                        ">
                            <AlertTriangle size={16} />
                            {errorMsg}
                        </p>
                    )}
                </div>
            </div>

            <div className="
                flex-1 flex flex-col lg:flex-row
                overflow-hidden bg-slate-950/50
            ">
                <div className="
                    w-full lg:w-7/12 flex flex-col
                    border-r border-slate-700
                    bg-slate-800/30 overflow-hidden
                ">
                    <div className="
                        p-4 bg-slate-800/80
                        border-b border-slate-700
                        flex justify-between items-center shrink-0
                    ">
                        <div>
                            <h2 className="font-bold text-white flex items-center gap-2">
                                <ArrowDownRight
                                    className="text-emerald-400"
                                    size={18}
                                />
                                {t('traceability.HierachyTree')}
                            </h2>

                            {targetBoxId && (
                                <p className="text-xs text-slate-400 mt-1">
                                    Phân tích:{' '}
                                    <span className="
                                        font-mono text-emerald-300
                                        bg-emerald-900/30 px-1 rounded
                                    ">
                                        {targetBoxId}
                                    </span>
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {treeData && (
                                <button
                                    type="button"
                                    onClick={handleExportTree}
                                    className="
                                        p-2 bg-emerald-600/20
                                        hover:bg-emerald-500/40
                                        text-emerald-400 rounded-lg
                                        transition-colors border
                                        border-emerald-500/30
                                    "
                                    title="Xuất Cây Phả Hệ"
                                >
                                    <Download size={18} />
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={handleExecuteReverseTrace}
                                disabled={selectedWOs.length === 0}
                                className={`
                                    flex items-center gap-2 px-4 py-2
                                    rounded-lg font-bold text-sm
                                    transition-all
                                    ${
                                        selectedWOs.length > 0
                                            ? `
                                                bg-rose-600 hover:bg-rose-500
                                                text-white shadow-lg
                                                shadow-rose-500/20
                                            `
                                            : `
                                                bg-slate-700 text-slate-500
                                                cursor-not-allowed
                                            `
                                    }
                                `}
                            >
                                <ArrowUpRight size={16} />
                                {t('traceability.defectLocalization')}
                                {(
                                    selectedWOs.length > 0
                                        ? ` (${selectedWOs.length})`
                                        : ''
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="
                        flex-1 overflow-auto
                        custom-scrollbar p-2 pb-10
                    ">
                        {!treeData ? (
                            <div className="
                                h-full flex flex-col
                                items-center justify-center
                                text-slate-500 opacity-50
                                p-8 text-center
                            ">
                                <GitMerge
                                    size={64}
                                    className="mb-4 text-slate-600"
                                />
                                <p>Nhập từ khóa và bấm Truy Vết.</p>
                            </div>
                        ) : (
                            <div className="
                                inline-block min-w-full
                                bg-slate-900 border
                                border-slate-700 rounded-lg
                                overflow-hidden animate-fade-in
                                shadow-2xl
                            ">
                                {Array.isArray(treeData) ? (
                                    treeData.map((node, index) => (
                                        <WOTreeNode
                                            key={`root-${index}`}
                                            node={node}
                                            selectedWOs={selectedWOs}
                                            onToggleWO={handleToggleWO}
                                            onViewDetails={handleViewDetails}
                                        />
                                    ))
                                ) : (
                                    <WOTreeNode
                                        node={treeData}
                                        selectedWOs={selectedWOs}
                                        onToggleWO={handleToggleWO}
                                        onViewDetails={handleViewDetails}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="
                    w-full lg:w-5/12 flex flex-col
                    bg-slate-900 overflow-hidden
                ">
                    <div className="
                        p-4 bg-slate-800/80
                        border-b border-slate-700
                        flex justify-between items-center shrink-0
                    ">
                        <h2 className="font-bold text-white flex items-center gap-2">
                            <ArrowLeftRight
                                className="text-blue-400"
                                size={18}
                            />
                            {t('traceability.details')}
                        </h2>

                        {hasExportableDetails && (
                            <button
                                type="button"
                                onClick={handleExportDetails}
                                className="
                                    flex items-center gap-1.5
                                    px-3 py-1.5 bg-blue-600/20
                                    hover:bg-blue-500/40
                                    text-blue-400 text-xs font-bold
                                    rounded border border-blue-500/30
                                    transition-colors
                                "
                            >
                                <Download size={14} />
                                Xuất CSV
                            </button>
                        )}
                    </div>

                    <div className="
                        flex-1 overflow-y-auto
                        p-4 custom-scrollbar
                    ">
                        {!detailPanel ? (
                            <div className="
                                h-full flex flex-col
                                items-center justify-center
                                text-slate-500 opacity-50
                                p-8 text-center border-2
                                border-dashed border-slate-700
                                rounded-xl
                            ">
                                <Database
                                    size={48}
                                    className="mb-3 text-slate-600"
                                />

                                <p>
                                    Bấm xem Batches/Materials ở danh sách bên trái,
                                    <br />
                                    hoặc thực hiện Quét Khoanh Vùng để xem kết quả.
                                </p>
                            </div>
                        ) : (
                            <div className="animate-fade-in">
                                <h3 className={`
                                    text-lg font-bold mb-4
                                    flex items-center gap-2
                                    pb-2 border-b
                                    ${
                                        detailPanel.type === 'reverse_graph'
                                            ? 'text-rose-400 border-rose-500/30'
                                            : detailPanel.type === 'defects'
                                                ? 'text-red-400 border-red-500/30'
                                                : 'text-blue-400 border-blue-500/30'
                                    }
                                `}>
                                    {detailPanel.type === 'reverse_graph' && (
                                        <AlertTriangle size={20} />
                                    )}

                                    {detailPanel.type === 'defects' && (
                                        <ShieldAlert size={20} />
                                    )}

                                    {[
                                        'batches',
                                        'materials',
                                        'box_items',
                                    ].includes(detailPanel.type) && (
                                        <Database size={20} />
                                    )}

                                    {detailPanel.title}
                                </h3>

                                {detailPanel.loading ? (
                                    <div className="
                                        flex justify-center items-center
                                        py-10 text-blue-400
                                    ">
                                        <Loader2
                                            size={32}
                                            className="animate-spin"
                                        />
                                    </div>
                                ) : (
                                    <div className="
                                        bg-slate-800 border
                                        border-slate-700 rounded-xl
                                        overflow-hidden
                                    ">
                                        {[
                                            'batches',
                                            'materials',
                                            'box_items',
                                        ].includes(detailPanel.type) && (
                                            detailPanel.data.length === 0 ? (
                                                <p className="
                                                    p-4 text-slate-400
                                                    italic text-center
                                                ">
                                                    Không có dữ liệu cho mục này.
                                                </p>
                                            ) : detailPanel.type === 'batches' ? (
                                                <div className="overflow-x-auto custom-scrollbar">
                                                    <table className="w-full text-left border-collapse whitespace-nowrap">
                                                        <thead className="
                                                            bg-slate-900/50
                                                            border-b border-slate-700
                                                            text-slate-400 text-xs uppercase
                                                        ">
                                                            <tr>
                                                                <th className="p-3">Part Number</th>
                                                                <th className="p-3">Mã Batch</th>
                                                                <th className="p-3">WO khai sinh</th>
                                                                <th className="p-3 text-right">Born QTY</th>
                                                                <th className="p-3 text-right">Used QTY</th>
                                                                <th className="p-3 text-center">Trạng thái</th>
                                                                <th className="p-3">Thời gian</th>
                                                            </tr>
                                                        </thead>

                                                        <tbody className="
                                                            text-sm text-slate-300
                                                            divide-y divide-slate-700/50
                                                        ">
                                                            {detailPanel.data.map((row, index) => (
                                                                <tr
                                                                    key={`${row.Batch}-${index}`}
                                                                    className="hover:bg-slate-700/20"
                                                                >
                                                                    <td className="p-3 font-bold">
                                                                        {row.PartNO || 'N/A'}
                                                                    </td>

                                                                    <td className="p-3 font-mono text-blue-300">
                                                                        {row.Batch}
                                                                    </td>

                                                                    <td className="p-3 font-mono text-purple-300">
                                                                        {row.BornWO ?? 'N/A'}
                                                                    </td>

                                                                    <td className="p-3 text-right font-mono text-slate-400">
                                                                        {row.BornQTY ?? 0}
                                                                    </td>

                                                                    <td className="p-3 text-right font-mono font-bold text-emerald-400">
                                                                        {row.QTY ?? 0}
                                                                    </td>

                                                                    <td className="p-3 text-center">
                                                                        {row.IsCurrent ? (
                                                                            <span className="
                                                                                inline-flex px-2 py-1 rounded
                                                                                text-xs font-bold
                                                                                bg-amber-500/10 text-amber-400
                                                                                border border-amber-500/30
                                                                            ">
                                                                                ĐANG GIỮ PHẦN DƯ
                                                                            </span>
                                                                        ) : (
                                                                            <span className="
                                                                                inline-flex px-2 py-1 rounded
                                                                                text-xs font-bold
                                                                                bg-slate-700 text-slate-400
                                                                                border border-slate-600
                                                                            ">
                                                                                ĐÃ CHỐT
                                                                            </span>
                                                                        )}
                                                                    </td>

                                                                    <td className="p-3 text-xs text-slate-400">
                                                                        {row.Time || 'N/A'}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <table className="w-full text-left border-collapse">
                                                    <thead className="
                                                        bg-slate-900/50
                                                        border-b border-slate-700
                                                        text-slate-400 text-xs uppercase
                                                    ">
                                                        <tr>
                                                            {detailPanel.type !== 'box_items' && (
                                                                <th className="p-3">
                                                                    Part Number
                                                                </th>
                                                            )}

                                                            <th className="p-3">
                                                                Mã Vật Tư / Code
                                                            </th>

                                                            {detailPanel.type !== 'box_items' && (
                                                                <th className="p-3 text-right">
                                                                    Số Lượng
                                                                </th>
                                                            )}
                                                        </tr>
                                                    </thead>

                                                    <tbody className="
                                                        text-sm text-slate-300
                                                        divide-y divide-slate-700/50
                                                    ">
                                                        {detailPanel.data.map((row, index) => (
                                                            <tr
                                                                key={index}
                                                                className="hover:bg-slate-700/20"
                                                            >
                                                                {detailPanel.type !== 'box_items' && (
                                                                    <td className="p-3 font-bold">
                                                                        {row.PartNO || 'N/A'}
                                                                    </td>
                                                                )}

                                                                <td className="p-3 font-mono text-blue-300">
                                                                    {(
                                                                        row.Batch
                                                                        || row.RawMaterial
                                                                        || row.Product
                                                                    )}
                                                                </td>

                                                                {detailPanel.type !== 'box_items' && (
                                                                    <td className="p-3 text-right font-mono">
                                                                        {row.QTY ?? 0}
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )
                                        )}

                                        {detailPanel.type === 'defects' && (
                                            detailPanel.data.length === 0 ? (
                                                <p className="
                                                    p-4 text-emerald-400
                                                    italic text-center font-bold
                                                    bg-emerald-900/10
                                                ">
                                                    WO này không có báo lỗi (NG) nào.
                                                </p>
                                            ) : (
                                                <div className="overflow-x-auto custom-scrollbar">
                                                    <table className="w-full text-left border-collapse whitespace-nowrap">
                                                        <thead className="
                                                            bg-slate-900/50
                                                            border-b border-slate-700
                                                            text-slate-400 text-xs uppercase
                                                        ">
                                                            <tr>
                                                                <th className="p-3">Thời gian</th>
                                                                <th className="p-3">Part Number</th>
                                                                <th className="p-3 text-center">Mã Lỗi</th>
                                                                <th className="p-3 text-center">Trạm</th>
                                                                <th className="p-3">Ghi chú</th>
                                                                <th className="p-3 text-right">SL (QTY)</th>
                                                            </tr>
                                                        </thead>

                                                        <tbody className="
                                                            text-sm text-slate-300
                                                            divide-y divide-slate-700/50
                                                        ">
                                                            {detailPanel.data.map((row, index) => (
                                                                <tr
                                                                    key={index}
                                                                    className="hover:bg-slate-700/20 text-rose-300"
                                                                >
                                                                    <td className="p-3 text-slate-400 text-xs">
                                                                        {row.Time || 'N/A'}
                                                                    </td>

                                                                    <td className="p-3 font-bold">
                                                                        {row.PartNO}
                                                                    </td>

                                                                    <td className="p-3 text-center">
                                                                        <span className="
                                                                            bg-rose-900/40
                                                                            text-rose-400 px-2 py-1
                                                                            rounded font-mono text-xs
                                                                            border border-rose-800/50
                                                                        ">
                                                                            {row.DefectCode || 'N/A'}
                                                                        </span>
                                                                    </td>

                                                                    <td className="p-3 text-center">
                                                                        <span className="
                                                                            bg-slate-800 text-slate-300
                                                                            px-2 py-1 rounded text-xs
                                                                            border border-slate-600
                                                                        ">
                                                                            {row.Station || 'N/A'}
                                                                        </span>
                                                                    </td>

                                                                    <td
                                                                        className="p-3 truncate max-w-[200px]"
                                                                        title={row.Description}
                                                                    >
                                                                        {row.Description}
                                                                    </td>

                                                                    <td className="
                                                                        p-3 text-right font-mono
                                                                        font-bold text-rose-400
                                                                    ">
                                                                        {row.QTY}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )
                                        )}

                                        {detailPanel.type === 'reverse_graph' && (
                                            !detailPanel.data ? (
                                                <p className="p-6 text-red-400 text-center">
                                                    Không có dữ liệu Reverse Trace.
                                                </p>
                                            ) : (
                                                <div className="p-3 space-y-4">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="
                                                            bg-slate-900 border
                                                            border-slate-700
                                                            rounded-lg p-3
                                                        ">
                                                            <p className="
                                                                text-xs text-slate-500
                                                                uppercase
                                                            ">
                                                                WO bị ảnh hưởng
                                                            </p>

                                                            <p className="
                                                                text-2xl font-black
                                                                text-amber-400
                                                            ">
                                                                {(
                                                                    detailPanel
                                                                        .data
                                                                        .affectedWOs
                                                                        ?.length
                                                                    || 0
                                                                )}
                                                            </p>
                                                        </div>

                                                        <div className="
                                                            bg-slate-900 border
                                                            border-slate-700
                                                            rounded-lg p-3
                                                        ">
                                                            <p className="
                                                                text-xs text-slate-500
                                                                uppercase
                                                            ">
                                                                Box cần khoanh vùng
                                                            </p>

                                                            <p className="
                                                                text-2xl font-black
                                                                text-rose-400
                                                            ">
                                                                {(
                                                                    detailPanel
                                                                        .data
                                                                        .boxes
                                                                        ?.length
                                                                    || 0
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {(
                                                        detailPanel.data.graph
                                                        || []
                                                    ).length === 0 ? (
                                                        <p className="
                                                            p-6 text-emerald-400
                                                            font-bold text-center
                                                            bg-emerald-900/20
                                                            rounded-lg
                                                        ">
                                                            Không tìm thấy nhánh downstream.
                                                        </p>
                                                    ) : (
                                                        <div className="
                                                            overflow-x-auto
                                                            custom-scrollbar pb-4
                                                        ">
                                                            <div className="min-w-[700px]">
                                                                {(
                                                                    detailPanel
                                                                        .data
                                                                        .graph
                                                                    || []
                                                                ).map((rootNode, index) => (
                                                                    <ReverseTraceNode
                                                                        key={`${rootNode.WO}-${index}`}
                                                                        node={rootNode}
                                                                        onViewDetails={handleViewDetails}
                                                                        onTraceBox={(boxId) => {
                                                                            setSearchMode('BOX');
                                                                            setSearchInput(boxId);
                                                                            executeForwardTrace(boxId);
                                                                        }}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        )}

                                        {detailPanel.type === 'product_search' && (
                                            <div>
                                                {detailPanel.data.warning && (
                                                    <div className="
                                                        p-4 bg-amber-500/10
                                                        text-amber-300 text-sm
                                                        leading-relaxed border-b
                                                        border-amber-500/20
                                                        flex items-start gap-3
                                                    ">
                                                        <AlertTriangle
                                                            className="shrink-0 mt-0.5"
                                                            size={20}
                                                        />

                                                        <p>
                                                            <b>{detailPanel.data.warning}</b>
                                                        </p>
                                                    </div>
                                                )}

                                                <ul className="
                                                    divide-y divide-slate-700/50
                                                    max-h-[60vh] overflow-y-auto
                                                ">
                                                    {detailPanel.data.boxes.map((boxItem, index) => (
                                                        <li
                                                            key={index}
                                                            className="
                                                                p-3 sm:p-4
                                                                hover:bg-slate-700/30
                                                                flex items-center
                                                                justify-between group
                                                                transition-colors
                                                            "
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <Package className="text-blue-500/70" />

                                                                <div>
                                                                    <p className="
                                                                        font-bold text-slate-200
                                                                        font-mono text-lg
                                                                        select-all
                                                                    ">
                                                                        {boxItem.BoxID}
                                                                    </p>

                                                                    <p className="text-xs text-slate-400">
                                                                        Đóng gói lúc: {boxItem.PackTime}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSearchMode('BOX');
                                                                    setSearchInput(boxItem.BoxID);
                                                                    executeForwardTrace(boxItem.BoxID);
                                                                }}
                                                                className="
                                                                    text-xs bg-blue-600
                                                                    hover:bg-blue-500
                                                                    text-white px-4 py-2
                                                                    rounded-lg transition-all
                                                                    shadow-md active:scale-95
                                                                    font-bold
                                                                "
                                                            >
                                                                Truy vết
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


export default TraceabilityView;