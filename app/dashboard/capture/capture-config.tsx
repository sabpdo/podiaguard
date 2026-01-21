// Configuration for wound capture camera validation

export const LIGHTING_CONFIG = {
  // Minimum average brightness (0-255 scale) - below this is "too dark"
  minBrightness: 50,
  // Maximum average brightness (0-255 scale) - above this is "too bright"
  maxBrightness: 200,
};

export const DISTANCE_CONFIG = {
  // Minimum foot height ratio (foot height / frame height) - below this is "too far"
  minDistance: 0.2,
  // Maximum foot height ratio - above this is "too close"
  maxDistance: 0.7,
};
