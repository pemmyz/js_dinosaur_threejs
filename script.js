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

        // Button 0 (A/Cross), Button 12 (D-pad Up)
        const jumpPressed = gp.buttons[0]?.pressed || gp.buttons[12]?.pressed;
        // Button 1 (B/Circle), Button 13 (D-pad Down)
        const duckPressed = gp.buttons[1]?.pressed || gp.buttons[13]?.pressed || gp.axes[1] > 0.5;
        // Button 9 (Start)
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
            dinoSkin: new THREE.MeshLambertMaterial({ color: 0x487346, flatShading: true }),
            dinoBelly: new THREE.MeshLambertMaterial({ color: 0x7ca96a, flatShading: true }),
            dinoEyes: new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 80 }),
            dinoEyePupil: new THREE.MeshBasicMaterial({ color: 0xffffff }),
            dinoTeeth: new THREE.MeshLambertMaterial({ color: 0xf5f3e9, flatShading: true }),
            dinoClaws: new THREE.MeshLambertMaterial({ color: 0x2b2b2b, flatShading: true }),

            cactusBase: new THREE.MeshLambertMaterial({ color: 0x2e6b36, flatShading: true }),
            cactusFlower: new THREE.MeshLambertMaterial({ color: 0xef476f, flatShading: true }),
            rockBase: new THREE.MeshLambertMaterial({ color: 0x7d7b7a, flatShading: true }),
            rockDark: new THREE.MeshLambertMaterial({ color: 0x5a5756, flatShading: true }),

            birdBody: new THREE.MeshLambertMaterial({ color: 0xa84a32, flatShading: true }),
            birdWing: new THREE.MeshLambertMaterial({ color: 0xd4684b, flatShading: true }),
            birdBeak: new THREE.MeshLambertMaterial({ color: 0xe9c46a, flatShading: true }),

            woodTrunk: new THREE.MeshLambertMaterial({ color: 0x5c4033, flatShading: true }),
            leafGreen: new THREE.MeshLambertMaterial({ color: 0x2d6a4f, flatShading: true }),
            leafDark: new THREE.MeshLambertMaterial({ color: 0x1b4332, flatShading: true }),
            leafAutumn: new THREE.MeshLambertMaterial({ color: 0xd97706, flatShading: true }),

            sandGround: new THREE.MeshLambertMaterial({ color: 0xded29e, flatShading: true }),
            grassGround: new THREE.MeshLambertMaterial({ color: 0x52b788, flatShading: true }),
            volcanicGround: new THREE.MeshLambertMaterial({ color: 0x262428, flatShading: true }),

            cloudMat: new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.88, flatShading: true })
        };
    }

    /** Creates an articulated, multi-part 3D low-poly Dinosaur */
    static createDinosaur() {
        const root = new THREE.Group();

        // Body main torso
        const bodyGeo = new THREE.BoxGeometry(0.85, 0.95, 0.65);
        const body = new THREE.Mesh(bodyGeo, this.mats.dinoSkin);
        body.position.set(0, 0.8, 0);
        body.castShadow = true;
        root.add(body);

        // Belly lighter underbelly
        const bellyGeo = new THREE.BoxGeometry(0.7, 0.7, 0.67);
        const belly = new THREE.Mesh(bellyGeo, this.mats.dinoBelly);
        belly.position.set(0.1, -0.05, 0);
        body.add(belly);

        // Dorsal ridges / back scales
        for (let i = 0; i < 3; i++) {
            const ridgeGeo = new THREE.ConeGeometry(0.06, 0.14, 4);
            const ridge = new THREE.Mesh(ridgeGeo, this.mats.dinoClaws);
            ridge.rotation.z = -Math.PI / 6;
            ridge.position.set(-0.35 + i * 0.25, 0.52, 0);
            body.add(ridge);
        }

        // Neck pivot & mesh
        const neckPivot = new THREE.Group();
        neckPivot.position.set(0.35, 0.35, 0);
        body.add(neckPivot);

        const neckGeo = new THREE.BoxGeometry(0.35, 0.55, 0.45);
        const neck = new THREE.Mesh(neckGeo, this.mats.dinoSkin);
        neck.position.set(0.05, 0.25, 0);
        neck.rotation.z = -0.2;
        neckPivot.add(neck);

        // Head
        const headPivot = new THREE.Group();
        headPivot.position.set(0.1, 0.3, 0);
        neck.add(headPivot);

        const headGeo = new THREE.BoxGeometry(0.75, 0.55, 0.55);
        const head = new THREE.Mesh(headGeo, this.mats.dinoSkin);
        head.position.set(0.25, 0.1, 0);
        head.castShadow = true;
        headPivot.add(head);

        // Snout
        const snoutGeo = new THREE.BoxGeometry(0.4, 0.35, 0.48);
        const snout = new THREE.Mesh(snoutGeo, this.mats.dinoSkin);
        snout.position.set(0.48, -0.05, 0);
        head.add(snout);

        // Nostrils
        const nostrilGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
        const nL = new THREE.Mesh(nostrilGeo, this.mats.dinoClaws);
        nL.position.set(0.2, 0.1, 0.15);
        const nR = nL.clone();
        nR.position.z = -0.15;
        snout.add(nL); snout.add(nR);

        // Lower Jaw
        const jawGeo = new THREE.BoxGeometry(0.55, 0.12, 0.48);
        const jaw = new THREE.Mesh(jawGeo, this.mats.dinoBelly);
        jaw.position.set(0.3, -0.24, 0);
        head.add(jaw);

        // Teeth
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

        // Eyes (Glossy + tiny specular pupil)
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

        // Arms
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

        // Segmented Tapered Tail
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

        // Legs (Upper, Lower, Foot with 3 toes)
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

            // Toes
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

    /** Creates detailed 3D Cacti */
    static createCactus(variant = 'small') {
        const group = new THREE.Group();

        const makeSingleCactus = (height, radius, addArms = true) => {
            const sub = new THREE.Group();
            const trunkGeo = new THREE.CylinderGeometry(radius * 0.85, radius, height, 7);
            const trunk = new THREE.Mesh(trunkGeo, this.mats.cactusBase);
            trunk.position.y = height / 2;
            trunk.castShadow = true;
            sub.add(trunk);

            // Rounded top cap
            const cap = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.85, 7, 5), this.mats.cactusBase);
            cap.position.y = height;
            sub.add(cap);

            // Optional Flower
            if (Math.random() < 0.4) {
                const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(radius * 0.5), this.mats.cactusFlower);
                flower.position.y = height + radius * 0.6;
                sub.add(flower);
            }

            if (addArms) {
                // Left arm
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

                // Right arm
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
        } else { // cluster
            for (let i = 0; i < 4; i++) {
                const c = makeSingleCactus(0.9 + Math.random() * 0.7, 0.18, Math.random() > 0.5);
                c.position.set((i - 1.5) * 0.45, 0, (Math.random() - 0.5) * 0.4);
                group.add(c);
            }
        }
        return group;
    }

    /** Creates low-poly Rock meshes */
    static createRock(size = 0.5) {
        const group = new THREE.Group();
        const geo = new THREE.DodecahedronGeometry(size, 0);
        // Distort vertices slightly for organic natural rocks
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

        // Main body & torso
        const body = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.1, 5), this.mats.birdBody);
        body.rotation.z = Math.PI / 2;
        group.add(body);

        // Head & elongated beak
        const headGroup = new THREE.Group();
        headGroup.position.set(0.6, 0.1, 0);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.2), this.mats.birdBody);
        headGroup.add(head);

        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.6, 4), this.mats.birdBeak);
        beak.rotation.z = -Math.PI / 2;
        beak.position.set(0.35, -0.02, 0);
        headGroup.add(beak);

        // Head Crest
        const crest = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45, 3), this.mats.birdBody);
        crest.rotation.z = Math.PI / 2.5;
        crest.position.set(-0.25, 0.15, 0);
        headGroup.add(crest);
        group.add(headGroup);

        // Eyes
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), this.mats.dinoEyes);
        eyeL.position.set(0.65, 0.18, 0.11);
        const eyeR = eyeL.clone();
        eyeR.position.z = -0.11;
        group.add(eyeL); group.add(eyeR);

        // Articulated Wings (Left and Right)
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

    /** Creates 3D Low-Poly Trees */
    static createTree(type = 'round') {
        const tree = new THREE.Group();
        const trunkH = 1.2 + Math.random() * 0.8;
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.22, trunkH, 5),
            this.mats.woodTrunk
        );
        trunk.position.y = trunkH / 2;
        trunk.castShadow = true;
        tree.add(trunk);

        if (type === 'round') {
            const foliage = new THREE.Mesh(
                new THREE.DodecahedronGeometry(1.0 + Math.random() * 0.4, 1),
                this.mats.leafGreen
            );
            foliage.position.y = trunkH + 0.6;
            foliage.castShadow = true;
            tree.add(foliage);
        } else { // Pine tree
            for (let i = 0; i < 3; i++) {
                const cone = new THREE.Mesh(
                    new THREE.ConeGeometry(1.1 - i * 0.28, 0.9, 5),
                    this.mats.leafDark
                );
                cone.position.y = trunkH + i * 0.6;
                cone.castShadow = true;
                tree.add(cone);
            }
        }
        return tree;
    }

    /** Creates Volumetric Puffy 3D Clouds */
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

    /** Creates Low-Poly Distant Mountain Meshes */
    static createMountain(width, height) {
        const geo = new THREE.ConeGeometry(width, height, 5);
        // Distort vertices slightly for rugged peaks
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            if (pos.getY(i) < height * 0.3) {
                pos.setX(i, pos.getX(i) * (1 + (Math.random() - 0.5) * 0.4));
                pos.setZ(i, pos.getZ(i) * (1 + (Math.random() - 0.5) * 0.4));
            }
        }
        geo.computeVertexNormals();
        const mat = new THREE.MeshLambertMaterial({ color: 0x4a4a58, flatShading: true });
        const mountain = new THREE.Mesh(geo, mat);
        mountain.position.y = height / 2;
        return mountain;
    }
}

// ============================================================================
// 4. PARTICLE MANAGER (Dust, Footsteps, Collision Debris, Weather)
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
// 5. PLAYER CONTROLLER (Physics, Articulated Animations & Ducking)
// ============================================================================
class Player {
    constructor(scene, audio) {
        this.scene = scene;
        this.audio = audio;
        this.dino = ModelFactory.createDinosaur();
        this.scene.add(this.dino.group);

        // Physics parameters
        this.posX = -3.2;
        this.posY = 0;
        this.posZ = 0;
        this.velocityY = 0;
        this.gravity = -34.0;
        this.jumpForce = 13.5;
        this.isGrounded = true;
        this.isDucking = false;

        // Visual animation timers
        this.animTime = 0;
        this.stepTimer = 0;
        this.squash = 1.0;

        // Collision box
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
            this.velocityY = 3.0; // Variable jump height
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
        // Physics update
        if (!this.isGrounded) {
            this.velocityY += this.gravity * delta;
            this.posY += this.velocityY * delta;
            if (this.posY <= 0) {
                this.posY = 0;
                this.velocityY = 0;
                this.isGrounded = true;
                this.squash = 0.75; // Land squish effect
                this.audio.playLand();
                particleMgr.spawnDust(this.posX, this.posY, this.posZ, 6);
            }
        }

        // Fast fall if ducking while in air
        if (!this.isGrounded && this.isDucking) {
            this.velocityY += this.gravity * 1.5 * delta;
        }

        // Update Dino Transform
        this.dino.group.position.set(this.posX, this.posY, this.posZ);

        // Land squish recovery
        this.squash += (1.0 - this.squash) * 12.0 * delta;

        // Animation logic
        this.animTime += delta * worldSpeed * 2.2;
        const runCycle = Math.sin(this.animTime);

        if (this.isGrounded) {
            // Footstep audio & dust puff at foot landing
            this.stepTimer += delta * worldSpeed;
            if (this.stepTimer > 1.8) {
                this.stepTimer = 0;
                this.audio.playFootstep();
                particleMgr.spawnDust(this.posX - 0.2, this.posY, this.posZ, 2);
            }

            // Legs swing
            this.dino.legL.root.rotation.z = runCycle * 0.75;
            this.dino.legR.root.rotation.z = -runCycle * 0.75;

            // Arms counter-swing
            this.dino.armL.rotation.z = -runCycle * 0.4;
            this.dino.armR.rotation.z = runCycle * 0.4;

            // Tail sinusoidal wave
            this.dino.tailSegments.forEach((seg, idx) => {
                seg.rotation.y = Math.sin(this.animTime - idx * 0.45) * 0.18;
                seg.rotation.z = Math.cos(this.animTime * 0.5) * 0.08;
            });

            // Head subtle bob
            this.dino.headPivot.position.y = 0.3 + Math.abs(runCycle) * 0.06;
        } else {
            // Jump poses
            this.dino.legL.root.rotation.z = -0.4;
            this.dino.legR.root.rotation.z = 0.5;
            this.dino.armL.rotation.z = -0.8;
            this.dino.armR.rotation.z = -0.8;
        }

        // Ducking posture adjustment
        if (this.isDucking) {
            this.dino.group.scale.set(1.15, 0.62 * this.squash, 1.0);
            this.dino.body.rotation.z = -0.3;
            this.dino.neckPivot.rotation.z = -0.4;
        } else {
            this.dino.group.scale.set(1.0, 1.0 * this.squash, 1.0);
            this.dino.body.rotation.z = 0;
            this.dino.neckPivot.rotation.z = 0;
        }

        // Update fair collision Box3
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
        this.pool = [];
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
        // Bias choice slightly as speed increases
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
            // 3 flying heights: 0: jump over, 1: duck under, 2: high decoration
            const heightTier = Math.random() < 0.55 ? 1 : (Math.random() < 0.5 ? 0 : 2);
            if (heightTier === 0) posY = 0.7;       // Low: must jump
            else if (heightTier === 1) posY = 1.35; // Medium: must duck
            else posY = 2.4;                       // High: safe

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
        // Spawn timer
        this.spawnTimer -= delta;
        if (this.spawnTimer <= 0) {
            this.spawn(worldSpeed);
            // Dynamic spawn interval based on speed to ensure reaction time
            const baseTime = 1.2 + Math.random() * 1.5;
            this.spawnTimer = THREE.MathUtils.clamp(baseTime / (worldSpeed * 0.08), 0.75, 2.5);
        }

        // Move obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.mesh.position.x -= worldSpeed * delta;

            // Flying bird wing flap animation
            if (obs.type === 'bird' && obs.wingL && obs.wingR) {
                obs.wingAnim += delta * 15.0;
                const angle = Math.sin(obs.wingAnim) * 0.75;
                obs.wingL.rotation.x = angle;
                obs.wingR.rotation.x = -angle;
            }

            // Update bounding Box3
            const p = obs.mesh.position;
            const b = obs.boxDim;
            // Ignore collision for high safe birds
            if (obs.type === 'bird' && obs.heightTier === 2) {
                obs.box.makeEmpty();
            } else {
                obs.box.min.set(p.x - b.w / 2, p.y + 0.05, -b.d / 2);
                obs.box.max.set(p.x + b.w / 2, p.y + b.h, b.d / 2);
            }

            // Remove out-of-bounds obstacles
            if (obs.mesh.position.x < -16.0) {
                this.scene.remove(obs.mesh);
                this.obstacles.splice(i, 1);
            }
        }
    }
}

// ============================================================================
// 7. ENVIRONMENT & PARALLAX MANAGER (Endless Diorama Layers & Biomes)
// ============================================================================
class EnvironmentManager {
    constructor(scene) {
        this.scene = scene;
        this.segments = [];
        this.midScenery = [];
        this.mountains = [];
        this.clouds = [];
        this.biomeIndex = 0;
        this.biomes = ['DESERT', 'GRASSLAND', 'FOREST', 'VOLCANIC'];

        this.initEndlessGround();
        this.initParallaxLayers();
    }

    initEndlessGround() {
            const segWidth = 20;
            const segCount = 5;
            // CHANGED: Increased ground depth from 4.5 to 14.0 to extend back under the trees
            this.groundGeo = new THREE.BoxGeometry(segWidth, 1.5, 14.0);

            for (let i = 0; i < segCount; i++) {
                const ground = new THREE.Mesh(this.groundGeo, ModelFactory.mats.sandGround);
                // CHANGED: Shifted Z from 0 to -3.5 so ground covers Z = +3.5 to Z = -10.5
                ground.position.set((i - 1) * segWidth, -0.75, -3.5);
                ground.receiveShadow = true;
                this.scene.add(ground);

                // Add small 3D pebbles/bushes on ground edges
                const details = new THREE.Group();
                for (let j = 0; j < 6; j++) {
                    const rock = ModelFactory.createRock(0.12 + Math.random() * 0.15);
                    // CHANGED: Adjusted local Z offset to keep edge pebbles along the front path
                    rock.position.set((Math.random() - 0.5) * segWidth, 0.75, 4.2 + Math.random() * 0.8);
                    details.add(rock);
                }
                ground.add(details);
                this.segments.push(ground);
            }
        }

    initParallaxLayers() {
        // Midground Trees & Bushes (Z = -4.5)
        for (let i = 0; i < 8; i++) {
            const tree = ModelFactory.createTree('round');
            tree.position.set(i * 6 - 15, 0, -4.5);
            this.scene.add(tree);
            this.midScenery.push(tree);
        }

        // Far Mountains (Z = -18)
        for (let i = 0; i < 6; i++) {
            const m = ModelFactory.createMountain(8 + Math.random() * 5, 6 + Math.random() * 5);
            m.position.set(i * 12 - 25, 0, -18 - Math.random() * 4);
            this.scene.add(m);
            this.mountains.push(m);
        }

        // Volumetric 3D Clouds (Z = -12 to -22)
        for (let i = 0; i < 7; i++) {
            const c = ModelFactory.createCloud();
            c.position.set(i * 8 - 20, 6 + Math.random() * 4, -12 - Math.random() * 10);
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

        // Midground Layer (speed = 0.55)
        this.midScenery.forEach(item => {
            item.position.x -= worldSpeed * 0.55 * delta;
            if (item.position.x < -20) item.position.x += 48;
        });

        // Far Mountains (speed = 0.15)
        this.mountains.forEach(m => {
            m.position.x -= worldSpeed * 0.15 * delta;
            if (m.position.x < -35) m.position.x += 72;
        });

        // 3D Clouds Parallax (speed = 0.08)
        this.clouds.forEach(c => {
            c.position.x -= worldSpeed * 0.08 * delta;
            if (c.position.x < -28) c.position.x += 56;
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
        const t = (Math.sin(this.cycleTime) + 1) / 2; // 0 (Night) to 1 (Day)

        // Sunlight intensity and colors
        this.dirLight.intensity = 0.2 + t * 0.9;
        this.dirLight.position.x = 10 * Math.cos(this.cycleTime);
        this.dirLight.position.y = 12 * Math.sin(this.cycleTime) + 2;

        // Ambient sky tint
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
        this.state = 'TITLE'; // 'TITLE', 'PLAYING', 'PAUSED', 'GAME_OVER'
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('dino3d_highscore') || '0', 10);
        this.baseSpeed = 9.5;
        this.maxSpeed = 26.0;
        this.worldSpeed = this.baseSpeed;

        // Camera shake variables
        this.shakeIntensity = 0;
        this.baseCamPos = new THREE.Vector3(1.5, 3.8, 9.8);
        this.baseCamLookAt = new THREE.Vector3(1.0, 1.2, 0);

        // Debug stats
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

        // Start render loop
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

        // 2.5D Ortho-like Weak Perspective Camera
        this.camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.copy(this.baseCamPos);
        this.camera.lookAt(this.baseCamLookAt);

        // Lighting
        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 0.65);
        this.scene.add(this.hemiLight);

        this.dirLight = new THREE.DirectionalLight(0xfffaed, 0.95);
        this.dirLight.position.set(9, 14, 8);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 1024;
        this.dirLight.shadow.mapSize.height = 1024;
        this.dirLight.shadow.camera.near = 0.5;
        this.dirLight.shadow.camera.far = 35;
        this.dirLight.shadow.camera.left = -12;
        this.dirLight.shadow.camera.right = 16;
        this.dirLight.shadow.camera.top = 10;
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

        // FPS calculation
        this.frameCount++;
        if (time - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = time;
        }

        this.inputs.update();

        if (this.state === 'PLAYING') {
            // Difficulty Scaling
            this.worldSpeed = Math.min(this.baseSpeed + (this.score * 0.007), this.maxSpeed);

            // Score update & milestone sounds
            const prevScore100 = Math.floor(this.score / 100);
            this.score += delta * this.worldSpeed * 1.5;
            const newScore100 = Math.floor(this.score / 100);
            if (newScore100 > prevScore100) {
                this.audio.playScoreDing();
            }
            this.updateScoreDisplay();

            // Entities update
            this.player.update(delta, this.worldSpeed, this.particles);
            this.obstacles.update(delta, this.worldSpeed);
            this.environment.update(delta, this.worldSpeed, this.score);
            this.particles.update(delta);
            this.dayNight.update(delta);

            this.checkCollisions();
        } else if (this.state === 'TITLE' || this.state === 'GAME_OVER') {
            // Idle background animations
            this.environment.update(delta, 3.0, this.score);
            this.dayNight.update(delta * 0.5);
            this.particles.update(delta);
        }

        // Camera Shake calculation
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
