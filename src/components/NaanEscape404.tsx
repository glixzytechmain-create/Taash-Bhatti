import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Trophy, Volume2, VolumeX, ArrowLeft, RefreshCw, Sparkles, ChefHat } from 'lucide-react';

interface NaanEscape404Props {
  onBackToFeast?: () => void;
}

// Procedural Audio Synthesizer (Zero external dependencies)
class SoundFX {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  jump() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(580, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch (e) {}
  }

  doubleJump() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.16);
    } catch (e) {}
  }

  milestone() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.15, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.25);
      });
    } catch (e) {}
  }

  crash() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.28);
      gain.gain.setValueAtTime(0.28, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.28);
    } catch (e) {}
  }
}

const sfx = new SoundFX();

export default function NaanEscape404({ onBackToFeast }: NaanEscape404Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // High score tracking
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('tb_404_naan_highscore');
        return saved ? parseInt(saved, 10) || 0 : 0;
      }
    } catch (e) {}
    return 0;
  });

  const [score, setScore] = useState<number>(0);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [milestoneText, setMilestoneText] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [funnyQuote, setFunnyQuote] = useState<string>('Overcooked! Naan fell into the glowing coals!');

  // References for live canvas loop state (avoids recreation)
  const stateRef = useRef({
    gameState: 'idle' as 'idle' | 'playing' | 'gameover',
    score: 0,
    highScore: 0,
    speed: 4.8,
    gravity: 0.62,
    viewW: 800,
    viewH: 400,
    dpr: 1,
    groundY: 356,
    player: {
      x: 60,
      y: 312,
      width: 54,
      height: 44,
      vy: 0,
      isGrounded: true,
      jumpCount: 0,
      rotation: 0,
      spinSpeed: 0,
      scaleX: 1,
      scaleY: 1,
      runCycle: 0,
    },
    obstacles: [] as Array<{
      type: 'charcoal' | 'belan' | 'chilli';
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
      spinSpeed: number;
    }>,
    particles: [] as Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      decay: number;
      isSpark?: boolean;
    }>,
    backgroundOffset: 0,
    groundOffset: 0,
    lastSpawnDistance: 0,
    nextSpawnGap: 220,
    milestoneAchieved: new Set<number>(),
    shake: 0,
  });

  // Sync stateRef high score
  useEffect(() => {
    stateRef.current.highScore = highScore;
  }, [highScore]);

  // Sync sound toggle
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sfx.enabled = next;
  };

  const FUNNY_FAIL_QUOTES = [
    "Overcooked! Slipped right into the glowing bhatti coals!",
    "Bummer! Whacked by the head chef's supersonic rolling pin!",
    "Too spicy! Tripped headfirst over an unforgiving ghost chilli!",
    "Butter slip! Lost footing on the greasy tandoor hearth!",
    "Caught! The hungry tandoor master pulled you back for dinner!",
    "Charred to a crisp! The embers showed zero mercy today!"
  ];

  // Trigger Jump Action (Reliable on mobile touch & keyboard)
  const handleJump = useCallback(() => {
    const state = stateRef.current;
    if (state.gameState === 'idle') {
      state.gameState = 'playing';
      setGameState('playing');
    }

    if (state.gameState === 'gameover') {
      resetGame();
      return;
    }

    const p = state.player;
    if (p.isGrounded) {
      // First Jump (taller, airy leap)
      p.vy = -13.6;
      p.isGrounded = false;
      p.jumpCount = 1;
      p.scaleX = 0.82;
      p.scaleY = 1.25;
      sfx.jump();

      // Mobile haptic
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
      }

      // Dust smoke puff on launch
      for (let i = 0; i < 6; i++) {
        state.particles.push({
          x: p.x + 18,
          y: state.groundY,
          vx: (Math.random() - 0.5) * 3,
          vy: -Math.random() * 2,
          size: Math.random() * 5 + 3,
          color: 'rgba(210, 200, 190, 0.4)',
          alpha: 0.6,
          decay: 0.04,
        });
      }
    } else if (p.jumpCount < 2) {
      // Butter Double Jump! (Spin in mid-air with generous lift)
      p.vy = -12.0;
      p.jumpCount = 2;
      p.spinSpeed = 18;
      sfx.doubleJump();

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([15, 30, 20]);
      }

      // Golden melted butter splash droplets
      for (let i = 0; i < 10; i++) {
        state.particles.push({
          x: p.x + 24,
          y: p.y + 20,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 5,
          size: Math.random() * 4 + 3,
          color: 'rgba(255, 235, 120, 0.95)',
          alpha: 1,
          decay: 0.035,
          isSpark: true,
        });
      }
    }
  }, []);

  const resetGame = () => {
    const s = stateRef.current;
    s.gameState = 'playing';
    s.score = 0;
    s.speed = 4.6;
    s.player.y = s.groundY - s.player.height;
    s.player.vy = 0;
    s.player.isGrounded = true;
    s.player.jumpCount = 0;
    s.player.rotation = 0;
    s.player.spinSpeed = 0;
    s.player.scaleX = 1;
    s.player.scaleY = 1;
    s.obstacles = [];
    s.particles = [];
    s.milestoneAchieved.clear();
    s.lastSpawnDistance = 0;
    s.nextSpawnGap = Math.max(180, s.viewW * 0.55);
    s.shake = 0;
    setScore(0);
    setGameState('playing');
    setMilestoneText(null);
  };

  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        handleJump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleJump]);

  // Touch Screen Native Listener: non-passive to strictly prevent double-tap zoom & 300ms click delay
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
      handleJump();
    };

    container.addEventListener('touchstart', onTouch, { passive: false });
    return () => container.removeEventListener('touchstart', onTouch);
  }, [handleJump]);

  // Responsive Canvas Size Updater
  const updateCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);

    if (w > 0 && h > 0) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);

      const s = stateRef.current;
      s.viewW = w;
      s.viewH = h;
      s.dpr = dpr;
      s.groundY = h - 42;
      // Position Naan safely 12% from left, never clipped off-screen on non-wide mobile screens!
      s.player.x = Math.max(32, Math.floor(w * 0.12));

      if (s.player.isGrounded) {
        s.player.y = s.groundY - s.player.height;
      }
    }
  }, []);

  // Listen for window resize
  useEffect(() => {
    updateCanvasDimensions();
    window.addEventListener('resize', updateCanvasDimensions);
    window.addEventListener('orientationchange', updateCanvasDimensions);
    return () => {
      window.removeEventListener('resize', updateCanvasDimensions);
      window.removeEventListener('orientationchange', updateCanvasDimensions);
    };
  }, [updateCanvasDimensions]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const s = stateRef.current;
      const width = s.viewW;
      const height = s.viewH;
      const groundY = s.groundY;

      // Clear & Scale to devicePixelRatio
      ctx.save();
      ctx.scale(s.dpr, s.dpr);

      // Handle Screen Shake
      if (s.shake > 0) {
        const dx = (Math.random() - 0.5) * s.shake;
        const dy = (Math.random() - 0.5) * s.shake;
        ctx.translate(dx, dy);
        s.shake *= 0.88;
        if (s.shake < 0.5) s.shake = 0;
      }

      // ==========================================
      // 1. BACKGROUND SKY & PARALLAX CHARCOAL HEARTH
      // ==========================================
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#0a0d10');
      bgGrad.addColorStop(0.65, '#161311');
      bgGrad.addColorStop(1, '#2b1408');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Distant warm bhatti tandoor glow
      const glowGrad = ctx.createRadialGradient(width * 0.75, groundY - 40, 20, width * 0.75, groundY - 40, Math.min(260, width * 0.6));
      glowGrad.addColorStop(0, 'rgba(255, 87, 34, 0.22)');
      glowGrad.addColorStop(0.5, 'rgba(230, 81, 0, 0.08)');
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      // Distant chimney & copper pots silhouettes (Parallax speed: 0.25x)
      if (s.gameState === 'playing') {
        s.backgroundOffset += s.speed * 0.25;
      }
      ctx.fillStyle = 'rgba(20, 25, 30, 0.6)';
      const chimneyStep = Math.max(160, Math.floor(width / 3));
      for (let i = 0; i < 4; i++) {
        const xPos = ((i * chimneyStep - (s.backgroundOffset % chimneyStep) + width) % width);
        ctx.fillRect(xPos + 20, groundY - 85, 18, 85);
        ctx.beginPath();
        ctx.arc(xPos + 29, groundY - 90, 14, Math.PI, 0);
        ctx.fill();
      }

      // ==========================================
      // 2. PARALLAX STONE HEARTH GROUND
      // ==========================================
      if (s.gameState === 'playing') {
        s.groundOffset += s.speed;
      }
      const groundGrad = ctx.createLinearGradient(0, groundY, 0, height);
      groundGrad.addColorStop(0, '#382217');
      groundGrad.addColorStop(0.12, '#21140e');
      groundGrad.addColorStop(1, '#110b08');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, groundY, width, height - groundY);

      // Fiery glowing line on ground surface
      ctx.strokeStyle = '#ff6b35';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ff4500';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(width, groundY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Scrolling hearth cracks and charcoal stones on ground
      ctx.fillStyle = 'rgba(255, 140, 0, 0.35)';
      const crackCount = Math.floor(width / 35);
      for (let i = 0; i < crackCount; i++) {
        const gx = ((i * 45 - (s.groundOffset % 45) + width) % width);
        ctx.fillRect(gx, groundY + 4 + (i % 3) * 5, (i % 2 === 0 ? 12 : 7), 2.5);
      }

      // ==========================================
      // 3. GAME STATE UPDATES & SPAWN LOGIC
      // ==========================================
      if (s.gameState === 'playing') {
        s.score += 1;
        setScore(Math.floor(s.score / 6));

        // Gradual speed boost (capped at comfortable chill max)
        if (s.speed < 9.0) {
          s.speed += 0.0008;
        }

        // Milestone checkpoints & celebratory fanfares
        const displayScore = Math.floor(s.score / 6);
        [50, 100, 200, 300, 500].forEach((ms) => {
          if (displayScore >= ms && !s.milestoneAchieved.has(ms)) {
            s.milestoneAchieved.add(ms);
            sfx.milestone();
            let msg = `🔥 ${ms} pts: Tandoor is Heating Up!`;
            if (ms === 100) msg = `🫓 ${ms} pts: Perfectly Crisped Naan!`;
            if (ms === 200) msg = `🧈 ${ms} pts: Double Makhan Velocity!`;
            if (ms === 300) msg = `👑 ${ms} pts: Certified Bhatti Master!`;
            if (ms === 500) msg = `🌟 ${ms} pts: God of Tandoor!`;
            setMilestoneText(msg);
            setTimeout(() => setMilestoneText(null), 3200);

            // Celebration confetti fire particles
            for (let k = 0; k < 20; k++) {
              s.particles.push({
                x: s.player.x + 25,
                y: s.player.y + 10,
                vx: (Math.random() - 0.5) * 8,
                vy: -Math.random() * 8 - 2,
                size: Math.random() * 5 + 3,
                color: ['#ffdd59', '#ff5722', '#ff3838', '#4cd137'][Math.floor(Math.random() * 4)],
                alpha: 1,
                decay: 0.02,
                isSpark: true,
              });
            }
          }
        });

        // Obstacle Spawning (Adaptive gap proportional to viewport width)
        s.lastSpawnDistance += s.speed;
        if (s.lastSpawnDistance > s.nextSpawnGap) {
          s.lastSpawnDistance = 0;
          s.nextSpawnGap = Math.max(190, width * 0.52) + Math.random() * 110;

          const types: Array<'charcoal' | 'belan' | 'chilli'> = ['charcoal', 'belan', 'chilli'];
          const type = types[Math.floor(Math.random() * types.length)];

          if (type === 'charcoal') {
            s.obstacles.push({
              type: 'charcoal',
              x: width + 20,
              y: groundY - 34,
              width: 36,
              height: 34,
              rotation: 0,
              spinSpeed: 0,
            });
          } else if (type === 'belan') {
            s.obstacles.push({
              type: 'belan',
              x: width + 20,
              y: groundY - 24,
              width: 44,
              height: 24,
              rotation: 0,
              spinSpeed: -6,
            });
          } else {
            // Chilli
            s.obstacles.push({
              type: 'chilli',
              x: width + 20,
              y: groundY - 36,
              width: 28,
              height: 36,
              rotation: 0,
              spinSpeed: 0,
            });
          }
        }

        // Ambient ground embers & sparks
        if (Math.random() < 0.28) {
          s.particles.push({
            x: width + 10,
            y: groundY - Math.random() * 20,
            vx: -s.speed * 0.8 - Math.random() * 2,
            vy: -Math.random() * 2 - 0.5,
            size: Math.random() * 3 + 1.5,
            color: Math.random() > 0.4 ? '#ff793f' : '#ffb142',
            alpha: 1,
            decay: 0.025,
            isSpark: true,
          });
        }
      }

      // ==========================================
      // 4. PLAYER (NAAN) PHYSICS & RENDERING
      // ==========================================
      const p = s.player;
      if (s.gameState === 'playing') {
        p.vy += s.gravity;
        p.y += p.vy;

        // Running stride counter
        p.runCycle += 0.25;

        // Double jump spinning
        if (p.spinSpeed !== 0) {
          p.rotation += p.spinSpeed;
          if (p.rotation >= 360) {
            p.rotation = 0;
            p.spinSpeed = 0;
          }
        }

        // Landing check
        if (p.y >= groundY - p.height) {
          p.y = groundY - p.height;
          p.vy = 0;
          if (!p.isGrounded) {
            // Landing squish
            p.scaleX = 1.25;
            p.scaleY = 0.82;
            p.rotation = 0;
            p.spinSpeed = 0;
            p.isGrounded = true;
            p.jumpCount = 0;

            // Landing smoke dust
            for (let i = 0; i < 5; i++) {
              s.particles.push({
                x: p.x + 10 + i * 6,
                y: groundY,
                vx: (Math.random() - 0.5) * 3,
                vy: -Math.random() * 1.5,
                size: Math.random() * 5 + 3,
                color: 'rgba(200, 190, 180, 0.35)',
                alpha: 0.5,
                decay: 0.05,
              });
            }
          }
        }

        // Recovery to normal shape from squish/stretch
        p.scaleX += (1 - p.scaleX) * 0.15;
        p.scaleY += (1 - p.scaleY) * 0.15;
      }

      // DRAW THE NAAN RUNNER (Detailed 3D & procedural blistering)
      ctx.save();
      const centerX = p.x + p.width / 2;
      const centerY = p.y + p.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.scale(p.scaleX, p.scaleY);

      // A. Running Feet (Little white chef shoes)
      if (p.isGrounded && s.gameState === 'playing') {
        const footOffset1 = Math.sin(p.runCycle) * 6;
        const footOffset2 = -Math.sin(p.runCycle) * 6;

        ctx.fillStyle = '#ffffff';
        // Left Foot
        ctx.beginPath();
        ctx.ellipse(-13, p.height / 2 - 2 + footOffset1, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2d3436';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Right Foot
        ctx.beginPath();
        ctx.ellipse(13, p.height / 2 - 2 + footOffset2, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // B. Naan Body (Crispy teardrop organic shape)
      ctx.beginPath();
      ctx.moveTo(-p.width / 2 + 6, -p.height / 2 + 8);
      ctx.bezierCurveTo(0, -p.height / 2 - 6, p.width / 2 + 4, -p.height / 2 + 4, p.width / 2, 4);
      ctx.bezierCurveTo(p.width / 2 + 2, p.height / 2 + 4, 0, p.height / 2 + 6, -p.width / 2 + 8, p.height / 2 - 2);
      ctx.bezierCurveTo(-p.width / 2 - 4, p.height / 2 - 12, -p.width / 2 - 2, -p.height / 2 + 2, -p.width / 2 + 6, -p.height / 2 + 8);
      ctx.closePath();

      // Golden baked flour gradient
      const naanGrad = ctx.createRadialGradient(-4, -6, 4, 0, 0, p.width / 1.7);
      naanGrad.addColorStop(0, '#fff4db');
      naanGrad.addColorStop(0.55, '#f5be6c');
      naanGrad.addColorStop(0.88, '#d68336');
      naanGrad.addColorStop(1, '#9b4a1b');
      ctx.fillStyle = naanGrad;
      ctx.fill();

      // Outer crispy border stroke
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#6b320d';
      ctx.stroke();

      // C. Roasted Tandoor Charcoal Char Blisters (Distinctive burnt spots)
      const blisters = [
        { x: -11, y: -10, r: 4.2, cr: '#210d04' },
        { x: 11, y: -8, r: 5.2, cr: '#2a1105' },
        { x: -13, y: 8, r: 5.6, cr: '#381608' },
        { x: 14, y: 7, r: 3.8, cr: '#2a1105' },
        { x: 2, y: 11, r: 4.8, cr: '#210d04' },
      ];
      blisters.forEach((b) => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = b.cr;
        ctx.fill();
        ctx.strokeStyle = '#853e16';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });

      // D. Melted Cow Ghee / Butter Gloss Pool (Center shine)
      ctx.beginPath();
      ctx.ellipse(0, -2, 13, 6, -0.15, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 245, 140, 0.72)';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-3, -4, 4.5, 2, -0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fill();

      // E. Chopped Fresh Green Coriander Specks
      ctx.fillStyle = '#2e7d32';
      const coriander = [
        { x: -8, y: -3 },
        { x: 6, y: -2 },
        { x: -3, y: 4 },
        { x: 9, y: 2 },
      ];
      coriander.forEach((c) => {
        ctx.fillRect(c.x, c.y, 2.5, 2);
      });

      // F. Expressive Cartoon Chef Eyes (Animated)
      const eyeY = -4;
      const eyeSpacing = 8;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-eyeSpacing, eyeY, 5, s.gameState === 'gameover' ? 2 : 6, 0, 0, Math.PI * 2);
      ctx.ellipse(eyeSpacing, eyeY, 5, s.gameState === 'gameover' ? 2 : 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1e272e';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (s.gameState === 'gameover') {
        ctx.strokeStyle = '#d63031';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-eyeSpacing - 3, eyeY - 3);
        ctx.lineTo(-eyeSpacing + 3, eyeY + 3);
        ctx.moveTo(-eyeSpacing + 3, eyeY - 3);
        ctx.lineTo(-eyeSpacing - 3, eyeY + 3);
        ctx.moveTo(eyeSpacing - 3, eyeY - 3);
        ctx.lineTo(eyeSpacing + 3, eyeY + 3);
        ctx.moveTo(eyeSpacing + 3, eyeY - 3);
        ctx.lineTo(eyeSpacing - 3, eyeY + 3);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#1e272e';
        ctx.beginPath();
        ctx.arc(-eyeSpacing + 2, eyeY, 2.8, 0, Math.PI * 2);
        ctx.arc(eyeSpacing + 2, eyeY, 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-eyeSpacing + 1, eyeY - 1.5, 1, 0, Math.PI * 2);
        ctx.arc(eyeSpacing + 1, eyeY - 1.5, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // ==========================================
      // 5. OBSTACLES (3D-Shaded Procedural Render)
      // ==========================================
      for (let i = s.obstacles.length - 1; i >= 0; i--) {
        const obs = s.obstacles[i];
        if (s.gameState === 'playing') {
          obs.x -= s.speed;
          obs.rotation += obs.spinSpeed;
        }

        ctx.save();
        ctx.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);

        if (obs.type === 'charcoal') {
          // A. 3D GLOWING CHARCOAL BRIQUETTE
          const cw = obs.width;
          const ch = obs.height;

          ctx.shadowColor = '#ff3838';
          ctx.shadowBlur = 12;

          ctx.beginPath();
          ctx.moveTo(-cw / 2 + 4, -ch / 2 + 6);
          ctx.lineTo(0, -ch / 2);
          ctx.lineTo(cw / 2 - 2, -ch / 2 + 8);
          ctx.lineTo(cw / 2, ch / 2 - 4);
          ctx.lineTo(0, ch / 2);
          ctx.lineTo(-cw / 2 + 2, ch / 2 - 2);
          ctx.closePath();

          const coalGrad = ctx.createLinearGradient(-cw / 2, -ch / 2, cw / 2, ch / 2);
          coalGrad.addColorStop(0, '#2d3436');
          coalGrad.addColorStop(0.6, '#181a1b');
          coalGrad.addColorStop(1, '#0e0f10');
          ctx.fillStyle = coalGrad;
          ctx.fill();

          ctx.strokeStyle = '#ff793f';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(-8, -4);
          ctx.lineTo(2, 2);
          ctx.lineTo(12, -2);
          ctx.moveTo(-2, 2);
          ctx.lineTo(-4, 9);
          ctx.stroke();

          ctx.strokeStyle = '#ffeaa7';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(-7, -4);
          ctx.lineTo(1, 2);
          ctx.lineTo(10, -2);
          ctx.stroke();
          ctx.shadowBlur = 0;

        } else if (obs.type === 'belan') {
          // B. 3D INDIAN WOODEN ROLLING PIN (BELAN)
          ctx.rotate((obs.rotation * Math.PI) / 180);
          const bw = obs.width;
          const bh = obs.height;

          const woodGrad = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2);
          woodGrad.addColorStop(0, '#8c532b');
          woodGrad.addColorStop(0.3, '#d38b5d');
          woodGrad.addColorStop(0.6, '#f3b080');
          woodGrad.addColorStop(0.85, '#9d5a2d');
          woodGrad.addColorStop(1, '#5a2e12');

          ctx.fillStyle = woodGrad;
          ctx.fillRect(-bw / 2 + 10, -bh / 2, bw - 20, bh);
          ctx.strokeStyle = '#432009';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-bw / 2 + 10, -bh / 2, bw - 20, bh);

          ctx.fillStyle = '#b46d3f';
          ctx.fillRect(-bw / 2, -bh / 4, 10, bh / 2);
          ctx.beginPath();
          ctx.arc(-bw / 2, 0, bh / 3.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillRect(bw / 2 - 10, -bh / 4, 10, bh / 2);
          ctx.beginPath();
          ctx.arc(bw / 2, 0, bh / 3.5, 0, Math.PI * 2);
          ctx.fill();

        } else if (obs.type === 'chilli') {
          // C. SIZZLING FIERY RED KASHMIRI CHILLI
          const chw = obs.width;
          const chh = obs.height;

          ctx.shadowColor = '#e74c3c';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(-4, -chh / 2 + 8);
          ctx.quadraticCurveTo(chw / 2, 0, chw / 3, chh / 2 - 2);
          ctx.quadraticCurveTo(-chw / 4, 2, -chw / 2 + 4, -chh / 2 + 8);
          ctx.closePath();

          const chilliGrad = ctx.createLinearGradient(-chw / 2, 0, chw / 2, 0);
          chilliGrad.addColorStop(0, '#c0392b');
          chilliGrad.addColorStop(0.4, '#e74c3c');
          chilliGrad.addColorStop(0.8, '#ff6b6b');
          chilliGrad.addColorStop(1, '#962d22');
          ctx.fillStyle = chilliGrad;
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.fillStyle = '#27ae60';
          ctx.beginPath();
          ctx.moveTo(-6, -chh / 2 + 8);
          ctx.lineTo(2, -chh / 2 + 8);
          ctx.lineTo(-2, -chh / 2 + 3);
          ctx.fill();

          ctx.strokeStyle = '#2ecc71';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-2, -chh / 2 + 3);
          ctx.quadraticCurveTo(8, -chh / 2 - 4, 6, -chh / 2 - 8);
          ctx.stroke();
        }

        ctx.restore();

        // COLLISION DETECTION (Tight hitbox for fair arcade play)
        if (s.gameState === 'playing') {
          const px1 = p.x + 8;
          const px2 = p.x + p.width - 8;
          const py1 = p.y + 6;
          const py2 = p.y + p.height - 4;

          const ox1 = obs.x + 4;
          const ox2 = obs.x + obs.width - 4;
          const oy1 = obs.y + 4;
          const oy2 = obs.y + obs.height - 2;

          if (px1 < ox2 && px2 > ox1 && py1 < oy2 && py2 > oy1) {
            s.gameState = 'gameover';
            s.shake = 18;
            sfx.crash();

            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([40, 60, 100]);
            }

            const finalScore = Math.floor(s.score / 6);
            if (finalScore > s.highScore) {
              setHighScore(finalScore);
              s.highScore = finalScore;
              try {
                localStorage.setItem('tb_404_naan_highscore', finalScore.toString());
              } catch (e) {}
            }

            const quote = FUNNY_FAIL_QUOTES[Math.floor(Math.random() * FUNNY_FAIL_QUOTES.length)];
            setFunnyQuote(quote);
            setGameState('gameover');

            for (let k = 0; k < 18; k++) {
              s.particles.push({
                x: p.x + 25,
                y: p.y + 20,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 7 - 2,
                size: Math.random() * 5 + 3,
                color: Math.random() > 0.5 ? '#d68336' : '#2b1408',
                alpha: 1,
                decay: 0.03,
              });
            }
          }
        }

        if (obs.x + obs.width < -40) {
          s.obstacles.splice(i, 1);
        }
      }

      // ==========================================
      // 6. VOLUMETRIC PARTICLE SYSTEMS (Embers, Smoke, Butter)
      // ==========================================
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const pt = s.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= pt.decay;

        if (pt.isSpark) {
          pt.vy -= 0.05;
        }

        if (pt.alpha <= 0) {
          s.particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore(); // Restore shake & DPR
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="min-h-screen bg-brand-charcoal text-white flex flex-col justify-between select-none relative overflow-hidden font-sans touch-manipulation">
      {/* Background Ambient Flame Lighting Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-brand-orange/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* TOP NAVBAR / HEADER */}
      <header className="relative z-10 px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between border-b border-white/10 backdrop-blur-md bg-brand-charcoal/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-brand-orange to-amber-600 flex items-center justify-center shadow-lg shadow-brand-orange/30 shrink-0">
            <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm sm:text-lg font-black tracking-tight flex items-center gap-1.5 sm:gap-2">
              <span>TAASH BHATTI</span>
              <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-brand-orange/20 text-brand-orange border border-brand-orange/30">
                404 ARCADE
              </span>
            </h1>
            <p className="text-[10px] sm:text-xs text-gray-400 font-medium">Original Woodfire & Clay-Oven Dining</p>
          </div>
        </div>

        {/* Audio Toggle & Return Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Mute Sound' : 'Unmute Sound'}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-all cursor-pointer"
            title={soundEnabled ? 'Mute Sound FX' : 'Unmute Sound FX'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />}
          </button>

          {onBackToFeast && (
            <button
              onClick={onBackToFeast}
              className="px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gradient-to-r from-brand-orange to-amber-500 hover:from-brand-orange/90 hover:to-amber-500/90 text-white text-xs sm:text-sm font-black tracking-wide shadow-lg shadow-brand-orange/25 transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer active:scale-95 shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Back to Feast</span>
            </button>
          )}
        </div>
      </header>

      {/* MAIN GAME ARENA & 404 CONTENT */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-3 sm:px-6 py-3 sm:py-5 max-w-6xl mx-auto w-full">
        {/* Funny 404 Headlines */}
        <div className="text-center space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-orange/15 border border-brand-orange/30 text-brand-orange text-[10px] sm:text-xs font-black tracking-wider uppercase">
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-brand-orange" />
            <span>Lost in the Charcoal Smoke</span>
          </div>

          <h2 className="text-2xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            404 • You've Wandered Off The Recipe!
          </h2>

          <p className="text-xs sm:text-sm text-gray-300 max-w-lg mx-auto font-medium leading-relaxed px-2">
            Even our GPS delivery riders couldn't find this page. It was either eaten by hungry kitchen staff or smoked to ashes in the clay oven!
          </p>
        </div>

        {/* GAME CANVAS ARENA CONTAINER (Spacious on both mobile & desktop) */}
        <div className="relative w-full max-w-5xl bg-black/60 rounded-2xl sm:rounded-3xl p-3 sm:p-5 border border-brand-orange/30 shadow-2xl backdrop-blur-xl group">
          {/* Top Score HUD Bar */}
          <div className="flex items-center justify-between px-3.5 py-2 mb-2.5 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-[11px] sm:text-xs font-mono">
            <div className="flex items-center gap-1.5 text-amber-400 font-black">
              <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-orange" />
              <span>SCORE: {score.toString().padStart(4, '0')}</span>
            </div>

            <div className="flex items-center gap-1.5 text-gray-300 font-bold">
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span>BEST: {highScore.toString().padStart(4, '0')}</span>
            </div>

            <div className="hidden xs:inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-gray-400">
              <ChefHat className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-brand-orange" />
              <span>CHILL MODE</span>
            </div>
          </div>

          {/* Interactive HTML5 Canvas Container (Generous vertical height on mobile and desktop) */}
          <div
            ref={containerRef}
            onClick={handleJump}
            style={{ touchAction: 'none' }}
            className="relative w-full h-[310px] xs:h-[350px] sm:h-[400px] md:h-[450px] lg:h-[490px] rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer select-none bg-[#0a0d10] border border-white/10"
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full block"
            />

            {/* In-Game Floating Milestone Banner */}
            <AnimatePresence>
              {milestoneText && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-brand-orange via-amber-500 to-brand-green text-white font-black text-[11px] sm:text-sm shadow-xl border border-white/20 flex items-center gap-1.5 pointer-events-none whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-300 animate-spin" />
                  <span>{milestoneText}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* IDLE / START OVERLAY */}
            {gameState === 'idle' && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center mb-2 animate-bounce">
                  <Flame className="w-6 h-6 sm:w-8 sm:h-8 text-brand-orange" />
                </div>
                <h3 className="text-lg sm:text-2xl font-black text-white mb-1">
                  The Great Naan Escape
                </h3>
                <p className="text-[11px] sm:text-xs text-gray-300 mb-3 max-w-sm px-2">
                  A fresh garlic butter naan has escaped the 400°C clay bhatti! Tap or press Space to leap over hot coals, rolling pins, and chillies.
                </p>
                <div className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-brand-orange hover:bg-brand-orange/90 text-white font-black text-xs sm:text-sm shadow-lg tracking-wide animate-pulse">
                  TAP / SPACE TO JUMP
                </div>
              </div>
            )}

            {/* GAME OVER OVERLAY */}
            {gameState === 'gameover' && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-md flex flex-col items-center justify-center p-3 text-center">
                <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-brand-orange mb-1">
                  KITCHEN CAUGHT!
                </div>
                <h3 className="text-xl sm:text-3xl font-black text-red-400 mb-1.5 sm:mb-2">
                  GAME OVER
                </h3>
                <p className="text-[11px] sm:text-xs text-gray-200 mb-3 sm:mb-4 max-w-sm font-medium px-2">
                  {funnyQuote}
                </p>

                <div className="flex items-center gap-5 sm:gap-6 mb-4 sm:mb-5 text-xs sm:text-sm font-mono">
                  <div>
                    <span className="text-gray-400 text-[10px] sm:text-xs block">SCORE</span>
                    <span className="text-lg sm:text-xl font-black text-white">{score}</span>
                  </div>
                  <div className="w-px h-7 sm:h-8 bg-white/20" />
                  <div>
                    <span className="text-gray-400 text-[10px] sm:text-xs block">BEST</span>
                    <span className="text-lg sm:text-xl font-black text-amber-400">{highScore}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resetGame();
                    }}
                    className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-brand-orange hover:bg-brand-orange/90 text-white font-black text-xs sm:text-sm shadow-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Play Again</span>
                  </button>

                  {onBackToFeast && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onBackToFeast();
                      }}
                      className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-xs sm:text-sm border border-white/20 transition-all cursor-pointer active:scale-95"
                    >
                      Return to Feast
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Controls Helper Tip */}
          <div className="mt-2.5 flex flex-col xs:flex-row items-center justify-between text-[10px] sm:text-[11px] text-gray-400 px-1 font-medium gap-1 text-center xs:text-left">
            <span>🕹️ Controls: <strong>[Space / Up Arrow]</strong> or <strong>Tap Screen</strong></span>
            <span className="text-amber-300 font-semibold">✨ <strong>Double-Tap in mid-air</strong> for Butter Spin!</span>
          </div>
        </div>

        {/* BOTTOM QUICK NAVIGATION LINKS */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <button
            onClick={onBackToFeast}
            className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Explore Royal Menu</span>
            <span>➜</span>
          </button>
          <a
            href="/#deals"
            className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Today's Bhatti Deals</span>
          </a>
          <a
            href="/#bhattis"
            className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Dine-In Locations</span>
          </a>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 px-4 py-3.5 text-center text-xs text-gray-400 border-t border-white/10 bg-brand-charcoal/90">
        <p>© {new Date().getFullYear()} Taash Bhatti • Authentic Woodfire & Clay-Oven Dining</p>
      </footer>
    </div>
  );
}
