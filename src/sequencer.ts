import { SynthNetwork } from './websocket';

interface NoteEvent { step: number; pitch: number; len: number; }

export class SequencerUI {
    private network: SynthNetwork;
    private container: HTMLElement;
    
    private numSteps = 64; 
    private stepsPerBeat = 4;
    private beatsPerBar = 4;
    private minPitch = 24; // C1
    private maxPitch = 107; // B7
    private cellW = 32;
    private cellH = 16;
    private keyW = 60; 
    private maxPolyphony = 6;
    
    private notes: NoteEvent[] = [];
    private scaleIntervals = [0, 2, 4, 5, 7, 9, 11]; // Major default
    private rootNote = 0; // C
    
    private mode: 'draw' | 'erase' = 'draw';
    private dragTarget: NoteEvent | null = null;
    private dragAction: 'move' | 'resize' | null = null;
    private dragStartStep = 0;
    private dragStartPitch = 0;
    private originalNoteState: NoteEvent | null = null;

    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;
    private keysCanvas!: HTMLCanvasElement;
    private keysCtx!: CanvasRenderingContext2D;
    private playhead!: HTMLDivElement;
    private viewport!: HTMLDivElement;
    private innerWrapper!: HTMLDivElement;
    private totalH!: number;

    constructor(network: SynthNetwork, containerId: string) {
        this.network = network;
        this.container = document.getElementById(containerId)!;
        this.buildUI();
        this.bindEvents();
        this.scaleCanvases();
        this.drawKeys(); 
        this.drawGrid(); 
    }

    private buildUI() {
        const totalW = this.numSteps * this.cellW;
        this.totalH = (this.maxPitch - this.minPitch + 1) * this.cellH;

        // Unified button style matching the cyberpunk theme controls
        const btnStyle = `background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-dim); padding: 6px 12px; border-radius: 4px; font-family: monospace; font-size: 11px; text-transform: uppercase; cursor: pointer;`;

        this.container.innerHTML = `
            <div class="module-box" style="border: none; border-radius: 0; padding: 15px;">
                <div style="display: flex; gap: 12px; margin-bottom: 15px; align-items: center; flex-wrap: wrap;">
                    <button id="seq-play" style="${btnStyle}">Play</button>
                    <button id="seq-pause" style="${btnStyle}">Pause</button>
                    <button id="seq-restart" style="${btnStyle}">Restart</button>
                    
                    <div style="border-left: 1px solid var(--border-dim); height: 20px;"></div>
                    
                    <label style="color: var(--text-dim); font-size: 12px;">BPM: 
                        <input type="number" id="seq-bpm" value="120" style="width: 55px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-dim); padding: 4px; border-radius: 4px;">
                    </label>

                    <label style="color: var(--text-dim); font-size: 12px;">Length: 
                        <input type="number" id="seq-len" value="${this.numSteps}" step="16" min="16" max="1024" style="width: 55px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-dim); padding: 4px; border-radius: 4px;">
                    </label>

                    <div style="border-left: 1px solid var(--border-dim); height: 20px;"></div>
                    
                    <select id="seq-root" style="width: auto;">
                        ${['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].map((n, i) => `<option value="${i}">${n}</option>`).join('')}
                    </select>
                    
                    <select id="seq-scale" style="width: auto;">
                        <option value="0,2,4,5,7,9,11">Major</option>
                        <option value="0,2,3,5,7,8,10">Natural Minor</option>
                        <option value="0,2,3,5,7,9,10">Dorian</option>
                        <option value="0,1,3,5,7,8,10">Phrygian</option>
                        <option value="0,3,5,6,7,10">Blues</option>
                        <option value="0,1,2,3,4,5,6,7,8,9,10,11">Chromatic</option>
                    </select>
                    
                    <div style="border-left: 1px solid var(--border-dim); height: 20px;"></div>
                    
                    <button id="seq-mode" style="${btnStyle} border-color: var(--neon-cyan); color: var(--neon-cyan);">Mode: Draw</button>
                </div>
                
                <!-- VIEWPORT -->
                <div id="seq-viewport" style="width: 100%; height: 400px; overflow: auto; background: var(--bg-input); border: 1px solid var(--border-dim); border-radius: 4px;">
                    <div id="seq-inner" style="position: relative; width: ${this.keyW + totalW}px; height: ${this.totalH}px;">
                        
                        <!-- STICKY PIANO KEYS -->
                        <div style="position: sticky; left: 0; top: 0; width: ${this.keyW}px; height: ${this.totalH}px; z-index: 20; box-shadow: 2px 0 8px rgba(0,0,0,0.8); float: left;">
                            <canvas id="seq-keys" style="display: block;"></canvas>
                        </div>
                        
                        <!-- GRID WRAPPER -->
                        <div id="seq-grid-wrapper" style="position: absolute; left: ${this.keyW}px; top: 0; width: ${totalW}px; height: ${this.totalH}px;">
                            <!-- PLAYHEAD FIXED TO TOTAL HEIGHT -->
                            <div id="seq-playhead" style="position: absolute; top: 0; height: ${this.totalH}px; left: 0; width: 2px; background: var(--neon-green); z-index: 10; pointer-events: none; box-shadow: 0 0 10px var(--neon-green);"></div>
                            <canvas id="seq-canvas" style="display: block; cursor: crosshair; touch-action: none;"></canvas>
                        </div>
                        
                    </div>
                </div>
            </div>
        `;

        this.canvas = document.getElementById('seq-canvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.keysCanvas = document.getElementById('seq-keys') as HTMLCanvasElement;
        this.keysCtx = this.keysCanvas.getContext('2d')!;
        this.playhead = document.getElementById('seq-playhead') as HTMLDivElement;
        this.viewport = document.getElementById('seq-viewport') as HTMLDivElement;
        this.innerWrapper = document.getElementById('seq-inner') as HTMLDivElement;

        // Auto-scroll vertically to middle (C4 = Pitch 60)
        this.viewport.scrollTop = ((this.maxPitch - 60) * this.cellH) - (this.viewport.clientHeight / 2);
    }

    private scaleCanvases() {
        const dpr = window.devicePixelRatio || 1;
        const totalW = this.numSteps * this.cellW;

        // Scale Main Grid for High-DPI displays
        this.canvas.width = totalW * dpr;
        this.canvas.height = this.totalH * dpr;
        this.canvas.style.width = `${totalW}px`;
        this.canvas.style.height = `${this.totalH}px`;
        this.ctx.scale(dpr, dpr);

        // Scale Piano Keys for High-DPI displays
        this.keysCanvas.width = this.keyW * dpr;
        this.keysCanvas.height = this.totalH * dpr;
        this.keysCanvas.style.width = `${this.keyW}px`;
        this.keysCanvas.style.height = `${this.totalH}px`;
        this.keysCtx.scale(dpr, dpr);
    }

    private drawKeys() {
        const ctx = this.keysCtx;
        ctx.clearRect(0, 0, this.keyW, this.totalH);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.font = '10px monospace';

        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        for (let p = this.maxPitch; p >= this.minPitch; p--) {
            const y = (this.maxPitch - p) * this.cellH;
            const noteInOctave = p % 12;
            const isBlack = [1, 3, 6, 8, 10].includes(noteInOctave);
            const octave = Math.floor(p / 12) - 1; // MIDI standard: C4 = 60
            const label = `${noteNames[noteInOctave]}${octave}`;

            if (isBlack) {
                ctx.fillStyle = '#090d16';
                ctx.fillRect(0, y, this.keyW, this.cellH);
                ctx.strokeStyle = '#020408';
                ctx.strokeRect(0, y, this.keyW, this.cellH);
                
                ctx.fillStyle = '#475569';
                ctx.fillText(label, this.keyW - 8, y + (this.cellH / 2));
            } else {
                ctx.fillStyle = noteInOctave === 0 ? '#cbd5e1' : '#e2e8f0';
                ctx.fillRect(0, y, this.keyW, this.cellH);
                ctx.strokeStyle = '#94a3b8';
                ctx.strokeRect(0, y, this.keyW, this.cellH);
                
                ctx.fillStyle = noteInOctave === 0 ? '#0f172a' : '#334155';
                ctx.fillText(label, this.keyW - 8, y + (this.cellH / 2));
            }
        }
    }

    private drawGrid() {
        const ctx = this.ctx;
        const w = this.numSteps * this.cellW;
        ctx.clearRect(0, 0, w, this.totalH);

        // 1. Draw Horizontal Rows (Pitch & Scale highlighting)
        for (let p = this.maxPitch; p >= this.minPitch; p--) {
            const y = (this.maxPitch - p) * this.cellH;
            const noteInOctave = p % 12;
            const isRoot = noteInOctave === this.rootNote;
            
            const offsetFromRoot = (noteInOctave - this.rootNote + 12) % 12;
            const inScale = this.scaleIntervals.includes(offsetFromRoot);
            const isBlackKey = [1,3,6,8,10].includes(noteInOctave);

            if (isRoot) ctx.fillStyle = 'rgba(0, 240, 255, 0.08)'; 
            else if (!inScale) ctx.fillStyle = '#04060d'; 
            else if (isBlackKey) ctx.fillStyle = '#080c16'; 
            else ctx.fillStyle = '#0d1220'; 

            ctx.fillRect(0, y, w, this.cellH);
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // 2. Draw Vertical Columns (Time)
        for (let s = 0; s <= this.numSteps; s++) {
            const x = s * this.cellW;
            const isBar = s % (this.stepsPerBeat * this.beatsPerBar) === 0;
            const isBeat = s % this.stepsPerBeat === 0;

            if (isBar) { ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; ctx.lineWidth = 2; }
            else if (isBeat) { ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'; ctx.lineWidth = 1; }
            else { ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)'; ctx.lineWidth = 1; }

            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.totalH); ctx.stroke();
        }

        // 3. Draw Notes with Neon Glow Effect
        this.notes.forEach(n => {
            const x = n.step * this.cellW;
            const y = (this.maxPitch - n.pitch) * this.cellH;
            const noteW = n.len * this.cellW;
            
            // Enable Neon Cyan Glow
            ctx.shadowBlur = 12;
            ctx.shadowColor = 'var(--neon-cyan)';
            
            ctx.fillStyle = 'var(--neon-cyan)'; 
            ctx.fillRect(x + 1, y + 1, noteW - 2, this.cellH - 2);

            // Disable shadow for crisp edge handle rendering
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + noteW - 6, y + 1, 4, this.cellH - 2);
        });
    }

    private bindEvents() {
        document.getElementById('seq-play')?.addEventListener('click', () => this.network.sendCommand({ type: 'seqCtrl', cmd: 'play' }));
        document.getElementById('seq-pause')?.addEventListener('click', () => this.network.sendCommand({ type: 'seqCtrl', cmd: 'pause' }));
        document.getElementById('seq-restart')?.addEventListener('click', () => this.network.sendCommand({ type: 'seqCtrl', cmd: 'restart' }));
        document.getElementById('seq-bpm')?.addEventListener('change', (e) => this.network.sendCommand({ type: 'bpm', val: parseInt((e.target as HTMLInputElement).value) }));
        
        const modeBtn = document.getElementById('seq-mode')!;
        modeBtn.addEventListener('click', () => {
            this.mode = this.mode === 'draw' ? 'erase' : 'draw';
            modeBtn.textContent = `Mode: ${this.mode === 'draw' ? 'Draw' : 'Erase'}`;
            modeBtn.style.color = this.mode === 'draw' ? 'var(--neon-cyan)' : 'var(--neon-pink)';
            modeBtn.style.borderColor = this.mode === 'draw' ? 'var(--neon-cyan)' : 'var(--neon-pink)';
        });

        document.getElementById('seq-root')?.addEventListener('change', (e) => {
            this.rootNote = parseInt((e.target as HTMLSelectElement).value);
            this.drawGrid();
        });

        document.getElementById('seq-scale')?.addEventListener('change', (e) => {
            this.scaleIntervals = (e.target as HTMLSelectElement).value.split(',').map(Number);
            this.drawGrid();
        });

        document.getElementById('seq-len')?.addEventListener('change', (e) => {
            this.numSteps = parseInt((e.target as HTMLInputElement).value);
            const newTotalW = this.numSteps * this.cellW;
            document.getElementById('seq-grid-wrapper')!.style.width = `${newTotalW}px`;
            this.innerWrapper.style.width = `${this.keyW + newTotalW}px`;
            this.scaleCanvases();
            this.drawGrid();
            this.compileAndSend();
        });

        this.canvas.addEventListener('contextmenu', e => e.preventDefault());

        const getCoords = (e: MouseEvent | TouchEvent) => {
            const rect = this.canvas.getBoundingClientRect();
            let clientX, clientY;
            
            if ('touches' in e) {
                if (e.touches.length > 0) {
                    clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
                } else if (e.changedTouches.length > 0) {
                    clientX = e.changedTouches[0].clientX; clientY = e.changedTouches[0].clientY;
                } else return null;
            } else {
                clientX = e.clientX; clientY = e.clientY;
            }

            const x = clientX - rect.left;
            const y = clientY - rect.top;
            const step = Math.floor(x / this.cellW);
            const pitch = this.maxPitch - Math.floor(y / this.cellH);
            return { x, y, step, pitch };
        };

        const onDown = (e: MouseEvent | TouchEvent) => {
            const coords = getCoords(e);
            if (!coords) return;
            const { x, step, pitch } = coords;
            
            const isRightClick = 'button' in e && e.button === 2;
            const isErase = isRightClick || this.mode === 'erase';
            
            const clickedNoteIdx = this.notes.findIndex(n => 
                pitch === n.pitch && step >= n.step && step < n.step + n.len
            );

            if (clickedNoteIdx > -1) {
                const note = this.notes[clickedNoteIdx];
                if (isErase) {
                    this.notes.splice(clickedNoteIdx, 1);
                    this.drawGrid();
                    this.compileAndSend();
                    return;
                }
                
                e.preventDefault(); 
                this.dragTarget = note;
                this.originalNoteState = { ...note };
                
                const noteRightEdgeX = (note.step + note.len) * this.cellW;
                if (x >= noteRightEdgeX - 12) {
                    this.dragAction = 'resize';
                } else {
                    this.dragAction = 'move';
                    this.dragStartStep = step;
                    this.dragStartPitch = pitch;
                }
            } else if (!isErase) {
                const activeNotesInStep = this.notes.filter(n => step >= n.step && step < n.step + n.len).length;
                if (activeNotesInStep >= this.maxPolyphony) return; 

                e.preventDefault();
                const newNote = { step, pitch, len: 1 };
                this.notes.push(newNote);
                this.dragTarget = newNote;
                this.dragAction = 'resize'; 
                this.drawGrid();
            }
        };

        const onMove = (e: MouseEvent | TouchEvent) => {
            if (!this.dragTarget || !this.dragAction) return;
            e.preventDefault(); 
            
            const coords = getCoords(e);
            if (!coords) return;
            const { step, pitch } = coords;

            let changed = false;

            if (this.dragAction === 'resize') {
                const newLen = Math.max(1, step - this.dragTarget.step + 1);
                if (newLen !== this.dragTarget.len) {
                    this.dragTarget.len = newLen;
                    changed = true;
                }
            } else if (this.dragAction === 'move' && this.originalNoteState) {
                const stepDelta = step - this.dragStartStep;
                const pitchDelta = pitch - this.dragStartPitch;
                
                const newStep = Math.max(0, Math.min(this.numSteps - 1, this.originalNoteState.step + stepDelta));
                const newPitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.originalNoteState.pitch + pitchDelta));

                if (newStep !== this.dragTarget.step || newPitch !== this.dragTarget.pitch) {
                    this.dragTarget.step = newStep;
                    this.dragTarget.pitch = newPitch;
                    changed = true;
                }
            }

            if (changed) this.drawGrid();
        };

        const onUp = () => {
            if (this.dragTarget) {
                this.dragTarget = null;
                this.dragAction = null;
                this.compileAndSend();
            }
        };

        this.canvas.addEventListener('mousedown', onDown);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        
        this.canvas.addEventListener('touchstart', onDown, { passive: false });
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp);
    }

    private compileAndSend() {
        const stepsGrouped: Array<Array<{n: number, l: number}>> = Array(this.numSteps).fill(null).map(() => []);
        
        this.notes.forEach(note => {
            if (note.step < this.numSteps) {
                stepsGrouped[note.step].push({ n: note.pitch, l: note.len });
            }
        });

        this.network.sendCommand({
            type: 'sequence',
            numSteps: this.numSteps,
            stepsPerBeat: this.stepsPerBeat,
            beatsPerBar: this.beatsPerBar,
            steps: stepsGrouped
        });
    }

    public updatePlayhead(currentStep: number) {
        if (currentStep >= 0 && currentStep < this.numSteps) {
            this.playhead.style.transform = `translateX(${currentStep * this.cellW}px)`;
        }
    }
}