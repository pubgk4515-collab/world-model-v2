// /devtools/architect/architect_bootstrap.js
// -----------------------------------------------------------------------------
// Symbiote Studio — Architect Bootstrap
// Premium Runtime Workspace Loader
// -----------------------------------------------------------------------------

import {
    createArchitectPanel
}
from './architect_panel.js';

// -----------------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------------

const STYLE_ID =
    'architect-runtime-styles';

const DEFAULT_STYLE_PATH =
    '/devtools/architect/architect_styles.css';

// -----------------------------------------------------------------------------
// STATE
// -----------------------------------------------------------------------------

let mounted =
    false;

let loading =
    false;

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function isBrowser() {

    return (
        typeof window !==
        'undefined'
    );
}

function isDevelopment() {

    const host =
        window.location.hostname;

    return (

        host === 'localhost' ||

        host === '127.0.0.1' ||

        host.endsWith('.local')
    );
}

// -----------------------------------------------------------------------------
// STYLES
// -----------------------------------------------------------------------------

function ensureStylesheet(
    href = DEFAULT_STYLE_PATH
) {

    const existing =
        document.getElementById(
            STYLE_ID
        );

    if (existing) {

        return existing;
    }

    const link =
        document.createElement(
            'link'
        );

    link.id =
        STYLE_ID;

    link.rel =
        'stylesheet';

    link.href =
        href;

    document.head.appendChild(
        link
    );

    console.log(
        '🎨 Architect styles loaded.'
    );

    return link;
}

// -----------------------------------------------------------------------------
// OPEN
// -----------------------------------------------------------------------------

export function openArchitect() {

    if (!isBrowser()) {

        return null;
    }

    ensureStylesheet();

    const existing =
        window.__architectDockAPI;

    if (existing) {

        existing.open?.();

        return existing;
    }

    const panel =
        createArchitectPanel();

    mounted =
        true;

    return panel;
}

// -----------------------------------------------------------------------------
// CLOSE
// -----------------------------------------------------------------------------

export function closeArchitect() {

    const api =
        window.__architectDockAPI;

    if (api) {

        api.close?.();
    }

    mounted =
        false;
}

// -----------------------------------------------------------------------------
// TOGGLE
// -----------------------------------------------------------------------------

export function toggleArchitect() {

    if (
        window.__architectDockMounted
    ) {

        closeArchitect();

        return;
    }

    openArchitect();
}

// -----------------------------------------------------------------------------
// HOTKEY
// -----------------------------------------------------------------------------

function handleHotkey(event) {

    // -------------------------------------------------------------------------
    // CTRL + SHIFT + A
    // -------------------------------------------------------------------------

    if (

        event.ctrlKey &&

        event.shiftKey &&

        event.key.toLowerCase() ===
        'a'
    ) {

        event.preventDefault();

        toggleArchitect();
    }
}

// -----------------------------------------------------------------------------
// GLOBALS
// -----------------------------------------------------------------------------

function exposeGlobals() {

    window.openArchitect =
        openArchitect;

    window.closeArchitect =
        closeArchitect;

    window.toggleArchitect =
        toggleArchitect;
}

// -----------------------------------------------------------------------------
// MOUNT
// -----------------------------------------------------------------------------

export function mountArchitect(
    options = {}
) {

    if (!isBrowser()) {

        return;
    }

    // -------------------------------------------------------------------------
    // PREVENT DUPLICATE
    // -------------------------------------------------------------------------

    if (
        mounted ||
        loading
    ) {

        return;
    }

    loading =
        true;

    try {

        // ---------------------------------------------------------------------
        // DEV CHECK
        // ---------------------------------------------------------------------

        const allowProduction =
            options.allowProduction ||
            false;

        if (

            !allowProduction &&

            !isDevelopment()
        ) {

            console.warn(
                '[ArchitectBootstrap] Skipped outside development mode.'
            );

            return;
        }

        // ---------------------------------------------------------------------
        // STYLES
        // ---------------------------------------------------------------------

        ensureStylesheet(
            options.stylesheet ||
            DEFAULT_STYLE_PATH
        );

        // ---------------------------------------------------------------------
        // GLOBALS
        // ---------------------------------------------------------------------

        exposeGlobals();

        // ---------------------------------------------------------------------
        // HOTKEY
        // ---------------------------------------------------------------------

        window.removeEventListener(
            'keydown',
            handleHotkey
        );

        window.addEventListener(
            'keydown',
            handleHotkey
        );

        // ---------------------------------------------------------------------
        // AUTO OPEN
        // ---------------------------------------------------------------------

        if (
            options.autoOpen !==
            false
        ) {

            openArchitect();
        }

        mounted =
            true;

        console.log(
            '🧠 Architect Bootstrap mounted.'
        );

    } catch (err) {

        console.error(
            '[ArchitectBootstrap]',
            err
        );

    } finally {

        loading =
            false;
    }
}

// -----------------------------------------------------------------------------
// UNMOUNT
// -----------------------------------------------------------------------------

export function unmountArchitect() {

    try {

        closeArchitect();

        window.removeEventListener(
            'keydown',
            handleHotkey
        );

        mounted =
            false;

        console.log(
            '🧠 Architect Bootstrap unmounted.'
        );

    } catch (err) {

        console.error(
            '[ArchitectBootstrap]',
            err
        );
    }
}

// -----------------------------------------------------------------------------
// AUTO DEVTOOLS
// -----------------------------------------------------------------------------

if (isBrowser()) {

    // -------------------------------------------------------------------------
    // GLOBAL READY FLAG
    // -------------------------------------------------------------------------

    window.__architectBootstrapReady =
        true;

    // -------------------------------------------------------------------------
    // HMR SAFE
    // -------------------------------------------------------------------------

    if (
        import.meta &&
        import.meta.hot
    ) {

        import.meta.hot.dispose(
            () => {

                unmountArchitect();
            }
        );
    }
}

// -----------------------------------------------------------------------------
// DEFAULT EXPORT
// -----------------------------------------------------------------------------

export default {

    mountArchitect,

    unmountArchitect,

    openArchitect,

    closeArchitect,

    toggleArchitect
};
