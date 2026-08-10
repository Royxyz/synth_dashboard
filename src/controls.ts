import { SynthNetwork } from './websocket';
import { SequencerUI } from './sequencer';
import { initEnvelopes } from './envelope';

export function setupUI(network: SynthNetwork, container: HTMLElement): SequencerUI {
    container.innerHTML = `
        <div style="max-width: 1200px; margin: 0 auto; padding: 40px 20px;">
            
            <!-- HEADER -->
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; border-bottom: 2px solid var(--border-dim); padding-bottom: 10px;">
                <h1 style="margin: 0; font-size: 28px; letter-spacing: 4px; color: var(--text-main);">CORE II <span style="color: var(--neon-cyan);">NEXUS</span></h1>
                <h3 id="ws-status" style="margin: 0; font-size: 14px; color: var(--neon-pink); text-transform: uppercase;">Status: Offline</h3>
            </div>

            <!-- ROW 1: MASTER GLOBALS & FILTER -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px;">
                <div class="module-box">
                    <h3 class="module-title">Master Output</h3>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>Osc Mix</span> <span class="readout" id="tel-oscmix">0</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>FX Mix</span> <span class="readout" id="tel-fxmix">0</span>
                    </div>
                </div>
                
                <div class="module-box" style="grid-column: span 2;">
                    <h3 class="module-title">State-Variable Filter</h3>
                    <div style="display: flex; gap: 20px;">
                        <div style="flex: 1;">
                            <label style="font-size: 12px; color: var(--text-dim);">Mode</label>
                            <select id="tgl-filterMode">
                                <option value="0">Low-Pass</option><option value="1">Band-Pass</option><option value="2">High-Pass</option>
                            </select>
                        </div>
                        <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-end;">
                            <div style="display: flex; justify-content: space-between;"><span>Cutoff (Hz)</span><span class="readout" id="tel-cutoff">0</span></div>
                        </div>
                        <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-end;">
                            <div style="display: flex; justify-content: space-between;"><span>Resonance</span><span class="readout" id="tel-res">0</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ROW 2: GENERATORS & MODULATORS -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 20px;">
                <div class="module-box">
                    <h3 class="module-title">Oscillator 1</h3>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                        <span style="font-size: 12px; color: var(--text-dim);">Morph</span> <span class="readout" id="tel-morph1">0.00</span>
                    </div>
                    <select id="tgl-osc1Bank" style="margin-bottom: 15px;">
                        <option value="0">Bank 0</option><option value="1">Bank 1</option><option value="2">Bank 2</option>
                    </select>
                    <label style="font-size: 12px; color: var(--text-dim);">Coarse Tune</label>
                    <input type="range" id="tune-1" min="-24" max="24" value="0">
                </div>

                <div class="module-box">
                    <h3 class="module-title">Oscillator 2</h3>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                        <span style="font-size: 12px; color: var(--text-dim);">Morph</span> <span class="readout" id="tel-morph2">0.00</span>
                    </div>
                    <select id="tgl-osc2Bank" style="margin-bottom: 15px;">
                        <option value="0">Bank 0</option><option value="1">Bank 1</option><option value="2">Bank 2</option>
                    </select>
                    <label style="font-size: 12px; color: var(--text-dim);">Coarse Tune</label>
                    <input type="range" id="tune-2" min="-24" max="24" value="0">
                </div>

                <div class="module-box">
                    <h3 class="module-title">LFO 1 (Global)</h3>
                    <select id="tgl-lfo1Wave" style="margin-bottom: 15px;">
                        <option value="0">Sine</option><option value="1">Saw</option><option value="2">Square</option><option value="3">Random</option>
                    </select>
                    <label style="font-size: 12px; color: var(--text-dim);">Rate (Hz)</label>
                    <input type="range" id="fx-lfo1Rate" min="0.1" max="20" step="0.1" value="1.0">
                </div>

                <div class="module-box">
                    <h3 class="module-title">LFO 2 (Per-Voice)</h3>
                    <select id="tgl-lfo2Wave" style="margin-bottom: 15px;">
                        <option value="0">Sine</option><option value="1">Saw</option><option value="2">Square</option><option value="3">Random</option>
                    </select>
                    <label style="font-size: 12px; color: var(--text-dim);">Rate (Hz)</label>
                    <input type="range" id="fx-lfo2Rate" min="0.1" max="20" step="0.1" value="1.0">
                </div>
            </div>

            <!-- ROW 3: ENVELOPES -->
            <div id="env-container" style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 20px;"></div>

            <!-- ROW 4: CYBERPUNK MOD MATRIX -->
            <div class="module-box" style="margin-bottom: 20px;">
                <h3 class="module-title">Modulation Matrix</h3>
                <div id="matrix-grid" style="display: grid; grid-template-columns: 100px repeat(5, 1fr); gap: 4px; align-items: center;">
                    <!-- Headers -->
                    <div></div>
                    <div style="font-size: 11px; color: var(--text-dim); text-align: center;">AMP</div>
                    <div style="font-size: 11px; color: var(--text-dim); text-align: center;">PITCH</div>
                    <div style="font-size: 11px; color: var(--text-dim); text-align: center;">OSC 1</div>
                    <div style="font-size: 11px; color: var(--text-dim); text-align: center;">OSC 2</div>
                    <div style="font-size: 11px; color: var(--text-dim); text-align: center;">CUTOFF</div>
                </div>
            </div>

            <!-- ROW 5: FX RACK -->
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px; margin-bottom: 20px;">
                <div class="module-box"><h3 class="module-title">Distortion</h3>
                    <label style="font-size: 12px; color: var(--text-dim);">Drive</label><input type="range" id="fx-distDrive" min="0" max="1" step="0.01" value="0">
                    <label style="font-size: 12px; color: var(--text-dim);">Mix</label><input type="range" id="fx-distMix" min="0" max="1" step="0.01" value="0">
                </div>
                <div class="module-box"><h3 class="module-title">Chorus</h3>
                    <label style="font-size: 12px; color: var(--text-dim);">Rate</label><input type="range" id="fx-chorusRate" min="0" max="1" step="0.01" value="0">
                    <label style="font-size: 12px; color: var(--text-dim);">Depth</label><input type="range" id="fx-chorusDepth" min="0" max="1" step="0.01" value="0">
                    <label style="font-size: 12px; color: var(--text-dim);">Mix</label><input type="range" id="fx-chorusMix" min="0" max="1" step="0.01" value="0">
                </div>
                <div class="module-box"><h3 class="module-title">Delay</h3>
                    <label style="font-size: 12px; color: var(--text-dim);">Time</label><input type="range" id="fx-delayTime" min="0" max="1" step="0.01" value="0">
                    <label style="font-size: 12px; color: var(--text-dim);">Feedback</label><input type="range" id="fx-delayFeedback" min="0" max="1" step="0.01" value="0">
                    <label style="font-size: 12px; color: var(--text-dim);">Mix</label><input type="range" id="fx-delayMix" min="0" max="1" step="0.01" value="0">
                </div>
                <div class="module-box"><h3 class="module-title">Abyss Reverb</h3>
                    <label style="font-size: 12px; color: var(--text-dim);">Size</label><input type="range" id="fx-reverbSize" min="0" max="1" step="0.01" value="0">
                    <label style="font-size: 12px; color: var(--text-dim);">Decay</label><input type="range" id="fx-reverbDecay" min="0" max="1" step="0.01" value="0">
                    <label style="font-size: 12px; color: var(--text-dim);">Mix</label><input type="range" id="fx-reverbMix" min="0" max="1" step="0.01" value="0">
                </div>
                <div class="module-box"><h3 class="module-title">Compressor</h3>
                    <label style="font-size: 12px; color: var(--text-dim);">Thresh</label><input type="range" id="fx-compThreshold" min="0" max="1" step="0.01" value="0">
                    <label style="font-size: 12px; color: var(--text-dim);">Ratio</label><input type="range" id="fx-compRatio" min="0" max="1" step="0.01" value="0">
                    <label style="font-size: 12px; color: var(--text-dim);">Makeup</label><input type="range" id="fx-compMakeup" min="0" max="1" step="0.01" value="0">
                </div>
            </div>

            <!-- ROW 6: WAVETABLE & SEQUENCER -->
            <div class="module-box" style="margin-bottom: 20px;">
                <h3 class="module-title">Wavetable PSRAM Hot-Swap</h3>
                <div style="display: flex; gap: 15px; align-items: center;">
                    <input type="file" id="wt-file" accept=".bin" style="color: var(--text-dim);" />
                    <select id="wt-bank" style="width: auto;">
                        <option value="0">Target: Bank 0</option><option value="1">Target: Bank 1</option><option value="2">Target: Bank 2</option>
                    </select>
                    <button id="wt-upload-btn" style="background: var(--neon-cyan); color: #000; border: none; padding: 6px 15px; border-radius: 4px; cursor: pointer; font-weight: bold;">UPLOAD & SWAP</button>
                    <span id="wt-status" style="font-size: 12px; font-weight: bold;"></span>
                </div>
            </div>

            <div class="module-box" style="margin-bottom: 80px; padding: 0; overflow: hidden; border: 1px solid var(--border-dim);">
                 <div id="seq-container"></div>
            </div>
        </div>
    `;

    // Generate Cyberpunk Mod Matrix Grid
    const matrixGrid = document.getElementById('matrix-grid')!;
    const sources = ['Velocity', 'Amp Env', 'Mod 1', 'Mod 2', 'LFO 1', 'LFO 2'];
    
    sources.forEach((srcName, rowIdx) => {
        matrixGrid.innerHTML += `<div style="font-size: 11px; color: var(--neon-cyan);">${srcName}</div>`;
        for (let colIdx = 0; colIdx < 5; colIdx++) {
            matrixGrid.innerHTML += `
                <input type="number" data-row="${rowIdx}" data-col="${colIdx}" class="matrix-input" min="-1.0" max="1.0" step="0.05" value="0">
            `;
        }
    });

    // Reattach Matrix Color Listeners (Neon glow on non-zero)
    document.querySelectorAll('.matrix-input').forEach(cell => {
        cell.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            const src = parseInt(target.getAttribute('data-row')!, 10);
            const dest = parseInt(target.getAttribute('data-col')!, 10);
            const val = parseFloat(target.value);
            
            // Apply neon styling if value is active
            target.style.color = val !== 0 ? 'var(--neon-green)' : 'var(--text-dim)';
            target.style.borderColor = val !== 0 ? 'var(--neon-green)' : 'var(--border-dim)';
            
            network.sendCommand({ type: 'matrix', src, dest, val });
        });
    });

    // Reattach Discrete Toggles
    ['osc1Bank', 'osc2Bank', 'filterMode', 'lfo1Wave', 'lfo2Wave'].forEach(id => {
        document.getElementById(`tgl-${id}`)?.addEventListener('change', (e) => {
            network.sendCommand({ type: 'toggle', id, val: parseInt((e.target as HTMLSelectElement).value, 10) });
        });
    });

    // Reattach Coarse Tuning
    ['1', '2'].forEach(osc => {
        document.getElementById(`tune-${osc}`)?.addEventListener('input', (e) => {
            network.sendCommand({ type: 'tune', osc: parseInt(osc, 10), coarse: parseInt((e.target as HTMLInputElement).value, 10) });
        });
    });

    // Reattach FX & LFO Rates
    const fxParams = [
        'distDrive', 'distMix', 'chorusRate', 'chorusDepth', 'chorusMix', 
        'delayTime', 'delayFeedback', 'delayMix', 'reverbSize', 'reverbDecay', 'reverbMix', 
        'compThreshold', 'compRatio', 'compMakeup', 'lfo1Rate', 'lfo2Rate'
    ];
    fxParams.forEach(param => {
        document.getElementById(`fx-${param}`)?.addEventListener('input', (e) => {
            network.sendCommand({ type: 'fx', param, val: parseFloat((e.target as HTMLInputElement).value) });
        });
    });

    // Reattach Wavetable Upload
    document.getElementById('wt-upload-btn')?.addEventListener('click', async () => {
        const fileInput = document.getElementById('wt-file') as HTMLInputElement;
        const bankSelect = document.getElementById('wt-bank') as HTMLSelectElement;
        const statusNode = document.getElementById('wt-status')!;
        
        if (!fileInput.files || fileInput.files.length === 0) {
            statusNode.textContent = "Error: Select .bin";
            statusNode.style.color = "var(--neon-pink)";
            return;
        }

        const file = fileInput.files[0];
        const bank = bankSelect.value;
        const formData = new FormData();
        formData.append("file", file, file.name);

        try {
            statusNode.textContent = "1/2: Uploading...";
            statusNode.style.color = "#facc15";
            const uploadRes = await fetch(`http://${network.host}/upload`, { method: 'POST', body: formData });
            if (!uploadRes.ok) throw new Error("Upload failed");

            statusNode.textContent = "2/2: Swapping PSRAM...";
            const filename = file.name.startsWith('/') ? file.name : `/${file.name}`;
            const loadRes = await fetch(`http://${network.host}/load?file=${filename}&bank=${bank}`);
            if (!loadRes.ok) throw new Error("Swap failed");
            
            statusNode.textContent = "Active.";
            statusNode.style.color = "var(--neon-green)";
        } catch (e: any) {
            statusNode.textContent = `Error: ${e.message}`;
            statusNode.style.color = "var(--neon-pink)";
        }
    });

    initEnvelopes(network, 'env-container');
    return new SequencerUI(network, 'seq-container');
}