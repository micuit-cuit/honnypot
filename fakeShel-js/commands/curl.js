/**
 * Commande curl - Outil de transfert de données avec URLs
 * Usage: curl [options] <URL>
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const HoneypotLogger = require('../logger');

function executeCURL(parts, fs, clientIP = '0.0.0.0', username = 'unknown') {
    if (parts.length < 2) return 'curl: try \'curl --help\' for more information\n';
    
    // Initialiser le logger
    const logger = new HoneypotLogger();
    
    // Compteur de requêtes global pour simuler la coupure
    if (!global.curlRequestCount) {
        global.curlRequestCount = 0;
    }
    
    let url = '';
    let output = null;
    let silent = false;
    let verbose = false;
    let followRedirects = false;
    let userAgent = 'curl/7.68.0';
    let method = 'GET';
    let headers = [];
    let data = null;
    
    // Parser les options
    for (let i = 1; i < parts.length; i++) {
        const arg = parts[i];
        
        if (arg === '-o' && i + 1 < parts.length) {
            output = parts[++i];
        } else if (arg === '-s' || arg === '--silent') {
            silent = true;
        } else if (arg === '-v' || arg === '--verbose') {
            verbose = true;
        } else if (arg === '-L' || arg === '--location') {
            followRedirects = true;
        } else if (arg === '-A' && i + 1 < parts.length) {
            userAgent = parts[++i];
        } else if (arg === '-X' && i + 1 < parts.length) {
            method = parts[++i];
        } else if (arg === '-H' && i + 1 < parts.length) {
            headers.push(parts[++i]);
        } else if (arg === '-d' && i + 1 < parts.length) {
            data = parts[++i];
            method = 'POST';
        } else if (arg === '--help') {
            return `Usage: curl [options...] <url>\n\nOptions:\n  -o <file>    Write output to file\n  -s, --silent Silent mode\n  -v, --verbose Verbose mode\n  -L, --location Follow redirects\n  -A <agent>   User agent\n  -X <method>  HTTP method\n  -H <header>  Add header\n  -d <data>    HTTP POST data\n`;
        } else if (!arg.startsWith('-')) {
            url = arg;
        }
    }
    
    if (!url) {
        return 'curl: no URL specified!\n';
    }
    
    // Incrémenter le compteur de requêtes
    global.curlRequestCount++;
    
    // Après 20 requêtes, simuler une coupure de connexion
    if (global.curlRequestCount > 20) {
        const hostname = url.replace(/https?:\/\//, '').split('/')[0];
        const errors = [
            `curl: (7) Failed to connect to ${hostname}: Network is unreachable`,
            `curl: (6) Could not resolve host: ${hostname}`,
            `curl: (28) Operation timed out after 30001 milliseconds with 0 bytes received`,
            `curl: (35) OpenSSL SSL_connect: Connection reset by peer`,
            `curl: (52) Empty reply from server`,
            `curl: (7) Couldn't connect to server`
        ];
        return errors[Math.floor(Math.random() * errors.length)] + '\n';
    }
    
    // Effectuer une vraie requête HTTP
    return new Promise((resolve) => {
        let response = '';
        
        if (verbose) {
            response += `* Trying ${url}...\n`;
        }
        
        try {
            const parsedUrl = new URL(url);
            const isHttps = parsedUrl.protocol === 'https:';
            const requestModule = isHttps ? https : http;
            
            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (isHttps ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: method,
                headers: {
                    'User-Agent': userAgent,
                    ...Object.fromEntries(headers.map(h => h.split(': ')))
                }
            };
            
            if (verbose) {
                response += `* Connected to ${parsedUrl.hostname} port ${options.port} (#0)\n`;
                response += `> ${method} ${options.path} HTTP/1.1\n`;
                response += `> Host: ${parsedUrl.hostname}\n`;
                response += `> User-Agent: ${userAgent}\n`;
                headers.forEach(h => response += `> ${h}\n`);
                response += `>\n`;
            }
            
            const req = requestModule.request(options, (res) => {
                const responseData = {
                    statusCode: res.statusCode,
                    contentType: res.headers['content-type'],
                    contentLength: res.headers['content-length']
                };
                
                if (verbose) {
                    response += `< HTTP/1.1 ${res.statusCode} ${res.statusMessage}\n`;
                    for (const [key, value] of Object.entries(res.headers)) {
                        response += `< ${key}: ${value}\n`;
                    }
                    response += `<\n`;
                }
                
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    // Logger la requête réussie
                    logger.logNetworkRequest(clientIP, username, parts.join(' '), url, true, {
                        ...responseData,
                        contentLength: data.length,
                        savedFile: output
                    });
                    
                    if (output) {
                        // Logger le téléchargement
                        logger.logDownload(clientIP, username, url, output, data.length, responseData.contentType);
                        fs.writeFile(output, data);
                        if (!silent && !verbose) {
                            response = '';
                        }
                    }
                    
                    if (!silent) {
                        response += data;
                    }
                    
                    resolve(response);
                });
            });
            
            req.on('error', (err) => {
                // Logger l'erreur de requête
                logger.logNetworkRequest(clientIP, username, parts.join(' '), url, false, {
                    error: err.message
                });
                
                resolve(`curl: (6) Could not resolve host: ${parsedUrl.hostname}\n`);
            });
            
            if (data) {
                req.write(data);
            }
            
            req.end();
            
        } catch (error) {
            resolve(`curl: (3) URL malformed: ${url}\n`);
        }
    });
}

module.exports = { executeCURL };