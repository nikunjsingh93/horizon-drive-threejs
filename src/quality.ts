export type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra';
export type RenderResolution = 'auto' | '640' | '720' | '1080' | '1440' | '2160';

export function renderResolution(value:string):RenderResolution {
  return ['640','720','1080','1440','2160'].includes(value)?value as RenderResolution:'auto';
}

export function renderPixelRatio(cssHeight:number,deviceRatio:number,quality:GraphicsQuality,resolution:RenderResolution):number {
  if(resolution==='auto')return Math.min(deviceRatio,qualityPresets[quality].pixelRatio);
  return Math.min(4,Number(resolution)/Math.max(1,cssHeight));
}

export const qualityPresets = {
  low: { pixelRatio: 0.55, tileRadius: 1, terrainSegments: 16, chunkBehind: 1, chunkAhead: 1, vegetation: 0.25, fogFar: 180, shadowSize: 0 },
  medium: { pixelRatio: 0.85, tileRadius: 2, terrainSegments: 24, chunkBehind: 1, chunkAhead: 3, vegetation: 0.32, fogFar: 350, shadowSize: 0 },
  high: { pixelRatio: 1.25, tileRadius: 3, terrainSegments: 48, chunkBehind: 1, chunkAhead: 4, vegetation: 1, fogFar: 560, shadowSize: 1024 },
  ultra: { pixelRatio: 1.75, tileRadius: 4, terrainSegments: 64, chunkBehind: 2, chunkAhead: 5, vegetation: 1.2, fogFar: 700, shadowSize: 2048 },
} as const;

export function graphicsQuality(value: string): GraphicsQuality {
  return value in qualityPresets ? value as GraphicsQuality : 'high';
}
