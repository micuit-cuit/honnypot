/**
 * Commande ping - Teste la connectivité réseau
 * Usage: ping [options] destination
 */

function generateRandomIP() {
    return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

function executePING(parts, fs) {
    if (parts.length < 2) return 'ping: usage error: Destination address required\n';
    const host = parts[1];
    
    // Simulation de ping
    const responses = [
        `PING ${host} (${generateRandomIP()}) 56(84) bytes of data.`,
        `64 bytes from ${host} (${generateRandomIP()}): icmp_seq=1 ttl=64 time=${(Math.random() * 50 + 1).toFixed(1)} ms`,
        `64 bytes from ${host} (${generateRandomIP()}): icmp_seq=2 ttl=64 time=${(Math.random() * 50 + 1).toFixed(1)} ms`,
        `64 bytes from ${host} (${generateRandomIP()}): icmp_seq=3 ttl=64 time=${(Math.random() * 50 + 1).toFixed(1)} ms`,
        ``,
        `--- ${host} ping statistics ---`,
        `3 packets transmitted, 3 received, 0% packet loss, time 2000ms`,
        `rtt min/avg/max/mdev = ${(Math.random() * 10 + 1).toFixed(1)}/${(Math.random() * 30 + 10).toFixed(1)}/${(Math.random() * 50 + 30).toFixed(1)}/${(Math.random() * 10).toFixed(1)} ms`
    ];
    
    return responses.join('\n') + '\n';
}

module.exports = { executePING };