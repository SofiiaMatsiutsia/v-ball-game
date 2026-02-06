import * as THREE from 'three';
import gsap from 'gsap';
import { PARTICLE_COUNT, SPHERE_RADIUS, EXPLOSION_RADIUS, COLOR_CORE, COLOR_OUTER } from '../constants';

export class SceneController {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particles: THREE.Points | null = null;
  
  // Data arrays
  private spherePositions: Float32Array;
  private explosionPositions: Float32Array;
  private currentPositions: Float32Array;

  // Animation state
  private explosionFactor = { value: 0 }; 
  
  // Cleanup
  private frameId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    
    // Camera setup
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.z = 8;

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: true, 
      alpha: true, // Critical: Allows CSS background (video) to show through
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0); // Explicitly clear to transparent

    // Initialize data
    this.spherePositions = new Float32Array(PARTICLE_COUNT * 3);
    this.explosionPositions = new Float32Array(PARTICLE_COUNT * 3);
    this.currentPositions = new Float32Array(PARTICLE_COUNT * 3);

    this.initParticles();
    this.initLighting();
    
    window.addEventListener('resize', this.handleResize);
    this.animate();
  }

  private initLighting() {
    const ambientLight = new THREE.AmbientLight(0x4a1a0a, 0.5); // Deep Orange/Brown Ambient
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 2, 50); // White Point Light
    pointLight.position.set(2, 2, 5);
    this.scene.add(pointLight);
  }

  private initParticles() {
    const geometry = new THREE.BufferGeometry();
    
    // Create Sphere positions and Explosion positions
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // 1. Sphere Shape
      const phi = Math.acos(-1 + (2 * i) / PARTICLE_COUNT);
      const theta = Math.sqrt(PARTICLE_COUNT * Math.PI) * phi;

      const sx = SPHERE_RADIUS * Math.cos(theta) * Math.sin(phi);
      const sy = SPHERE_RADIUS * Math.sin(theta) * Math.sin(phi);
      const sz = SPHERE_RADIUS * Math.cos(phi);

      this.spherePositions[i3] = sx;
      this.spherePositions[i3 + 1] = sy;
      this.spherePositions[i3 + 2] = sz;

      // 2. Explosion Shape
      const u = Math.random();
      const v = Math.random();
      const thetaR = 2 * Math.PI * u;
      const phiR = Math.acos(2 * v - 1);
      const r = SPHERE_RADIUS + (Math.random() * (EXPLOSION_RADIUS - SPHERE_RADIUS));

      this.explosionPositions[i3] = r * Math.sin(phiR) * Math.cos(thetaR);
      this.explosionPositions[i3 + 1] = r * Math.sin(phiR) * Math.sin(thetaR);
      this.explosionPositions[i3 + 2] = r * Math.cos(phiR);

      // Initial state = sphere
      this.currentPositions[i3] = sx;
      this.currentPositions[i3 + 1] = sy;
      this.currentPositions[i3 + 2] = sz;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.currentPositions, 3));

    // Material
    const material = new THREE.PointsMaterial({
      color: COLOR_CORE,
      size: 0.15, // Slightly larger to compensate for lack of bloom
      transparent: true,
      opacity: 0.9, // More opaque
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false, 
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  public updateHandPosition(x: number, y: number) {
    // Map normalized 2D (0-1) to 3D world space
    const vec = new THREE.Vector3();
    const pos = new THREE.Vector3();
    
    vec.set((x * 2) - 1, -(y * 2) + 1, 0.5);
    vec.unproject(this.camera);
    vec.sub(this.camera.position).normalize();

    const distance = -this.camera.position.z / vec.z;
    pos.copy(this.camera.position).add(vec.multiplyScalar(distance));

    // Smoothly interpolate the group position
    if (this.particles) {
        gsap.to(this.particles.position, {
            x: pos.x,
            y: pos.y,
            z: pos.z,
            duration: 0.2,
            overwrite: true
        });
    }
  }

  public triggerExplosion() {
    gsap.to(this.explosionFactor, {
      value: 1,
      duration: 0.8,
      ease: "power2.out"
    });
  }

  public triggerAssembly() {
    gsap.to(this.explosionFactor, {
      value: 0,
      duration: 0.6,
      ease: "power2.inOut"
    });
  }

  private handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private animate = () => {
    this.frameId = requestAnimationFrame(this.animate);

    if (this.particles) {
      this.particles.rotation.y += 0.002;
      this.particles.rotation.z += 0.001;

      const positions = this.particles.geometry.attributes.position.array as Float32Array;
      const factor = this.explosionFactor.value;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        // Linear interpolation between sphere and explosion
        positions[i3] = this.spherePositions[i3] * (1 - factor) + this.explosionPositions[i3] * factor;
        positions[i3 + 1] = this.spherePositions[i3 + 1] * (1 - factor) + this.explosionPositions[i3 + 1] * factor;
        positions[i3 + 2] = this.spherePositions[i3 + 2] * (1 - factor) + this.explosionPositions[i3 + 2] * factor;
      }

      this.particles.geometry.attributes.position.needsUpdate = true;
      
      // Dynamic color shift using Lerp for smoothness
      const mat = this.particles.material as THREE.PointsMaterial;
      const targetColor = new THREE.Color(factor > 0.5 ? COLOR_OUTER : COLOR_CORE);
      mat.color.lerp(targetColor, 0.1);
    }

    this.renderer.render(this.scene, this.camera);
  };

  public cleanup() {
    if (this.frameId) cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
  }
}