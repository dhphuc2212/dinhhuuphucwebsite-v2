window.initCaroGame = function () {
  const boardEl = document.getElementById("caroBoard");
  const statusEl = document.getElementById("caroStatus");
  const modeSelect = document.getElementById("caroModeSelect");
  const resetBtn = document.getElementById("caroResetBtn");
  if (!boardEl) return;

  const SIZE = 15;
  let grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(""));
  let currentPlayer = "X";
  let gameOver = false;

  function renderBoard() {
    boardEl.innerHTML = "";
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = document.createElement("div");
        cell.className = "caro-cell";
        const val = grid[r][c];
        if (val) {
          cell.textContent = val;
          cell.classList.add(val.toLowerCase());
        }
        cell.addEventListener("click", () => handleMove(r, c));
        boardEl.appendChild(cell);
      }
    }
  }

  function checkWin(r, c, player) {
    const dirs = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1]
    ];
    for (const [dr, dc] of dirs) {
      const cells = [[r, c]];
      for (const sign of [1, -1]) {
        let nr = r + dr * sign;
        let nc = c + dc * sign;
        while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && grid[nr][nc] === player) {
          cells.push([nr, nc]);
          nr += dr * sign;
          nc += dc * sign;
        }
      }
      if (cells.length >= 5) return cells;
    }
    return null;
  }

  function highlightWin(cells) {
    const domCells = boardEl.children;
    for (const [r, c] of cells) {
      domCells[r * SIZE + c]?.classList.add("win");
    }
  }

  function aiPickMove() {
    let bestScore = -1;
    let bestMove = null;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] !== "") continue;
        let score = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
              if (grid[nr][nc] === "O") score += 3;
              if (grid[nr][nc] === "X") score += 2;
            }
          }
        }
        score += Math.random();
        if (score > bestScore) {
          bestScore = score;
          bestMove = [r, c];
        }
      }
    }
    return bestMove;
  }

  function handleMove(r, c) {
    if (gameOver || grid[r][c] !== "") return;

    grid[r][c] = currentPlayer;
    renderBoard();

    const winCells = checkWin(r, c, currentPlayer);
    if (winCells) {
      gameOver = true;
      highlightWin(winCells);
      statusEl.textContent = `🎉 Người chơi ${currentPlayer} chiến thắng!`;
      return;
    }

    currentPlayer = currentPlayer === "X" ? "O" : "X";
    statusEl.textContent = `Lượt của ${currentPlayer}`;

    if (modeSelect?.value === "ai" && currentPlayer === "O" && !gameOver) {
      const move = aiPickMove();
      if (move) {
        setTimeout(() => {
          handleMove(move[0], move[1]);
        }, 200);
      }
    }
  }

  function resetGame() {
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(""));
    currentPlayer = "X";
    gameOver = false;
    statusEl.textContent = "Lượt của bạn (X)";
    renderBoard();
  }

  resetBtn?.addEventListener("click", resetGame);
  modeSelect?.addEventListener("change", resetGame);
  renderBoard();
};
