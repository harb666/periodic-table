// Gir, the rigged 3D mascot. Loaded lazily (this module pulls in three.js).
// The skeleton, skin weights and clips come from scripts/rig-character.mjs.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import zapUrl from '../assets/zap.glb?url';

export type ZapClip = 'Idle' | 'Run' | 'Wave' | 'Jump' | 'Point' | 'Dance' | 'Cheer';

const FADE = 0.18;

export class ZapActor {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private current: THREE.AnimationAction | null = null;
  private base: ZapClip = 'Idle';
  private head: THREE.Object3D | null;
  private yaw = 0;
  private yawTarget = 0;
  private look = new THREE.Vector2();
  private lookTarget = new THREE.Vector2();
  private tongue: THREE.Object3D | null = null;
  private talking = false;
  private talkTime = 0;
  private disposed = false;

  static async create(canvas: HTMLCanvasElement): Promise<ZapActor> {
    const gltf = await new GLTFLoader().loadAsync(zapUrl);
    return new ZapActor(canvas, gltf.scene, gltf.animations);
  }

  private constructor(
    private canvas: HTMLCanvasElement,
    private model: THREE.Object3D,
    clips: THREE.AnimationClip[],
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    this.renderer.setClearColor(0x000000, 0);

    // Framing: feet on y=0, 1 unit tall, with headroom for the jump and elbow room for the ears.
    this.camera = new THREE.OrthographicCamera(-0.62, 0.62, 0.775, -0.775, 0.1, 20);
    this.camera.position.set(0, 0.95, 6);
    this.camera.lookAt(0, 0.68, 0);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a6aa8, 3.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(1.5, 3, 4);
    this.scene.add(key);
    this.scene.add(model);
    // Bones swing vertices well outside the bind-pose bounds (jump, ears), so never cull.
    model.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isSkinnedMesh) return;
      mesh.frustumCulled = false;
      // The source materials are tuned for a bright backdrop; lift the suit so it reads on the app's dark one.
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat.map) mat.color.multiplyScalar(1.8);
    });
    this.head = model.getObjectByName('Head') ?? null;
    this.tongue = model.getObjectByName('Tongue') ?? null;

    this.mixer = new THREE.AnimationMixer(model);
    for (const clip of clips) this.actions.set(clip.name, this.mixer.clipAction(clip));
    this.mixer.addEventListener('finished', (e) => {
      if (e.action === this.current) this.fadeTo(this.base, true);
    });
    this.fadeTo('Idle', true);
    this.resize();
  }

  /** Match the drawing buffer to the canvas's CSS size. */
  resize() {
    const w = this.canvas.clientWidth || 120;
    const h = this.canvas.clientHeight || 150;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    const halfH = 0.775;
    const halfW = halfH * (w / h);
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.updateProjectionMatrix();
  }

  private fadeTo(name: ZapClip, loop: boolean, repetitions = 1) {
    const next = this.actions.get(name);
    if (!next) return 0;
    next.reset();
    next.setLoop(loop ? THREE.LoopRepeat : repetitions > 1 ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : repetitions);
    next.clampWhenFinished = true;
    if (this.current && this.current !== next) next.crossFadeFrom(this.current, FADE, false);
    next.play();
    this.current = next;
    return next.getClip().duration * (loop ? 1 : repetitions);
  }

  /** Switch the looping clip he falls back to (Idle or Run). */
  loop(name: 'Idle' | 'Run' | 'Dance') {
    if (this.base === name && this.current === this.actions.get(name)) return;
    this.base = name;
    this.fadeTo(name, true);
  }

  /** Play a clip once (or `repetitions` times), then return to the base loop. Returns its length in seconds. */
  playOnce(name: ZapClip, repetitions = 1): number {
    return this.fadeTo(name, false, repetitions);
  }

  /** Turn the whole body: 0 faces the viewer, +π/2 faces screen-right. Smoothed. */
  face(yaw: number) {
    this.yawTarget = yaw;
  }

  /** Glance toward a point; x and y in -1..1 (screen right / screen down). Smoothed. */
  lookAt(x: number, y: number) {
    this.lookTarget.set(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(y, -1, 1));
  }

  /** Chatter motion (tongue flap, small head nods) layered over whatever clip is playing. */
  setTalking(talking: boolean) {
    this.talking = talking;
  }

  update(dt: number) {
    if (this.disposed) return;
    this.mixer.update(dt);
    const k = 1 - Math.exp(-dt * 12);
    this.yaw += (this.yawTarget - this.yaw) * k;
    this.model.rotation.y = this.yaw;
    this.look.lerp(this.lookTarget, 1 - Math.exp(-dt * 6));
    if (this.head) {
      // Layered on top of whatever the clip did to the head this frame.
      this.head.rotateY(this.look.x * 0.4);
      this.head.rotateX(this.look.y * 0.22);
    }
    if (this.talking) {
      this.talkTime += dt;
      const t = this.talkTime;
      this.head?.rotateX(0.05 * Math.sin(t * 17) + 0.03 * Math.sin(t * 7.3));
      this.tongue?.rotateX(0.45 * Math.sin(t * 21));
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    this.mixer.stopAllAction();
    this.model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        (m as THREE.MeshStandardMaterial).map?.dispose();
        m.dispose();
      }
    });
    this.renderer.dispose();
  }
}
