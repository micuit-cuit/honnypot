/**
 * Commande ps - Affiche les processus en cours
 * Usage: ps [options]
 */

function getRandomTime() {
    const hour = Math.floor(Math.random() * 24).toString().padStart(2, '0');
    const minute = Math.floor(Math.random() * 60).toString().padStart(2, '0');
    return `${hour}:${minute}`;
}

function generatePsAux(fs) {
    const processes = [
        'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND',
        `root         1  0.0  0.2 169484  9284 ?        Ss   ${getRandomTime()}   0:01 /sbin/init`,
        `root         2  0.0  0.0      0     0 ?        S    ${getRandomTime()}   0:00 [kthreadd]`,
        `root         3  0.0  0.0      0     0 ?        I<   ${getRandomTime()}   0:00 [rcu_gp]`,
        `${fs.getCurrentUser()}      ${Math.floor(Math.random() * 1000 + 1000)}  0.1  0.5  25632  8192 pts/0    Ss   ${getRandomTime()}   0:00 -bash`,
        `${fs.getCurrentUser()}      ${Math.floor(Math.random() * 1000 + 2000)}  0.0  0.1   7236  2048 pts/0    R+   ${getRandomTime()}   0:00 ps aux`,
    ];
    return processes.join('\n') + '\n';
}

function executePS(parts, fs) {
    const processes = [
        '  PID TTY          TIME CMD',
        `${(Math.random() * 1000 + 1000).toFixed(0)} pts/0    00:00:00 bash`,
        `${(Math.random() * 1000 + 2000).toFixed(0)} pts/0    00:00:00 ssh`,
        `${(Math.random() * 1000 + 3000).toFixed(0)} ?        00:00:01 systemd`,
    ];
    
    if (parts.includes('aux')) {
        return generatePsAux(fs);
    }
    
    return processes.join('\n') + '\n';
}

module.exports = { executePS };