window.initSnakeGame = function () {
  const canvas = document.getElementById("snakeCanvas");
  const scoreEl = document.getElementById("snakeScore");
  const highEl = document.getElementById("snakeHighScore");
  const startBtn = document.getElementById("snakeStartBtn");
  const pauseBtn = document.getElementById("snakePauseBtn");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const GRID = 20;
  const TILE = canvas.width / GRID;

  let snake = [{ x: 10, y: 10 }];
  let food = { x: 15, y: 10 };
  let dx = 1;
  let dy = 0;
  let score = 0;
  let highScore = Number(localStorage.getItem("dhp_snake_high") || 0);
  let timer = null;
  let paused = false;

  if (highEl) highEl.textContent = highScore;

  function randomFood() {
    food = {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID)
    };
  }

  function draw() {
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#e11d48";
    ctx.beginPath();
    ctx.arc(food.x * TILE + TILE / 2, food.y * TILE + TILE / 2, TILE / 2.4, 0, Math.PI * 2);
    ctx.fill();

    snake.forEach((part, idx) => {
      ctx.fillStyle = idx === 0 ? "#0f766e" : "#14b8a6";
      ctx.fillRect(part.x * TILE + 1, part.y * TILE + 1, TILE - 2, TILE - 2);
    });
  }

  function step() {
    if (paused) return;
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    const hitWall = head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID;
    const hitSelf = snake.some((p) => p.x === head.x && p.y === head.y);

    if (hitWall || hitSelf) {
      clearInterval(timer);
      timer = null;
      window.showToast(`Thua rồi! Điểm của bạn: ${score}`);
      return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score += 10;
      if (scoreEl) scoreEl.textContent = score;
      if (score > highScore) {
        highScore = score;
        localStorage.setItem("dhp_snake_high", String(highScore));
        if (highEl) highEl.textContent = highScore;
      }
      randomFood();
    } else {
      snake.pop();
    }

    draw();
  }

  function setDirection(dir) {
    if (dir === "UP" && dy !== 1) { dx = 0; dy = -1; }
    if (dir === "DOWN" && dy !== -1) { dx = 0; dy = 1; }
    if (dir === "LEFT" && dx !== 1) { dx = -1; dy = 0; }
    if (dir === "RIGHT" && dx !== -1) { dx = 1; dy = 0; }
  }

  function startGame() {
    snake = [{ x: 10, y: 10 }];
    dx = 1;
    dy = 0;
    score = 0;
    paused = false;
    if (scoreEl) scoreEl.textContent = "0";
    randomFood();
    draw();
    if (timer) clearInterval(timer);
    timer = setInterval(step, 130);
  }

  startBtn?.addEventListener("click", startGame);
  pauseBtn?.addEventListener("click", () => {
    if (!timer) return;
    paused = !paused;
    pauseBtn.textContent = paused ? "Tiếp tục" : "Tạm dừng";
  });

  document.querySelectorAll(".dpad-btn").forEach((btn) => {
    btn.addEventListener("click", () => setDirection(btn.dataset.dir));
  });

  window.addEventListener("keydown", (e) => {
    const panel = document.getElementById("gamePanelSnake");
    if (!panel || panel.classList.contains("hidden")) return;
    const key = e.key.toLowerCase();
    if (key === "arrowup" || key === "w") { e.preventDefault(); setDirection("UP"); }
    if (key === "arrowdown" || key === "s") { e.preventDefault(); setDirection("DOWN"); }
    if (key === "arrowleft" || key === "a") { e.preventDefault(); setDirection("LEFT"); }
    if (key === "arrowright" || key === "d") { e.preventDefault(); setDirection("RIGHT"); }
  });

  draw();
};
