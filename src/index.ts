const CANVAS_WIDTH = innerWidth;
const CANVAS_HEIGHT = innerHeight;

const PLAYER_RADIUS = 15;
const PROJECTILE_RADIUS = 7;
const PROJECTILE_SPD = 5; // Coefficient of projectiles' speed
const AVERAGE_ENEMIES_RADIUS = 30;
const FRICTION = 0.98; // Coefficient of particles' friction (The less value, the greater effect)

type Velocity = {
  x: number;
  y: number;
};

class Player {
  static inst: Player | null;

  private constructor(
    private x: number,
    private y: number,
    private r: number,
    private color: string,
    private ctx: CanvasRenderingContext2D
  ) {}

  static createInstance(
    x: number,
    y: number,
    r: number,
    color: string,
    ctx: CanvasRenderingContext2D
  ) {
    if (!this.inst) {
      this.inst = new Player(x, y, r, color, ctx);
    }
    return this.inst;
  }

  draw() {
    this.ctx.fillStyle = this.color;
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.r, Math.PI * 2, 0);
    this.ctx.fill();
  }

  get X() {
    return this.x;
  }

  get Y() {
    return this.y;
  }

  get R() {
    return this.r;
  }
}

class Projectile {
  constructor(
    protected x: number,
    protected y: number,
    public r: number,
    protected color: string,
    protected velocity: Velocity,
    protected ctx: CanvasRenderingContext2D
  ) {}

  draw() {
    this.ctx.fillStyle = this.color;
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.r, Math.PI * 2, 0);
    this.ctx.fill();
  }

  update() {
    this.draw();
    this.x += this.velocity.x;
    this.y += this.velocity.y;
  }

  get X() {
    return this.x;
  }

  get Y() {
    return this.y;
  }
}

class Enemy extends Projectile {
  changeSize(value: number) {
    this.r = value;
  }
  get Color() {
    return this.color;
  }
}

class Particle extends Projectile {
  private alpha = 1.0;

  draw(): void {
    this.ctx.save();
    this.ctx.globalAlpha = this.alpha;
    super.draw();
    this.ctx.restore();
  }

  update(): void {
    this.velocity.x *= FRICTION;
    this.velocity.y *= FRICTION;
    super.update();
    this.alpha -= 0.01;
  }

  get Alpha() {
    return this.alpha;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
  const stopSpawn = document.querySelector<HTMLButtonElement>("#stop");
  const scoreEl = document.querySelector<HTMLSpanElement>(".game__score-value");
  const modal = document.querySelector<HTMLDivElement>(".modal");
  const modalScore =
    document.querySelector<HTMLHeadingElement>(".modal__score");
  const startGame = document.querySelector<HTMLButtonElement>(".start-game");

  if (canvas && stopSpawn && scoreEl && modal && modalScore && startGame) {
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const ctx = canvas.getContext("2d");

    if (ctx) {
      // Set up objects of the game
      const player = Player.createInstance(
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2,
        PLAYER_RADIUS,
        "aliceblue",
        ctx
      );

      let projectiles: Projectile[] = [];
      let enemies: Enemy[] = [];
      let particles: Particle[] = [];
      let score = 0;

      let segments = 24;
      let shape: number[] = [];
      for (let i = 0; i < segments; i++) {
        shape.push(Math.random() - 0.5);
      }

      // reset the game
      function gameReset() {
        projectiles = [];
        enemies = [];
        particles = [];
        score = 0;
        scoreEl!.innerHTML = `${score}`;
      }

      // Set up game loop
      function animate() {
        const animFrameId = requestAnimationFrame(animate);
        ctx!.fillStyle = "rgba(0, 0, 0, .1)";
        ctx!.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        player.draw();

        // draw the particles
        for (let i = particles.length - 1; i >= 0; i--) {
          particles[i].update();

          if (particles[i].Alpha <= 0) {
            particles.splice(i, 1);
          }
        }

        // draw the projectiles
        for (let i = projectiles.length - 1; i >= 0; i--) {
          projectiles[i].update();

          // handle edge of the screen
          if (
            projectiles[i].X < -projectiles[i].r ||
            projectiles[i].X > CANVAS_WIDTH + projectiles[i].r ||
            projectiles[i].Y < -projectiles[i].r ||
            projectiles[i].Y > CANVAS_HEIGHT + projectiles[i].r
          ) {
            projectiles.splice(i, 1);
            break;
          }
        }

        let projectile: Projectile;
        let enemy: Enemy;

        // Draw the enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
          enemy = enemies[i];
          enemy.update();

          // handle the collision between enemies and the player
          const dist = Math.hypot(player.X - enemy.X, player.Y - enemy.Y);
          if (dist < enemy.r + player.R) {
            modal!.classList.add("active");
            modalScore!.innerHTML = `${score}`;
            cancelAnimationFrame(animFrameId);
          }

          // Handle the collision between projectiles and enemies
          for (let j = projectiles.length - 1; j >= 0; j--) {
            projectile = projectiles[j];
            if (
              Math.hypot(projectile.X - enemy.X, projectile.Y - enemy.Y) <
              enemy.r + projectile.r
            ) {
              for (let i = 0; i < enemy.r * 2; i++) {
                particles.push(
                  new Particle(
                    enemy.X,
                    enemy.Y,
                    Math.random() * 2,
                    enemy.Color,
                    {
                      x: (Math.random() - 0.5) * (Math.random() * 5),
                      y: (Math.random() - 0.5) * (Math.random() * 5),
                    },
                    ctx!
                  )
                );
              }
              if (enemy.r - 10 > 10) {
                score += 100;
                gsap.to(enemy, {
                  r: enemy.r - 10,
                });
              } else {
                score += 250;
                enemies.splice(i, 1);
              }

              scoreEl!.innerHTML = `${score}`;
              projectiles.splice(j, 1);
              break;
            }
          }
        }
      }

      function spawnEnemies() {
        const intervalId = setInterval(() => {
          const r = Math.max(10, Math.random() * AVERAGE_ENEMIES_RADIUS);
          let x: Enemy["x"];
          let y: Enemy["y"];

          // Randomize position of a new enemy
          if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? CANVAS_WIDTH + r : -r;
            y = Math.random() * CANVAS_HEIGHT;
          } else {
            y = Math.random() < 0.5 ? CANVAS_HEIGHT + r : -r;
            x = Math.random() * CANVAS_WIDTH;
          }
          const angle = Math.atan2(y - player.Y, x - player.X);

          const velocity: Velocity = {
            x: -Math.cos(angle),
            y: -Math.sin(angle),
          };

          enemies.push(
            new Enemy(
              x,
              y,
              r,
              `hsl(${Math.random() * 360}, 50%, 50%)`,
              velocity,
              ctx!
            )
          );
        }, 1000);

        return () => clearInterval(intervalId);
      }

      // start spawning of enemies
      const stopSpawning = spawnEnemies();

      // Set up event handlers
      window.addEventListener("click", ({ clientX, clientY }) => {
        const angle = Math.atan2(clientY - player.Y, clientX - player.X);
        const velocity: Velocity = {
          x: PROJECTILE_SPD * Math.cos(angle),
          y: PROJECTILE_SPD * Math.sin(angle),
        };

        projectiles.push(
          new Projectile(
            player.X,
            player.Y,
            PROJECTILE_RADIUS,
            "salmon",
            velocity,
            ctx
          )
        );
      });

      // handle stopping of enemies' spawn
      // stopSpawn.addEventListener("click", () => {
      //   stopSpawning();
      // });

      startGame.addEventListener("click", () => {
        modal.classList.remove("active");
        gameReset();
        animate();
      });
    }
  }
});
