/**
 * One-Euro Filter for Real-Time Bounding Box & Coordinate Smoothing
 * Reference: Casiez, Roussel, Vogel (CHI 2012)
 * Eliminates high-frequency coordinate jitter at low speeds while retaining zero lag at high speeds.
 */

export class OneEuroFilter {
  private minCutoff: number; // Minimum cutoff frequency in Hz (lower = more smoothing when still)
  private beta: number;      // Speed coefficient (higher = faster adaptation when moving)
  private dCutoff: number;   // Cutoff frequency for derivative in Hz
  private xPrev: number | null = null;
  private dxPrev: number = 0;
  private tPrev: number | null = null;

  constructor(minCutoff: number = 0.8, beta: number = 0.05, dCutoff: number = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  public filter(x: number, timestamp: number): number {
    if (this.xPrev === null || this.tPrev === null) {
      this.xPrev = x;
      this.tPrev = timestamp;
      this.dxPrev = 0;
      return x;
    }

    const dt = Math.max(1e-3, (timestamp - this.tPrev) / 1000);
    this.tPrev = timestamp;

    // Filter the derivative to prevent spikes in speed estimation
    const dx = (x - this.xPrev) / dt;
    const aD = this.alpha(this.dCutoff, dt);
    const dxHat = aD * dx + (1 - aD) * this.dxPrev;
    this.dxPrev = dxHat;

    // Compute dynamic cutoff frequency: low when stationary, high when fast
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const a = this.alpha(cutoff, dt);
    const xHat = a * x + (1 - a) * this.xPrev;
    this.xPrev = xHat;

    return xHat;
  }

  public reset(): void {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }
}

export class BBoxOneEuroFilter {
  private filterX: OneEuroFilter;
  private filterY: OneEuroFilter;
  private filterW: OneEuroFilter;
  private filterH: OneEuroFilter;

  constructor(minCutoff: number = 0.7, beta: number = 0.04) {
    this.filterX = new OneEuroFilter(minCutoff, beta, 1.0);
    this.filterY = new OneEuroFilter(minCutoff, beta, 1.0);
    // Dimension changes (w, h) are smoothed even more aggressively to prevent box pulsing
    this.filterW = new OneEuroFilter(minCutoff * 0.75, beta * 0.5, 0.8);
    this.filterH = new OneEuroFilter(minCutoff * 0.75, beta * 0.5, 0.8);
  }

  public filter(
    x: number,
    y: number,
    width: number,
    height: number,
    timestamp: number
  ): { x: number; y: number; width: number; height: number } {
    return {
      x: this.filterX.filter(x, timestamp),
      y: this.filterY.filter(y, timestamp),
      width: Math.max(2, this.filterW.filter(width, timestamp)),
      height: Math.max(2, this.filterH.filter(height, timestamp)),
    };
  }

  public reset(): void {
    this.filterX.reset();
    this.filterY.reset();
    this.filterW.reset();
    this.filterH.reset();
  }
}
