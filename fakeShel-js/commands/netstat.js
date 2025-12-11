/**
 * Commande netstat - Affiche les connexions réseau, tables de routage, statistiques
 * Usage: netstat [options]
 */

function executeNETSTAT(parts, fs) {
    let showListening = false;
    let showAll = false;
    let showNumeric = false;
    let showProcesses = false;
    let showTcp = false;
    let showUdp = false;
    let showRouting = false;
    
    // Parser les options
    for (let i = 1; i < parts.length; i++) {
        const arg = parts[i];
        
        if (arg === '-l' || arg === '--listening') {
            showListening = true;
        } else if (arg === '-a' || arg === '--all') {
            showAll = true;
        } else if (arg === '-n' || arg === '--numeric') {
            showNumeric = true;
        } else if (arg === '-p' || arg === '--programs') {
            showProcesses = true;
        } else if (arg === '-t' || arg === '--tcp') {
            showTcp = true;
        } else if (arg === '-u' || arg === '--udp') {
            showUdp = true;
        } else if (arg === '-r' || arg === '--route') {
            showRouting = true;
        } else if (arg.includes('l')) showListening = true;
        else if (arg.includes('a')) showAll = true;
        else if (arg.includes('n')) showNumeric = true;
        else if (arg.includes('p')) showProcesses = true;
        else if (arg.includes('t')) showTcp = true;
        else if (arg.includes('u')) showUdp = true;
    }
    
    let result = '';
    
    if (showRouting) {
        result += 'Kernel IP routing table\n';
        result += 'Destination     Gateway         Genmask         Flags   MSS Window  irtt Iface\n';
        result += '0.0.0.0         192.168.1.1     0.0.0.0         UG        0 0          0 eth0\n';
        result += '192.168.1.0     0.0.0.0         255.255.255.0   U         0 0          0 eth0\n';
        return result;
    }
    
    // Header
    const processHeader = showProcesses ? 'PID/Program name   ' : '';
    result += `Active Internet connections ${showListening ? '(only servers)' : showAll ? '(w/o servers)' : '(w/o servers)'}\n`;
    result += `Proto Recv-Q Send-Q Local Address           Foreign Address         State       ${processHeader}\n`;
    
    // Connexions TCP
    if (!showUdp || showTcp || (!showTcp && !showUdp)) {
        const tcpConnections = [
            ['tcp', '0', '0', '0.0.0.0:22', '0.0.0.0:*', 'LISTEN', '1234/sshd'],
            ['tcp', '0', '0', '0.0.0.0:80', '0.0.0.0:*', 'LISTEN', '5678/apache2'],
            ['tcp', '0', '0', '127.0.0.1:3306', '0.0.0.0:*', 'LISTEN', '9012/mysqld'],
            ['tcp', '0', '0', '192.168.1.100:22', '192.168.1.50:54321', 'ESTABLISHED', '1234/sshd'],
            ['tcp', '0', '52', '192.168.1.100:80', '203.0.113.10:45678', 'ESTABLISHED', '5678/apache2']
        ];
        
        for (const conn of tcpConnections) {
            if (showListening && conn[5] !== 'LISTEN') continue;
            if (!showListening && !showAll && conn[5] === 'LISTEN') continue;
            
            let line = `${conn[0].padEnd(5)} ${conn[1].padEnd(6)} ${conn[2].padEnd(6)} `;
            line += `${conn[3].padEnd(23)} ${conn[4].padEnd(23)} ${conn[5].padEnd(11)} `;
            if (showProcesses) {
                line += conn[6];
            }
            result += line + '\n';
        }
    }
    
    // Connexions UDP
    if (showUdp || (!showTcp && !showUdp)) {
        const udpConnections = [
            ['udp', '0', '0', '0.0.0.0:68', '0.0.0.0:*', '', '3456/dhclient'],
            ['udp', '0', '0', '0.0.0.0:53', '0.0.0.0:*', '', '7890/systemd-resolve'],
            ['udp', '0', '0', '127.0.0.1:323', '0.0.0.0:*', '', '2345/chronyd']
        ];
        
        for (const conn of udpConnections) {
            let line = `${conn[0].padEnd(5)} ${conn[1].padEnd(6)} ${conn[2].padEnd(6)} `;
            line += `${conn[3].padEnd(23)} ${conn[4].padEnd(23)} ${conn[5].padEnd(11)} `;
            if (showProcesses) {
                line += conn[6];
            }
            result += line + '\n';
        }
    }
    
    return result;
}

module.exports = { executeNETSTAT };