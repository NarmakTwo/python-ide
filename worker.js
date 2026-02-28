/**
 * Nuilith Worker - Python Engine
 */
importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js");

let pyodide = null;

// Helper to send messages to UI without DataCloneErrors
function postToUI(type, text) {
    self.postMessage({ type: type, text: String(text) });
}

async function initPython() {
    pyodide = await loadPyodide();
    await pyodide.loadPackage("micropip");
    postToUI("READY", "Python Runtime Ready");
}

self.onmessage = async (event) => {
    const { type, code } = event.data;

    if (type === "RUN") {
        if (!pyodide) return;

        // Auto-install imports
        const imports = [...code.matchAll(/^(?:from|import)\s+([a-zA-Z0-9_]+)/gm)].map(m => m[1]);
        if (imports.length > 0) {
            const micropip = pyodide.pyimport("micropip");
            for (const pkg of imports) {
                try { await micropip.install(pkg); } catch (e) {}
            }
        }

        // Setup the Sync Input Bridge
        // We use the 'postToUI' JS function defined above to avoid DataCloneError
        await pyodide.runPythonAsync(`
import builtins
from js import XMLHttpRequest, postToUI

def sync_input(prompt=""):
    if prompt:
        postToUI("PRINT", str(prompt))
    
    request = XMLHttpRequest.new()
    request.open("GET", "/get_input?t=" + str(builtins.id(request)), False)
    try:
        request.send(None)
        return str(request.responseText)
    except Exception as e:
        return ""

builtins.input = sync_input
        `);

        // Redirect stdout/stderr using our safe helper
        pyodide.setStdout({ 
            batched: (str) => postToUI("PRINT", str) 
        });
        pyodide.setStderr({ 
            batched: (str) => postToUI("ERROR", str) 
        });

        try {
            await pyodide.runPythonAsync(code);
            postToUI("FINISHED", "");
        } catch (err) {
            postToUI("ERROR", err.message);
        }
    }
};

initPython();