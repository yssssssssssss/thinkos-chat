export interface ParticleConfig {
  particleSize: number;
  particleDensity: number;
  disruption: number;
  returnSpeed: number;
  scatterLimit: number;
  mouseRadius: number;
  mouseForce: number;
  friction: number;
  brightness: number;
  glowIntensity: number;
  sizeVariance: number;
  pulseSpeed: number;
  pulseAmplitude: number;
  flowAngle: number;
  flowSpeed: number;
  fadeRate: number;
  customColor: string;
  useSourceColor: boolean;
  recordDuration: number;
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
  life: number;
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

