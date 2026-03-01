# Nuilith Python IDE

A browser-based Python IDE that runs entirely offline. No server, no backend, no account. You write code, it runs in the tab.

The name is Neo-Latin for "No Stupid". Make of that what you will.

## Background

Nuilith started as a riff on the Programiz online IDE — same general layout, same editor feel, same kind of audience. The difference is that Programiz requires a server to execute code. Nuilith doesn't. Everything runs locally in the browser through Pyodide (Python compiled to WebAssembly), so once the page has loaded once, it works without any connection at all.

The editor theme is also adapted from Programiz's CodeMirror theme.

## Fully static and offline-capable

There is no backend. The entire IDE is static files: HTML, JS, and CSS. You can host it on GitHub Pages, Netlify, an S3 bucket, or just `npx serve .` from your machine. After the first load, the Service Worker caches everything and the IDE works with no internet connection.

The only caveat is that on first load, Pyodide (~10MB) and pyflakes have to download. After that, they're cached and subsequent loads are instant regardless of connectivity.

## What it does

Nuilith gives you a split-pane editor and terminal in the browser. The left side is a CodeMirror editor with Python syntax highlighting, line numbers, and live linting via pyflakes. The right side is an interactive terminal where your program's output appears. You can resize the split by dragging the divider.

Python runs inside a Web Worker so the UI stays responsive. `input()` is handled via a synchronous XHR trick routed through a Service Worker, which means programs that call `input()` actually pause and wait for the user to type — the same way they would in a real terminal.

Code is autosaved to IndexedDB every 30 seconds and restored when you reopen the page.

## Getting started

Clone the repo and serve it over HTTPS or localhost. It won't work from a `file://` path because Service Workers require a secure context.

```
npx serve .
```

or any static file server will do. Open it in Chrome or Firefox.

## Keyboard shortcuts

- `Ctrl+Enter` — run the current code
- `Ctrl+S` — save to IndexedDB
- `Ctrl+Space` — trigger autocomplete
- Typing a `.` after a variable will suggest methods automatically

The toolbar also has Import and Export buttons for loading/saving `.py` files from disk.

## How it works

The architecture is three pieces talking to each other: the page (`index.js`), a Web Worker (`worker.js`), and a Service Worker (`sw.js`).

The worker loads Pyodide and handles all Python execution. It also does linting by running pyflakes inside Pyodide and sending annotations back to CodeMirror. When Python code calls `input()`, it fires a synchronous XHR to `/get_input`. The Service Worker intercepts that request, sends a message to the page asking for user input, waits on a MessageChannel port, and resolves the response once the user types something. From Python's perspective it just looks like a blocking `input()` call.

## Dependencies

All loaded from CDN at runtime — nothing to install.

- Pyodide 0.27 for the Python runtime
- CodeMirror 5 for the editor
- jQuery Terminal for the output pane
- Alpine.js for the small tooltip UI
- Tailwind CSS (browser build) for layout
- pyflakes (installed via micropip on first lint)

## Notes

The synchronous XHR + Service Worker input trick only works because of the Cross-Origin Isolation headers that `coi-serviceworker.min.js` injects. Without those headers, SharedArrayBuffer-based alternatives would be needed. If you deploy this somewhere, make sure those headers are present or include the coi-serviceworker shim.

Package imports are auto-detected at runtime by scanning the code for `import` statements and running `micropip.install()` before execution. This works for pure-Python packages available on PyPI. Packages with native extensions won't install this way.
