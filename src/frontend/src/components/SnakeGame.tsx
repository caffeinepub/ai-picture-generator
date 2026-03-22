import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

const GRID_SIZE = 20;
const CELL_SIZE = 22;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE; // 440px
const INITIAL_SPEED = 150; // ms per frame
const SPEED_INCREMENT = 10;
const FOODS_PER_LEVEL = 5;

type Point = { x: number; y: number };
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

type GameState = {
  snake: Point[];
  food: Point;
  direction: Direction;
  nextDirection: Direction;
  score: number;
  level: number;
  foodsEaten: number;
  running: boolean;
  gameOver: boolean;
  paused: boolean;
};

type Props = {
  onScoreUpdate: (score: number, level: number) => void;
  onGameOver: (score: number) => void;
  externalHighScore: number;
};

function randomFood(snake: Point[]): Point {
  let pos: Point;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  return pos;
}

function initState(): GameState {
  const center = Math.floor(GRID_SIZE / 2);
  const snake = [
    { x: center, y: center },
    { x: center - 1, y: center },
    { x: center - 2, y: center },
  ];
  return {
    snake,
    food: randomFood(snake),
    direction: "RIGHT",
    nextDirection: "RIGHT",
    score: 0,
    level: 1,
    foodsEaten: 0,
    running: false,
    gameOver: false,
    paused: false,
  };
}

export function SnakeGame({
  onScoreUpdate,
  onGameOver,
  externalHighScore,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>(initState());
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const speedRef = useRef<number>(INITIAL_SPEED);

  const [uiState, setUiState] = useState({
    score: 0,
    level: 1,
    running: false,
    gameOver: false,
    paused: false,
  });

  const syncUi = useCallback(
    (gs: GameState) => {
      setUiState({
        score: gs.score,
        level: gs.level,
        running: gs.running,
        gameOver: gs.gameOver,
        paused: gs.paused,
      });
      onScoreUpdate(gs.score, gs.level);
    },
    [onScoreUpdate],
  );

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const gs = gameStateRef.current;

    // Background
    ctx.fillStyle = "#0B1014";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Grid lines
    ctx.strokeStyle = "rgba(42, 55, 65, 0.5)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // Food (orange/yellow glowing dot)
    const fx = gs.food.x * CELL_SIZE + CELL_SIZE / 2;
    const fy = gs.food.y * CELL_SIZE + CELL_SIZE / 2;
    const foodGrad = ctx.createRadialGradient(fx, fy, 2, fx, fy, CELL_SIZE / 2);
    foodGrad.addColorStop(0, "#FFD060");
    foodGrad.addColorStop(0.5, "#F09030");
    foodGrad.addColorStop(1, "rgba(240,120,20,0)");
    ctx.fillStyle = foodGrad;
    ctx.beginPath();
    ctx.arc(fx, fy, CELL_SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    // Glow
    ctx.shadowColor = "#F09030";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#FFD060";
    ctx.beginPath();
    ctx.arc(fx, fy, CELL_SIZE / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Snake
    gs.snake.forEach((seg, i) => {
      const x = seg.x * CELL_SIZE + 1;
      const y = seg.y * CELL_SIZE + 1;
      const w = CELL_SIZE - 2;

      if (i === 0) {
        // Head — bright green with glow
        ctx.shadowColor = "#62FF6B";
        ctx.shadowBlur = 16;
        const grad = ctx.createLinearGradient(x, y, x + w, y + w);
        grad.addColorStop(0, "#62FF6B");
        grad.addColorStop(1, "#2DD43A");
        ctx.fillStyle = grad;
      } else {
        // Body — teal/blue-green gradient fading with index
        ctx.shadowBlur = 0;
        const alpha = Math.max(0.3, 1 - i * 0.04);
        const lightness = Math.max(40, 70 - i * 2);
        ctx.fillStyle = `hsla(160, 70%, ${lightness}%, ${alpha})`;
      }

      const r = 4;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + w - r);
      ctx.arcTo(x + w, y + w, x + w - r, y + w, r);
      ctx.lineTo(x + r, y + w);
      ctx.arcTo(x, y + w, x, y + w - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    // Overlay for paused or game over
    if (gs.paused && gs.running) {
      ctx.fillStyle = "rgba(11, 16, 20, 0.75)";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.fillStyle = "#62FF6B";
      ctx.shadowColor = "#62FF6B";
      ctx.shadowBlur = 20;
      ctx.font = "bold 36px 'Bricolage Grotesque', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PAUSED", CANVAS_SIZE / 2, CANVAS_SIZE / 2);
      ctx.shadowBlur = 0;
    }

    if (gs.gameOver) {
      ctx.fillStyle = "rgba(11, 16, 20, 0.85)";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.fillStyle = "#E45A55";
      ctx.shadowColor = "#E45A55";
      ctx.shadowBlur = 20;
      ctx.font = "bold 40px 'Bricolage Grotesque', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 20);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#E8EEF2";
      ctx.font = "20px 'General Sans', sans-serif";
      ctx.fillText(`Score: ${gs.score}`, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 20);
    }
  }, []);

  const gameLoop = useCallback(
    (timestamp: number) => {
      const gs = gameStateRef.current;
      if (!gs.running || gs.paused || gs.gameOver) {
        drawGame();
        return;
      }

      const elapsed = timestamp - lastTimeRef.current;
      if (elapsed >= speedRef.current) {
        lastTimeRef.current = timestamp;

        // Apply next direction
        gs.direction = gs.nextDirection;
        const head = gs.snake[0];
        let newHead: Point;

        switch (gs.direction) {
          case "UP":
            newHead = { x: head.x, y: head.y - 1 };
            break;
          case "DOWN":
            newHead = { x: head.x, y: head.y + 1 };
            break;
          case "LEFT":
            newHead = { x: head.x - 1, y: head.y };
            break;
          case "RIGHT":
            newHead = { x: head.x + 1, y: head.y };
            break;
        }

        // Wall collision
        if (
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE
        ) {
          gs.gameOver = true;
          gs.running = false;
          syncUi(gs);
          onGameOver(gs.score);
          drawGame();
          return;
        }

        // Self collision
        if (gs.snake.some((s) => s.x === newHead.x && s.y === newHead.y)) {
          gs.gameOver = true;
          gs.running = false;
          syncUi(gs);
          onGameOver(gs.score);
          drawGame();
          return;
        }

        // Ate food?
        const ateFood = newHead.x === gs.food.x && newHead.y === gs.food.y;
        gs.snake = [newHead, ...gs.snake];
        if (!ateFood) gs.snake.pop();
        else {
          gs.score += 10;
          gs.foodsEaten += 1;
          if (gs.foodsEaten % FOODS_PER_LEVEL === 0) {
            gs.level += 1;
            speedRef.current = Math.max(
              60,
              INITIAL_SPEED - (gs.level - 1) * SPEED_INCREMENT,
            );
          }
          gs.food = randomFood(gs.snake);
          syncUi(gs);
        }
      }

      drawGame();
      animFrameRef.current = requestAnimationFrame(gameLoop);
    },
    [drawGame, syncUi, onGameOver],
  );

  const startLoop = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  const handleStart = useCallback(() => {
    const gs = gameStateRef.current;
    if (gs.gameOver) return;
    gs.running = true;
    gs.paused = false;
    syncUi(gs);
    startLoop();
  }, [syncUi, startLoop]);

  const handlePause = useCallback(() => {
    const gs = gameStateRef.current;
    if (!gs.running) return;
    gs.paused = !gs.paused;
    syncUi(gs);
    if (!gs.paused) startLoop();
    else drawGame();
  }, [syncUi, startLoop, drawGame]);

  const handleRestart = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    speedRef.current = INITIAL_SPEED;
    gameStateRef.current = initState();
    syncUi(gameStateRef.current);
    drawGame();
  }, [syncUi, drawGame]);

  const handleQuit = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    speedRef.current = INITIAL_SPEED;
    const fresh = initState();
    gameStateRef.current = fresh;
    syncUi(fresh);
    drawGame();
  }, [syncUi, drawGame]);

  // D-pad handler
  const handleDpad = useCallback((dir: Direction) => {
    const gs = gameStateRef.current;
    const cur = gs.direction;
    if (
      (dir === "UP" && cur !== "DOWN") ||
      (dir === "DOWN" && cur !== "UP") ||
      (dir === "LEFT" && cur !== "RIGHT") ||
      (dir === "RIGHT" && cur !== "LEFT")
    ) {
      gs.nextDirection = dir;
    }
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const gs = gameStateRef.current;
      const cur = gs.direction;
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          e.preventDefault();
          if (cur !== "DOWN") gs.nextDirection = "UP";
          break;
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault();
          if (cur !== "UP") gs.nextDirection = "DOWN";
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault();
          if (cur !== "RIGHT") gs.nextDirection = "LEFT";
          break;
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault();
          if (cur !== "LEFT") gs.nextDirection = "RIGHT";
          break;
        case " ":
          e.preventDefault();
          handlePause();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handlePause]);

  // Initial draw
  useEffect(() => {
    drawGame();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [drawGame]);

  const { score, level, running, gameOver, paused } = uiState;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
      {/* Game Board */}
      <div className="flex flex-col items-center gap-4">
        <div
          className="neon-glow rounded-xl overflow-hidden"
          style={{ border: "2px solid oklch(0.82 0.22 142 / 0.8)" }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{ display: "block", imageRendering: "pixelated" }}
          />
        </div>
        {/* D-Pad */}
        <div className="flex flex-col items-center gap-1 mt-2">
          <button
            type="button"
            data-ocid="game.dpad_up"
            onClick={() => handleDpad("UP")}
            className="w-12 h-12 bg-card border border-border rounded-lg flex items-center justify-center text-foreground hover:bg-muted hover:border-neon-green transition-colors active:scale-95"
            aria-label="Move Up"
          >
            ▲
          </button>
          <div className="flex gap-1">
            <button
              type="button"
              data-ocid="game.dpad_left"
              onClick={() => handleDpad("LEFT")}
              className="w-12 h-12 bg-card border border-border rounded-lg flex items-center justify-center text-foreground hover:bg-muted hover:border-neon-green transition-colors active:scale-95"
              aria-label="Move Left"
            >
              ◀
            </button>
            <div className="w-12 h-12 bg-muted/30 rounded-lg" />
            <button
              type="button"
              data-ocid="game.dpad_right"
              onClick={() => handleDpad("RIGHT")}
              className="w-12 h-12 bg-card border border-border rounded-lg flex items-center justify-center text-foreground hover:bg-muted hover:border-neon-green transition-colors active:scale-95"
              aria-label="Move Right"
            >
              ▶
            </button>
          </div>
          <button
            type="button"
            data-ocid="game.dpad_down"
            onClick={() => handleDpad("DOWN")}
            className="w-12 h-12 bg-card border border-border rounded-lg flex items-center justify-center text-foreground hover:bg-muted hover:border-neon-green transition-colors active:scale-95"
            aria-label="Move Down"
          >
            ▼
          </button>
        </div>
      </div>

      {/* Stats Panel */}
      <div className="flex flex-col gap-4 w-full lg:w-52">
        {/* Score */}
        <div className="bg-card border border-border rounded-xl p-4 panel-glow">
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-1">
                Score
              </p>
              <p
                className="text-4xl font-display font-bold neon-text"
                style={{ color: "oklch(0.82 0.22 142)" }}
                data-ocid="game.score_panel"
              >
                {score}
              </p>
            </div>
            <div className="border-t border-border" />
            <div className="text-center">
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-1">
                Level
              </p>
              <p className="text-3xl font-display font-bold text-foreground">
                {level}
              </p>
            </div>
            <div className="border-t border-border" />
            <div className="text-center">
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-1">
                High Score
              </p>
              <p
                className="text-2xl font-display font-bold"
                style={{ color: "oklch(0.82 0.22 142)" }}
              >
                {externalHighScore}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {!running && !gameOver ? (
            <button
              type="button"
              data-ocid="game.start_button"
              onClick={handleStart}
              className="w-full py-3 rounded-xl font-display font-bold uppercase tracking-wider text-sm transition-all active:scale-95 hover:opacity-90"
              style={{
                background: "oklch(0.82 0.22 142)",
                color: "oklch(0.10 0.012 222)",
                boxShadow: "0 0 16px oklch(0.82 0.22 142 / 0.4)",
              }}
            >
              ▶ Start
            </button>
          ) : (
            <button
              type="button"
              data-ocid="game.pause_button"
              onClick={handlePause}
              disabled={gameOver}
              className="w-full py-3 rounded-xl font-display font-bold uppercase tracking-wider text-sm transition-all active:scale-95 hover:opacity-90 disabled:opacity-40"
              style={{
                background: "oklch(0.82 0.22 142)",
                color: "oklch(0.10 0.012 222)",
                boxShadow: "0 0 16px oklch(0.82 0.22 142 / 0.4)",
              }}
            >
              {paused ? "▶ Resume" : "⏸ Pause"}
            </button>
          )}

          <button
            type="button"
            data-ocid="game.restart_button"
            onClick={handleRestart}
            className="w-full py-3 rounded-xl font-display font-bold uppercase tracking-wider text-sm transition-all active:scale-95 hover:opacity-90"
            style={{
              background: "oklch(0.87 0.18 92)",
              color: "oklch(0.10 0.012 222)",
              boxShadow: "0 0 12px oklch(0.87 0.18 92 / 0.3)",
            }}
          >
            ↺ Restart
          </button>

          <button
            type="button"
            data-ocid="game.quit_button"
            onClick={handleQuit}
            className="w-full py-3 rounded-xl font-display font-bold uppercase tracking-wider text-sm transition-all active:scale-95 hover:opacity-90"
            style={{
              background: "oklch(0.62 0.22 25)",
              color: "oklch(0.98 0 0)",
              boxShadow: "0 0 12px oklch(0.62 0.22 25 / 0.3)",
            }}
          >
            ✕ Quit
          </button>
        </div>

        {/* Status indicator */}
        <div className="text-center">
          {running && !paused && !gameOver && (
            <span
              className="text-xs font-bold uppercase tracking-widest animate-pulse-green"
              style={{ color: "oklch(0.82 0.22 142)" }}
            >
              ● PLAYING
            </span>
          )}
          {paused && !gameOver && (
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              ⏸ PAUSED
            </span>
          )}
          {gameOver && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "oklch(0.62 0.22 25)" }}
            >
              ✕ GAME OVER
            </motion.span>
          )}
          {!running && !gameOver && (
            <span className="text-xs text-muted-foreground uppercase tracking-widest">
              READY
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
