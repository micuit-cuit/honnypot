/**
 * Commande cut - Extraction de sections de chaque ligne de fichiers
 * Usage: cut OPTION... [FILE]...
 */

function executeCUT(parts, fs) {
    let fields = null;
    let delimiter = '\t';
    let characters = null;
    let files = [];
    
    // Parser les options
    for (let i = 1; i < parts.length; i++) {
        if (parts[i] === '-f' && i + 1 < parts.length) {
            fields = parts[++i];
        } else if (parts[i] === '-d' && i + 1 < parts.length) {
            delimiter = parts[++i];
        } else if (parts[i] === '-c' && i + 1 < parts.length) {
            characters = parts[++i];
        } else if (parts[i].startsWith('-f')) {
            fields = parts[i].substring(2);
        } else if (parts[i].startsWith('-d')) {
            delimiter = parts[i].substring(2);
        } else if (parts[i].startsWith('-c')) {
            characters = parts[i].substring(2);
        } else if (!parts[i].startsWith('-')) {
            files.push(parts[i]);
        }
    }
    
    if (files.length === 0) {
        return 'cut: no input files\n';
    }
    
    let result = '';
    
    for (const file of files) {
        const content = fs.readFile(file);
        if (content === null) {
            result += `cut: cannot read: ${file}: No such file or directory\n`;
            continue;
        }
        
        const lines = content.split('\n').filter(line => line.length > 0);
        
        for (const line of lines) {
            if (fields) {
                const fieldArray = line.split(delimiter);
                const fieldNumbers = fields.split(',').map(f => {
                    if (f.includes('-')) {
                        const [start, end] = f.split('-').map(Number);
                        return Array.from({length: end - start + 1}, (_, i) => start + i);
                    }
                    return [Number(f)];
                }).flat();
                
                const selectedFields = fieldNumbers.map(num => fieldArray[num - 1] || '').filter(f => f !== '');
                result += selectedFields.join(delimiter) + '\n';
            } else if (characters) {
                const charNumbers = characters.split(',').map(c => {
                    if (c.includes('-')) {
                        const [start, end] = c.split('-').map(Number);
                        return Array.from({length: end - start + 1}, (_, i) => start + i);
                    }
                    return [Number(c)];
                }).flat();
                
                const selectedChars = charNumbers.map(num => line[num - 1] || '').join('');
                result += selectedChars + '\n';
            }
        }
    }
    
    return result;
}

module.exports = { executeCUT };