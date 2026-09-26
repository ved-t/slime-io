export class ScoreTracker {
  public score: number = 0;
  public multiplier: number = 1;
  public comboTimer: number = 0; // ms remaining
  public maxComboTimer: number = 2400; // 2.4s window
  public totalDevoured: number = 0;
  public dnaEarned: number = 0;
  public damageTaken: number = 0;
  public timeElapsedMs: number = 0;

  public update(deltaMs: number): void {
    this.timeElapsedMs += deltaMs;

    if (this.comboTimer > 0) {
      this.comboTimer -= deltaMs;
      if (this.comboTimer <= 0) {
        this.comboTimer = 0;
        this.multiplier = 1;
      }
    }
  }

  public registerDevour(nutrition: number): number {
    this.totalDevoured++;
    this.comboTimer = this.maxComboTimer;

    // Multiplier steps: 1x -> 2x -> 4x -> 8x
    if (this.multiplier < 8) {
      if (this.multiplier === 1) this.multiplier = 2;
      else if (this.multiplier === 2) this.multiplier = 4;
      else if (this.multiplier === 4) this.multiplier = 8;
    }

    const earnedPoints = Math.round(nutrition * 15 * this.multiplier);
    this.score += earnedPoints;

    // DNA earned
    const dnaGained = Math.max(1, Math.floor(nutrition * 0.8));
    this.dnaEarned += dnaGained;

    return earnedPoints;
  }

  public registerDamage(amount: number): void {
    this.damageTaken += amount;
    this.multiplier = 1;
    this.comboTimer = 0;
  }

  public getGrade(targetTimeSec: number): string {
    const timeSec = this.timeElapsedMs / 1000;
    let rankScore = 100;

    // Time penalty
    if (timeSec > targetTimeSec) {
      rankScore -= Math.min(30, (timeSec - targetTimeSec) * 1.5);
    } else {
      rankScore += 15; // Speed bonus
    }

    // Damage penalty
    rankScore -= Math.min(35, this.damageTaken * 0.5);

    // Devour streak bonus
    if (this.totalDevoured >= 40) rankScore += 15;

    if (rankScore >= 95) return "S";
    if (rankScore >= 80) return "A";
    if (rankScore >= 65) return "B";
    return "C";
  }
}
