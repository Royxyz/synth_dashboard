import { SynthNetwork } from './websocket';

class EnvelopeCard {
    private network: SynthNetwork;
    private target: 'amp' | 'mod1' | 'mod2';
    private color: string;
    private state = [0.1, 0.3, 0.5, 0.4]; 
    private w = 260;
    private h = 120;
    private pad = 12;
    private svgPath!: SVGPathElement;
    private handles: SVGCircleElement[] = [];
    private sliders: HTMLInputElement[] = [];
    private activeHandle: number | null = null;

    constructor(network: SynthNetwork, parent: HTMLElement, target: 'amp'|'mod1'|'mod2', title: string, color: string) {
        this.network = network;
        this.target = target;
        this.color = color;

        const card = document.createElement('div');
        card.className = 'module-box'; // Hooking into style.css
        card.style.flex = '1';
        card.style.minWidth = '250px';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        
        card.innerHTML = `
            <h4 class="module-title" style="color: ${color}; text-align: center;">${title}</h4>
            <svg width="100%" height="${this.h}" viewBox="0 0 ${this.w} ${this.h}" style="background: var(--bg-input); border-radius: 4px; border: 1px solid var(--border-dim); cursor: crosshair; touch-action: none;">
                <defs>
                    <linearGradient id="grad-${target}" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stop-color="${color}" stop-opacity="0.4"/>
                        <stop offset="100%" stop-color="${color}" stop-opacity="0.0"/>
                    </linearGradient>
                </defs>
                <line x1="0" y1="${this.h / 2}" x2="${this.w}" y2="${this.h / 2}" stroke="var(--border-dim)" stroke-dasharray="2" stroke-width="1"/>
                <path class="env-path" fill="url(#grad-${target})" stroke="${color}" stroke-width="2" stroke-linejoin="round"></path>
                <circle class="env-handle" data-idx="0" r="6" fill="#fff" stroke="${color}" stroke-width="2" style="cursor: ew-resize;"></circle>
                <circle class="env-handle" data-idx="1" r="6" fill="#fff" stroke="${color}" stroke-width="2" style="cursor: move;"></circle>
                <circle class="env-handle" data-idx="3" r="6" fill="#fff" stroke="${color}" stroke-width="2" style="cursor: ew-resize;"></circle>
            </svg>
            
            <div style="display: flex; gap: 8px; margin-top: 15px;">
                ${['A', 'D', 'S', 'R'].map((lbl, i) => `
                    <div style="flex: 1; text-align: center;">
                        <div style="color: var(--text-dim); font-size: 10px; margin-bottom: 4px;">${lbl}</div>
                        <input type="range" class="env-slider" data-idx="${i}" min="0" max="100" value="${this.state[i] * 100}">
                    </div>
                `).join('')}
            </div>
        `;
        parent.appendChild(card);

        this.svgPath = card.querySelector('.env-path') as SVGPathElement;
        this.handles = Array.from(card.querySelectorAll('.env-handle'));
        this.sliders = Array.from(card.querySelectorAll('.env-slider'));

        this.bindEvents(card.querySelector('svg')!);
        this.draw();
    }

    private getPoints() {
        const [a, d, s, r] = this.state;
        const usableW = this.w - (this.pad * 2);
        const usableH = this.h - (this.pad * 2);
        const maxStageW = usableW / 3.5; 

        const startX = this.pad;
        const startY = this.h - this.pad;

        const pA = { x: startX + (a * maxStageW), y: this.pad };
        const pD = { x: pA.x + (d * maxStageW), y: startY - (s * usableH) };
        const pS_end = { x: pD.x + (maxStageW * 0.5), y: pD.y }; 
        const pR = { x: pS_end.x + (r * maxStageW), y: startY };

        return { startX, startY, pA, pD, pS_end, pR };
    }

    private draw() {
        const pts = this.getPoints();
        
        // Luxury Bezier Curves (Convex Attack, Concave Decay/Release)
        const cpAx = pts.startX + (pts.pA.x - pts.startX) * 0.2;
        const cpAy = pts.startY - (pts.startY - pts.pA.y) * 0.95;
        const cpDx = pts.pA.x + (pts.pD.x - pts.pA.x) * 0.2;
        const cpDy = pts.pD.y;
        const cpRx = pts.pS_end.x + (pts.pR.x - pts.pS_end.x) * 0.2;
        const cpRy = pts.pR.y;

        const d = `M ${pts.startX},${pts.startY} 
                   Q ${cpAx},${cpAy} ${pts.pA.x},${pts.pA.y} 
                   Q ${cpDx},${cpDy} ${pts.pD.x},${pts.pD.y} 
                   L ${pts.pS_end.x},${pts.pS_end.y} 
                   Q ${cpRx},${cpRy} ${pts.pR.x},${pts.pR.y}`;
                   
        this.svgPath.setAttribute('d', d);

        this.handles[0].setAttribute('cx', pts.pA.x.toString());
        this.handles[0].setAttribute('cy', pts.pA.y.toString());
        this.handles[1].setAttribute('cx', pts.pD.x.toString());
        this.handles[1].setAttribute('cy', pts.pD.y.toString());
        this.handles[2].setAttribute('cx', pts.pR.x.toString());
        this.handles[2].setAttribute('cy', pts.pR.y.toString());
        
        this.sliders.forEach((slider, i) => { slider.value = (this.state[i] * 100).toString(); });
    }

    private bindEvents(svg: SVGSVGElement) {
        this.sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement;
                const stage = parseInt(target.getAttribute('data-idx')!, 10);
                this.updateStage(stage, parseInt(target.value, 10) / 100);
            });
        });

        const startDrag = (e: MouseEvent | TouchEvent) => {
            const target = e.target as SVGElement;
            if (target.classList.contains('env-handle')) {
                this.activeHandle = parseInt(target.getAttribute('data-idx')!, 10);
            }
        };

        const onDrag = (e: MouseEvent | TouchEvent) => {
            if (this.activeHandle === null) return;
            e.preventDefault();
            const rect = svg.getBoundingClientRect();
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            const svgX = ((clientX - rect.left) / rect.width) * this.w;
            const svgY = ((clientY - rect.top) / rect.height) * this.h;
            const usableH = this.h - (this.pad * 2);
            const maxStageW = (this.w - (this.pad * 2)) / 3.5;
            const pts = this.getPoints();

            if (this.activeHandle === 0) { 
                this.updateStage(0, (svgX - pts.startX) / maxStageW);
            } else if (this.activeHandle === 1) { 
                this.updateStage(1, (svgX - pts.pA.x) / maxStageW);
                this.updateStage(2, (this.h - this.pad - svgY) / usableH);
            } else if (this.activeHandle === 3) { 
                this.updateStage(3, (svgX - pts.pS_end.x) / maxStageW);
            }
        };

        const endDrag = () => { this.activeHandle = null; };

        svg.addEventListener('mousedown', startDrag);
        window.addEventListener('mousemove', onDrag);
        window.addEventListener('mouseup', endDrag);
        svg.addEventListener('touchstart', startDrag, { passive: false });
        window.addEventListener('touchmove', onDrag, { passive: false });
        window.addEventListener('touchend', endDrag);
    }

    private updateStage(stage: number, val: number) {
        val = Math.max(0, Math.min(1, val)); 
        if (Math.abs(this.state[stage] - val) > 0.01) {
            this.state[stage] = val;
            this.draw();
            this.network.sendCommand({ type: 'env', target: this.target, stage: stage, val: parseFloat(val.toFixed(3)) });
        }
    }
}

export function initEnvelopes(network: SynthNetwork, containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = ''; // Clear prior mounts
    new EnvelopeCard(network, container, 'amp', 'Amp Envelope', 'var(--neon-green)'); 
    new EnvelopeCard(network, container, 'mod1', 'Mod Envelope 1', 'var(--neon-cyan)'); 
    new EnvelopeCard(network, container, 'mod2', 'Mod Envelope 2', 'var(--neon-pink)'); 
}