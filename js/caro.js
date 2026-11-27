window.initCaroGame = function () {
  const boardEl = document.getElementById("caroBoard");
  const statusEl = document.getElementById("caroStatus");
  const modeSelect = document.getElementById("caroModeSelect");
  const difficultySelect = document.getElementById("caroDifficultySelect");
  const resetBtn = document.getElementById("caroResetBtn");
  if (!boardEl) return;

  const SIZE = 15;
  const AI_PLAYER = "O";
  const HUMAN_PLAYER = "X";

  // Cấu hình 4 mức độ tư duy (có thể dùng cùng tư duy phân tầng cho Cờ Vua sau này)
  const DIFFICULTY_PROFILES = {
    easy: {
      label: "Dễ",
      searchDepth: 0,
      candidateLimit: 18,
      attackWeight: 0.75,
      defenseWeight: 0.45,
      randomJitter: 240,
      blunderChance: 0.35
    },
    medium: {
      label: "Trung bình",
      searchDepth: 0,
      candidateLimit: 24,
      attackWeight: 1.0,
      defenseWeight: 1.05,
      randomJitter: 45,
      blunderChance: 0.08
    },
    hard: {
      label: "Khó",
      searchDepth: 1,
      candidateLimit: 14,
      attackWeight: 1.15,
      defenseWeight: 1.25,
      randomJitter: 6,
      blunderChance: 0
    },
    extreme: {
      label: "Siêu khó",
      searchDepth: 2,
      candidateLimit: 12,
      attackWeight: 1.25,
      defenseWeight: 1.35,
      randomJitter: 0,
      blunderChance: 0
    }
  };

  let grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(""));
  let currentPlayer = HUMAN_PLAYER;
  let lastMove = null;
  let gameOver = false;
  let aiTimer = null;

  function getDifficulty() {
    const val = difficultySelect?.value || "medium";
    return DIFFICULTY_PROFILES[val] ? val : "medium";
  }

  function syncDifficultyVisibility() {
    if (!difficultySelect) return;
    difficultySelect.classList.toggle("hidden", modeSelect?.value !== "ai");
  }

  function formatTurnStatus(player = currentPlayer) {
    if (modeSelect?.value === "ai") {
      const diffLabel = DIFFICULTY_PROFILES[getDifficulty()].label;
      return player === HUMAN_PLAYER
        ? `Lượt của bạn (X) • Máy: ${diffLabel}`
        : `Máy (${diffLabel}) đang tính nước (O)...`;
    }
    return `Lượt của ${player}`;
  }

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
        if (lastMove && lastMove[0] === r && lastMove[1] === c) {
          cell.classList.add("last-move");
        }
        cell.addEventListener("click", () => handleMove(r, c));
        boardEl.appendChild(cell);
      }
    }
  }

  function checkWinAt(r, c, player, board = grid) {
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
        while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === player) {
          cells.push([nr, nc]);
          nr += dr * sign;
          nc += dc * sign;
        }
      }
      if (cells.length >= 5) return cells;
    }
    return null;
  }

  function hasAnyPiece(board = grid) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] !== "") return true;
      }
    }
    return false;
  }

  function highlightWin(cells) {
    const domCells = boardEl.children;
    for (const [r, c] of cells) {
      domCells[r * SIZE + c]?.classList.add("win");
    }
  }

  // Chấm điểm một chuỗi liên tiếp theo độ dài và số đầu mở (0, 1, 2)
  function scorePattern(count, openEnds, isOffensive, diffKey) {
    if (count >= 5) return 10000000;

    if (diffKey === "easy") {
      if (count === 4) return openEnds > 0 ? 420 : 120;
      if (count === 3) return openEnds === 2 ? 110 : 35;
      if (count === 2) return openEnds === 2 ? 22 : 8;
      return openEnds > 0 ? 3 : 1;
    }

    if (diffKey === "medium") {
      if (count === 4) return openEnds === 2 ? 250000 : openEnds === 1 ? 65000 : 0;
      if (count === 3) return openEnds === 2 ? 9500 : openEnds === 1 ? 1400 : 0;
      if (count === 2) return openEnds === 2 ? 650 : openEnds === 1 ? 140 : 0;
      return openEnds > 0 ? 25 : 4;
    }

    // Khó & Siêu khó: phân biệt rõ chuỗi mở 2 đầu vs 1 đầu
    if (count === 4) {
      if (openEnds === 2) return 1500000;
      if (openEnds === 1) return isOffensive ? 280000 : 320000;
      return 0;
    }
    if (count === 3) {
      if (openEnds === 2) return isOffensive ? 85000 : 110000;
      if (openEnds === 1) return isOffensive ? 4200 : 3200;
      return 0;
    }
    if (count === 2) {
      if (openEnds === 2) return isOffensive ? 2400 : 2100;
      if (openEnds === 1) return isOffensive ? 320 : 240;
      return 0;
    }
    if (count === 1) {
      return openEnds === 2 ? 45 : openEnds === 1 ? 12 : 0;
    }
    return 0;
  }

  // Đánh giá điểm thế cờ của một bên trên bàn cờ hiện tại
  function evaluateSide(player, diffKey, board = grid) {
    const dirs = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1]
    ];
    let total = 0;
    let openThrees = 0;
    let openFours = 0;

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] !== player) continue;

        for (const [dr, dc] of dirs) {
          const prevR = r - dr;
          const prevC = c - dc;
          // Chỉ tính từ đầu chuỗi để không cộng trùng
          if (prevR >= 0 && prevR < SIZE && prevC >= 0 && prevC < SIZE && board[prevR][prevC] === player) {
            continue;
          }

          let count = 1;
          let nr = r + dr;
          let nc = c + dc;
          while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === player) {
            count++;
            nr += dr;
            nc += dc;
          }

          let openEnds = 0;
          if (prevR >= 0 && prevR < SIZE && prevC >= 0 && prevC < SIZE && board[prevR][prevC] === "") {
            openEnds++;
          }
          if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === "") {
            openEnds++;
          }

          total += scorePattern(count, openEnds, player === AI_PLAYER, diffKey);
          if (count === 3 && openEnds === 2) openThrees++;
          if (count === 4 && openEnds >= 1) openFours++;
        }
      }
    }

    // Cộng thưởng thế đòn đôi ở mức Khó và Siêu khó
    if (diffKey === "hard" || diffKey === "extreme") {
      if (openThrees >= 2) total += 180000;
      if (openFours >= 1 && openThrees >= 1) total += 350000;
    }

    return total;
  }

  // Chấm điểm nhanh cho một ô đặt quân (r, c) của player để sắp xếp ứng viên
  function heuristicMoveScore(r, c, player, diffKey, board = grid) {
    const profile = DIFFICULTY_PROFILES[diffKey];
    const opp = player === AI_PLAYER ? HUMAN_PLAYER : AI_PLAYER;

    // Nước thắng ngay của chính mình
    board[r][c] = player;
    const selfWin = checkWinAt(r, c, player, board);
    board[r][c] = "";
    if (selfWin) return 20000000;

    // Nước thắng ngay của đối thủ -> buộc phải chặn
    board[r][c] = opp;
    const oppWin = checkWinAt(r, c, opp, board);
    board[r][c] = "";
    if (oppWin) return diffKey === "easy" ? 650 : 12000000;

    // Tính chênh lệch thế cờ trước và sau khi đi ô (r, c)
    const beforeAi = evaluateSide(AI_PLAYER, diffKey, board);
    const beforeHuman = evaluateSide(HUMAN_PLAYER, diffKey, board);

    board[r][c] = player;
    const afterAi = evaluateSide(AI_PLAYER, diffKey, board);
    const afterHuman = evaluateSide(HUMAN_PLAYER, diffKey, board);
    board[r][c] = "";

    const aiGain = Math.max(0, afterAi - beforeAi);
    const humanSaved = Math.max(0, beforeHuman - afterHuman);

    const centerDist = Math.abs(r - 7) + Math.abs(c - 7);
    const centerBonus = Math.max(0, 14 - centerDist) * 12;

    return aiGain * profile.attackWeight + humanSaved * profile.defenseWeight + centerBonus;
  }

  // Lấy danh sách ô trống gần quân cờ đã đánh (bán kính radius)
  function getCandidateMoves(radius = 2, board = grid) {
    const candidates = [];
    const seen = new Set();

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === "") continue;
        for (let dr = -radius; dr <= radius; dr++) {
          for (let dc = -radius; dc <= radius; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
            if (board[nr][nc] !== "") continue;
            const key = `${nr},${nc}`;
            if (seen.has(key)) continue;
            seen.add(key);
            candidates.push([nr, nc]);
          }
        }
      }
    }

    if (candidates.length === 0) {
      return [[Math.floor(SIZE / 2), Math.floor(SIZE / 2)]];
    }
    return candidates;
  }

  // Tìm kiếm Minimax có cắt tỉa Alpha-Beta cho mức Khó & Siêu khó
  function minimax(depth, isMaximizing, alpha, beta, diffKey, lastR, lastC, board) {
    if (lastR !== null && lastC !== null) {
      const prevPlayer = isMaximizing ? HUMAN_PLAYER : AI_PLAYER;
      if (checkWinAt(lastR, lastC, prevPlayer, board)) {
        return prevPlayer === AI_PLAYER ? 8000000 + depth * 50000 : -8000000 - depth * 50000;
      }
    }

    if (depth === 0) {
      const aiVal = evaluateSide(AI_PLAYER, diffKey, board);
      const humVal = evaluateSide(HUMAN_PLAYER, diffKey, board);
      return aiVal * 1.08 - humVal * 1.15;
    }

    const turnPlayer = isMaximizing ? AI_PLAYER : HUMAN_PLAYER;
    const rawMoves = getCandidateMoves(2, board);
    const ranked = rawMoves
      .map(([r, c]) => ({ r, c, h: heuristicMoveScore(r, c, turnPlayer, diffKey, board) }))
      .sort((a, b) => b.h - a.h)
      .slice(0, diffKey === "extreme" ? 8 : 7);

    if (isMaximizing) {
      let best = -Infinity;
      for (const m of ranked) {
        board[m.r][m.c] = AI_PLAYER;
        const val = minimax(depth - 1, false, alpha, beta, diffKey, m.r, m.c, board);
        board[m.r][m.c] = "";
        best = Math.max(best, val);
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const m of ranked) {
        board[m.r][m.c] = HUMAN_PLAYER;
        const val = minimax(depth - 1, true, alpha, beta, diffKey, m.r, m.c, board);
        board[m.r][m.c] = "";
        best = Math.min(best, val);
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  function aiPickMove() {
    if (!hasAnyPiece(grid)) {
      return [7, 7];
    }

    const diffKey = getDifficulty();
    const profile = DIFFICULTY_PROFILES[diffKey];
    const radius = diffKey === "easy" ? 1 : 2;
    const candidates = getCandidateMoves(radius, grid);

    // Đánh giá nhanh tất cả ứng viên
    const scoredMoves = candidates.map(([r, c]) => {
      const base = heuristicMoveScore(r, c, AI_PLAYER, diffKey, grid);
      const jitter = profile.randomJitter > 0 ? Math.random() * profile.randomJitter : 0;
      return { r, c, score: base + jitter, base };
    });

    scoredMoves.sort((a, b) => b.score - a.score);

    // Chế độ Dễ / Trung bình: đôi khi đi nước kém hơn để tạo cảm giác tự nhiên
    if (profile.blunderChance > 0 && scoredMoves.length > 1 && Math.random() < profile.blunderChance) {
      const slicePool = scoredMoves.slice(1, Math.min(scoredMoves.length, diffKey === "easy" ? 8 : 4));
      const picked = slicePool[Math.floor(Math.random() * slicePool.length)] || scoredMoves[0];
      return [picked.r, picked.c];
    }

    // Nếu đã có nước thắng ngay hoặc chặn thắng ngay tuyệt đối thì đi luôn
    if (scoredMoves[0] && scoredMoves[0].base >= 12000000) {
      return [scoredMoves[0].r, scoredMoves[0].c];
    }

    // Mức Khó & Siêu khó: tinh chỉnh top ứng viên bằng Minimax + Alpha-Beta
    if (profile.searchDepth > 0 && scoredMoves.length > 1) {
      const topPool = scoredMoves.slice(0, profile.candidateLimit);
      const workingBoard = grid.map((row) => row.slice());
      let bestMove = [topPool[0].r, topPool[0].c];
      let bestTotal = -Infinity;

      for (const item of topPool) {
        workingBoard[item.r][item.c] = AI_PLAYER;
        const futureScore = minimax(
          profile.searchDepth,
          false,
          -Infinity,
          Infinity,
          diffKey,
          item.r,
          item.c,
          workingBoard
        );
        workingBoard[item.r][item.c] = "";

        const combined = item.base * 0.35 + futureScore;
        if (combined > bestTotal) {
          bestTotal = combined;
          bestMove = [item.r, item.c];
        }
      }

      return bestMove;
    }

    return [scoredMoves[0].r, scoredMoves[0].c];
  }

  function handleMove(r, c) {
    if (gameOver || grid[r][c] !== "") return;
    if (modeSelect?.value === "ai" && currentPlayer === AI_PLAYER && aiTimer === null && hasAnyPiece(grid)) {
      // Cho phép người chơi đánh khi đến lượt X; nếu đang chờ AI thì bỏ qua click đè
    }

    grid[r][c] = currentPlayer;
    lastMove = [r, c];
    renderBoard();

    const winCells = checkWinAt(r, c, currentPlayer, grid);
    if (winCells) {
      gameOver = true;
      highlightWin(winCells);
      if (modeSelect?.value === "ai") {
        statusEl.textContent =
          currentPlayer === HUMAN_PLAYER
            ? `🎉 Bạn (X) đã thắng Máy (${DIFFICULTY_PROFILES[getDifficulty()].label})!`
            : `🤖 Máy (${DIFFICULTY_PROFILES[getDifficulty()].label}) đã thắng (O)!`;
      } else {
        statusEl.textContent = `🎉 Người chơi ${currentPlayer} chiến thắng!`;
      }
      return;
    }

    currentPlayer = currentPlayer === HUMAN_PLAYER ? AI_PLAYER : HUMAN_PLAYER;
    statusEl.textContent = formatTurnStatus(currentPlayer);

    if (modeSelect?.value === "ai" && currentPlayer === AI_PLAYER && !gameOver) {
      if (aiTimer) clearTimeout(aiTimer);
      aiTimer = setTimeout(() => {
        aiTimer = null;
        const move = aiPickMove();
        if (move && !gameOver) {
          handleMove(move[0], move[1]);
        }
      }, getDifficulty() === "extreme" ? 260 : 180);
    }
  }

  function resetGame() {
    if (aiTimer) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(""));
    currentPlayer = HUMAN_PLAYER;
    lastMove = null;
    gameOver = false;
    syncDifficultyVisibility();
    statusEl.textContent = formatTurnStatus(currentPlayer);
    renderBoard();
  }

  resetBtn?.addEventListener("click", resetGame);
  modeSelect?.addEventListener("change", resetGame);
  difficultySelect?.addEventListener("change", resetGame);

  syncDifficultyVisibility();
  statusEl.textContent = formatTurnStatus(currentPlayer);
  renderBoard();
};
