(function () {
    // Create debug container
    const debugDiv = document.createElement('div');
    debugDiv.id = 'debug-overlay';
    debugDiv.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 300px;
        background: rgba(0, 0, 0, 0.85);
        color: #0f0;
        font-family: monospace;
        font-size: 12px;
        overflow-y: auto;
        z-index: 10000;
        padding: 10px;
        border-top: 2px solid #0f0;
        pointer-events: none; /* Let clicks pass through unless we want to copy */
        pointer-events: auto;
    `;

    const header = document.createElement('div');
    header.innerHTML = '<strong>DEBUG CONSOLE (Take a screenshot of this)</strong> <button onclick="document.getElementById(\'debug-overlay\').style.display=\'none\'" style="float:right;color:black;">Close</button>';
    header.style.marginBottom = '10px';
    header.style.color = 'white';
    debugDiv.appendChild(header);

    const logContainer = document.createElement('div');
    debugDiv.appendChild(logContainer);

    document.body.appendChild(debugDiv);

    function logToScreen(msg, type = 'LOG') {
        const line = document.createElement('div');
        line.style.borderBottom = '1px solid #333';
        line.style.padding = '2px 0';

        const timestamp = new Date().toLocaleTimeString();

        if (type === 'ERROR') line.style.color = '#ff5555';
        else if (type === 'WARN') line.style.color = '#ffff55';
        else line.style.color = '#55ff55';

        line.textContent = `[${timestamp}] [${type}] ${msg}`;
        logContainer.appendChild(line);
        debugDiv.scrollTop = debugDiv.scrollHeight;
    }

    // Capture Console
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = function (...args) {
        originalLog.apply(console, args);
        logToScreen(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), 'LOG');
    };

    console.error = function (...args) {
        originalError.apply(console, args);
        logToScreen(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), 'ERROR');
    };

    console.warn = function (...args) {
        originalWarn.apply(console, args);
        logToScreen(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), 'WARN');
    };

    // Capture Global Errors
    window.onerror = function (msg, url, line, col, error) {
        logToScreen(`${msg} form ${url}:${line}:${col}`, 'ERROR');
        return false;
    };

    // Capture Unhandled Promise Rejections
    window.onunhandledrejection = function (event) {
        logToScreen(`Unhandled Promise Rejection: ${event.reason}`, 'ERROR');
    };

    logToScreen("Debug Overlay Initialized. Waiting for errors...");
})();
