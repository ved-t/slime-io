export interface ThemeColors {
  name: string;
  codename: string;
  primary: number;       // hex number for Phaser (0x22c55e)
  secondary: number;
  core: number;
  membrane: number;
  glow: number;
  bodyInner: number;
  trail: number;
  eye: number;
  laserSafeColor: number;
  hexPrimary: string;
  hexGlow: string;
}

export const THEMES: Record<string, ThemeColors> = {
  acid: {
    name: "Acid Bio",
    codename: "SPECIMEN-01 // ACIDIC",
    primary: 0x22c55e,
    secondary: 0x10b981,
    core: 0x86efac,
    membrane: 0x22c55e,
    glow: 0x4ade80,
    bodyInner: 0x10b981,
    trail: 0x22c55e,
    eye: 0xfacc15,
    laserSafeColor: 0x10b981,
    hexPrimary: "#22c55e",
    hexGlow: "#4ade80"
  },
  void: {
    name: "Cosmic Void",
    codename: "SPECIMEN-02 // NEBULAR",
    primary: 0xa855f7,
    secondary: 0x6366f1,
    core: 0xe9d5ff,
    membrane: 0xa855f7,
    glow: 0xc084fc,
    bodyInner: 0x8b5cf6,
    trail: 0xa855f7,
    eye: 0x38bdf8,
    laserSafeColor: 0x8b5cf6,
    hexPrimary: "#a855f7",
    hexGlow: "#c084fc"
  },
  plasma: {
    name: "Cyber Plasma",
    codename: "SPECIMEN-03 // IONIC",
    primary: 0x06b6d4,
    secondary: 0x3b82f6,
    core: 0xa5f3fc,
    membrane: 0x06b6d4,
    glow: 0x38bdf8,
    bodyInner: 0x0ea5e9,
    trail: 0x06b6d4,
    eye: 0xf43f5e,
    laserSafeColor: 0x0284c7,
    hexPrimary: "#06b6d4",
    hexGlow: "#38bdf8"
  },
  eldritch: {
    name: "Eldritch Crimson",
    codename: "SPECIMEN-04 // SANGUINE",
    primary: 0xf43f5e,
    secondary: 0xe11d48,
    core: 0xfecdd3,
    membrane: 0xf43f5e,
    glow: 0xfb7185,
    bodyInner: 0xe11d48,
    trail: 0xf43f5e,
    eye: 0x34d399,
    laserSafeColor: 0xbe123c,
    hexPrimary: "#f43f5e",
    hexGlow: "#fb7185"
  }
};
