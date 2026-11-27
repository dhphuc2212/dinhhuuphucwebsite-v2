window.initChessGame = function () {
  const boardEl = document.getElementById("chessBoard");
  const statusEl = document.getElementById("chessStatus");
  const modeSelect = document.getElementById("chessModeSelect");
  const difficultySelect = document.getElementById("chessDifficultySelect");
  const resetBtn = document.getElementById("chessResetBtn");
  if (!boardEl) return;

  const HUMAN_COLOR = "w";
  const AI_COLOR = "b";

  const PIECE_UNICODE = {
    wk: "♔",
    wq: "♕",
    wr: "♖",
    wb: "♗",
    wn: "♘",
    wp: "♙",
    bk: "♚",
    bq: "♛",
    br: "♜",
    bb: "♝",
    bn: "♞",
    bp: "♟"
  };

  const PIECE_VALUE = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000
  };

  // Điểm thưởng vị trí (từ góc nhìn quân Trắng; quân Đen sẽ lật hàng 7 - r)
  const PST = {
    p: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [50, 50, 50, 50, 50, 50, 50, 50],
      [10, 10, 20, 30, 30, 20, 10, 10],
      [5, 5, 10, 25, 25, 10, 5, 5],
      [0, 0, 0, 20, 20, 0, 0, 0],
      [5, -5, -10, 0, 0, -10, -5, 5],
      [5, 10, 10, -20, -20, 10, 10, 5],
      [0, 0, 0, 0, 0, 0, 0, 0]
    ],
    n: [
      [-50, -40, -30, -30, -30, -30, -40, -50],
      [-40, -20, 0, 0, 0, 0, -20, -40],
      [-30, 0, 10, 15, 15, 10, 0, -30],
      [-30, 5, 15, 20, 20, 15, 5, -30],
      [-30, 0, 15, 20, 20, 15, 0, -30],
      [-30, 5, 10, 15, 15, 10, 5, -30],
      [-40, -20, 0, 5, 5, 0, -20, -40],
      [-50, -40, -30, -30, -30, -30, -40, -50]
    ],
    b: [
      [-20, -10, -10, -10, -10, -10, -10, -20],
      [-10, 0, 0, 0, 0, 0, 0, -10],
      [-10, 0, 5, 10, 10, 5, 0, -10],
      [-10, 5, 5, 10, 10, 5, 5, -10],
      [-10, 0, 10, 10, 10, 10, 0, -10],
      [-10, 10, 10, 10, 10, 10, 10, -10],
      [-10, 5, 0, 0, 0, 0, 5, -10],
      [-20, -10, -10, -10, -10, -10, -10, -20]
    ],
    r: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [5, 10, 10, 10, 10, 10, 10, 5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [0, 0, 0, 5, 5, 0, 0, 0]
    ],
    q: [
      [-20, -10, -10, -5, -5, -10, -10, -20],
      [-10, 0, 0, 0, 0, 0, 0, -10],
      [-10, 0, 5, 5, 5, 5, 0, -10],
      [-5, 0, 5, 5, 5, 5, 0, -5],
      [0, 0, 5, 5, 5, 5, 0, -5],
      [-10, 5, 5, 5, 5, 5, 0, -10],
      [-10, 0, 5, 0, 0, 0, 0, -10],
      [-20, -10, -10, -5, -5, -10, -10, -20]
    ],
    k: [
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-20, -30, -30, -40, -40, -30, -30, -20],
      [-10, -20, -20, -20, -20, -20, -20, -10],
      [20, 20, 0, 0, 0, 0, 20, 20],
      [20, 30, 10, 0, 0, 10, 30, 20]
    ]
  };

  // 4 cấp độ tư duy của máy (khớp bộ Dễ / Trung bình / Khó / Siêu khó)
  const DIFFICULTY_PROFILES = {
    easy: {
      label: "Dễ",
      maxPly: 1,
      positionalWeight: 0.15,
      randomJitter: 140,
      blunderChance: 0.45
    },
    medium: {
      label: "Trung bình",
      maxPly: 2,
      positionalWeight: 0.5,
      randomJitter: 28,
      blunderChance: 0.12
    },
    hard: {
      label: "Khó",
      maxPly: 4,
      positionalWeight: 0.9,
      randomJitter: 4,
      blunderChance: 0
    },
    extreme: {
      label: "Siêu khó",
      maxPly: 5,
      positionalWeight: 1.0,
      randomJitter: 0,
      blunderChance: 0
    }
  };

  let state = null;
  let selectedSquare = null;
  let legalMovesForSelected = [];
  let lastMove = null;
  let gameOver = false;
  let aiTimer = null;

  function createInitialState() {
    return {
      board: [
        ["br", "bn", "bb", "bq", "bk", "bb", "bn", "br"],
        ["bp", "bp", "bp", "bp", "bp", "bp", "bp", "bp"],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["wp", "wp", "wp", "wp", "wp", "wp", "wp", "wp"],
        ["wr", "wn", "wb", "wq", "wk", "wb", "wn", "wr"]
      ],
      turn: "w",
      castling: { wK: true, wQ: true, bK: true, bQ: true },
      enPassant: null // { r, c } ô mà Tốt đối thủ vừa nhảy qua
    };
  }

  function cloneState(s) {
    return {
      board: s.board.map((row) => row.slice()),
      turn: s.turn,
      castling: { ...s.castling },
      enPassant: s.enPassant ? { ...s.enPassant } : null
    };
  }

  function inBounds(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  function colorOf(piece) {
    return piece ? piece[0] : "";
  }

  function typeOf(piece) {
    return piece ? piece[1] : "";
  }

  function oppColor(color) {
    return color === "w" ? "b" : "w";
  }

  function getDifficulty() {
    const v = difficultySelect?.value || "medium";
    return DIFFICULTY_PROFILES[v] ? v : "medium";
  }

  function syncDifficultyVisibility() {
    if (!difficultySelect) return;
    difficultySelect.classList.toggle("hidden", modeSelect?.value !== "ai");
  }

  function colorLabel(color) {
    return color === "w" ? "Trắng" : "Đen";
  }

  function findKing(board, color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] === `${color}k`) return [r, c];
      }
    }
    return null;
  }

  function isSquareAttacked(board, targetR, targetC, attackerColor) {
    // 1. Tốt tấn công chéo
    const pawnDir = attackerColor === "w" ? -1 : 1;
    // Tốt trắng đi từ r=6 lên r=0 (dr = -1), nên ô bị tốt trắng tấn công ở (tr, tc) có tốt đứng tại (tr + 1, tc +- 1)
    const pawnSourceR = attackerColor === "w" ? targetR + 1 : targetR - 1;
    for (const dc of [-1, 1]) {
      const sc = targetC + dc;
      if (inBounds(pawnSourceR, sc) && board[pawnSourceR][sc] === `${attackerColor}p`) {
        return true;
      }
    }
    void pawnDir;

    // 2. Mã
    const knightJumps = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (const [dr, dc] of knightJumps) {
      const nr = targetR + dr;
      const nc = targetC + dc;
      if (inBounds(nr, nc) && board[nr][nc] === `${attackerColor}n`) return true;
    }

    // 3. Vua
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = targetR + dr;
        const nc = targetC + dc;
        if (inBounds(nr, nc) && board[nr][nc] === `${attackerColor}k`) return true;
      }
    }

    // 4. Xe & Hậu theo đường thẳng
    const orthoDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of orthoDirs) {
      let nr = targetR + dr;
      let nc = targetC + dc;
      while (inBounds(nr, nc)) {
        const p = board[nr][nc];
        if (p) {
          if (colorOf(p) === attackerColor && (typeOf(p) === "r" || typeOf(p) === "q")) return true;
          break;
        }
        nr += dr;
        nc += dc;
      }
    }

    // 5. Tượng & Hậu theo đường chéo
    const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of diagDirs) {
      let nr = targetR + dr;
      let nc = targetC + dc;
      while (inBounds(nr, nc)) {
        const p = board[nr][nc];
        if (p) {
          if (colorOf(p) === attackerColor && (typeOf(p) === "b" || typeOf(p) === "q")) return true;
          break;
        }
        nr += dr;
        nc += dc;
      }
    }

    return false;
  }

  function isInCheck(s, color) {
    const kingPos = findKing(s.board, color);
    if (!kingPos) return false;
    return isSquareAttacked(s.board, kingPos[0], kingPos[1], oppColor(color));
  }

  // Sinh nước đi giả lập (chưa lọc tự chiếu)
  function generatePseudoMoves(s, color) {
    const moves = [];
    const board = s.board;
    const enemy = oppColor(color);

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece || colorOf(piece) !== color) continue;
        const t = typeOf(piece);

        if (t === "p") {
          const dir = color === "w" ? -1 : 1;
          const startRow = color === "w" ? 6 : 1;
          const promoRow = color === "w" ? 0 : 7;

          const pushPawnMove = (tr, tc, extra = {}) => {
            if (tr === promoRow) {
              for (const promo of ["q", "r", "b", "n"]) {
                moves.push({ fr: r, fc: c, tr, tc, promo, ...extra });
              }
            } else {
              moves.push({ fr: r, fc: c, tr, tc, ...extra });
            }
          };

          // Tiến 1 ô
          const r1 = r + dir;
          if (inBounds(r1, c) && !board[r1][c]) {
            pushPawnMove(r1, c);
            // Tiến 2 ô từ hàng xuất phát
            const r2 = r + dir * 2;
            if (r === startRow && inBounds(r2, c) && !board[r2][c]) {
              pushPawnMove(r2, c, { newEnPassant: { r: r1, c } });
            }
          }

          // Ăn chéo thường + Bắt tốt qua đường
          for (const dc of [-1, 1]) {
            const tc = c + dc;
            if (!inBounds(r1, tc)) continue;
            const target = board[r1][tc];
            if (target && colorOf(target) === enemy) {
              pushPawnMove(r1, tc);
            } else if (s.enPassant && s.enPassant.r === r1 && s.enPassant.c === tc) {
              pushPawnMove(r1, tc, { isEnPassant: true, capR: r, capC: tc });
            }
          }
        } else if (t === "n") {
          const jumps = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
          ];
          for (const [dr, dc] of jumps) {
            const tr = r + dr;
            const tc = c + dc;
            if (!inBounds(tr, tc)) continue;
            const dest = board[tr][tc];
            if (!dest || colorOf(dest) === enemy) {
              moves.push({ fr: r, fc: c, tr, tc });
            }
          }
        } else if (t === "b" || t === "r" || t === "q") {
          const dirs = [];
          if (t === "b" || t === "q") dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
          if (t === "r" || t === "q") dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);

          for (const [dr, dc] of dirs) {
            let tr = r + dr;
            let tc = c + dc;
            while (inBounds(tr, tc)) {
              const dest = board[tr][tc];
              if (!dest) {
                moves.push({ fr: r, fc: c, tr, tc });
              } else {
                if (colorOf(dest) === enemy) {
                  moves.push({ fr: r, fc: c, tr, tc });
                }
                break;
              }
              tr += dr;
              tc += dc;
            }
          }
        } else if (t === "k") {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (!dr && !dc) continue;
              const tr = r + dr;
              const tc = c + dc;
              if (!inBounds(tr, tc)) continue;
              const dest = board[tr][tc];
              if (!dest || colorOf(dest) === enemy) {
                moves.push({ fr: r, fc: c, tr, tc });
              }
            }
          }

          // Nhập thành (chỉ khi không đang bị chiếu)
          const homeRow = color === "w" ? 7 : 0;
          if (r === homeRow && c === 4 && !isSquareAttacked(board, r, c, enemy)) {
            const canKingSide = color === "w" ? s.castling.wK : s.castling.bK;
            if (
              canKingSide &&
              !board[homeRow][5] &&
              !board[homeRow][6] &&
              board[homeRow][7] === `${color}r` &&
              !isSquareAttacked(board, homeRow, 5, enemy) &&
              !isSquareAttacked(board, homeRow, 6, enemy)
            ) {
              moves.push({
                fr: homeRow,
                fc: 4,
                tr: homeRow,
                tc: 6,
                castle: "K"
              });
            }

            const canQueenSide = color === "w" ? s.castling.wQ : s.castling.bQ;
            if (
              canQueenSide &&
              !board[homeRow][1] &&
              !board[homeRow][2] &&
              !board[homeRow][3] &&
              board[homeRow][0] === `${color}r` &&
              !isSquareAttacked(board, homeRow, 3, enemy) &&
              !isSquareAttacked(board, homeRow, 2, enemy)
            ) {
              moves.push({
                fr: homeRow,
                fc: 4,
                tr: homeRow,
                tc: 2,
                castle: "Q"
              });
            }
          }
        }
      }
    }

    return moves;
  }

  function applyMoveToState(s, move) {
    const next = cloneState(s);
    const board = next.board;
    const piece = board[move.fr][move.fc];
    const moverColor = colorOf(piece);
    const t = typeOf(piece);

    board[move.fr][move.fc] = "";

    if (move.isEnPassant) {
      board[move.capR][move.capC] = "";
    }

    board[move.tr][move.tc] = move.promo ? `${moverColor}${move.promo}` : piece;

    if (move.castle === "K") {
      board[move.tr][5] = `${moverColor}r`;
      board[move.tr][7] = "";
    } else if (move.castle === "Q") {
      board[move.tr][3] = `${moverColor}r`;
      board[move.tr][0] = "";
    }

    // Cập nhật quyền nhập thành
    if (t === "k") {
      if (moverColor === "w") {
        next.castling.wK = false;
        next.castling.wQ = false;
      } else {
        next.castling.bK = false;
        next.castling.bQ = false;
      }
    }
    if (move.fr === 7 && move.fc === 7) next.castling.wK = false;
    if (move.fr === 7 && move.fc === 0) next.castling.wQ = false;
    if (move.fr === 0 && move.fc === 7) next.castling.bK = false;
    if (move.fr === 0 && move.fc === 0) next.castling.bQ = false;
    if (move.tr === 7 && move.tc === 7) next.castling.wK = false;
    if (move.tr === 7 && move.tc === 0) next.castling.wQ = false;
    if (move.tr === 0 && move.tc === 7) next.castling.bK = false;
    if (move.tr === 0 && move.tc === 0) next.castling.bQ = false;

    next.enPassant = move.newEnPassant ? { ...move.newEnPassant } : null;
    next.turn = oppColor(moverColor);
    return next;
  }

  function getLegalMoves(s, color = s.turn) {
    const pseudo = generatePseudoMoves(s, color);
    const legal = [];
    for (const m of pseudo) {
      const after = applyMoveToState(s, m);
      if (!isInCheck(after, color)) {
        legal.push(m);
      }
    }
    return legal;
  }

  // Đánh giá điểm đứng từ góc nhìn của AI_COLOR ("b")
  function evaluateBoard(s, diffKey) {
    const profile = DIFFICULTY_PROFILES[diffKey];
    let score = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = s.board[r][c];
        if (!piece) continue;
        const col = colorOf(piece);
        const t = typeOf(piece);
        const baseVal = PIECE_VALUE[t] || 0;
        const pstRow = col === "w" ? r : 7 - r;
        const posVal = (PST[t]?.[pstRow]?.[c] || 0) * profile.positionalWeight;
        const totalPiece = baseVal + posVal;

        if (col === AI_COLOR) score += totalPiece;
        else score -= totalPiece;
      }
    }

    return score;
  }

  function movePriority(s, move) {
    let p = 0;
    const target = s.board[move.tr][move.tc];
    if (target) {
      p += (PIECE_VALUE[typeOf(target)] || 0) * 10 - (PIECE_VALUE[typeOf(s.board[move.fr][move.fc])] || 0);
    }
    if (move.isEnPassant) p += 120;
    if (move.promo) p += (PIECE_VALUE[move.promo] || 900) * 8;
    if (move.castle) p += 70;
    return p;
  }

  function minimax(s, depth, alpha, beta, isMaximizing, diffKey) {
    const legal = getLegalMoves(s, s.turn);
    if (legal.length === 0) {
      if (isInCheck(s, s.turn)) {
        return isMaximizing ? -900000 - depth * 1000 : 900000 + depth * 1000;
      }
      return 0; // Hòa cờ (stalemate)
    }

    if (depth === 0) {
      return evaluateBoard(s, diffKey);
    }

    legal.sort((a, b) => movePriority(s, b) - movePriority(s, a));

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const m of legal) {
        const next = applyMoveToState(s, m);
        const ev = minimax(next, depth - 1, alpha, beta, false, diffKey);
        if (ev > maxEval) maxEval = ev;
        if (ev > alpha) alpha = ev;
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const m of legal) {
        const next = applyMoveToState(s, m);
        const ev = minimax(next, depth - 1, alpha, beta, true, diffKey);
        if (ev < minEval) minEval = ev;
        if (ev < beta) beta = ev;
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  function pickAiMove() {
    const legal = getLegalMoves(state, AI_COLOR);
    if (legal.length === 0) return null;

    const diffKey = getDifficulty();
    const profile = DIFFICULTY_PROFILES[diffKey];

    const scored = legal.map((m) => {
      const next = applyMoveToState(state, m);
      const val =
        profile.maxPly <= 1
          ? evaluateBoard(next, diffKey) + movePriority(state, m) * 0.25
          : minimax(next, profile.maxPly - 1, -Infinity, Infinity, false, diffKey);
      return { move: m, val, jittered: val + (profile.randomJitter ? Math.random() * profile.randomJitter : 0) };
    });

    scored.sort((a, b) => b.jittered - a.jittered);

    if (profile.blunderChance > 0 && scored.length > 1 && Math.random() < profile.blunderChance) {
      const pool = scored.slice(1, Math.min(scored.length, 5));
      return (pool[Math.floor(Math.random() * pool.length)] || scored[0]).move;
    }

    return scored[0].move;
  }

  function updateStatus() {
    if (gameOver) return;
    const legal = getLegalMoves(state, state.turn);
    const inCheck = isInCheck(state, state.turn);

    if (legal.length === 0) {
      gameOver = true;
      if (inCheck) {
        const winner = oppColor(state.turn);
        statusEl.textContent =
          modeSelect?.value === "ai"
            ? winner === HUMAN_COLOR
              ? `🎉 Chiếu hết! Bạn (Trắng) thắng Máy (${DIFFICULTY_PROFILES[getDifficulty()].label})!`
              : `♚ Chiếu hết! Máy (${DIFFICULTY_PROFILES[getDifficulty()].label}) thắng (Đen)!`
            : `🎉 Chiếu hết! Bên ${colorLabel(winner)} chiến thắng!`;
      } else {
        statusEl.textContent = "🤝 Hòa cờ (Hết nước đi hợp lệ).";
      }
      return;
    }

    const checkPrefix = inCheck ? "⚠️ Đang bị chiếu! " : "";
    if (modeSelect?.value === "ai") {
      const dLabel = DIFFICULTY_PROFILES[getDifficulty()].label;
      statusEl.textContent =
        state.turn === HUMAN_COLOR
          ? `${checkPrefix}Lượt của bạn (Trắng) • Máy: ${dLabel}`
          : `${checkPrefix}Máy (${dLabel}) đang tính nước (Đen)...`;
    } else {
      statusEl.textContent = `${checkPrefix}Lượt bên ${colorLabel(state.turn)}`;
    }
  }

  function commitMove(move) {
    state = applyMoveToState(state, move);
    lastMove = { fr: move.fr, fc: move.fc, tr: move.tr, tc: move.tc };
    selectedSquare = null;
    legalMovesForSelected = [];
    renderBoard();
    updateStatus();

    if (modeSelect?.value === "ai" && state.turn === AI_COLOR && !gameOver) {
      if (aiTimer) clearTimeout(aiTimer);
      aiTimer = setTimeout(() => {
        aiTimer = null;
        const aiMove = pickAiMove();
        if (aiMove && !gameOver) {
          commitMove(aiMove);
        }
      }, getDifficulty() === "extreme" ? 260 : 170);
    }
  }

  function askPromotionChoice(color) {
    const choice = window.prompt("Phong cấp Tốt thành quân gì? Nhập q (Hậu), r (Xe), b (Tượng) hoặc n (Mã):", "q");
    const norm = (choice || "q").trim().toLowerCase();
    return ["q", "r", "b", "n"].includes(norm) ? norm : "q";
  }

  function handleSquareClick(r, c) {
    if (gameOver) return;
    if (modeSelect?.value === "ai" && state.turn !== HUMAN_COLOR) return;

    const matchingMoves = legalMovesForSelected.filter((m) => m.tr === r && m.tc === c);
    if (matchingMoves.length > 0) {
      let chosen = matchingMoves[0];
      if (matchingMoves.length > 1) {
        const promoType = askPromotionChoice(state.turn);
        chosen = matchingMoves.find((m) => m.promo === promoType) || matchingMoves[0];
      }
      commitMove(chosen);
      return;
    }

    const piece = state.board[r][c];
    if (piece && colorOf(piece) === state.turn) {
      if (selectedSquare && selectedSquare[0] === r && selectedSquare[1] === c) {
        selectedSquare = null;
        legalMovesForSelected = [];
      } else {
        selectedSquare = [r, c];
        legalMovesForSelected = getLegalMoves(state, state.turn).filter((m) => m.fr === r && m.fc === c);
      }
      renderBoard();
    } else {
      selectedSquare = null;
      legalMovesForSelected = [];
      renderBoard();
    }
  }

  function renderBoard() {
    boardEl.innerHTML = "";
    const checkedColor = isInCheck(state, state.turn) ? state.turn : null;
    const checkedKing = checkedColor ? findKing(state.board, checkedColor) : null;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = document.createElement("button");
        cell.type = "button";
        const isLight = (r + c) % 2 === 0;
        cell.className = `chess-cell ${isLight ? "light" : "dark"}`;

        const piece = state.board[r][c];
        if (piece) {
          cell.textContent = PIECE_UNICODE[piece] || "";
          cell.classList.add(colorOf(piece) === "w" ? "piece-white" : "piece-black");
        }

        if (selectedSquare && selectedSquare[0] === r && selectedSquare[1] === c) {
          cell.classList.add("selected");
        }

        const isTarget = legalMovesForSelected.some((m) => m.tr === r && m.tc === c);
        if (isTarget) {
          cell.classList.add(piece ? "can-capture" : "can-move");
        }

        if (
          lastMove &&
          ((lastMove.fr === r && lastMove.fc === c) || (lastMove.tr === r && lastMove.tc === c))
        ) {
          cell.classList.add("last-move");
        }

        if (checkedKing && checkedKing[0] === r && checkedKing[1] === c) {
          cell.classList.add("in-check");
        }

        cell.addEventListener("click", () => handleSquareClick(r, c));
        boardEl.appendChild(cell);
      }
    }
  }

  function resetGame() {
    if (aiTimer) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }
    state = createInitialState();
    selectedSquare = null;
    legalMovesForSelected = [];
    lastMove = null;
    gameOver = false;
    syncDifficultyVisibility();
    renderBoard();
    updateStatus();
  }

  resetBtn?.addEventListener("click", resetGame);
  modeSelect?.addEventListener("change", resetGame);
  difficultySelect?.addEventListener("change", resetGame);

  resetGame();
};
