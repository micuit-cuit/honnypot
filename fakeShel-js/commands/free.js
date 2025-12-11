/**
 * Commande free - Affiche l'utilisation de la mémoire
 * Usage: free [options]
 */

function formatHumanReadable(bytes) {
    const units = ['B', 'K', 'M', 'G', 'T'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return unitIndex === 0 ? 
        `${size}${units[unitIndex]}` : 
        `${size.toFixed(1)}${units[unitIndex]}`;
}

function executeFREE(parts, fs) {
    let humanReadable = parts.includes('-h');
    
    const total = Math.floor(Math.random() * 2000000 + 8000000);
    const used = Math.floor(total * (0.3 + Math.random() * 0.4));
    const free = total - used;
    const buffers = Math.floor(total * 0.1);
    const cached = Math.floor(total * 0.2);

    if (humanReadable) {
        return `              total        used        free      shared  buff/cache   available
Mem:          ${formatHumanReadable(total * 1024)}       ${formatHumanReadable(used * 1024)}       ${formatHumanReadable(free * 1024)}        ${formatHumanReadable(Math.floor(total * 0.01) * 1024)}       ${formatHumanReadable((buffers + cached) * 1024)}       ${formatHumanReadable((free + buffers + cached) * 1024)}
Swap:         ${formatHumanReadable(Math.floor(total * 0.5) * 1024)}          0B       ${formatHumanReadable(Math.floor(total * 0.5) * 1024)}
`;
    } else {
        return `              total        used        free      shared  buff/cache   available
Mem:        ${total}     ${used}     ${free}       ${Math.floor(total * 0.01)}     ${buffers + cached}     ${free + buffers + cached}
Swap:       ${Math.floor(total * 0.5)}           0     ${Math.floor(total * 0.5)}
`;
    }
}

module.exports = { executeFREE };