import './style.css'; // CRITICAL: This is what turns the screen dark!
import { SynthNetwork } from './websocket';
import { StateStore } from './store';
import { setupUI } from './controls';

// 1. Initialize Network
const ESP32_IP = 'synth-hardware.local'; // Ensure this is your ESP32's IP
const network = new SynthNetwork(ESP32_IP);

// 2. Scaffold UI
const appContainer = document.querySelector<HTMLDivElement>('#app');
if (!appContainer) {
    throw new Error("CRITICAL: Missing <div id='app'></div> in your root index.html file.");
}

// 3. Mount the UI and connect
const pianoRoll = setupUI(network, appContainer);
network.connect();

// 4. Cache UI Elements for the fast loop
const elCutoff = document.getElementById('tel-cutoff');
const elRes = document.getElementById('tel-res');
const elOscMix = document.getElementById('tel-oscmix');
const elFxMix = document.getElementById('tel-fxmix');
const elMorph1 = document.getElementById('tel-morph1');
const elMorph2 = document.getElementById('tel-morph2');
const lfo1Slider = document.getElementById('fx-lfo1Rate') as HTMLInputElement;

// 5. Fast Render Loop
function renderLoop() {
    if (elCutoff) elCutoff.textContent = StateStore.telemetry.cutoff.toString();
    if (elRes) elRes.textContent = (StateStore.telemetry.res * 100).toFixed(1);
    if (elOscMix) elOscMix.textContent = (StateStore.telemetry.oscMix * 100).toFixed(1);
    if (elFxMix) elFxMix.textContent = (StateStore.telemetry.masterFxMix * 100).toFixed(1);
    if (elMorph1) elMorph1.textContent = StateStore.telemetry.morph1.toFixed(2);
    if (elMorph2) elMorph2.textContent = StateStore.telemetry.morph2.toFixed(2);

    // Hardware Potentiometer Two-Way Sync
    if (lfo1Slider && document.activeElement !== lfo1Slider) {
        lfo1Slider.value = StateStore.telemetry.lfo1Rate.toString();
    }

    // Move Sequencer Playhead
    if (pianoRoll) pianoRoll.updatePlayhead(StateStore.telemetry.currentStep);
    
    requestAnimationFrame(renderLoop);
}

renderLoop();