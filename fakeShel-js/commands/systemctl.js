/**
 * Commande systemctl - Contrôle systemd et les services
 * Usage: systemctl [options] command [service]
 */

function executeSYSTEMCTL(parts, fs) {
    let command = '';
    let units = [];
    
    // Parser les arguments
    for (let i = 1; i < parts.length; i++) {
        const arg = parts[i];
        
        if (!command && !arg.startsWith('-')) {
            command = arg;
        } else if (command && !arg.startsWith('-')) {
            units.push(arg);
        }
    }
    
    if (!command) command = 'list-units';
    
    let result = '';
    
    // Services simulés
    const services = {
        'sshd': { status: 'active', enabled: true, description: 'OpenSSH Daemon' },
        'apache2': { status: 'active', enabled: true, description: 'The Apache HTTP Server' },
        'mysql': { status: 'active', enabled: true, description: 'MySQL Community Server' },
        'nginx': { status: 'inactive', enabled: false, description: 'A high performance web server' },
        'docker': { status: 'active', enabled: true, description: 'Docker Application Container Engine' },
        'ufw': { status: 'active', enabled: true, description: 'Uncomplicated firewall' },
        'cron': { status: 'active', enabled: true, description: 'Regular background program processing daemon' },
        'systemd-resolved': { status: 'active', enabled: true, description: 'Network Name Resolution' }
    };
    
    switch (command) {
        case 'list-units':
            result += 'UNIT                        LOAD   ACTIVE SUB     DESCRIPTION\n';
            for (const [name, info] of Object.entries(services)) {
                const unit = `${name}.service`.padEnd(27);
                const load = 'loaded'.padEnd(6);
                const active = info.status.padEnd(6);
                const sub = (info.status === 'active' ? 'running' : 'dead').padEnd(7);
                result += `${unit} ${load} ${active} ${sub} ${info.description}\n`;
            }
            result += '\nLOAD   = Reflects whether the unit definition was properly loaded.\n';
            result += 'ACTIVE = The high-level unit activation state, i.e. generalization of SUB.\n';
            result += 'SUB    = The low-level unit activation state, values depend on unit type.\n';
            break;
            
        case 'status':
            if (units.length === 0) {
                result += `● ${fs.current_user}-server\n    State: running\n     Jobs: 0 queued\n   Failed: 0 units\n    Since: Mon 2024-01-01 00:00:00 UTC; 5 days ago\n`;
            } else {
                for (const unit of units) {
                    const serviceName = unit.replace('.service', '');
                    const service = services[serviceName];
                    
                    if (service) {
                        result += `● ${unit}\n`;
                        result += `   Loaded: loaded (/lib/systemd/system/${unit}; ${service.enabled ? 'enabled' : 'disabled'})\n`;
                        result += `   Active: ${service.status} (${service.status === 'active' ? 'running' : 'dead'}) since Mon 2024-01-01 00:00:00 UTC; 5 days ago\n`;
                        result += `     Docs: man:${serviceName}(8)\n`;
                        result += ` Main PID: ${Math.floor(Math.random() * 10000)} (${serviceName})\n`;
                        result += `    Tasks: ${Math.floor(Math.random() * 20) + 1}\n`;
                        result += `   Memory: ${Math.floor(Math.random() * 100) + 10}.0M\n`;
                        result += `   CGroup: /system.slice/${unit}\n`;
                    } else {
                        result += `Unit ${unit} could not be found.\n`;
                    }
                }
            }
            break;
            
        case 'start':
            for (const unit of units) {
                const serviceName = unit.replace('.service', '');
                if (services[serviceName]) {
                    services[serviceName].status = 'active';
                    // Pas de sortie pour start réussi
                } else {
                    result += `Failed to start ${unit}: Unit ${unit} not found.\n`;
                }
            }
            break;
            
        case 'stop':
            for (const unit of units) {
                const serviceName = unit.replace('.service', '');
                if (services[serviceName]) {
                    services[serviceName].status = 'inactive';
                    // Pas de sortie pour stop réussi
                } else {
                    result += `Failed to stop ${unit}: Unit ${unit} not found.\n`;
                }
            }
            break;
            
        case 'restart':
            for (const unit of units) {
                const serviceName = unit.replace('.service', '');
                if (services[serviceName]) {
                    // Pas de sortie pour restart réussi
                } else {
                    result += `Failed to restart ${unit}: Unit ${unit} not found.\n`;
                }
            }
            break;
            
        case 'enable':
            for (const unit of units) {
                const serviceName = unit.replace('.service', '');
                if (services[serviceName]) {
                    services[serviceName].enabled = true;
                    result += `Created symlink /etc/systemd/system/multi-user.target.wants/${unit} → /lib/systemd/system/${unit}.\n`;
                } else {
                    result += `Failed to enable unit: Unit file ${unit} does not exist.\n`;
                }
            }
            break;
            
        case 'disable':
            for (const unit of units) {
                const serviceName = unit.replace('.service', '');
                if (services[serviceName]) {
                    services[serviceName].enabled = false;
                    result += `Removed /etc/systemd/system/multi-user.target.wants/${unit}.\n`;
                } else {
                    result += `Failed to disable unit: Unit file ${unit} does not exist.\n`;
                }
            }
            break;
            
        default:
            result += `Unknown operation '${command}'.\n`;
    }
    
    return result;
}

module.exports = { executeSYSTEMCTL };