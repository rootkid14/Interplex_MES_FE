// IPTH_ALLOCATOR_ROUTING_V4 - CSV contract and deterministic route extraction.
export const normalizeAllocatorPn = (value) => String(value ?? '').trim().toUpperCase();

export function allocatorRoutingError(error) {
    const detail = error?.response?.data?.detail;
    const message = typeof detail === 'string' ? detail : detail?.message;
    return String(message || error?.message || 'Không xác định được routing.');
}

export function extractAllocatorProcess(path, allocatedPn) {
    if (!Array.isArray(path)) throw new Error('Routing API không trả về routingPath.');
    const matches = path.map((step, index) =>
        Array.isArray(step.Components) && step.Components.some(p =>
            normalizeAllocatorPn(p) === normalizeAllocatorPn(allocatedPn)) ? index : -1
    ).filter(index => index !== -1);
    if (matches.length !== 1) throw new Error(`Không xác định duy nhất PN ${allocatedPn} trong routing.`);
    const current = String(path[matches[0]]?.Process || '').trim();
    const subsequent = path[matches[0] + 1];
    const next = subsequent ? String(subsequent.Process || '').trim() : 'Finished Good';
    if (!current || !next) throw new Error('Mô tả Current / Next Process không hợp lệ.');
    return { currentProcess: current, nextProcess: next };
}

// RFC4180-style escaping: embedded commas/quotes remain intact, one physical line per label.
export function formatAllocatorLabelRow(values) {
    return values.map(value => {
        const str = String(value ?? '-').replace(/[\r\n]+/g, ' ').trim() || '-';
        return /[",]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(',');
}
