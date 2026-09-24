export type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra';

export const qualityPresets = {
  low: { pixelRatio: 0.55, tileRadius: 1, terrainSegments: 16, chunkBehind: 1, chunkAhead: 2, vegetation: 0.14, fogFar: 180, shadowSize: 0 },
  medium: { pixelRatio: 0.85, tileRadius: 2, terrainSegments: 24, chunkBehind: 1, chunkAhead: 4, vegetation: 0.38, fogFar: 350, shadowSize: 0 },
  high: { pixelRatio: 1.25, tileRadius: 3, terrainSegments: 48, chunkBehind: 2, chunkAhead: 8, vegetation: 1, fogFar: 560, shadowSize: 1024 },
  ultra: { pixelRatio: 1.75, tileRadius: 4, terrainSegments: 64, chunkBehind: 2, chunkAhead: 10, vegetation: 1.2, fogFar: 700, shadowSize: 2048 },
} as const;

export function graphicsQuality(value: string): GraphicsQuality {
  return value in qualityPresets ? value as GraphicsQuality : 'high';
}
