// --- CONFIGURAÇÕES E SETUP INICIAL ---

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const restartButton = document.getElementById("restartButton");

canvas.width = 1280;
canvas.height = 720;

let score = 0;
let lives = 3;
let level = 1;
let isGameOver = false;
let lastTime = 0;

// Configurações da Nave
const PLAYER_THRUST = 0.08;
const PLAYER_TURN_SPEED = 0.08;
const FRICTION = 0.02;
const INVINCIBILITY_DURATION = 3000;

// Configurações dos Projéteis
const PROJECTILE_SPEED = 7;
const PROJECTILE_LIFESPAN = 900;
const MAX_PROJECTILES = 15;

// Configurações dos Asteroides
const ASTEROID_SPEED = 1.5;
const ASTEROID_BASE_SIZE = 45;
const ASTEROID_POINTS_LARGE = 20;
const ASTEROID_POINTS_MEDIUM = 50;
const ASTEROID_POINTS_SMALL = 100;

// Configurações da Animação de Explosão
const EXPLOSION_FRAMES = 8;
const EXPLOSION_FRAME_SIZE = 64;
const EXPLOSION_ANIMATION_SPEED = 60;
const explosionSpriteSheet = new Image();
let SPRITESHEET_LOADED = false;
explosionSpriteSheet.onload = () => {
  SPRITESHEET_LOADED = true;
};
function createExplosionPlaceholder() {
  const placeholderCanvas = document.createElement("canvas");
  placeholderCanvas.width = EXPLOSION_FRAME_SIZE * EXPLOSION_FRAMES;
  placeholderCanvas.height = EXPLOSION_FRAME_SIZE;
  const placeholderCtx = placeholderCanvas.getContext("2d");
  for (let i = 0; i < EXPLOSION_FRAMES; i++) {
    const x = i * EXPLOSION_FRAME_SIZE;
    const colorValue = Math.floor(255 - i * (255 / EXPLOSION_FRAMES));
    const color = `rgb(255, ${colorValue}, 0)`;
    placeholderCtx.fillStyle = color;
    placeholderCtx.beginPath();
    placeholderCtx.arc(
      x + EXPLOSION_FRAME_SIZE / 2,
      EXPLOSION_FRAME_SIZE / 2,
      (EXPLOSION_FRAME_SIZE / 2) * (i / EXPLOSION_FRAMES),
      0,
      Math.PI * 2
    );
    placeholderCtx.fill();
  }
  explosionSpriteSheet.src = placeholderCanvas.toDataURL();
  SPRITESHEET_LOADED = true;
}
createExplosionPlaceholder();

// Gerenciamento de Teclas
const keys = { up: false, left: false, right: false, space: false };

// --- CARREGAMENTO DE ASSETS (IMAGENS) ---

const playerSprite = new Image();
const projectileSprite = new Image();
const asteroidLargeSprite = new Image();
const asteroidMediumSprite = new Image();
const asteroidSmallSprite = new Image();

const assetsToLoad = [
  { image: playerSprite, src: "assets/playerShip1_blue.png" },
  { image: projectileSprite, src: "assets/laserBlue01.png" },
  { image: asteroidLargeSprite, src: "assets/meteorBrown_big1.png" },
  { image: asteroidMediumSprite, src: "assets/meteorBrown_med1.png" },
  { image: asteroidSmallSprite, src: "assets/meteorBrown_small1.png" },
];

let assetsLoaded = 0;

function loadAssets(callback) {
  if (assetsToLoad.length === 0) {
    callback();
    return;
  }
  assetsToLoad.forEach((asset) => {
    asset.image.src = asset.src;
    asset.image.onload = () => {
      assetsLoaded++;
      if (assetsLoaded === assetsToLoad.length) {
        callback();
      }
    };
    asset.image.onerror = () => {
      console.error(`Erro ao carregar o asset: ${asset.src}`);
    };
  });
}

// --- CLASSES DAS ENTIDADES ---

class GameObject {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.velocity = { x: 0, y: 0 };
    this.angle = 0;
  }
  handleScreenWrap() {
    if (this.x < -this.radius) this.x = canvas.width + this.radius;
    if (this.x > canvas.width + this.radius) this.x = -this.radius;
    if (this.y < -this.radius) this.y = canvas.height + this.radius;
    if (this.y > canvas.height + this.radius) this.y = -this.radius;
  }
  update() {
    this.x += this.velocity.x;
    this.y += this.velocity.y;
    this.handleScreenWrap();
  }
}

class Player extends GameObject {
  constructor(x, y) {
    super(x, y, playerSprite.height / 2.5);
    this.reset();
  }
  reset() {
    this.x = canvas.width / 2;
    this.y = canvas.height / 2;
    this.velocity = { x: 0, y: 0 };
    this.angle = -Math.PI / 2;
    this.isInvincible = true;
    this.invincibilityTimer = INVINCIBILITY_DURATION;
  }
  update(deltaTime) {
    if (keys.left) this.angle -= PLAYER_TURN_SPEED;
    if (keys.right) this.angle += PLAYER_TURN_SPEED;
    if (keys.up) {
      this.velocity.x += Math.cos(this.angle) * PLAYER_THRUST;
      this.velocity.y += Math.sin(this.angle) * PLAYER_THRUST;
    }
    this.velocity.x *= 1 - FRICTION;
    this.velocity.y *= 1 - FRICTION;
    if (this.isInvincible) {
      this.invincibilityTimer -= deltaTime;
      if (this.invincibilityTimer <= 0) this.isInvincible = false;
    }
    super.update();
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2);
    if (this.isInvincible) {
      ctx.globalAlpha =
        Math.floor(this.invincibilityTimer / 200) % 2 === 0 ? 0.5 : 1.0;
    }
    ctx.drawImage(
      playerSprite,
      -playerSprite.width / 2,
      -playerSprite.height / 2
    );
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }
}

class Projectile extends GameObject {
  constructor() {
    super(0, 0, 5);
    this.active = false;
    this.lifespan = 0;
  }
  fire(x, y, angle) {
    this.angle = angle;
    const shipFrontOffset = playerSprite.width / 2;
    this.x = x + Math.cos(angle) * shipFrontOffset;
    this.y = y + Math.sin(angle) * shipFrontOffset;
    this.velocity.x = Math.cos(angle) * PROJECTILE_SPEED;
    this.velocity.y = Math.sin(angle) * PROJECTILE_SPEED;
    this.lifespan = PROJECTILE_LIFESPAN;
    this.active = true;
  }
  update(deltaTime) {
    if (!this.active) return;
    this.lifespan -= deltaTime;
    if (this.lifespan <= 0) this.active = false;
    super.update();
  }
  draw() {
    if (!this.active) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2);
    ctx.drawImage(
      projectileSprite,
      -projectileSprite.width / 2,
      -projectileSprite.height / 2
    );
    ctx.restore();
  }
}

class Asteroid extends GameObject {
  constructor(x, y, size) {
    super(x, y, size);
    this.velocity = {
      x: (Math.random() - 0.5) * ASTEROID_SPEED,
      y: (Math.random() - 0.5) * ASTEROID_SPEED,
    };
    this.rotationSpeed = (Math.random() - 0.5) * 0.02;
    this.angle = 0;
    if (this.radius === ASTEROID_BASE_SIZE) {
      this.sprite = asteroidLargeSprite;
    } else if (this.radius === ASTEROID_BASE_SIZE / 2) {
      this.sprite = asteroidMediumSprite;
    } else {
      this.sprite = asteroidSmallSprite;
    }
  }
  update() {
    this.angle += this.rotationSpeed;
    super.update();
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.drawImage(
      this.sprite,
      -this.radius,
      -this.radius,
      this.radius * 2,
      this.radius * 2
    );
    ctx.restore();
  }
}

class Explosion {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.currentFrame = 0;
    this.timer = 0;
    this.isFinished = false;
  }
  update(deltaTime) {
    if (this.isFinished) return;
    this.timer += deltaTime;
    if (this.timer > EXPLOSION_ANIMATION_SPEED) {
      this.timer = 0;
      this.currentFrame++;
      if (this.currentFrame >= EXPLOSION_FRAMES) {
        this.isFinished = true;
      }
    }
  }
  draw() {
    if (this.isFinished || !SPRITESHEET_LOADED) return;
    const sx = this.currentFrame * EXPLOSION_FRAME_SIZE;
    ctx.drawImage(
      explosionSpriteSheet,
      sx,
      0,
      EXPLOSION_FRAME_SIZE,
      EXPLOSION_FRAME_SIZE,
      this.x - EXPLOSION_FRAME_SIZE / 2,
      this.y - EXPLOSION_FRAME_SIZE / 2,
      EXPLOSION_FRAME_SIZE,
      EXPLOSION_FRAME_SIZE
    );
  }
}

class Starfield {
  constructor(numStars, speed, size) {
    this.stars = [];
    this.speed = speed;
    for (let i = 0; i < numStars; i++) {
      this.stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * size + 0.5,
      });
    }
  }
  update(playerVelocity) {
    this.stars.forEach((star) => {
      star.x -= playerVelocity.x * this.speed;
      star.y -= playerVelocity.y * this.speed;
      if (star.x < 0) star.x += canvas.width;
      if (star.x > canvas.width) star.x -= canvas.width;
      if (star.y < 0) star.y += canvas.height;
      if (star.y > canvas.height) star.y -= canvas.height;
    });
  }
  draw() {
    ctx.fillStyle = "#FFFFFF";
    this.stars.forEach((star) => {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

// --- LÓGICA DO JOGO E GERENCIAMENTO DE ESTADO ---

let player;
let projectiles = [];
let asteroids = [];
let explosions = [];
let starfieldNear;
let starfieldFar;

function initGame() {
  player = new Player(canvas.width / 2, canvas.height / 2);
  projectiles = [];
  for (let i = 0; i < MAX_PROJECTILES; i++) {
    projectiles.push(new Projectile());
  }
  asteroids = [];
  explosions = [];
  starfieldNear = new Starfield(100, 0.2, 1.5);
  starfieldFar = new Starfield(200, 0.05, 0.8);
}

function startLevel() {
  const numAsteroids = level + 2;
  for (let i = 0; i < numAsteroids; i++) {
    let x, y;
    if (Math.random() > 0.5) {
      x =
        Math.random() > 0.5
          ? 0 - ASTEROID_BASE_SIZE
          : canvas.width + ASTEROID_BASE_SIZE;
      y = Math.random() * canvas.height;
    } else {
      x = Math.random() * canvas.width;
      y =
        Math.random() > 0.5
          ? 0 - ASTEROID_BASE_SIZE
          : canvas.height + ASTEROID_BASE_SIZE;
    }
    asteroids.push(new Asteroid(x, y, ASTEROID_BASE_SIZE));
  }
}

function checkCollision(obj1, obj2) {
  const dx = obj1.x - obj2.x;
  const dy = obj1.y - obj2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < obj1.radius + obj2.radius;
}

function handleCollisions() {
  projectiles.forEach((proj) => {
    if (!proj.active) return;
    for (let i = asteroids.length - 1; i >= 0; i--) {
      const ast = asteroids[i];
      if (checkCollision(proj, ast)) {
        proj.active = false;
        breakAsteroid(ast, i);
        return;
      }
    }
  });
  if (!player.isInvincible) {
    asteroids.forEach((ast) => {
      if (checkCollision(player, ast)) {
        playerHit();
      }
    });
  }
}

function breakAsteroid(asteroid, index) {
  explosions.push(new Explosion(asteroid.x, asteroid.y));
  if (asteroid.radius > ASTEROID_BASE_SIZE / 3) {
    const newSize = asteroid.radius / 2;
    asteroids.push(new Asteroid(asteroid.x, asteroid.y, newSize));
    asteroids.push(new Asteroid(asteroid.x, asteroid.y, newSize));
    if (asteroid.radius === ASTEROID_BASE_SIZE) {
      score += ASTEROID_POINTS_LARGE;
    } else {
      score += ASTEROID_POINTS_MEDIUM;
    }
  } else {
    score += ASTEROID_POINTS_SMALL;
  }
  asteroids.splice(index, 1);
  if (asteroids.length === 0) {
    level++;
    startLevel();
  }
}

function playerHit() {
  lives--;
  explosions.push(new Explosion(player.x, player.y));
  if (lives <= 0) {
    isGameOver = true;
    restartButton.style.display = "block";
  } else {
    player.reset();
  }
}

function restartGame() {
  score = 0;
  lives = 3;
  level = 1;
  isGameOver = false;
  initGame();
  player.isInvincible = false;
  startLevel();
  restartButton.style.display = "none";
}

// --- LOOP PRINCIPAL DO JOGO (UPDATE & DRAW) ---

function update(deltaTime) {
  if (isGameOver) return;
  player.update(deltaTime);
  projectiles.forEach((p) => p.update(deltaTime));
  asteroids.forEach((a) => a.update());
  explosions.forEach((e) => e.update(deltaTime));
  explosions = explosions.filter((e) => !e.isFinished);
  handleCollisions();
  starfieldNear.update(player.velocity);
  starfieldFar.update(player.velocity);
}

function draw() {
  ctx.fillStyle = "#0a0a1a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  starfieldFar.draw();
  starfieldNear.draw();
  projectiles.forEach((p) => p.draw());
  asteroids.forEach((a) => a.draw());
  explosions.forEach((e) => e.draw());
  if (!isGameOver) player.draw();
  drawHUD();
  if (isGameOver) drawGameOver();
}

function drawHUD() {
  ctx.fillStyle = "#FFFFFF";
  ctx.font = '24px "Courier New", Courier, monospace';
  ctx.textAlign = "left";
  ctx.fillText(`PONTUAÇÃO: ${score}`, 20, 40);
  for (let i = 0; i < lives; i++) {
    const iconWidth = playerSprite.width * 0.4;
    const iconHeight = playerSprite.height * 0.4;
    ctx.drawImage(
      playerSprite,
      canvas.width - 50 - i * (iconWidth + 10),
      20,
      iconWidth,
      iconHeight
    );
  }
}

function drawGameOver() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = '60px "Courier New", Courier, monospace';
  ctx.textAlign = "center";
  ctx.fillText("FIM DE JOGO", canvas.width / 2, canvas.height / 2 - 40);
  ctx.font = '30px "Courier New", Courier, monospace';
  ctx.fillText(
    `PONTUAÇÃO FINAL: ${score}`,
    canvas.width / 2,
    canvas.height / 2 + 20
  );
}

function gameLoop(timestamp) {
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;
  update(deltaTime);
  draw();
  requestAnimationFrame(gameLoop);
}

// --- EVENT LISTENERS E INÍCIO DO JOGO ---

window.addEventListener("keydown", (e) => {
  if (isGameOver && e.code === "Enter") {
    restartGame();
    return;
  }
  switch (e.code) {
    case "ArrowUp":
    case "KeyW":
      keys.up = true;
      break;
    case "ArrowLeft":
    case "KeyA":
      keys.left = true;
      break;
    case "ArrowRight":
    case "KeyD":
      keys.right = true;
      break;
    case "Space":
      if (!keys.space) {
        keys.space = true;
        const projectile = projectiles.find((p) => !p.active);
        if (projectile && !isGameOver)
          projectile.fire(player.x, player.y, player.angle);
      }
      break;
  }
});
window.addEventListener("keyup", (e) => {
  switch (e.code) {
    case "ArrowUp":
    case "KeyW":
      keys.up = false;
      break;
    case "ArrowLeft":
    case "KeyA":
      keys.left = false;
      break;
    case "ArrowRight":
    case "KeyD":
      keys.right = false;
      break;
    case "Space":
      keys.space = false;
      break;
  }
});
restartButton.addEventListener("click", restartGame);

function startGame() {
  initGame();
  startLevel();
  requestAnimationFrame(gameLoop);
}

loadAssets(startGame);
