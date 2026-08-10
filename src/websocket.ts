import { StateStore } from './store';

export class SynthNetwork {
    private ws: WebSocket | null = null;
    public host: string; 

    constructor(host: string) {
        this.host = host;
    }

    connect() {
        // Targets port 81 as defined in SynthNetwork.cpp
        this.ws = new WebSocket(`ws://${this.host}:81`); 

        this.ws.onopen = () => {
            console.log('[WS] Connected to CORE II');
            this.updateStatus(true);
        };

        this.ws.onclose = () => {
            console.log('[WS] Offline. Retrying in 2 seconds...');
            this.updateStatus(false);
            setTimeout(() => this.connect(), 2000);
        };

        this.ws.onmessage = (event) => {
            try {
                const doc = JSON.parse(event.data);
                
                if (doc.type === 'telemetry') {
                    // FAST PATH: Overwrite the store instantly in memory.
                    Object.assign(StateStore.telemetry, doc);
                } else if (doc.type === 'manifest') {
                    console.log('[WS] Manifest received:', doc.data);
                }
            } catch (e) {
                console.error('[WS] JSON Parse Error:', e);
            }
        };
    }

    sendCommand(payload: object) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(payload));
        }
    }

    private updateStatus(connected: boolean) {
        const badge = document.getElementById('ws-status');
        if (badge) {
            badge.textContent = connected ? 'Status: Linked' : 'Status: Offline';
            badge.style.color = connected ? '#4ade80' : '#f87171';
        }
    }
}   