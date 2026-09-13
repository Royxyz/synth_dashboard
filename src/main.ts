import './style.css'; 
import { SynthNetwork } from './websocket';
import { StateStore } from './store';
import { setupUI } from './controls';

const ESP32_IP = 'synth-hardware.local';
const network = new SynthNetwork(ESP32_IP);

const appContainer = document.querySelector<HTMLDivElement>('#app');
if (!appContainer) throw new Error("CRITICAL: Missing <div id='app'></div>");

const pianoRoll = setupUI(network, appContainer);
network.connect();

const elMenuPage = document.getElementById('tel-menuPage');
const elMidiSource = document.getElementById('ctrl-midiSource') as HTMLSelectElement;

function renderLoop() {
    // Update active menu page readout
    if (elMenuPage) elMenuPage.textContent = StateStore.telemetry.menuPage.toString();

    // Two-way sync for MIDI source toggle (if changed from the ESP32 itself)
    if (elMidiSource && document.activeElement !== elMidiSource) {
        elMidiSource.value = StateStore.telemetry.midiSource.toString();
    }

    // Move Sequencer Playhead
    if (pianoRoll) pianoRoll.updatePlayhead(StateStore.telemetry.currentStep);
    
    requestAnimationFrame(renderLoop);
}

renderLoop();