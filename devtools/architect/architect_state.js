// /devtools/architect/architect_state.js
// -----------------------------------------------------------------------------
// Symbiote Studio — Architect Runtime State
// Centralized Runtime Workspace Store
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function createId() {

    return (
        'architect_' +

        Math.random()
            .toString(36)
            .slice(2, 10)
    );
}

function clone(value) {

    try {

        return structuredClone(
            value
        );

    } catch {

        return JSON.parse(
            JSON.stringify(value)
        );
    }
}

// -----------------------------------------------------------------------------
// DEFAULT STATE
// -----------------------------------------------------------------------------

const DEFAULT_STATE = {

    // -------------------------------------------------------------------------
    // UI
    // -------------------------------------------------------------------------

    visible:
        true,

    minimized:
        false,

    activeTab:
        'repair',

    // -------------------------------------------------------------------------
    // STATUS
    // -------------------------------------------------------------------------

    status:
        'idle',

    loading:
        false,

    error:
        null,

    // -------------------------------------------------------------------------
    // AI
    // -------------------------------------------------------------------------

    lastPrompt:
        '',

    lastResponse:
        null,

    lastPatch:
        '',

    // -------------------------------------------------------------------------
    // SCAN
    // -------------------------------------------------------------------------

    lastScan:
        null,

    lastScanTime:
        null,

    // -------------------------------------------------------------------------
    // PATCH HISTORY
    // -------------------------------------------------------------------------

    patchHistory:
        [],

    // -------------------------------------------------------------------------
    // LOGS
    // -------------------------------------------------------------------------

    logs:
        []
};

// -----------------------------------------------------------------------------
// STORE
// -----------------------------------------------------------------------------

class ArchitectStateStore {

    // -------------------------------------------------------------------------
    // CONSTRUCTOR
    // -------------------------------------------------------------------------

    constructor() {

        this.state =
            clone(
                DEFAULT_STATE
            );

        this.listeners =
            new Set();

        console.log(
            '🧠 ArchitectState initialized.'
        );
    }

    // -------------------------------------------------------------------------
    // GET STATE
    // -------------------------------------------------------------------------

    getState() {

        return clone(
            this.state
        );
    }

    // -------------------------------------------------------------------------
    // SET STATE
    // -------------------------------------------------------------------------

    setState(
        partial = {}
    ) {

        this.state = {

            ...this.state,

            ...partial
        };

        this.emit();

        return this.getState();
    }

    // -------------------------------------------------------------------------
    // PATCH
    // -------------------------------------------------------------------------

    patch(
        updater
    ) {

        if (
            typeof updater !==
            'function'
        ) {

            return this.getState();
        }

        const next =
            updater(
                this.getState()
            );

        return this.setState(
            next
        );
    }

    // -------------------------------------------------------------------------
    // RESET
    // -------------------------------------------------------------------------

    reset() {

        this.state =
            clone(
                DEFAULT_STATE
            );

        this.emit();

        console.log(
            '♻️ ArchitectState reset.'
        );
    }

    // -------------------------------------------------------------------------
    // LOG
    // -------------------------------------------------------------------------

    addLog(
        level,
        message,
        metadata = null
    ) {

        const logs =
            [
                ...this.state.logs
            ];

        logs.unshift({

            id:
                createId(),

            timestamp:
                Date.now(),

            level:
                level || 'info',

            message:
                String(
                    message || ''
                ),

            metadata
        });

        // ---------------------------------------------------------------------
        // LIMIT
        // ---------------------------------------------------------------------

        if (
            logs.length > 200
        ) {

            logs.length =
                200;
        }

        this.state.logs =
            logs;

        this.emit();

        return logs[0];
    }

    // -------------------------------------------------------------------------
    // PATCH HISTORY
    // -------------------------------------------------------------------------

    addPatchHistory(
        entry = {}
    ) {

        const history =
            [
                ...this.state.patchHistory
            ];

        history.unshift({

            id:
                createId(),

            timestamp:
                Date.now(),

            summary:
                entry.summary || '',

            patch:
                entry.patch || '',

            response:
                entry.response || null
        });

        // ---------------------------------------------------------------------
        // LIMIT
        // ---------------------------------------------------------------------

        if (
            history.length > 50
        ) {

            history.length =
                50;
        }

        this.state.patchHistory =
            history;

        this.emit();

        return history[0];
    }

    // -------------------------------------------------------------------------
    // LOADING
    // -------------------------------------------------------------------------

    setLoading(
        value = false
    ) {

        this.state.loading =
            !!value;

        this.state.status =
            value
                ? 'loading'
                : 'idle';

        this.emit();
    }

    // -------------------------------------------------------------------------
    // ERROR
    // -------------------------------------------------------------------------

    setError(
        error
    ) {

        this.state.error =
            error
                ? String(error)
                : null;

        this.state.status =
            error
                ? 'error'
                : 'idle';

        this.state.loading =
            false;

        this.emit();

        if (error) {

            this.addLog(
                'error',
                String(error)
            );
        }
    }

    // -------------------------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------------------------

    setResponse(
        response
    ) {

        this.state.lastResponse =
            response || null;

        this.state.loading =
            false;

        this.state.status =
            'success';

        // ---------------------------------------------------------------------
        // PATCH
        // ---------------------------------------------------------------------

        if (
            response?.patch
        ) {

            this.state.lastPatch =
                response.patch;

            this.addPatchHistory({

                summary:
                    response.summary ||

                    'AI patch generated.',

                patch:
                    response.patch,

                response
            });
        }

        this.emit();
    }

    // -------------------------------------------------------------------------
    // SCAN
    // -------------------------------------------------------------------------

    setScan(
        scan
    ) {

        this.state.lastScan =
            scan || null;

        this.state.lastScanTime =
            Date.now();

        this.emit();

        this.addLog(
            'info',
            'Runtime scan completed.'
        );
    }

    // -------------------------------------------------------------------------
    // TAB
    // -------------------------------------------------------------------------

    setActiveTab(
        tab
    ) {

        this.state.activeTab =
            String(
                tab || 'repair'
            );

        this.emit();
    }

    // -------------------------------------------------------------------------
    // VISIBILITY
    // -------------------------------------------------------------------------

    setVisible(
        value
    ) {

        this.state.visible =
            !!value;

        this.emit();
    }

    // -------------------------------------------------------------------------
    // MINIMIZE
    // -------------------------------------------------------------------------

    setMinimized(
        value
    ) {

        this.state.minimized =
            !!value;

        this.emit();
    }

    // -------------------------------------------------------------------------
    // SUBSCRIBE
    // -------------------------------------------------------------------------

    subscribe(
        listener
    ) {

        if (
            typeof listener !==
            'function'
        ) {

            return () => {};
        }

        this.listeners.add(
            listener
        );

        // ---------------------------------------------------------------------
        // INITIAL PUSH
        // ---------------------------------------------------------------------

        listener(
            this.getState()
        );

        // ---------------------------------------------------------------------
        // UNSUBSCRIBE
        // ---------------------------------------------------------------------

        return () => {

            this.listeners.delete(
                listener
            );
        };
    }

    // -------------------------------------------------------------------------
    // EMIT
    // -------------------------------------------------------------------------

    emit() {

        const snapshot =
            this.getState();

        this.listeners.forEach(
            (listener) => {

                try {

                    listener(
                        snapshot
                    );

                } catch (err) {

                    console.error(
                        '[ArchitectState]',
                        err
                    );
                }
            }
        );
    }
}

// -----------------------------------------------------------------------------
// SINGLETON
// -----------------------------------------------------------------------------

const architectState =
    window.__architectState ||

    new ArchitectStateStore();

// -----------------------------------------------------------------------------
// GLOBAL
// -----------------------------------------------------------------------------

window.__architectState =
    architectState;

// -----------------------------------------------------------------------------
// EXPORTS
// -----------------------------------------------------------------------------

export function getArchitectState() {

    return architectState;
}

export function useArchitectState() {

    return architectState;
}

export default architectState;
