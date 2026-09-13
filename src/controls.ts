import { SynthNetwork } from './websocket';
import { SequencerUI } from './sequencer';

export function setupUI(network: SynthNetwork, container: HTMLElement): SequencerUI {
    // Labels corresponding exactly to the 16 direct pots mapped in UI.cpp
    const directLabels = [
        'O1 Vol', 'O2 Vol', 'Noise Vol', 'Noise Color',
        'Cutoff', 'Resonance', 'Env Amt',
        'Amp A', 'Amp D', 'Amp S', 'Amp R',
        'Filt A', 'Filt D', 'Filt S', 'Filt R',
        'Master Vol'
    ];

    container.innerHTML = `
        <div style="max-width: 1200px; margin: 0 auto; padding: 40px 20px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; border-bottom: 2px solid var(--border-dim); padding-bottom: 10px;">
                <h1 style="margin: 0; font-size: 28px; letter-spacing: 4px; color: var(--text-main);">CORE II <span style="color: var(--neon-cyan);">VIRTUAL RIG</span></h1>
                <h3 id="ws-status" style="margin: 0; font-size: 14px; color: var(--neon-pink); text-transform: uppercase;">Status: Offline</h3>
            </div>

            <!-- GLOBALS -->
            <div class="module-box" style="margin-bottom: 20px;">
                <h3 class="module-title">System Globals</h3>
                <div style="display: flex; gap: 20px; align-items: center;">
                    <div>
                        <label style="font-size: 12px; color: var(--text-dim);">MIDI Source</label>
                        <select id="ctrl-midiSource" style="width: 170px; display: block; margin-top: 5px;">
                            <option value="0">Web Sequencer</option>
                            <option value="1">USB MIDI Keyboard</option>
                        </select>
                    </div>
                    <div style="flex: 1; text-align: right;">
                        <div style="font-size: 12px; color: var(--text-dim);">Current ESP32 Menu Page</div>
                        <div id="tel-menuPage" style="font-size: 24px; color: var(--neon-green); font-weight: bold;">0</div>
                    </div>
                </div>
            </div>

            <!-- VIRTUAL ENCODERS -->
            <div class="module-box" style="margin-bottom: 20px;">
                <h3 class="module-title">Virtual Encoders (Menu Nav)</h3>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                    ${[0, 1, 2].map(id => `
                        <div style="text-align: center; padding: 10px; background: var(--bg-input); border-radius: 4px; border: 1px solid var(--border-dim);">
                            <div style="font-size: 12px; color: var(--text-dim); margin-bottom: 10px;">Encoder ${id} ${id===0?'(Page)':id===1?'(Param)':'(Value)'}</div>
                            <div style="display: flex; gap: 5px; justify-content: center;">
                                <button class="enc-btn" data-id="${id}" data-delta="-1">◀</button>
                                <button class="enc-btn push" data-id="${id}" data-btn="true">PUSH</button>
                                <button class="enc-btn" data-id="${id}" data-delta="1">▶</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- VIRTUAL POTS (PAGE SPECIFIC) -->
            <div class="module-box" style="margin-bottom: 20px;">
                <h3 class="module-title">Page-Specific Pots (Soft Catch-up)</h3>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
                    ${[16, 17, 18, 19].map((id, i) => `
                        <div>
                            <label style="font-size: 12px; color: var(--neon-pink);">Pot ${id} (P${i})</label>
                            <input type="range" class="v-pot" data-id="${id}" min="0" max="1" step="0.001" value="0.5">
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- VIRTUAL POTS (DIRECT) -->
            <div class="module-box" style="margin-bottom: 20px;">
                <h3 class="module-title">Direct Pots</h3>
                <div style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 15px; row-gap: 25px;">
                    ${directLabels.map((lbl, id) => `
                        <div style="text-align: center;">
                            <label style="font-size: 11px; color: var(--text-dim); white-space: nowrap;">${id}: ${lbl}</label>
                            <input type="range" class="v-pot" data-id="${id}" min="0" max="1" step="0.001" value="${id === 15 ? '0.8' : '0.5'}">
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- SEQUENCER (Unchanged) -->
            <div class="module-box" style="margin-bottom: 80px; padding: 0; overflow: hidden; border: 1px solid var(--border-dim);">
                 <div id="seq-container"></div>
            </div>
        </div>
    `;

    // 1. MIDI Source Toggle Binding
    document.getElementById('ctrl-midiSource')?.addEventListener('change', (e) => {
        network.sendCommand({ type: 'midiSource', val: parseInt((e.target as HTMLSelectElement).value, 10) });
    });

    // 2. Virtual Encoders Binding
    document.querySelectorAll('.enc-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLButtonElement;
            const id = parseInt(target.getAttribute('data-id')!, 10);
            const delta = parseInt(target.getAttribute('data-delta') || '0', 10);
            const isBtn = target.getAttribute('data-btn') === 'true';
            
            network.sendCommand({ type: 'encoder', id, delta, btn: isBtn });
        });
    });

    // 3. Virtual Pots Binding
    document.querySelectorAll('.v-pot').forEach(pot => {
        pot.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            const id = parseInt(target.getAttribute('data-id')!, 10);
            const val = parseFloat(target.value);
            
            network.sendCommand({ type: 'pot', id, val });
        });
    });

    // Mount the flawless piano roll into the container
    return new SequencerUI(network, 'seq-container');
}