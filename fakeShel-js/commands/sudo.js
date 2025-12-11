/**
 * Commande sudo - Simule l'élévation de privilèges
 */

function executeSUDO(parts, fs) {
    if (parts.length === 1) {
        return `usage: sudo [-AbEHnPS] [-C num] [-D directory] [-g group] [-h host]
            [-p prompt] [-R directory] [-T timeout] [-u user]
            command [arg ...]
sudo [-AbEHilnPS] [-C num] [-D directory] [-g group] [-h host]
            [-p prompt] [-R directory] [-T timeout] [-u user] -i | -s
            [command [arg ...]]
sudo [-AbEHnPS] [-C num] [-D directory] [-g group] [-h host]
            [-p prompt] [-R directory] [-T timeout] [-u user] -e [file]

Options:
    -A, --askpass              use a helper program for password prompts
    -b, --background           run command in the background
    -B, --bell                 ring bell when prompting
    -C, --close-from=num       close all file descriptors >= num
    -D, --chdir=directory      change the working directory before running command
    -e, --edit                 edit files instead of running a command
    -E, --preserve-env         preserve user environment when running command
    -g, --group=group          run command as the specified group name or ID
    -H, --set-home             set HOME variable to target user's home dir
    -h, --help                 display help message and exit
    -i, --login                run login shell as the target user; a command may also be specified
    -l, --list                 list user's privileges or check a specific command; use twice for longer format
    -n, --non-interactive      non-interactive mode, no prompts are used
    -P, --preserve-groups      preserve group vector instead of setting to target's
    -p, --prompt=prompt        use the specified password prompt
    -R, --chroot=directory     change the root directory before running command
    -S, --stdin                read password from standard input
    -s, --shell                run shell as the target user; a command may also be specified
    -T, --command-timeout=timeout
                              terminate command after the specified time limit
    -U, --other-user=user      in list mode, display privileges for user
    -u, --user=user            run command (or edit file) as specified user name or ID
    -V, --version              display version information and exit
    -v, --validate             update user's timestamp without running a command
    --                         stop processing command line arguments
`;
    }

    // Parse les options sudo
    let userOption = '';
    let groupOption = '';
    let loginShell = false;
    let editMode = false;
    let listMode = false;
    let nonInteractive = false;
    let preserveEnv = false;
    let background = false;
    let chdir = '';
    
    let commandStart = 1;
    for (let i = 1; i < parts.length; i++) {
        const arg = parts[i];
        
        if (arg === '--') {
            commandStart = i + 1;
            break;
        } else if (arg.startsWith('-u')) {
            if (arg === '-u' && i + 1 < parts.length) {
                userOption = parts[++i];
            } else if (arg.startsWith('-u=')) {
                userOption = arg.substring(3);
            } else if (arg.length > 2) {
                userOption = arg.substring(2);
            }
        } else if (arg.startsWith('--user=')) {
            userOption = arg.substring(7);
        } else if (arg.startsWith('-g')) {
            if (arg === '-g' && i + 1 < parts.length) {
                groupOption = parts[++i];
            } else if (arg.startsWith('-g=')) {
                groupOption = arg.substring(3);
            } else if (arg.length > 2) {
                groupOption = arg.substring(2);
            }
        } else if (arg.startsWith('--group=')) {
            groupOption = arg.substring(8);
        } else if (arg === '-i' || arg === '--login') {
            loginShell = true;
        } else if (arg === '-e' || arg === '--edit') {
            editMode = true;
        } else if (arg === '-l' || arg === '--list') {
            listMode = true;
        } else if (arg === '-n' || arg === '--non-interactive') {
            nonInteractive = true;
        } else if (arg === '-E' || arg === '--preserve-env') {
            preserveEnv = true;
        } else if (arg === '-b' || arg === '--background') {
            background = true;
        } else if (arg.startsWith('-D')) {
            if (arg === '-D' && i + 1 < parts.length) {
                chdir = parts[++i];
            } else if (arg.startsWith('-D=')) {
                chdir = arg.substring(3);
            } else if (arg.length > 2) {
                chdir = arg.substring(2);
            }
        } else if (arg.startsWith('--chdir=')) {
            chdir = arg.substring(8);
        } else if (arg === '-h' || arg === '--help') {
            return executeSUDO(['sudo'], fs); // Retourne l'aide
        } else if (arg === '-V' || arg === '--version') {
            return `Sudo version 1.9.5p2
Sudoers policy plugin version 1.9.5p2
Sudoers file grammar version 46
Sudoers I/O plugin version 1.9.5p2
Sudoers audit plugin version 1.9.5p2
`;
        } else if (!arg.startsWith('-')) {
            commandStart = i;
            break;
        }
    }

    // Gestion des modes spéciaux
    if (listMode) {
        const targetUser = userOption || fs.getCurrentUser();
        return `Matching Defaults entries for ${targetUser} on this host:
    env_reset, mail_badpass, secure_path=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin

User ${targetUser} may run the following commands on this host:
    (ALL : ALL) ALL
`;
    }

    if (loginShell) {
        const targetUser = userOption || 'root';
        return `[sudo] password for ${fs.getCurrentUser()}: 
Sorry, try again.
[sudo] password for ${fs.getCurrentUser()}: 
sudo: 3 incorrect password attempts
`;
    }

    if (editMode) {
        return `[sudo] password for ${fs.getCurrentUser()}: 
sudoedit: /etc/sudoers: Permission denied
`;
    }

    // Vérifier s'il y a une commande à exécuter
    if (commandStart >= parts.length) {
        return `Usage: sudo COMMAND
Try 'sudo COMMAND' to run a command as another user.
`;
    }

    const command = parts.slice(commandStart).join(' ');
    const targetUser = userOption || 'root';
    const cmdParts = command.trim().split(/\s+/);
    const mainCmd = cmdParts[0];

    // Sauvegarder l'utilisateur actuel
    const originalUser = fs.getCurrentUser();
    
    try {
        // Changer vers l'utilisateur cible (généralement root)
        fs.setCurrentUser(targetUser);
        
        // Changer vers root et exécuter la commande directement avec le module correspondant
        try {
            // Changer l'utilisateur vers root
            fs.setCurrentUser('root');
            
            // Mapper les commandes vers leurs modules
            const commandModules = {
                'ls': () => require('./ls.js'),
                'cd': () => require('./cd.js'),
                'pwd': () => require('./pwd.js'),
                'mkdir': () => require('./mkdir.js'),
                'rmdir': () => require('./rmdir.js'),
                'rm': () => require('./rm.js'),
                'cp': () => require('./cp.js'),
                'mv': () => require('./mv.js'),
                'cat': () => require('./cat.js'),
                'echo': () => require('./echo.js'),
                'touch': () => require('./touch.js'),
                'find': () => require('./find.js'),
                'grep': () => require('./grep.js'),
                'ps': () => require('./ps.js'),
                'kill': () => require('./kill.js'),
                'whoami': () => require('./whoami.js'),
                'id': () => require('./id.js'),
                'su': () => require('./su.js'),
                'chmod': () => require('./chmod.js'),
                'chown': () => require('./chown.js'),
                'tar': () => require('./tar.js'),
                'wget': () => require('./wget.js'),
                'curl': () => require('./curl.js'),
                'tree': () => require('./tree.js'),
                'nano': () => require('./nano.js'),
                'vi': () => require('./vi.js')
            };
            
            if (commandModules[mainCmd]) {
                const module = commandModules[mainCmd]();
                const executeFunction = module[`execute${mainCmd.toUpperCase()}`];
                
                if (executeFunction) {
                    const result = executeFunction(cmdParts, fs);
                    // Restaurer l'utilisateur original
                    fs.setCurrentUser(originalUser);
                    return result;
                }
            }
            
            // Si commande non trouvée, simuler l'erreur sudo classique
            fs.setCurrentUser(originalUser);
            return `sudo: ${mainCmd}: command not found\n`;
            
        } catch (error) {
            // En cas d'erreur, restaurer l'utilisateur et retourner l'erreur
            fs.setCurrentUser(originalUser);
            return `sudo: ${command}: command failed: ${error.message}\n`;
        }
        
    } catch (error) {
        // En cas d'erreur, restaurer l'utilisateur original
        fs.setCurrentUser(originalUser);
        return `sudo: ${command}: command failed: ${error.message}\n`;
    }
}

module.exports = {
    executeSUDO
};