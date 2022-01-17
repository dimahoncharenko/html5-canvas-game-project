const CANVAS_WIDTH = innerWidth;
const CANVAS_HEIGHT = innerHeight;

const PLAYER_SIZE = 30; // Player's size in pixels

const PROJECTILE_SIZE = 8; // Projectiles' size in pixels
const PROJECTILE_SPD = 5; // Coefficient of projectiles' speed

const ENEMY_MAX_SIZE = 35; // Enemies' max size
const ENEMY_MIN_SIZE = 15; // Enemies' min size
const ENEMY_SPAWN_TIME = 60 * 1; // Every 1 seconds

const PARTICLE_SPD = 0.99; // Coefficient of fading speed of particles (The less value, the greater speed)
const PARTICLE_MAX_SIZE = 1.5; // Particles' max size
const PARTICLE_DISTANCE = 5; // Coefficient of distance that particle can to achieve

type Velocity = {
  x: number;
  y: number;
};

interface DrawBegaviour {
  draw(
    x: number,
    y: number,
    r: number,
    color: string,
    ctx: CanvasRenderingContext2D
  ): void;
}

interface UpdateBegaviour {
  update(
    x: number,
    y: number,
    velocity: Velocity
  ): { x: number; y: number; velocity: Velocity };
}

class Actor {
  protected drawBehaviour: DrawBegaviour;
  protected updateBehaviour: UpdateBegaviour;
  constructor(
    public x: number,
    public y: number,
    public r: number,
    public color: string,
    public velocity: Velocity,
    protected ctx: CanvasRenderingContext2D
  ) {}

  draw() {
    this.drawBehaviour.draw(this.x, this.y, this.r, this.color, this.ctx);
  }

  update() {
    this.draw();
    const { x, y, velocity } = this.updateBehaviour.update(
      this.x,
      this.y,
      this.velocity
    );
    this.x = x;
    this.y = y;
    this.velocity = velocity;
  }
}

class WithoutMove implements UpdateBegaviour {
  update(x: number, y: number, velocity: Velocity) {
    return { x, y, velocity };
  }
}

class WithMove implements UpdateBegaviour {
  update(x: number, y: number, velocity: Velocity) {
    x += velocity.x;
    y += velocity.y;
    return {
      x,
      y,
      velocity,
    };
  }
}

class Circle implements DrawBegaviour {
  draw(
    x: number,
    y: number,
    r: number,
    color: string,
    ctx: CanvasRenderingContext2D
  ) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI * 2, 0);
    ctx.fill();
  }
}

class Triangle implements DrawBegaviour {
  draw(
    x: number,
    y: number,
    r: number,
    color: string,
    ctx: CanvasRenderingContext2D
  ): void {
    const dir = Math.atan2(y - CANVAS_HEIGHT / 2, x - CANVAS_WIDTH / 2);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + r * Math.cos(dir), y - r * Math.sin(dir));
    ctx.lineTo(
      x - r * (Math.cos(dir) - Math.sin(dir)),
      y + r * (Math.sin(dir) + Math.cos(dir))
    );
    ctx.lineTo(
      x - r * (Math.cos(dir) + Math.sin(dir)),
      y + r * (Math.sin(dir) - Math.cos(dir))
    );
    ctx.closePath();
    ctx.fill();
  }
}

class Rhombus implements DrawBegaviour {
  draw(
    x: number,
    y: number,
    r: number,
    color: string,
    ctx: CanvasRenderingContext2D
  ): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + r);
    ctx.lineTo(x - r, y);
    ctx.lineTo(x, y - r);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r);
    ctx.closePath();
    ctx.fill();
  }
}

class Player extends Actor {
  constructor(
    x: number,
    y: number,
    r: number,
    color: string,
    ctx: CanvasRenderingContext2D
  ) {
    super(x, y, r, color, { x: 0, y: 0 }, ctx);
    this.updateBehaviour = new WithoutMove();
    this.drawBehaviour = new Circle();
  }
}

class Projectile extends Actor {
  constructor(
    x: number,
    y: number,
    r: number,
    color: string,
    velocity: Velocity,
    ctx: CanvasRenderingContext2D
  ) {
    super(x, y, r, color, velocity, ctx);
    this.updateBehaviour = new WithMove();
    this.drawBehaviour = new Circle();
  }
}

class Particle extends Actor {
  public alpha = 1.0;
  constructor(
    x: number,
    y: number,
    r: number,
    color: string,
    velocity: Velocity,
    ctx: CanvasRenderingContext2D
  ) {
    super(x, y, r, color, velocity, ctx);
    this.updateBehaviour = new WithMove();
    this.drawBehaviour = new Circle();
  }

  draw() {
    this.ctx.save();
    this.ctx.globalAlpha = this.alpha;
    super.draw();
    this.ctx.restore();
  }

  update() {
    this.velocity.x *= 0.99;
    this.velocity.y *= 0.99;
    super.update();
    this.alpha -= 0.01;
  }
}

class Enemy extends Actor {
  constructor(
    x: number,
    y: number,
    r: number,
    color: string,
    velocity: Velocity,
    ctx: CanvasRenderingContext2D
  ) {
    super(x, y, r, color, velocity, ctx);
    const shapes = [Circle, Rhombus, Triangle];
    this.drawBehaviour = new shapes[
      Math.floor(Math.random() * shapes.length)
    ]();
    this.updateBehaviour = new WithMove();
  }
}

addEventListener("DOMContentLoaded", () => {
  const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
  const modal = document.querySelector<HTMLDivElement>(".modal");
  const gameScore =
    document.querySelector<HTMLSpanElement>(".game__score-value");
  const modalScore =
    document.querySelector<HTMLHeadingElement>(".modal__score");
  const startBtn = document.querySelector<HTMLButtonElement>(".start-game");

  if (canvas && modal) {
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext("2d");

    const player = new Player(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      PLAYER_SIZE,
      "white",
      ctx!
    );

    // set up main game variables
    let projectiles: Projectile[] = [];
    let enemies: Enemy[] = [];
    let spawnTime = ENEMY_SPAWN_TIME;
    let particles: Particle[] = [];
    let score = 0;

    // handle creation of enemies
    function createEnemy() {
      const r = Math.max(ENEMY_MIN_SIZE, Math.random() * ENEMY_MAX_SIZE);
      const color = `hsl(${Math.random() * 360}, 50%, 50%)`;

      let x: number;
      let y: number;

      if (Math.random() > 0.5) {
        x = Math.random() < 0.5 ? -r : CANVAS_WIDTH + r;
        y = Math.random() * CANVAS_HEIGHT;
      } else {
        x = Math.random() * CANVAS_WIDTH;
        y = Math.random() < 0.5 ? -r : CANVAS_HEIGHT + r;
      }

      const angle = Math.atan2(y - player.y, x - player.x);
      const vel: Velocity = {
        x: -Math.cos(angle),
        y: -Math.sin(angle),
      };

      enemies.push(new Enemy(x, y, r, color, vel, ctx!));
    }

    // handle the game over
    function gameOver(id: number) {
      cancelAnimationFrame(id);
      modalScore!.innerHTML = `${score}`;
      modal?.classList.add("active");
    }

    // reset the game
    function resetGame() {
      score = 0;
      gameScore!.innerHTML = `${score}`;
      projectiles = [];
      enemies = [];
      particles = [];
    }

    // set up the game loop
    function animate() {
      const frameId = requestAnimationFrame(animate);

      // clear the scene
      ctx!.fillStyle = "rgba(0, 0, 0, .2)";
      ctx!.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // draw the player
      player.draw();

      // check the collision between enemies and the player
      for (let i = 0; i < enemies.length; i++) {
        if (
          Math.hypot(enemies[i].x - player.x, enemies[i].y - player.y) <=
          enemies[i].r + player.r
        ) {
          gameOver(frameId);
        }
      }

      // draw the projectiles
      for (let i = projectiles.length - 1; i >= 0; i--) {
        projectiles[i].update();

        // handle edge of the screen
        if (
          projectiles[i].x < -projectiles[i].r ||
          projectiles[i].x > CANVAS_WIDTH + projectiles[i].r ||
          projectiles[i].y < -projectiles[i].r ||
          projectiles[i].y > CANVAS_HEIGHT + projectiles[i].r
        ) {
          projectiles.splice(i, 1);
        }
      }

      // handle spawning enemies
      spawnTime--;
      if (spawnTime <= 0) {
        createEnemy();
        spawnTime = ENEMY_SPAWN_TIME;
      }

      let enemy: Enemy;
      let projectile: Projectile;
      // handle drawing, updating of enemies and check the collision between projectiles and enemies
      for (let i = enemies.length - 1; i >= 0; i--) {
        // draw and update the enemies
        enemy = enemies[i];
        enemy.update();

        // check the collision
        for (let j = projectiles.length - 1; j >= 0; j--) {
          projectile = projectiles[j];
          if (
            Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y) <=
            enemy.r + projectile.r
          ) {
            if (enemy.r - 10 > ENEMY_MIN_SIZE) {
              score += 100;
              gsap.to(enemy, {
                r: enemy.r - 10,
              });
            } else {
              score += 250;
              enemies.splice(i, 1);
            }

            // display new score
            gameScore!.innerHTML = `${score}`;

            // handle enemies' explosion
            for (let i = 0; i < enemy.r * 2; i++) {
              particles.push(
                new Particle(
                  enemy.x,
                  enemy.y,
                  Math.random() * PARTICLE_MAX_SIZE,
                  enemy.color,
                  {
                    x:
                      (Math.random() - 0.5) *
                      (Math.random() * PARTICLE_DISTANCE),
                    y:
                      (Math.random() - 0.5) *
                      (Math.random() * PARTICLE_DISTANCE),
                  },
                  ctx!
                )
              );
            }

            projectiles.splice(j, 1);
            break;
          }
        }
      }

      console.log(particles);

      // draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].alpha > 0) {
          particles[i].update();
        } else {
          particles.splice(i, 1);
        }
      }
    }

    // set up event handlers
    addEventListener("click", ({ clientX, clientY }) => {
      const angle = Math.atan2(clientY - player.y, clientX - player.x);
      const velocity: Velocity = {
        x: Math.cos(angle) * PROJECTILE_SPD,
        y: Math.sin(angle) * PROJECTILE_SPD,
      };
      projectiles.push(
        new Projectile(
          player.x,
          player.y,
          PROJECTILE_SIZE,
          "salmon",
          velocity,
          ctx!
        )
      );
    });

    startBtn?.addEventListener("click", () => {
      modal?.classList.remove("active");
      resetGame();
      animate();
    });
  }
});
