export interface ProcessingOptions {
  cellSize: number;
  glassOpacity: number;
  bevelIntensity: number;
  innerShine: number;
  gap: number;
  renderShape: 'square' | 'circle';
  sparkleIntensity: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
}