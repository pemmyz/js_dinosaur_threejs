/**
 * DINO RUN 3D - 2.5D Low-Poly Diorama Endless Runner
 * Built with Three.js (r128)
 */

// ============================================================================
// 1. SOUND SYSTEM (Web Audio API Synthesizer)
// ============================================================================
class AudioManager {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.musicPlaying = false;
        this.musicTimer = null;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }

    tone(freq, type, duration, startVol = 0.2, endVol = 0.001) {
        if (this.isMuted || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(startVol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(endVol, this.ctx.currentTime + duration);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
    }

    playJump() {
        if (this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    playLand() {
        this.tone(90, 'triangle', 0.08, 0.2);
    }

    playDuck() {
        this.tone(180, 'sine', 0.06, 0.15);
    }

    playFootstep() {
        this.tone(100 + Math.random() * 40, 'triangle', 0.04, 0.04);
    }

    playScoreDing() {
        if (this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        [1046.5, 1318.5].forEach((f, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now + idx * 0.08);
            gain.gain.setValueAtTime(0.18, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.25);
        });
    }

    playCrash() {
        if (this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(30, now + 0.4);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
    }
}

// ============================================================================
// 2. INPUT MANAGER (Keyboard, Gamepad, Touch)
// ============================================================================
class InputManager {
    constructor(game) {
        this.game = game;
        this.keys = { jump: false, duck: false };
        this.lastGamepadJump = false;
        this.lastGamepadDuck = false;
        this.lastGamepadPause = false;

        this.setupKeyboard();
        this.setupTouch();
    }

    setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                e.preventDefault();
                this.keys.jump = true;
                this.game.onJumpAction();
            }
            if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                e.preventDefault();
                this.keys.duck = true;
                this.game.onDuckAction(true);
            }
            if (e.code === 'KeyP') {
                this.game.togglePause();
            }
            if (e.code === 'F3') {
                e.preventDefault();
                this.game.toggleDebug();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                this.keys.jump = false;
                this.game.onJumpRelease();
            }
            if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                this.keys.duck = false;
                this.game.onDuckAction(false);
            }
        });
    }

    setupTouch() {
        const jumpBtn = document.getElementById('mobile-jump');
        const duckBtn = document.getElementById('mobile-duck');

        const bindPress = (el, onStart, onEnd) => {
            const start = (e) => { e.preventDefault(); onStart(); };
            const end = (e) => { e.preventDefault(); onEnd(); };
            el.addEventListener('touchstart', start, { passive: false });
            el.addEventListener('touchend', end, { passive: false });
            el.addEventListener('mousedown', start);
            el.addEventListener('mouseup', end);
        };

        if (jumpBtn) {
            bindPress(jumpBtn,
                () => { this.keys.jump = true; this.game.onJumpAction(); },
                () => { this.keys.jump = false; this.game.onJumpRelease(); }
            );
        }
        if (duckBtn) {
            bindPress(duckBtn,
                () => { this.keys.duck = true; this.game.onDuckAction(true); },
                () => { this.keys.duck = false; this.game.onDuckAction(false); }
            );
        }

        window.addEventListener('pointerdown', (e) => {
            if (e.target.closest('#hud') || e.target.closest('#mobile-controls')) return;
            if (this.game.state === 'TITLE' || this.game.state === 'GAME_OVER') {
                this.game.onJumpAction();
            }
        });
    }

    update() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        if (!gamepads) return;
        const gp = gamepads[0];
        if (!gp) return;

        const jumpPressed = gp.buttons[0]?.pressed || gp.buttons[12]?.pressed;
        const duckPressed = gp.buttons[1]?.pressed || gp.buttons[13]?.pressed || gp.axes[1] > 0.5;
        const pausePressed = gp.buttons[9]?.pressed;

        if (jumpPressed && !this.lastGamepadJump) {
            this.game.onJumpAction();
        } else if (!jumpPressed && this.lastGamepadJump) {
            this.game.onJumpRelease();
        }

        if (duckPressed && !this.lastGamepadDuck) {
            this.game.onDuckAction(true);
        } else if (!duckPressed && this.lastGamepadDuck) {
            this.game.onDuckAction(false);
        }

        if (pausePressed && !this.lastGamepadPause) {
            this.game.togglePause();
        }

        this.lastGamepadJump = jumpPressed;
        this.lastGamepadDuck = duckPressed;
        this.lastGamepadPause = pausePressed;
    }
}

// ============================================================================
// 3. 3D PROCEDURAL MODEL GENERATOR (Detailed Low-Poly Diorama Objects)
// ============================================================================
class ModelFactory {
    static initMaterials() {
        this.mats = {
            dinoSkin: new THREE.MeshStandardMaterial({ color: 0x487346, flatShading: true, roughness: 0.8 }),
            dinoBelly: new THREE.MeshStandardMaterial({ color: 0x7ca96a, flatShading: true, roughness: 0.8 }),
            dinoEyes: new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 80 }),
            dinoEyePupil: new THREE.MeshBasicMaterial({ color: 0xffffff }),
            dinoTeeth: new THREE.MeshStandardMaterial({ color: 0xf5f3e9, flatShading: true, roughness: 0.5 }),
            dinoClaws: new THREE.MeshStandardMaterial({ color: 0x2b2b2b, flatShading: true, roughness: 0.7 }),

            // Cactus & Desert Flora Materials
            cactusBase: new THREE.MeshStandardMaterial({ color: 0x2e6b36, flatShading: true, roughness: 0.85 }),
            cactusSage: new THREE.MeshStandardMaterial({ color: 0x3d745a, flatShading: true, roughness: 0.85 }),
            cactusOlive: new THREE.MeshStandardMaterial({ color: 0x47632a, flatShading: true, roughness: 0.85 }),
            cactusDark: new THREE.MeshStandardMaterial({ color: 0x1f4e2b, flatShading: true, roughness: 0.85 }),
            cactusLime: new THREE.MeshStandardMaterial({ color: 0x4a9344, flatShading: true, roughness: 0.85 }),
            cactusPale: new THREE.MeshStandardMaterial({ color: 0x6e9668, flatShading: true, roughness: 0.85 }),
            cactusFlower: new THREE.MeshStandardMaterial({ color: 0xef476f, flatShading: true, roughness: 0.6 }),
            cactusFlowerGold: new THREE.MeshStandardMaterial({ color: 0xffb703, flatShading: true, roughness: 0.6 }),
            cactusFruit: new THREE.MeshStandardMaterial({ color: 0xb5179e, flatShading: true, roughness: 0.7 }),
            cactusWool: new THREE.MeshStandardMaterial({ color: 0xede0d4, flatShading: true, roughness: 0.95 }),
            yuccaTrunk: new THREE.MeshStandardMaterial({ color: 0x5c4233, flatShading: true, roughness: 0.9 }),
            yuccaLeaf: new THREE.MeshStandardMaterial({ color: 0x285a3c, flatShading: true, roughness: 0.8 }),

            rockBase: new THREE.MeshStandardMaterial({ color: 0x7d7b7a, flatShading: true, roughness: 0.9 }),
            rockDark: new THREE.MeshStandardMaterial({ color: 0x5a5756, flatShading: true, roughness: 0.9 }),

            birdBody: new THREE.MeshStandardMaterial({ color: 0xa84a32, flatShading: true, roughness: 0.8 }),
            birdWing: new THREE.MeshStandardMaterial({ color: 0xd4684b, flatShading: true, roughness: 0.8 }),
            birdBeak: new THREE.MeshStandardMaterial({ color: 0xe9c46a, flatShading: true, roughness: 0.6 }),

            sandGround: new THREE.MeshStandardMaterial({ color: 0xded29e, flatShading: true, roughness: 0.95 }),
            grassGround: new THREE.MeshStandardMaterial({ color: 0x52b788, flatShading: true, roughness: 0.95 }),
            volcanicGround: new THREE.MeshStandardMaterial({ color: 0x262428, flatShading: true, roughness: 0.95 }),

            cloudMat: new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.90, flatShading: true, roughness: 1.0 }),
            mountainCloudMat: new THREE.MeshStandardMaterial({ color: 0xf0f4f8, transparent: true, opacity: 0.78, flatShading: true, roughness: 1.0 })
        };
    }

    /** Creates an articulated, multi-part 3D low-poly Dinosaur */
    static createDinosaur() {
        const root = new THREE.Group();

        const bodyGeo = new THREE.BoxGeometry(0.85, 0.95, 0.65);
        const body = new THREE.Mesh(bodyGeo, this.mats.dinoSkin);
        body.position.set(0, 0.8, 0);
        body.castShadow = true;
        root.add(body);

        const bellyGeo = new THREE.BoxGeometry(0.7, 0.7, 0.67);
        const belly = new THREE.Mesh(bellyGeo, this.mats.dinoBelly);
        belly.position.set(0.1, -0.05, 0);
        body.add(belly);

        for (let i = 0; i < 3; i++) {
            const ridgeGeo = new THREE.ConeGeometry(0.06, 0.14, 4);
            const ridge = new THREE.Mesh(ridgeGeo, this.mats.dinoClaws);
            ridge.rotation.z = -Math.PI / 6;
            ridge.position.set(-0.35 + i * 0.25, 0.52, 0);
            body.add(ridge);
        }

        const neckPivot = new THREE.Group();
        neckPivot.position.set(0.35, 0.35, 0);
        body.add(neckPivot);

        const neckGeo = new THREE.BoxGeometry(0.35, 0.55, 0.45);
        const neck = new THREE.Mesh(neckGeo, this.mats.dinoSkin);
        neck.position.set(0.05, 0.25, 0);
        neck.rotation.z = -0.2;
        neckPivot.add(neck);

        const headPivot = new THREE.Group();
        headPivot.position.set(0.1, 0.3, 0);
        neck.add(headPivot);

        const headGeo = new THREE.BoxGeometry(0.75, 0.55, 0.55);
        const head = new THREE.Mesh(headGeo, this.mats.dinoSkin);
        head.position.set(0.25, 0.1, 0);
        head.castShadow = true;
        headPivot.add(head);

        const snoutGeo = new THREE.BoxGeometry(0.4, 0.35, 0.48);
        const snout = new THREE.Mesh(snoutGeo, this.mats.dinoSkin);
        snout.position.set(0.48, -0.05, 0);
        head.add(snout);

        const nostrilGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
        const nL = new THREE.Mesh(nostrilGeo, this.mats.dinoClaws);
        nL.position.set(0.2, 0.1, 0.15);
        const nR = nL.clone();
        nR.position.z = -0.15;
        snout.add(nL); snout.add(nR);

        const jawGeo = new THREE.BoxGeometry(0.55, 0.12, 0.48);
        const jaw = new THREE.Mesh(jawGeo, this.mats.dinoBelly);
        jaw.position.set(0.3, -0.24, 0);
        head.add(jaw);

        for (let t = 0; t < 3; t++) {
            const toothGeo = new THREE.ConeGeometry(0.03, 0.07, 3);
            const toothL = new THREE.Mesh(toothGeo, this.mats.dinoTeeth);
            toothL.rotation.x = Math.PI;
            toothL.position.set(0.15 + t * 0.12, -0.18, 0.22);
            head.add(toothL);
            const toothR = toothL.clone();
            toothR.position.z = -0.22;
            head.add(toothR);
        }

        const eyeGeo = new THREE.SphereGeometry(0.08, 6, 6);
        const pupilGeo = new THREE.SphereGeometry(0.03, 4, 4);

        const eyeL = new THREE.Mesh(eyeGeo, this.mats.dinoEyes);
        eyeL.position.set(0.15, 0.15, 0.28);
        const pupilL = new THREE.Mesh(pupilGeo, this.mats.dinoEyePupil);
        pupilL.position.set(0.04, 0.03, 0.05);
        eyeL.add(pupilL);
        head.add(eyeL);

        const eyeR = new THREE.Mesh(eyeGeo, this.mats.dinoEyes);
        eyeR.position.set(0.15, 0.15, -0.28);
        const pupilR = new THREE.Mesh(pupilGeo, this.mats.dinoEyePupil);
        pupilR.position.set(0.04, 0.03, -0.05);
        eyeR.add(pupilR);
        head.add(eyeR);

        const makeArm = (isLeft) => {
            const arm = new THREE.Group();
            arm.position.set(0.25, 0.1, isLeft ? 0.35 : -0.35);
            const armMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.1, 0.1), this.mats.dinoSkin);
            armMesh.position.set(0.1, 0, 0);
            armMesh.rotation.z = -Math.PI / 6;
            arm.add(armMesh);

            const claw = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 4), this.mats.dinoClaws);
            claw.rotation.z = -Math.PI / 2;
            claw.position.set(0.22, -0.06, 0);
            arm.add(claw);
            return arm;
        };
        const armL = makeArm(true);
        const armR = makeArm(false);
        body.add(armL); body.add(armR);

        const tailSegments = [];
        let prevTail = body;
        const tailDims = [
            { w: 0.35, h: 0.35, d: 0.35, pos: [-0.48, 0.15, 0] },
            { w: 0.3,  h: 0.3,  d: 0.3,  pos: [-0.3,  0.03, 0] },
            { w: 0.25, h: 0.24, d: 0.24, pos: [-0.26, 0.02, 0] },
            { w: 0.18, h: 0.18, d: 0.18, pos: [-0.22, 0.01, 0] }
        ];
        tailDims.forEach((dim) => {
            const tGroup = new THREE.Group();
            tGroup.position.set(...dim.pos);
            const tMesh = new THREE.Mesh(new THREE.BoxGeometry(dim.w, dim.h, dim.d), this.mats.dinoSkin);
            tMesh.castShadow = true;
            tGroup.add(tMesh);
            prevTail.add(tGroup);
            tailSegments.push(tGroup);
            prevTail = tGroup;
        });

        const makeLeg = (isLeft) => {
            const legRoot = new THREE.Group();
            legRoot.position.set(-0.05, 0.45, isLeft ? 0.35 : -0.35);

            const upperLegGeo = new THREE.BoxGeometry(0.24, 0.45, 0.2);
            const upperLeg = new THREE.Mesh(upperLegGeo, this.mats.dinoSkin);
            upperLeg.position.set(0, -0.15, 0);
            upperLeg.castShadow = true;
            legRoot.add(upperLeg);

            const lowerLegGeo = new THREE.BoxGeometry(0.16, 0.4, 0.16);
            const lowerLeg = new THREE.Mesh(lowerLegGeo, this.mats.dinoSkin);
            lowerLeg.position.set(0.04, -0.32, 0);
            lowerLeg.castShadow = true;
            upperLeg.add(lowerLeg);

            const foot = new THREE.Group();
            foot.position.set(0.06, -0.22, 0);
            lowerLeg.add(foot);

            const soleGeo = new THREE.BoxGeometry(0.3, 0.08, 0.22);
            const sole = new THREE.Mesh(soleGeo, this.mats.dinoSkin);
            sole.position.set(0.05, 0, 0);
            foot.add(sole);

            for (let i = -1; i <= 1; i++) {
                const claw = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 3), this.mats.dinoClaws);
                claw.rotation.z = -Math.PI / 2;
                claw.position.set(0.2, 0, i * 0.08);
                foot.add(claw);
            }

            return { root: legRoot, upper: upperLeg, lower: lowerLeg, foot };
        };

        const legL = makeLeg(true);
        const legR = makeLeg(false);
        root.add(legL.root);
        root.add(legR.root);

        return {
            group: root,
            body,
            neckPivot,
            headPivot,
            tailSegments,
            armL, armR,
            legL, legR
        };
    }

    /** Creates gameplay obstacles (cacti on track) */
    static createCactus(variant = 'small') {
        const group = new THREE.Group();

        const makeSingleCactus = (height, radius, addArms = true) => {
            const sub = new THREE.Group();
            const trunkGeo = new THREE.CylinderGeometry(radius * 0.85, radius, height, 7);
            const trunk = new THREE.Mesh(trunkGeo, this.mats.cactusBase);
            trunk.position.y = height / 2;
            trunk.castShadow = true;
            sub.add(trunk);

            const cap = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.85, 7, 5), this.mats.cactusBase);
            cap.position.y = height;
            sub.add(cap);

            if (Math.random() < 0.4) {
                const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(radius * 0.5), this.mats.cactusFlower);
                flower.position.y = height + radius * 0.6;
                sub.add(flower);
            }

            if (addArms) {
                const arm1 = new THREE.Group();
                arm1.position.y = height * 0.45;
                const h1 = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.6, radius * 0.6, radius * 1.5, 6), this.mats.cactusBase);
                h1.rotation.z = Math.PI / 2;
                h1.position.x = -radius * 0.8;
                arm1.add(h1);
                const v1 = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.55, radius * 0.6, height * 0.45, 6), this.mats.cactusBase);
                v1.position.set(-radius * 1.5, height * 0.2, 0);
                arm1.add(v1);
                sub.add(arm1);

                const arm2 = new THREE.Group();
                arm2.position.y = height * 0.6;
                const h2 = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.6, radius * 0.6, radius * 1.5, 6), this.mats.cactusBase);
                h2.rotation.z = -Math.PI / 2;
                h2.position.x = radius * 0.8;
                arm2.add(h2);
                const v2 = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.55, radius * 0.6, height * 0.35, 6), this.mats.cactusBase);
                v2.position.set(radius * 1.5, height * 0.16, 0);
                arm2.add(v2);
                sub.add(arm2);
            }
            return sub;
        };

        if (variant === 'small') {
            group.add(makeSingleCactus(1.2, 0.22, true));
        } else if (variant === 'large') {
            group.add(makeSingleCactus(1.9, 0.26, true));
        } else if (variant === 'triple') {
            const c1 = makeSingleCactus(1.6, 0.22, true);
            const c2 = makeSingleCactus(1.1, 0.18, false);
            c2.position.set(-0.55, 0, 0.15);
            const c3 = makeSingleCactus(0.8, 0.16, false);
            c3.position.set(0.5, 0, -0.1);
            group.add(c1); group.add(c2); group.add(c3);
        } else {
            for (let i = 0; i < 4; i++) {
                const c = makeSingleCactus(0.9 + Math.random() * 0.7, 0.18, Math.random() > 0.5);
                c.position.set((i - 1.5) * 0.45, 0, (Math.random() - 0.5) * 0.4);
                group.add(c);
            }
        }
        return group;
    }

    // ========================================================================
    // 10 DISTINCT TYPES OF BIG BACKGROUND CACTUSES (Replaces background trees)
    // ========================================================================
    static createBigCactus(typeIndex = 0) {
        const root = new THREE.Group();
        const type = Math.abs(typeIndex) % 10;

        switch (type) {
            // ----------------------------------------------------------------
            // TYPE 0: CLASSIC SAGUARO (Tall ribbed trunk, 2 asymmetrical curved arms)
            // ----------------------------------------------------------------
            case 0: {
                const mat = this.mats.cactusBase;
                const h = 4.2;
                const r = 0.36;
                const trunk = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r, h, 8), mat);
                trunk.position.y = h / 2;
                trunk.castShadow = true;
                root.add(trunk);

                const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.9, 8, 6), mat);
                cap.position.y = h;
                root.add(cap);

                // Blossom
                const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18), this.mats.cactusFlower);
                flower.position.y = h + 0.25;
                root.add(flower);

                // Arm 1 (Lower Left)
                const a1 = new THREE.Group();
                a1.position.set(0, 1.8, 0);
                const a1h = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.9, 7), mat);
                a1h.rotation.z = Math.PI / 2;
                a1h.position.x = -0.55;
                a1h.castShadow = true;
                a1.add(a1h);

                const a1v = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.2, 1.6, 7), mat);
                a1v.position.set(-1.0, 0.8, 0);
                a1v.castShadow = true;
                a1.add(a1v);

                const a1cap = new THREE.Mesh(new THREE.SphereGeometry(0.19, 7, 5), mat);
                a1cap.position.set(-1.0, 1.6, 0);
                a1.add(a1cap);
                root.add(a1);

                // Arm 2 (Higher Right)
                const a2 = new THREE.Group();
                a2.position.set(0, 2.5, 0);
                const a2h = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.8, 7), mat);
                a2h.rotation.z = -Math.PI / 2;
                a2h.position.x = 0.5;
                a2h.castShadow = true;
                a2.add(a2h);

                const a2v = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.19, 1.2, 7), mat);
                a2v.position.set(0.9, 0.6, 0);
                a2v.castShadow = true;
                a2.add(a2v);

                const a2cap = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 5), mat);
                a2cap.position.set(0.9, 1.2, 0);
                a2.add(a2cap);
                root.add(a2);
                break;
            }

            // ----------------------------------------------------------------
            // TYPE 1: CANDELABRA PATRIARCH SAGUARO (Massive with 4 radial arms)
            // ----------------------------------------------------------------
            case 1: {
                const mat = this.mats.cactusDark;
                const h = 4.8;
                const r = 0.44;
                const trunk = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.88, r, h, 8), mat);
                trunk.position.y = h / 2;
                trunk.castShadow = true;
                root.add(trunk);

                const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.88, 8, 6), mat);
                cap.position.y = h;
                root.add(cap);

                // 4 arms radiating around the trunk
                const armConfigs = [
                    { y: 1.5, angle: 0, reach: 0.95, height: 2.1 },
                    { y: 2.1, angle: Math.PI * 0.55, reach: 0.85, height: 1.8 },
                    { y: 2.7, angle: Math.PI * 1.15, reach: 0.9, height: 1.5 },
                    { y: 3.2, angle: Math.PI * 1.7, reach: 0.75, height: 1.2 }
                ];

                armConfigs.forEach((cfg) => {
                    const armGroup = new THREE.Group();
                    armGroup.position.y = cfg.y;
                    armGroup.rotation.y = cfg.angle;

                    const hBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, cfg.reach, 6), mat);
                    hBeam.rotation.z = Math.PI / 2;
                    hBeam.position.x = -cfg.reach / 2;
                    armGroup.add(hBeam);

                    const vRiser = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, cfg.height, 6), mat);
                    vRiser.position.set(-cfg.reach, cfg.height / 2, 0);
                    vRiser.castShadow = true;
                    armGroup.add(vRiser);

                    const bloom = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14), this.mats.cactusFlowerGold);
                    bloom.position.set(-cfg.reach, cfg.height + 0.1, 0);
                    armGroup.add(bloom);

                    root.add(armGroup);
                });
                break;
            }

            // ----------------------------------------------------------------
            // TYPE 2: PRICKLY PEAR / NOPAL (Branching flat pads with magenta tunas)
            // ----------------------------------------------------------------
            case 2: {
                const mat = this.mats.cactusPale;

                const createPad = (scaleX = 0.55, scaleY = 0.75, scaleZ = 0.14) => {
                    const padGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.15, 8);
                    const pad = new THREE.Mesh(padGeo, mat);
                    pad.scale.set(scaleX, scaleY, scaleZ);
                    pad.castShadow = true;
                    return pad;
                };

                // Base Pad
                const p0 = createPad(0.7, 0.9, 0.2);
                p0.position.y = 0.55;
                p0.rotation.z = 0.1;
                root.add(p0);

                // Tier 1 Left
                const p1 = createPad(0.65, 0.85, 0.18);
                p1.position.set(-0.48, 1.25, 0.05);
                p1.rotation.z = 0.45;
                p1.rotation.y = 0.2;
                root.add(p1);

                // Tier 1 Right
                const p2 = createPad(0.6, 0.8, 0.18);
                p2.position.set(0.5, 1.3, -0.05);
                p2.rotation.z = -0.4;
                p2.rotation.y = -0.25;
                root.add(p2);

                // Tier 2 Branches
                const p3 = createPad(0.55, 0.7, 0.16);
                p3.position.set(-0.95, 1.85, 0.1);
                p3.rotation.z = 0.75;
                root.add(p3);

                const p4 = createPad(0.55, 0.75, 0.16);
                p4.position.set(-0.25, 2.05, 0);
                p4.rotation.z = 0.05;
                root.add(p4);

                const p5 = createPad(0.5, 0.7, 0.15);
                p5.position.set(0.42, 2.1, 0.12);
                p5.rotation.z = 0.25;
                root.add(p5);

                const p6 = createPad(0.5, 0.65, 0.15);
                p6.position.set(0.95, 1.9, -0.1);
                p6.rotation.z = -0.55;
                root.add(p6);

                // Top tier pads
                const p7 = createPad(0.45, 0.6, 0.14);
                p7.position.set(-0.2, 2.75, -0.05);
                p7.rotation.z = -0.15;
                root.add(p7);

                // Magenta prickly pear fruits (tunas) on upper pads
                const fruitSpots = [
                    [-0.95, 2.3, 0.1], [-1.2, 2.0, 0.12],
                    [-0.35, 3.1, -0.05], [-0.05, 3.15, -0.04],
                    [0.35, 2.55, 0.12], [0.55, 2.5, 0.1],
                    [1.2, 2.2, -0.12]
                ];
                fruitSpots.forEach(pt => {
                    const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.09, 5, 5), this.mats.cactusFruit);
                    fruit.position.set(...pt);
                    root.add(fruit);
                });
                break;
            }

            // ----------------------------------------------------------------
            // TYPE 3: GIANT BARREL CACTUS CLUSTER (Ribbed spherical barrels with gold flowers)
            // ----------------------------------------------------------------
            case 3: {
                const mat = this.mats.cactusOlive;

                const makeBarrel = (r, h, x, z, tiltZ = 0) => {
                    const barrelGroup = new THREE.Group();
                    barrelGroup.position.set(x, 0, z);
                    barrelGroup.rotation.z = tiltZ;

                    const body = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.95, r, h, 10), mat);
                    body.position.y = h / 2;
                    body.castShadow = true;
                    barrelGroup.add(body);

                    const dome = new THREE.Mesh(new THREE.SphereGeometry(r * 0.95, 10, 6), mat);
                    dome.position.y = h;
                    barrelGroup.add(dome);

                    // Crown of gold blossoms
                    for (let b = 0; b < 5; b++) {
                        const angle = (b / 5) * Math.PI * 2;
                        const bl = new THREE.Mesh(new THREE.DodecahedronGeometry(r * 0.2), this.mats.cactusFlowerGold);
                        bl.position.set(Math.cos(angle) * r * 0.5, h + r * 0.65, Math.sin(angle) * r * 0.5);
                        barrelGroup.add(bl);
                    }
                    return barrelGroup;
                };

                root.add(makeBarrel(0.85, 1.5, 0, 0, 0));
                root.add(makeBarrel(0.6, 1.1, -0.9, 0.2, 0.1));
                root.add(makeBarrel(0.65, 1.25, 0.95, -0.15, -0.08));
                root.add(makeBarrel(0.4, 0.7, 0.2, 0.7, 0.05));
                break;
            }

            // ----------------------------------------------------------------
            // TYPE 4: ORGAN PIPE CACTUS (Fan of 11 vertical ribbed flutes)
            // ----------------------------------------------------------------
            case 4: {
                const mat = this.mats.cactusSage;

                // Center base mound
                const base = new THREE.Mesh(new THREE.SphereGeometry(0.65, 8, 5), mat);
                base.scale.set(1.4, 0.5, 1.2);
                base.position.y = 0.15;
                root.add(base);

                const pipeCount = 11;
                for (let i = 0; i < pipeCount; i++) {
                    const phi = (i / pipeCount) * Math.PI * 2;
                    const dist = 0.35 + (i % 3) * 0.12;
                    const px = Math.cos(phi) * dist;
                    const pz = Math.sin(phi) * (dist * 0.65);
                    const pipeH = 2.4 + ((i * 7) % 5) * 0.45;
                    const pipeR = 0.14 + (i % 2) * 0.03;

                    const pipeGroup = new THREE.Group();
                    pipeGroup.position.set(px, 0.1, pz);
                    pipeGroup.rotation.z = -px * 0.14;
                    pipeGroup.rotation.x = pz * 0.14;

                    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(pipeR * 0.85, pipeR, pipeH, 6), mat);
                    stalk.position.y = pipeH / 2;
                    stalk.castShadow = true;
                    pipeGroup.add(stalk);

                    const pCap = new THREE.Mesh(new THREE.SphereGeometry(pipeR * 0.85, 6, 5), mat);
                    pCap.position.y = pipeH;
                    pipeGroup.add(pCap);

                    if (i % 3 === 0) {
                        const tipFlower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12), this.mats.cactusFlower);
                        tipFlower.position.y = pipeH + 0.12;
                        pipeGroup.add(tipFlower);
                    }
                    root.add(pipeGroup);
                }
                break;
            }

            // ----------------------------------------------------------------
            // TYPE 5: CARDÓN GIGANTE (Massive titan trunk splitting high into columns)
            // ----------------------------------------------------------------
            case 5: {
                const mat = this.mats.cactusDark;

                // Buttress base
                const baseH = 2.1;
                const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.72, baseH, 8), mat);
                trunk.position.y = baseH / 2;
                trunk.castShadow = true;
                root.add(trunk);

                // Small root flares
                for (let rIdx = 0; rIdx < 3; rIdx++) {
                    const flare = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.8, 5), mat);
                    const fAngle = (rIdx / 3) * Math.PI * 2;
                    flare.position.set(Math.cos(fAngle) * 0.62, 0.4, Math.sin(fAngle) * 0.62);
                    root.add(flare);
                }

                // 5 vertical columns rising from trunk summit
                const columnOffsets = [
                    [0, 0, 2.7, 0.38],
                    [-0.52, 0.1, 2.4, 0.32],
                    [0.55, -0.05, 2.3, 0.32],
                    [-0.2, 0.42, 2.0, 0.28],
                    [0.22, -0.4, 1.9, 0.28]
                ];

                columnOffsets.forEach(([cx, cz, ch, cr]) => {
                    const colGroup = new THREE.Group();
                    colGroup.position.set(cx, baseH - 0.1, cz);

                    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(cr * 0.85, cr, ch, 7), mat);
                    stalk.position.y = ch / 2;
                    stalk.castShadow = true;
                    colGroup.add(stalk);

                    const dome = new THREE.Mesh(new THREE.SphereGeometry(cr * 0.85, 7, 5), mat);
                    dome.position.y = ch;
                    colGroup.add(dome);

                    root.add(colGroup);
                });
                break;
            }

            // ----------------------------------------------------------------
            // TYPE 6: CRESTED / CRISTATE SAGUARO (Fan-crested ruffled summit)
            // ----------------------------------------------------------------
            case 6: {
                const mat = this.mats.cactusBase;
                const trunkH = 2.6;
                const trunkR = 0.35;

                const trunk = new THREE.Mesh(new THREE.CylinderGeometry(trunkR * 0.9, trunkR, trunkH, 8), mat);
                trunk.position.y = trunkH / 2;
                trunk.castShadow = true;
                root.add(trunk);

                // Lower normal arm
                const sideArm = new THREE.Group();
                sideArm.position.set(0, 1.4, 0);
                const sH = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.19, 0.6, 6), mat);
                sH.rotation.z = Math.PI / 2;
                sH.position.x = -0.4;
                sideArm.add(sH);
                const sV = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.18, 0.9, 6), mat);
                sV.position.set(-0.7, 0.45, 0);
                sideArm.add(sV);
                root.add(sideArm);

                // Wavy, ruffled crest fan at the summit
                const crestGroup = new THREE.Group();
                crestGroup.position.set(0, trunkH, 0);

                const fanSlices = 7;
                for (let f = 0; f < fanSlices; f++) {
                    const u = (f - (fanSlices - 1) / 2) / (fanSlices / 2); // -1 to 1
                    const sliceH = 0.95 - Math.abs(u) * 0.35;
                    const sliceW = 0.32;
                    const sliceGeo = new THREE.BoxGeometry(sliceW, sliceH, 0.26 + Math.sin(f * 1.5) * 0.08);
                    const slice = new THREE.Mesh(sliceGeo, mat);
                    slice.position.set(u * 1.05, sliceH / 2 + Math.cos(u * Math.PI * 0.5) * 0.15, Math.sin(u * 3) * 0.1);
                    slice.rotation.z = -u * 0.35;
                    slice.castShadow = true;
                    crestGroup.add(slice);

                    // Crest rim bud
                    if (f % 2 === 0) {
                        const bud = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 5), this.mats.cactusFlower);
                        bud.position.set(slice.position.x, slice.position.y + sliceH * 0.52, slice.position.z);
                        crestGroup.add(bud);
                    }
                }
                root.add(crestGroup);
                break;
            }

            // ----------------------------------------------------------------
            // TYPE 7: DESERT JOSHUA / YUCCA TREE (Forked angular branches with spiky needle tufts)
            // ----------------------------------------------------------------
            case 7: {
                const trunkMat = this.mats.yuccaTrunk;
                const leafMat = this.mats.yuccaLeaf;

                // Main trunk
                const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.38, 1.8, 6), trunkMat);
                trunk.position.y = 0.9;
                trunk.castShadow = true;
                root.add(trunk);

                // Spiky leaf rosette generator
                const makeSpikeTuft = () => {
                    const tuft = new THREE.Group();
                    const numLeaves = 16;
                    for (let i = 0; i < numLeaves; i++) {
                        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.65, 4), leafMat);
                        const yaw = (i / numLeaves) * Math.PI * 2;
                        const pitch = ((i % 4) / 4) * 0.9 - 0.45;
                        spike.rotation.y = yaw;
                        spike.rotation.z = Math.PI / 2 + pitch;
                        spike.position.set(Math.cos(yaw) * 0.15, Math.sin(pitch) * 0.1, Math.sin(yaw) * 0.15);
                        tuft.add(spike);
                    }
                    return tuft;
                };

                // Branch 1
                const b1 = new THREE.Group();
                b1.position.set(0, 1.7, 0);
                const l1 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.1, 5), trunkMat);
                l1.position.set(-0.4, 0.45, 0);
                l1.rotation.z = 0.7;
                b1.add(l1);
                const t1 = makeSpikeTuft();
                t1.position.set(-0.85, 0.9, 0);
                b1.add(t1);
                root.add(b1);

                // Branch 2
                const b2 = new THREE.Group();
                b2.position.set(0, 1.7, 0);
                const l2 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.2, 5), trunkMat);
                l2.position.set(0.45, 0.5, 0.1);
                l2.rotation.z = -0.65;
                b2.add(l2);
                const t2 = makeSpikeTuft();
                t2.position.set(0.9, 1.0, 0.15);
                b2.add(t2);
                root.add(b2);

                // Branch 3 (Central higher fork)
                const b3 = new THREE.Group();
                b3.position.set(0, 1.8, 0);
                const l3 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.19, 1.3, 5), trunkMat);
                l3.position.set(-0.05, 0.65, -0.2);
                l3.rotation.x = -0.25;
                b3.add(l3);
                const t3 = makeSpikeTuft();
                t3.position.set(-0.08, 1.3, -0.35);
                b3.add(t3);
                root.add(b3);
                break;
            }

            // ----------------------------------------------------------------
            // TYPE 8: JUMPING CHOLLA (Segmented knobby jointed branching shrub)
            // ----------------------------------------------------------------
            case 8: {
                const mat = this.mats.cactusLime;

                const makeJoint = (h = 0.6, r = 0.15) => {
                    const geo = new THREE.CylinderGeometry(r * 0.85, r, h, 6);
                    const m = new THREE.Mesh(geo, mat);
                    m.castShadow = true;
                    return m;
                };

                const j0 = makeJoint(1.0, 0.2);
                j0.position.y = 0.5;
                root.add(j0);

                const addSegmentCluster = (parentX, parentY, parentZ, tier = 1) => {
                    if (tier > 3) return;
                    const count = tier === 1 ? 3 : 2;
                    for (let c = 0; c < count; c++) {
                        const joint = makeJoint(0.55 - tier * 0.08, 0.16 - tier * 0.025);
                        const angle = (c / count) * Math.PI * 2 + tier * 0.8;
                        const tilt = 0.45 + tier * 0.2;
                        const jGroup = new THREE.Group();
                        jGroup.position.set(parentX, parentY, parentZ);
                        jGroup.rotation.y = angle;
                        jGroup.rotation.z = tilt;
                        joint.position.y = 0.25;
                        jGroup.add(joint);
                        root.add(jGroup);

                        // Tip spines
                        const spine = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08), this.mats.cactusFlowerGold);
                        spine.position.set(0, 0.55, 0);
                        jGroup.add(spine);

                        const nextX = parentX + Math.sin(tilt) * -Math.sin(angle) * 0.45;
                        const nextY = parentY + Math.cos(tilt) * 0.45;
                        const nextZ = parentZ + Math.sin(tilt) * Math.cos(angle) * 0.45;
                        addSegmentCluster(nextX, nextY, nextZ, tier + 1);
                    }
                };

                addSegmentCluster(0, 1.0, 0, 1);
                break;
            }

            // ----------------------------------------------------------------
            // TYPE 9: TWISTED TOTEM / OLD MAN CACTUS (Spiral ribs with woolly fuzz top)
            // ----------------------------------------------------------------
            case 9:
            default: {
                const mat = this.mats.cactusSage;
                const numSegments = 11;
                const segH = 0.36;
                const baseR = 0.38;

                for (let s = 0; s < numSegments; s++) {
                    const seg = new THREE.Mesh(new THREE.CylinderGeometry(baseR * 0.94, baseR, segH, 6), mat);
                    seg.position.y = s * segH + segH / 2;
                    seg.rotation.y = s * 0.38; // Continuous helical spiral groove
                    seg.castShadow = true;
                    root.add(seg);
                }

                // Woolly white crown ("Old Man Cactus" Cephalocereus senilis)
                const woolTop = new THREE.Group();
                woolTop.position.y = numSegments * segH;

                const woolHead = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), this.mats.cactusWool);
                woolTop.add(woolHead);

                // Woolly puffs cascading down
                for (let w = 0; w < 5; w++) {
                    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.18, 5, 5), this.mats.cactusWool);
                    const pAngle = (w / 5) * Math.PI * 2;
                    puff.position.set(Math.cos(pAngle) * 0.32, -0.2 - (w % 2) * 0.15, Math.sin(pAngle) * 0.32);
                    woolTop.add(puff);
                }
                root.add(woolTop);
                break;
            }
        }

        return root;
    }

    /** Creates low-poly Rock meshes */
    static createRock(size = 0.5) {
        const group = new THREE.Group();
        const geo = new THREE.DodecahedronGeometry(size, 0);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const vx = pos.getX(i);
            const vy = pos.getY(i);
            const vz = pos.getZ(i);
            const factor = 1 + (Math.random() - 0.5) * 0.3;
            pos.setXYZ(i, vx * factor, vy * factor * 0.75, vz * factor);
        }
        geo.computeVertexNormals();

        const rock = new THREE.Mesh(geo, Math.random() > 0.5 ? this.mats.rockBase : this.mats.rockDark);
        rock.position.y = size * 0.6;
        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        rock.castShadow = true;
        group.add(rock);
        return group;
    }

    /** Creates 3D Flying Pterodactyl */
    static createPterodactyl() {
        const group = new THREE.Group();

        const body = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.1, 5), this.mats.birdBody);
        body.rotation.z = Math.PI / 2;
        group.add(body);

        const headGroup = new THREE.Group();
        headGroup.position.set(0.6, 0.1, 0);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.2), this.mats.birdBody);
        headGroup.add(head);

        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.6, 4), this.mats.birdBeak);
        beak.rotation.z = -Math.PI / 2;
        beak.position.set(0.35, -0.02, 0);
        headGroup.add(beak);

        const crest = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45, 3), this.mats.birdBody);
        crest.rotation.z = Math.PI / 2.5;
        crest.position.set(-0.25, 0.15, 0);
        headGroup.add(crest);
        group.add(headGroup);

        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), this.mats.dinoEyes);
        eyeL.position.set(0.65, 0.18, 0.11);
        const eyeR = eyeL.clone();
        eyeR.position.z = -0.11;
        group.add(eyeL); group.add(eyeR);

        const makeWing = (isLeft) => {
            const wingRoot = new THREE.Group();
            wingRoot.position.set(0.1, 0.05, isLeft ? 0.15 : -0.15);

            const wingGeom = new THREE.BufferGeometry();
            const vertices = new Float32Array([
                0.0, 0.0, 0.0,
                -0.3, 0.0, isLeft ? 1.1 : -1.1,
                0.4, 0.0, isLeft ? 0.4 : -0.4
            ]);
            wingGeom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            wingGeom.computeVertexNormals();

            const wingMesh = new THREE.Mesh(wingGeom, this.mats.birdWing);
            wingMesh.material.side = THREE.DoubleSide;
            wingMesh.castShadow = true;
            wingRoot.add(wingMesh);
            return wingRoot;
        };

        const wingL = makeWing(true);
        const wingR = makeWing(false);
        group.add(wingL);
        group.add(wingR);

        return { group, wingL, wingR };
    }

    /** Creates Volumetric Puffy 3D Sky Clouds */
    static createCloud() {
        const cloud = new THREE.Group();
        const count = 4 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            const r = 0.6 + Math.random() * 0.7;
            const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), this.mats.cloudMat);
            puff.position.set((i - count / 2) * 0.7, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.4);
            cloud.add(puff);
        }
        return cloud;
    }

    /** Creates Atmospheric Low-Poly Clouds situated in the background with the mountains */
    static createMountainCloud() {
        const cloud = new THREE.Group();
        const count = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
            const r = 1.0 + Math.random() * 1.1;
            const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), this.mats.mountainCloudMat);
            puff.position.set(
                (i - count / 2) * 1.25 + (Math.random() - 0.5) * 0.4,
                (Math.random() - 0.5) * 0.6,
                (Math.random() - 0.5) * 0.8
            );
            cloud.add(puff);
        }
        return cloud;
    }

    /** Creates Low-Poly Distant Mountain Meshes */
    static createMountain(width, height) {
        const geo = new THREE.ConeGeometry(width, height, 5);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            if (pos.getY(i) < height * 0.3) {
                pos.setX(i, pos.getX(i) * (1 + (Math.random() - 0.5) * 0.4));
                pos.setZ(i, pos.getZ(i) * (1 + (Math.random() - 0.5) * 0.4));
            }
        }
        geo.computeVertexNormals();
        const mat = new THREE.MeshStandardMaterial({ color: 0x4a4a58, flatShading: true, roughness: 0.95 });
        const mountain = new THREE.Mesh(geo, mat);
        mountain.position.y = height / 2;
        return mountain;
    }
}

// ============================================================================
// 4. PARTICLE MANAGER (Dust, Footsteps, Collision Debris)
// ============================================================================
class ParticleManager {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        this.dustMat = new THREE.MeshBasicMaterial({ color: 0xd6ccc2, transparent: true, opacity: 0.8 });
        this.sparkMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
    }

    spawnDust(x, y, z, count = 4) {
        for (let i = 0; i < count; i++) {
            const p = new THREE.Mesh(this.geo, this.dustMat);
            p.position.set(x + (Math.random() - 0.5) * 0.2, y + 0.05, z + (Math.random() - 0.5) * 0.2);
            const vx = -1.5 - Math.random() * 2;
            const vy = 0.8 + Math.random() * 1.5;
            const vz = (Math.random() - 0.5) * 1.2;
            this.scene.add(p);
            this.particles.push({ mesh: p, vx, vy, vz, life: 1.0, decay: 2.5 + Math.random() * 2 });
        }
    }

    spawnImpact(x, y, z, count = 18) {
        for (let i = 0; i < count; i++) {
            const isSpark = Math.random() > 0.4;
            const p = new THREE.Mesh(this.geo, isSpark ? this.sparkMat : this.dustMat);
            p.position.set(x, y, z);
            const vx = (Math.random() - 0.5) * 8;
            const vy = 2.0 + Math.random() * 6;
            const vz = (Math.random() - 0.5) * 5;
            this.scene.add(p);
            this.particles.push({ mesh: p, vx, vy, vz, life: 1.0, decay: 1.8 + Math.random() * 2 });
        }
    }

    update(delta) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= p.decay * delta;
            p.vy -= 9.8 * delta;
            p.mesh.position.x += p.vx * delta;
            p.mesh.position.y += p.vy * delta;
            p.mesh.position.z += p.vz * delta;
            p.mesh.scale.setScalar(Math.max(0.01, p.life));

            if (p.life <= 0 || p.mesh.position.y < -0.2) {
                this.scene.remove(p.mesh);
                this.particles.splice(i, 1);
            }
        }
    }

    reset() {
        this.particles.forEach(p => this.scene.remove(p.mesh));
        this.particles = [];
    }
}

// ============================================================================
// 5. PLAYER CONTROLLER
// ============================================================================
class Player {
    constructor(scene, audio) {
        this.scene = scene;
        this.audio = audio;
        this.dino = ModelFactory.createDinosaur();
        this.scene.add(this.dino.group);

        this.posX = -3.2;
        this.posY = 0;
        this.posZ = 0;
        this.velocityY = 0;
        this.gravity = -34.0;
        this.jumpForce = 13.5;
        this.isGrounded = true;
        this.isDucking = false;

        this.animTime = 0;
        this.stepTimer = 0;
        this.squash = 1.0;

        this.box = new THREE.Box3();
        this.dino.group.position.set(this.posX, this.posY, this.posZ);
    }

    reset() {
        this.posY = 0;
        this.velocityY = 0;
        this.isGrounded = true;
        this.isDucking = false;
        this.dino.group.position.set(this.posX, this.posY, this.posZ);
        this.dino.group.scale.set(1, 1, 1);
        this.dino.body.rotation.set(0, 0, 0);
    }

    jump() {
        if (this.isGrounded) {
            this.velocityY = this.jumpForce;
            this.isGrounded = false;
            this.audio.playJump();
        }
    }

    cutJump() {
        if (this.velocityY > 3.0) {
            this.velocityY = 3.0;
        }
    }

    setDuck(ducking) {
        if (this.isDucking === ducking) return;
        this.isDucking = ducking;
        if (this.isDucking) {
            this.audio.playDuck();
        }
    }

    update(delta, worldSpeed, particleMgr) {
        if (!this.isGrounded) {
            this.velocityY += this.gravity * delta;
            this.posY += this.velocityY * delta;
            if (this.posY <= 0) {
                this.posY = 0;
                this.velocityY = 0;
                this.isGrounded = true;
                this.squash = 0.75;
                this.audio.playLand();
                particleMgr.spawnDust(this.posX, this.posY, this.posZ, 6);
            }
        }

        if (!this.isGrounded && this.isDucking) {
            this.velocityY += this.gravity * 1.5 * delta;
        }

        this.dino.group.position.set(this.posX, this.posY, this.posZ);
        this.squash += (1.0 - this.squash) * 12.0 * delta;

        this.animTime += delta * worldSpeed * 2.2;
        const runCycle = Math.sin(this.animTime);

        if (this.isGrounded) {
            this.stepTimer += delta * worldSpeed;
            if (this.stepTimer > 1.8) {
                this.stepTimer = 0;
                this.audio.playFootstep();
                particleMgr.spawnDust(this.posX - 0.2, this.posY, this.posZ, 2);
            }

            this.dino.legL.root.rotation.z = runCycle * 0.75;
            this.dino.legR.root.rotation.z = -runCycle * 0.75;

            this.dino.armL.rotation.z = -runCycle * 0.4;
            this.dino.armR.rotation.z = runCycle * 0.4;

            this.dino.tailSegments.forEach((seg, idx) => {
                seg.rotation.y = Math.sin(this.animTime - idx * 0.45) * 0.18;
                seg.rotation.z = Math.cos(this.animTime * 0.5) * 0.08;
            });

            this.dino.headPivot.position.y = 0.3 + Math.abs(runCycle) * 0.06;
        } else {
            this.dino.legL.root.rotation.z = -0.4;
            this.dino.legR.root.rotation.z = 0.5;
            this.dino.armL.rotation.z = -0.8;
            this.dino.armR.rotation.z = -0.8;
        }

        if (this.isDucking) {
            this.dino.group.scale.set(1.15, 0.62 * this.squash, 1.0);
            this.dino.body.rotation.z = -0.3;
            this.dino.neckPivot.rotation.z = -0.4;
        } else {
            this.dino.group.scale.set(1.0, 1.0 * this.squash, 1.0);
            this.dino.body.rotation.z = 0;
            this.dino.neckPivot.rotation.z = 0;
        }

        const halfW = 0.32;
        const h = this.isDucking ? 0.75 : 1.35;
        this.box.min.set(this.posX - halfW, this.posY + 0.05, -0.25);
        this.box.max.set(this.posX + halfW + 0.2, this.posY + h, 0.25);
    }
}

// ============================================================================
// 6. OBSTACLE MANAGER (Cacti, Rocks, Flying Pterodactyls)
// ============================================================================
class ObstacleManager {
    constructor(scene) {
        this.scene = scene;
        this.obstacles = [];
        this.spawnTimer = 2.0;
        this.minSpacing = 16.0;
        this.lastSpawnX = 0;
    }

    reset() {
        this.obstacles.forEach(obs => this.scene.remove(obs.mesh));
        this.obstacles = [];
        this.spawnTimer = 2.0;
        this.lastSpawnX = 0;
    }

    spawn(speed) {
        const types = ['cactus_small', 'cactus_large', 'cactus_triple', 'cactus_cluster', 'rock', 'bird'];
        let choice = types[Math.floor(Math.random() * types.length)];

        let obsObj = null;
        const posX = 24.0;
        let posY = 0.0;
        let boxDim = { w: 0.5, h: 1.2, d: 0.5 };

        if (choice.startsWith('cactus')) {
            const variant = choice.split('_')[1];
            const mesh = ModelFactory.createCactus(variant);
            if (variant === 'small') boxDim = { w: 0.5, h: 1.2, d: 0.5 };
            else if (variant === 'large') boxDim = { w: 0.6, h: 1.9, d: 0.5 };
            else if (variant === 'triple') boxDim = { w: 1.2, h: 1.6, d: 0.6 };
            else boxDim = { w: 1.6, h: 1.3, d: 0.6 };
            obsObj = { mesh, type: 'cactus', boxDim };
        } else if (choice === 'rock') {
            const mesh = ModelFactory.createRock(0.55 + Math.random() * 0.3);
            boxDim = { w: 0.7, h: 0.6, d: 0.6 };
            obsObj = { mesh, type: 'rock', boxDim };
        } else if (choice === 'bird') {
            const birdData = ModelFactory.createPterodactyl();
            const heightTier = Math.random() < 0.55 ? 1 : (Math.random() < 0.5 ? 0 : 2);
            if (heightTier === 0) posY = 0.7;
            else if (heightTier === 1) posY = 1.35;
            else posY = 2.4;

            boxDim = { w: 0.8, h: 0.45, d: 0.6 };
            obsObj = {
                mesh: birdData.group,
                wingL: birdData.wingL,
                wingR: birdData.wingR,
                type: 'bird',
                wingAnim: 0,
                boxDim,
                heightTier
            };
        }

        obsObj.mesh.position.set(posX, posY, 0);
        obsObj.box = new THREE.Box3();
        this.scene.add(obsObj.mesh);
        this.obstacles.push(obsObj);
        this.lastSpawnX = posX;
    }

    update(delta, worldSpeed) {
        this.spawnTimer -= delta;
        if (this.spawnTimer <= 0) {
            this.spawn(worldSpeed);
            const baseTime = 1.2 + Math.random() * 1.5;
            this.spawnTimer = THREE.MathUtils.clamp(baseTime / (worldSpeed * 0.08), 0.75, 2.5);
        }

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.mesh.position.x -= worldSpeed * delta;

            if (obs.type === 'bird' && obs.wingL && obs.wingR) {
                obs.wingAnim += delta * 15.0;
                const angle = Math.sin(obs.wingAnim) * 0.75;
                obs.wingL.rotation.x = angle;
                obs.wingR.rotation.x = -angle;
            }

            const p = obs.mesh.position;
            const b = obs.boxDim;
            if (obs.type === 'bird' && obs.heightTier === 2) {
                obs.box.makeEmpty();
            } else {
                obs.box.min.set(p.x - b.w / 2, p.y + 0.05, -b.d / 2);
                obs.box.max.set(p.x + b.w / 2, p.y + b.h, b.d / 2);
            }

            if (obs.mesh.position.x < -16.0) {
                this.scene.remove(obs.mesh);
                this.obstacles.splice(i, 1);
            }
        }
    }
}

// ============================================================================
// 7. ENVIRONMENT & PARALLAX MANAGER (Big Cacti & Mountain Clouds)
// ============================================================================
class EnvironmentManager {
    constructor(scene) {
        this.scene = scene;
        this.segments = [];
        this.midScenery = [];      // Holds the 10 big background cacti varieties
        this.mountains = [];       // Far mountain peaks
        this.mountainClouds = [];  // Volumetric clouds situated right with the mountains
        this.clouds = [];          // High sky clouds
        this.biomeIndex = 0;
        this.biomes = ['DESERT', 'GRASSLAND', 'FOREST', 'VOLCANIC'];

        this.initEndlessGround();
        this.initParallaxLayers();
    }

    initEndlessGround() {
        const segWidth = 20;
        const segCount = 5;
        this.groundGeo = new THREE.BoxGeometry(segWidth, 1.5, 14.0);

        for (let i = 0; i < segCount; i++) {
            const ground = new THREE.Mesh(this.groundGeo, ModelFactory.mats.sandGround);
            ground.position.set((i - 1) * segWidth, -0.75, -3.5);
            ground.receiveShadow = true;
            this.scene.add(ground);

            const details = new THREE.Group();
            for (let j = 0; j < 6; j++) {
                const rock = ModelFactory.createRock(0.12 + Math.random() * 0.15);
                rock.position.set((Math.random() - 0.5) * segWidth, 0.75, 4.2 + Math.random() * 0.8);
                details.add(rock);
            }
            ground.add(details);
            this.segments.push(ground);
        }
    }

    initParallaxLayers() {
        // --------------------------------------------------------------------
        // 1. Midground: 10 DISTINCT BIG CACTI (Replacing former background trees)
        // --------------------------------------------------------------------
        const cactusCount = 12;
        const cactusSpacing = 6.4;
        for (let i = 0; i < cactusCount; i++) {
            const typeIndex = i % 10;
            const cactus = ModelFactory.createBigCactus(typeIndex);
            const zStagger = -4.4 - ((i * 3) % 4) * 0.35; // Stagger Z between -4.4 and -5.45
            cactus.position.set(i * cactusSpacing - 22, 0, zStagger);
            cactus.rotation.y = ((i * 53) % 360) * (Math.PI / 180);
            this.scene.add(cactus);
            this.midScenery.push(cactus);
        }

        // --------------------------------------------------------------------
        // 2. Distant Mountain Range (Z = -18 to -22)
        // --------------------------------------------------------------------
        const mountainCount = 6;
        for (let i = 0; i < mountainCount; i++) {
            const m = ModelFactory.createMountain(9 + Math.random() * 5, 6.5 + Math.random() * 5);
            m.position.set(i * 13 - 26, 0, -18 - Math.random() * 4);
            this.scene.add(m);
            this.mountains.push(m);
        }

        // --------------------------------------------------------------------
        // 3. Clouds Situated with the Mountains (Z = -17.5 to -22, hovering ridges)
        // --------------------------------------------------------------------
        const mountainCloudCount = 7;
        for (let i = 0; i < mountainCloudCount; i++) {
            const mc = ModelFactory.createMountainCloud();
            mc.position.set(i * 12 - 24, 4.5 + Math.random() * 3.5, -17.5 - Math.random() * 4);
            this.scene.add(mc);
            this.mountainClouds.push(mc);
        }

        // --------------------------------------------------------------------
        // 4. High Sky Puffy Clouds (Z = -11 to -15)
        // --------------------------------------------------------------------
        const skyCloudCount = 6;
        for (let i = 0; i < skyCloudCount; i++) {
            const c = ModelFactory.createCloud();
            c.position.set(i * 9 - 20, 8.5 + Math.random() * 3.0, -11 - Math.random() * 4);
            this.scene.add(c);
            this.clouds.push(c);
        }
    }

    update(delta, worldSpeed, score) {
        // Endless Recycling Ground (speed = 1.0)
        const segWidth = 20;
        this.segments.forEach(seg => {
            seg.position.x -= worldSpeed * delta;
            if (seg.position.x < -segWidth * 1.5) {
                seg.position.x += segWidth * this.segments.length;
            }
        });

        // Midground Layer: Big Cacti (speed = 0.55)
        const cactusSpan = 12 * 6.4;
        this.midScenery.forEach(item => {
            item.position.x -= worldSpeed * 0.55 * delta;
            if (item.position.x < -24) item.position.x += cactusSpan;
        });

        // Far Mountains (speed = 0.15)
        this.mountains.forEach(m => {
            m.position.x -= worldSpeed * 0.15 * delta;
            if (m.position.x < -36) m.position.x += 78;
        });

        // Clouds Situated with the Mountains (speed = 0.13)
        this.mountainClouds.forEach(mc => {
            mc.position.x -= worldSpeed * 0.13 * delta;
            if (mc.position.x < -36) mc.position.x += 84;
        });

        // High Sky Clouds Parallax (speed = 0.08)
        this.clouds.forEach(c => {
            c.position.x -= worldSpeed * 0.08 * delta;
            if (c.position.x < -28) c.position.x += 54;
        });

        // Biome Transition
        const currentBiomeIdx = Math.floor((score / 450) % this.biomes.length);
        if (currentBiomeIdx !== this.biomeIndex) {
            this.biomeIndex = currentBiomeIdx;
            this.applyBiome(this.biomes[this.biomeIndex]);
        }
    }

    applyBiome(biome) {
        const badge = document.getElementById('biome-indicator');
        if (badge) badge.textContent = biome;

        if (biome === 'DESERT') {
            ModelFactory.mats.sandGround.color.setHex(0xded29e);
            this.scene.fog.color.setHex(0xf4a261);
        } else if (biome === 'GRASSLAND') {
            ModelFactory.mats.sandGround.color.setHex(0x52b788);
            this.scene.fog.color.setHex(0xa8dadc);
        } else if (biome === 'FOREST') {
            ModelFactory.mats.sandGround.color.setHex(0x2d6a4f);
            this.scene.fog.color.setHex(0x74c69d);
        } else if (biome === 'VOLCANIC') {
            ModelFactory.mats.sandGround.color.setHex(0x262428);
            this.scene.fog.color.setHex(0x401f26);
        }
    }

    reset() {
        this.biomeIndex = 0;
        this.applyBiome('DESERT');
    }
}

// ============================================================================
// 8. DAY / NIGHT CYCLE & ATMOSPHERE
// ============================================================================
class DayNightCycle {
    constructor(scene, dirLight, hemiLight) {
        this.scene = scene;
        this.dirLight = dirLight;
        this.hemiLight = hemiLight;
        this.cycleTime = 0;
    }

    update(delta) {
        this.cycleTime += delta * 0.05;
        const t = (Math.sin(this.cycleTime) + 1) / 2;

        this.dirLight.intensity = 0.2 + t * 0.9;
        this.dirLight.position.x = 10 * Math.cos(this.cycleTime);
        this.dirLight.position.y = 12 * Math.sin(this.cycleTime) + 2;

        const daySky = new THREE.Color(0xdbe9f4);
        const nightSky = new THREE.Color(0x0e131f);
        const curSky = nightSky.clone().lerp(daySky, t);
        this.scene.background = curSky;
    }
}

// ============================================================================
// 9. CORE GAME ENGINE
// ============================================================================
class Game {
    constructor() {
        this.state = 'TITLE';
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('dino3d_highscore') || '0', 10);
        this.baseSpeed = 9.5;
        this.maxSpeed = 26.0;
        this.worldSpeed = this.baseSpeed;

        this.shakeIntensity = 0;
        this.baseCamPos = new THREE.Vector3(1.5, 3.8, 9.8);
        this.baseCamLookAt = new THREE.Vector3(1.0, 1.2, 0);

        this.debugVisible = false;
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.fps = 60;

        this.initGraphics();
        this.audio = new AudioManager();
        this.particles = new ParticleManager(this.scene);
        this.player = new Player(this.scene, this.audio);
        this.obstacles = new ObstacleManager(this.scene);
        this.environment = new EnvironmentManager(this.scene);
        this.dayNight = new DayNightCycle(this.scene, this.dirLight, this.hemiLight);
        this.inputs = new InputManager(this);

        this.bindUI();
        this.updateScoreDisplay();

        this.clock = new THREE.Clock();
        requestAnimationFrame((t) => this.loop(t));
    }

    initGraphics() {
        this.canvas = document.getElementById('webgl-canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xdbe9f4);
        this.scene.fog = new THREE.Fog(0xf4a261, 15, 38);

        this.camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.copy(this.baseCamPos);
        this.camera.lookAt(this.baseCamLookAt);

        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 0.65);
        this.scene.add(this.hemiLight);

        this.dirLight = new THREE.DirectionalLight(0xfffaed, 0.95);
        this.dirLight.position.set(9, 14, 8);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 1024;
        this.dirLight.shadow.mapSize.height = 1024;
        this.dirLight.shadow.camera.near = 0.5;
        this.dirLight.shadow.camera.far = 38;
        this.dirLight.shadow.camera.left = -14;
        this.dirLight.shadow.camera.right = 18;
        this.dirLight.shadow.camera.top = 12;
        this.dirLight.shadow.camera.bottom = -5;
        this.scene.add(this.dirLight);

        ModelFactory.initMaterials();

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    bindUI() {
        const audioBtn = document.getElementById('audio-toggle-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const fullscreenBtn = document.getElementById('fullscreen-btn');

        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                    const docEl = document.documentElement;
                    if (docEl.requestFullscreen) {
                        docEl.requestFullscreen();
                    } else if (docEl.webkitRequestFullscreen) {
                        docEl.webkitRequestFullscreen();
                    }
                } else {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    } else if (document.webkitExitFullscreen) {
                        document.webkitExitFullscreen();
                    }
                }
            });
        }
        if (audioBtn) {
            audioBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.audio.init();
                const muted = this.audio.toggleMute();
                audioBtn.textContent = muted ? '🔇' : '🔊';
            });
        }
        if (pauseBtn) {
            pauseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePause();
            });
        }
    }

    triggerCameraShake(amount) {
        this.shakeIntensity = amount;
    }

    onJumpAction() {
        this.audio.init();
        if (this.state === 'TITLE') {
            this.startGame();
            return;
        }
        if (this.state === 'GAME_OVER') {
            this.restartGame();
            return;
        }
        if (this.state === 'PLAYING') {
            this.player.jump();
        }
    }

    onJumpRelease() {
        if (this.state === 'PLAYING') {
            this.player.cutJump();
        }
    }

    onDuckAction(isDucking) {
        if (this.state === 'PLAYING') {
            this.player.setDuck(isDucking);
        }
    }

    togglePause() {
        if (this.state !== 'PLAYING' && this.state !== 'PAUSED') return;
        this.state = (this.state === 'PLAYING') ? 'PAUSED' : 'PLAYING';
        document.getElementById('pause-overlay').classList.toggle('hidden', this.state !== 'PAUSED');
    }

    toggleDebug() {
        this.debugVisible = !this.debugVisible;
        document.getElementById('debug-overlay').classList.toggle('hidden', !this.debugVisible);
    }

    startGame() {
        this.state = 'PLAYING';
        document.getElementById('start-overlay').classList.add('hidden');
        document.getElementById('game-over-overlay').classList.add('hidden');
        document.getElementById('pause-overlay').classList.add('hidden');
    }

    gameOver() {
        this.state = 'GAME_OVER';
        this.audio.playCrash();
        this.triggerCameraShake(0.35);
        this.particles.spawnImpact(this.player.posX + 0.3, this.player.posY + 0.5, this.player.posZ, 25);

        if (this.score > this.highScore) {
            this.highScore = Math.floor(this.score);
            localStorage.setItem('dino3d_highscore', this.highScore);
        }

        document.getElementById('final-score').textContent = String(Math.floor(this.score)).padStart(5, '0');
        document.getElementById('final-high-score').textContent = String(this.highScore).padStart(5, '0');
        document.getElementById('game-over-overlay').classList.remove('hidden');
    }

    restartGame() {
        this.score = 0;
        this.worldSpeed = this.baseSpeed;
        this.player.reset();
        this.obstacles.reset();
        this.environment.reset();
        this.particles.reset();
        this.updateScoreDisplay();
        this.startGame();
    }

    updateScoreDisplay() {
        const s = String(Math.floor(this.score)).padStart(5, '0');
        const h = String(this.highScore).padStart(5, '0');
        document.getElementById('score-val').textContent = s;
        document.getElementById('high-score-val').textContent = h;
    }

    checkCollisions() {
        for (const obs of this.obstacles.obstacles) {
            if (obs.box && !obs.box.isEmpty()) {
                if (this.player.box.intersectsBox(obs.box)) {
                    this.gameOver();
                    break;
                }
            }
        }
    }

    updateDebug() {
        if (!this.debugVisible) return;
        document.getElementById('dbg-fps').textContent = this.fps;
        document.getElementById('dbg-dinoy').textContent = this.player.posY.toFixed(2);
        document.getElementById('dbg-dinovy').textContent = this.player.velocityY.toFixed(2);
        document.getElementById('dbg-speed').textContent = this.worldSpeed.toFixed(2);
        document.getElementById('dbg-obstacles').textContent = this.obstacles.obstacles.length;
        document.getElementById('dbg-particles').textContent = this.particles.particles.length;
        document.getElementById('dbg-biome').textContent = this.environment.biomes[this.environment.biomeIndex];
    }

    loop(time) {
        requestAnimationFrame((t) => this.loop(t));

        const delta = Math.min(this.clock.getDelta(), 0.05);

        this.frameCount++;
        if (time - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = time;
        }

        this.inputs.update();

        if (this.state === 'PLAYING') {
            this.worldSpeed = Math.min(this.baseSpeed + (this.score * 0.007), this.maxSpeed);

            const prevScore100 = Math.floor(this.score / 100);
            this.score += delta * this.worldSpeed * 1.5;
            const newScore100 = Math.floor(this.score / 100);
            if (newScore100 > prevScore100) {
                this.audio.playScoreDing();
            }
            this.updateScoreDisplay();

            this.player.update(delta, this.worldSpeed, this.particles);
            this.obstacles.update(delta, this.worldSpeed);
            this.environment.update(delta, this.worldSpeed, this.score);
            this.particles.update(delta);
            this.dayNight.update(delta);

            this.checkCollisions();
        } else if (this.state === 'TITLE' || this.state === 'GAME_OVER') {
            this.environment.update(delta, 3.0, this.score);
            this.dayNight.update(delta * 0.5);
            this.particles.update(delta);
        }

        if (this.shakeIntensity > 0) {
            this.shakeIntensity -= delta * 1.5;
            const sx = (Math.random() - 0.5) * this.shakeIntensity;
            const sy = (Math.random() - 0.5) * this.shakeIntensity;
            this.camera.position.set(this.baseCamPos.x + sx, this.baseCamPos.y + sy, this.baseCamPos.z);
        } else {
            this.camera.position.copy(this.baseCamPos);
        }
        this.camera.lookAt(this.baseCamLookAt);

        this.updateDebug();
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
