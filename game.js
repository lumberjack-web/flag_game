const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

/* =======================
   ARENA SETTINGS
======================= */
const CENTER_X = 300;
const CENTER_Y = 300;
const RADIUS = 220;

const FLAG_RADIUS = 18;
const SPEED = 4.5;

/* Exit gap (hole) */
const GAP_CENTER_ANGLE = Math.PI / 2; // bottom
const GAP_SIZE = Math.PI / 4;         // bigger gap

/* =======================
   WINNER TRACKING
======================= */
let winnerAnnounced = false;

/* =======================
   FLAGS LIST
======================= */
const flagNames = [
  "canada", "germany", "japan", "usa", "france",
  "italy", "uk", "brazil", "argentina", "spain",
  "portugal", "mexico", "china", "india", "australia",
  "southafrica", "egypt", "nigeria", "turkey", "sweden"
];

const flags = [];

/* =======================
   HELPER FUNCTIONS
======================= */
function randomPointInCircle(radius) {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * (radius - FLAG_RADIUS - 5);
  return {
    x: CENTER_X + Math.cos(angle) * r,
    y: CENTER_Y + Math.sin(angle) * r
  };
}

function checkElimination(flag) {
  const dx = flag.x - CENTER_X;
  const dy = flag.y - CENTER_Y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < RADIUS + FLAG_RADIUS) return false;

  let angle = Math.atan2(dy, dx);
  if (angle < 0) angle += Math.PI * 2;

  let start = GAP_CENTER_ANGLE - GAP_SIZE / 2;
  let end = GAP_CENTER_ANGLE + GAP_SIZE / 2;

  if (start < 0) start += Math.PI * 2;
  if (end < 0) end += Math.PI * 2;

  return angle > start && angle < end;
}

/* =======================
   CREATE/RESET FLAGS
======================= */
function initFlags() {
  flags.length = 0; // clear old flags
  winnerAnnounced = false;

  // Hide winner popup immediately and reset animation
  const popup = document.getElementById("winner-popup");
  popup.style.opacity = "0";
  popup.style.transform = "translate(-50%, -50%) scale(0)";
  popup.style.animation = "none";  // Reset animation so it doesn't replay

  // Re-create flags
  flagNames.forEach(name => {
    const img = new Image();
    img.src = `flags/${name}.png`;

    let pos = randomPointInCircle(RADIUS);
    let safe = false;
    let tries = 0;

    while (!safe && tries < 50) {
      safe = true;
      for (const f of flags) {
        const dx = pos.x - f.x;
        const dy = pos.y - f.y;
        if (Math.sqrt(dx * dx + dy * dy) < FLAG_RADIUS * 2) {
          safe = false;
          pos = randomPointInCircle(RADIUS);
          break;
        }
      }
      tries++;
    }

    const angle = Math.random() * Math.PI * 2;

    flags.push({
      name,
      img,
      x: pos.x,
      y: pos.y,
      vx: Math.cos(angle) * SPEED,
      vy: Math.sin(angle) * SPEED
    });
  });
}

// Initialize flags at start
initFlags();

/* =======================
   DRAW FUNCTIONS
======================= */
function drawCircle() {
  ctx.beginPath();
  ctx.arc(
    CENTER_X,
    CENTER_Y,
    RADIUS,
    GAP_CENTER_ANGLE + GAP_SIZE / 2,
    GAP_CENTER_ANGLE - GAP_SIZE / 2,
    false
  );
  ctx.lineWidth = 4;
  ctx.strokeStyle = "black";
  ctx.stroke();
}

function drawFlags() {
  flags.forEach(f => {
    if (f.img.complete) {
      ctx.drawImage(f.img, f.x - 20, f.y - 14, 40, 28);
    }
  });
}

/* =======================
   WINNER POPUP
======================= */
function showWinner(name) {
  const popup = document.getElementById("winner-popup");

  // Reset animation to restart it properly
  popup.style.animation = "none";
  // Trigger reflow to allow animation restart
  void popup.offsetHeight;

  popup.textContent = `Winner: ${name.toUpperCase()}!`;
  popup.style.opacity = "1";
  popup.style.transform = "translate(-50%, -50%) scale(1.2)";
  popup.style.animation = "pop 0.8s forwards";

  // Small bounce effect
  setTimeout(() => {
    popup.style.transform = "translate(-50%, -50%) scale(1)";
  }, 800);

  // Fade out after 3 seconds
  setTimeout(() => {
    popup.style.opacity = "0";
    popup.style.transform = "translate(-50%, -50%) scale(0)";
  }, 3000);

  // Restart game after 3 seconds
  setTimeout(() => {
    initFlags();
  }, 3000);
}

/* =======================
   PHYSICS
======================= */
function moveFlags() {
  for (let i = flags.length - 1; i >= 0; i--) {
    const f = flags[i];

    f.x += f.vx;
    f.y += f.vy;

    const dx = f.x - CENTER_X;
    const dy = f.y - CENTER_Y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > RADIUS) {
      if (checkElimination(f)) {
        flags.splice(i, 1);
        continue;
      }

      let angleToCenter = Math.atan2(dy, dx);
      if (angleToCenter < 0) angleToCenter += Math.PI * 2;

      let start = GAP_CENTER_ANGLE - GAP_SIZE / 2;
      let end = GAP_CENTER_ANGLE + GAP_SIZE / 2;
      if (start < 0) start += Math.PI * 2;
      if (end < 0) end += Math.PI * 2;

      if (!(angleToCenter > start && angleToCenter < end)) {
        const nx = dx / dist;
        const ny = dy / dist;
        const dot = f.vx * nx + f.vy * ny;
        f.vx -= 2 * dot * nx;
        f.vy -= 2 * dot * ny;

        f.x = CENTER_X + nx * (RADIUS - FLAG_RADIUS);
        f.y = CENTER_Y + ny * (RADIUS - FLAG_RADIUS);
      }
    }
  }
}

function handleCollisions() {
  for (let i = 0; i < flags.length; i++) {
    for (let j = i + 1; j < flags.length; j++) {
      const a = flags[i];
      const b = flags[j];

      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < FLAG_RADIUS * 2) {
        const overlap = FLAG_RADIUS * 2 - dist;
        const nx = dx / dist;
        const ny = dy / dist;

        a.x += nx * overlap / 2;
        a.y += ny * overlap / 2;
        b.x -= nx * overlap / 2;
        b.y -= ny * overlap / 2;

        const tempVx = a.vx;
        const tempVy = a.vy;
        a.vx = b.vx;
        a.vy = b.vy;
        b.vx = tempVx;
        b.vy = tempVy;
      }
    }
  }
}

/* =======================
   GAME LOOP
======================= */
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawCircle();
  moveFlags();
  handleCollisions();
  drawFlags();

  ctx.fillStyle = "black";
  ctx.font = "14px Arial";
  ctx.fillText(`Remaining: ${flags.length}`, 10, 20);

  // Winner check
  if (!winnerAnnounced && flags.length === 1) {
    winnerAnnounced = true;
    const winner = flags[0];
    showWinner(winner.name);
  }

  requestAnimationFrame(gameLoop);
}

gameLoop();
