/**
 * Nuilith IDE - Main UI Controller
 */

let pythonWorker = new Worker('worker.js');
globalThis.term = null;
globalThis.myCodeMirror = null;
globalThis.autosaveTime = Math.floor(Date.now() / 1000);

window.addEventListener('load', async () => {
    // 1. Service Worker Registration
    if ('serviceWorker' in navigator) {
        try {
            const reg = await navigator.serviceWorker.register('sw.js');
            await navigator.serviceWorker.ready;
            
            if (!navigator.serviceWorker.controller) {
                location.reload(); 
                return;
            }

            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.type === 'INPUT_REQUEST') {
                    const port = event.ports[0];
                    globalThis.term.read("", (userInput) => {
                        port.postMessage(userInput);
                    });
                }
            });
        } catch (e) { console.error("SW failed", e); }
    }

    // 2. Terminal Initialization
    globalThis.term = $('#terminal').terminal(async function(command) {
        const cmd = command.trim();
        if (cmd === "run") runcode();
        else if (cmd === "clear") term.clear();
        else if (cmd === "help") term.echo("Commands: run, clear, help");
    }, {
        greetings: 'Nuilith Python v1.0.0 (Offline Ready)',
        prompt: '[[b;green;]>>> ]'
    });

    // 3. Handle Messages from the Worker
    pythonWorker.onmessage = (event) => {
        const { type, text } = event.data;
        if (type === "PRINT") term.echo(text);
        if (type === "ERROR") term.error(text);
        if (type === "FINISHED") term.echo("[[i;gray;]-- Execution Finished --]");
    };

    // 4. CodeMirror Setup
    const editorpage = document.getElementById("editor");
    globalThis.myCodeMirror = CodeMirror(editorpage, {
        value: "name = input('What is your name? ')\nprint(f'Hello, {name}!')",
        mode: "python",
        theme: "programiz",
        lineNumbers: true,
        indentUnit: 4,
        extraKeys: {
            "Tab": (cm) => cm.replaceSelection("    ", "end"),
            "Ctrl-Enter": () => runcode(),
            "Ctrl-S": (cm) => { saveToIDB(); return false; }
        }
    });

    loadFromIDB();
    setupTimers();
});

function runcode() {
    term.echo("[[b;yellow;]> Running main.py...]");
    pythonWorker.postMessage({ type: "RUN", code: myCodeMirror.getValue() });
}

function setupTimers() {
    setInterval(() => saveToIDB(), 30000);
    setInterval(() => {
        const diff = Math.floor(Date.now() / 1000) - globalThis.autosaveTime;
        $('#autosavetime').text(`${diff}s`);
    }, 1000);
}

function saveToIDB() {
    if (!myCodeMirror) return;
    const request = indexedDB.open('nuilithdb', 1);
    request.onupgradeneeded = (e) => {
        if (!e.target.result.objectStoreNames.contains('autosave')) {
            e.target.result.createObjectStore('autosave', { keyPath: 'id' });
        }
    };
    request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('autosave', 'readwrite');
        tx.objectStore('autosave').put({ id: 1, code: myCodeMirror.getValue() });
        tx.oncomplete = () => {
            globalThis.autosaveTime = Math.floor(Date.now() / 1000);
            db.close();
        };
    };
}

function loadFromIDB() {
    const request = indexedDB.open('nuilithdb', 1);
    request.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('autosave')) return;
        const tx = db.transaction('autosave', 'readonly');
        const getReq = tx.objectStore('autosave').get(1);
        getReq.onsuccess = () => {
            if (getReq.result && myCodeMirror) myCodeMirror.setValue(getReq.result.code);
        };
    };
}

function savecode() {
    const blob = new Blob([myCodeMirror.getValue()], { type: 'text/x-python' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'main.py';
    a.click();
}

async function loadcode() {
    try {
        const [handle] = await window.showOpenFilePicker();
        const file = await handle.getFile();
        myCodeMirror.setValue(await file.text());
    } catch (e) {}
}