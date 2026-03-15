// Zen Desktop - connects to zen-swarm at http://127.0.0.1:8124/ui

function onWindowClose() {
    Neutralino.app.exit();
}

// Initialize Neutralino
Neutralino.init();

// Handle window close
Neutralino.events.on('windowClose', onWindowClose);
