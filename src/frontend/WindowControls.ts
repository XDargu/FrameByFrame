const remote = require('electron').remote;
const win = remote.getCurrentWindow(); /* Note this is different to the html global `window` variable */

export function initWindowControls()
{
    // When document has loaded, initialise
    document.onreadystatechange = (event) => {
        if (document.readyState == "complete") {
            handleWindowControls();
        }
    };

    window.onbeforeunload = () => {
        /* If window is reloaded, remove win event listeners
        (DOM element listeners get auto garbage collected but not
        Electron win listeners as the win is not dereferenced unless closed) */
        win.removeAllListeners();
    }
}

function handleWindowControls() {
    // Make minimise/maximise/restore/close buttons work when they are clicked
    document.getElementById('min-button').addEventListener("click", event => {
        win.minimize();
    });

    document.getElementById('max-button').addEventListener("click", event => {
        win.maximize();
    });

    document.getElementById('restore-button').addEventListener("click", event => {
        win.unmaximize();
    });

    document.getElementById('close-button').addEventListener("click", event => {
        win.close();
    });

    // Toggle maximise/restore buttons when maximisation/unmaximisation occurs
    toggleMaxRestoreButtons();
    win.on('maximize', toggleMaxRestoreButtons);
    win.on('unmaximize', toggleMaxRestoreButtons);

    function toggleMaxRestoreButtons() {
        if (win.isMaximized()) {
            document.body.classList.add('maximized');
        } else {
            document.body.classList.remove('maximized');
        }
    }
}