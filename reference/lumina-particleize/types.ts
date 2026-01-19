export interface ParticleConfig {
  particleSize: number;
  particleDensity: number;
  disruption: number; // Used for angle spread/randomness now
  returnSpeed: number; // Keeping for compatibility, though less used in flow mode
  scatterLimit: number;
  mouseRadius: number;
  mouseForce: number;
  friction: number;
  brightness: number;
  glowIntensity: number;
  sizeVariance: number;
  pulseSpeed: number;
  pulseAmplitude: number;
  // New Flow Parameters
  flowAngle: number; // 0 - 360 degrees
  flowSpeed: number; // How fast they move
  fadeRate: number; // How fast they darken/die (0.01 - 0.1)
  // Color & Density Features
  customColor: string; // Hex color code
  useSourceColor: boolean; // Toggle between image color and custom color
  // Export Settings
  recordDuration: number; // Seconds
}

export interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  r: number;
  g: number;
  b: number;
  randomFactor: number;
  angle: number;
  life: number; // 1.0 = Full Brightness, 0.0 = Dark/Reset
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}