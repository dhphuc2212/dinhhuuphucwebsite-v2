(function () {
  function createPieceSvg(piece) {
  if (!piece) return "";
  const color = piece[0]; // "w" | "b"
  const type = piece[1];  // "k" | "q" | "r" | "b" | "n" | "p"
  const isWhite = color === "w";

  const fillMain = isWhite ? "#ffffff" : "#111827";
  const fillAccent = isWhite ? "#f1f5f9" : "#1f2937";
  const strokeMain = isWhite ? "#090d16" : "#090d16";
  const detailStroke = isWhite ? "#090d16" : "#e2e8f0";

  let paths = "";

  if (type === "p") {
    paths = `
      <circle cx="25" cy="15.5" r="6.2" fill="${fillMain}" stroke="${strokeMain}" stroke-width="2.4"/>
      <path d="M16 37.5c0-6.2 4.2-11.2 9-11.2s9 5 9 11.2H16z" fill="${fillMain}" stroke="${strokeMain}" stroke-width="2.4" stroke-linejoin="round"/>
      <rect x="13" y="37.5" width="24" height="4.5" rx="2" fill="${fillAccent}" stroke="${strokeMain}" stroke-width="2.2"/>
    `;
  } else if (type === "r") {
    paths = `
      <path d="M14 11h4v4h5v-4h4v4h5v-4h4v7.5l-3 3.5v15.5H17V22l-3-3.5V11z" fill="${fillMain}" stroke="${strokeMain}" stroke-width="2.3" stroke-linejoin="round"/>
      <line x1="17" y1="22" x2="33" y2="22" stroke="${detailStroke}" stroke-width="2"/>
      <rect x="12" y="37.5" width="26" height="4.5" rx="2" fill="${fillAccent}" stroke="${strokeMain}" stroke-width="2.2"/>
    `;
  } else if (type === "n") {
    paths = `
      <path d="M16.5 37.5c0-7.5 2.5-12 6.5-15.5-2.5-.6-5.2.3-6.8 2.2-1.5-2.6-.6-6.8 2.4-9.8 2.8-2.8 6.5-4.4 9.4-4.4l2.5-2.5 1.5 3.8c3.6 2.5 5.5 7 5 12.2-.4 4.4-2.5 8.5-3.5 14H16.5z" fill="${fillMain}" stroke="${strokeMain}" stroke-width="2.3" stroke-linejoin="round"/>
      <circle cx="24.5" cy="15" r="1.6" fill="${detailStroke}"/>
      <rect x="12" y="37.5" width="26" height="4.5" rx="2" fill="${fillAccent}" stroke="${strokeMain}" stroke-width="2.2"/>
    `;
  } else if (type === "b") {
    paths = `
      <circle cx="25" cy="9.5" r="2.6" fill="${fillMain}" stroke="${strokeMain}" stroke-width="2.2"/>
      <path d="M25 13c-6.2 4.5-8.5 9.8-6.5 15.8 1 2.9 1.5 5.8 1.5 8.7h10c0-2.9.5-5.8 1.5-8.7 2-6-.3-11.3-6.5-15.8z" fill="${fillMain}" stroke="${strokeMain}" stroke-width="2.3" stroke-linejoin="round"/>
      <path d="M21.5 20.5l7 7M28.5 20.5l-4.5 4.5" stroke="${detailStroke}" stroke-width="2" stroke-linecap="round"/>
      <rect x="12" y="37.5" width="26" height="4.5" rx="2" fill="${fillAccent}" stroke="${strokeMain}" stroke-width="2.2"/>
    `;
  } else if (type === "q") {
    paths = `
      <circle cx="11.5" cy="15.5" r="2.2" fill="${fillMain}" stroke="${strokeMain}" stroke-width="2"/>
      <circle cx="18.2" cy="12" r="2.2" fill="${fillMain}" stroke="${strokeMain}" stroke-width="2"/>
      <circle cx="25" cy="10.5" r="2.4" fill="${fillMain}" stroke="${strokeMain}" stroke-width="2"/>
      <circle cx="31.8" cy="12" r="2.2" fill="${fillMain}" stroke="${strokeMain}" stroke-width="2"/>
      <circle cx="38.5" cy="15.5" r="2.2" fill="${fillMain}" stroke="${strokeMain}" stroke-width="2"/>
      <path d="M12.5 17.5l4.2 20h16.6l4.2-20-6.2 8.5L25 14l-6.3 12-6.2-8.5z" fill="${fillMain}" stroke="${strokeMain}" stroke-width="2.3" stroke-linejoin="round"/>
      <rect x="12" y="37.5" width="26" height="4.5" rx="2" fill="${fillAccent}" stroke="${strokeMain}" stroke-width="2.2"/>
    `;
  } else if (type === "k") {
    paths = `
      <line x1="25" y1="7.5" x2="25" y2="15.5" stroke="${detailStroke}" stroke-width="2.4" stroke-linecap="round"/>
      <line x1="21.5" y1="11" x2="28.5" y2="11" stroke="${detailStroke}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M17.5 37.5l-2-11.5c-1.8-1.4-2.5-3.7-1.7-5.8.9-2.3 3.5-3.4 5.9-2.4 1.6.7 2.8 2.1 3.3 3.7h6c.5-1.6 1.7-3 3.3-3.7 2.4-1 5 .1 5.9 2.4.8 2.1.1 4.4-1.7 5.8l-2 11.5h-15z" fill="${fillMain}" stroke="${strokeMain}" stroke-width="2.3" stroke-linejoin="round"/>
      <rect x="12" y="37.5" width="26" height="4.5" rx="2" fill="${fillAccent}" stroke="${strokeMain}" stroke-width="2.2"/>
    `;
  }

  return `
    <svg class="chess-piece-svg ${isWhite ? "is-white" : "is-black"}" viewBox="0 0 50 50" aria-hidden="true">
      <defs>
        <filter id="chessDrop_${color}_${type}" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1" flood-color="#000000" flood-opacity="0.35" />
        </filter>
      </defs>
      <g filter="url(#chessDrop_${color}_${type})">${paths}</g>
    </svg>
  `;
}

  function initChessGame() {
    const boardEl = document.getElementById("chessBoard");
    const statusEl = document.getElementById("chessStatus");
    const modeSelect = document.getElementById("chessModeSelect");
    const difficultySelect = document.getElementById("chessDifficultySelect");
    const undoBtn = document.getElementById("chessUndoBtn");
    const resetBtn = document.getElementById("chessResetBtn");
    if (!boardEl) return;

    const HUMAN_COLOR = "w";
    const AI_COLOR = "b";

    const PIECE_VALUE = {
      p: 100,
      n: 320,
      b: 330,
      r: 500,
      q: 900,
      k: 20000
    };

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
        maxPly: 3,
        positionalWeight: 0.9,
        randomJitter: 4,
        blunderChance: 0
      },
      extreme: {
        label: "Siêu khó",
        maxPly: 4,
        positionalWeight: 1.0,
        randomJitter: 0,
        blunderChance: 0
      }
    };

    let state = null;
    let history = [];
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
        enPassant: null
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

    function syncUndoButton() {
      if (!undoBtn) return;
      const isAiMode = modeSelect?.value === "ai";
      if (isAiMode) {
        const hasHumanMove = history.some((entry) => entry.mover === HUMAN_COLOR);
        undoBtn.disabled = !hasHumanMove || state?.turn === AI_COLOR;
      } else {
        undoBtn.disabled = history.length === 0;
      }
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
      const pawnSourceR = attackerColor === "w" ? targetR + 1 : targetR - 1;
      for (const dc of [-1, 1]) {
        const sc = targetC + dc;
        if (inBounds(pawnSourceR, sc) && board[pawnSourceR][sc] === `${attackerColor}p`) {
          return true;
        }
      }

      const knightJumps = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      for (const [dr, dc] of knightJumps) {
        const nr = targetR + dr;
        const nc = targetC + dc;
        if (inBounds(nr, nc) && board[nr][nc] === `${attackerColor}n`) return true;
      }

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nr = targetR + dr;
          const nc = targetC + dc;
          if (inBounds(nr, nc) && board[nr][nc] === `${attackerColor}k`) return true;
        }
      }

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

            const r1 = r + dir;
            if (inBounds(r1, c) && !board[r1][c]) {
              pushPawnMove(r1, c);
              const r2 = r + dir * 2;
              if (r === startRow && inBounds(r2, c) && !board[r2][c]) {
                pushPawnMove(r2, c, { newEnPassant: { r: r1, c } });
              }
            }

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
                moves.push({ fr: homeRow, fc: 4, tr: homeRow, tc: 6, castle: "K" });
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
                moves.push({ fr: homeRow, fc: 4, tr: homeRow, tc: 2, castle: "Q" });
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
        return 0;
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
      if (!statusEl || gameOver) return;
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
        syncUndoButton();
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
      syncUndoButton();
    }

    function commitMove(move) {
      const mover = state.turn;
      history.push({
        prevState: cloneState(state),
        prevLastMove: lastMove ? { ...lastMove } : null,
        mover
      });

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
          if (gameOver) return;
          const aiMove = pickAiMove();
          if (aiMove && !gameOver) {
            commitMove(aiMove);
          }
        }, getDifficulty() === "extreme" ? 260 : 170);
      }
    }

    function askPromotionChoice() {
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
          const promoType = askPromotionChoice();
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
            cell.innerHTML = createPieceSvg(piece);
            cell.classList.add(colorOf(piece) === "w" ? "is-white-piece" : "is-black-piece");
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

    function undoMove() {
      if (aiTimer) {
        clearTimeout(aiTimer);
        aiTimer = null;
      }
      if (history.length === 0) return;

      const isAiMode = modeSelect?.value === "ai";
      if (isAiMode) {
        while (history.length > 0 && history[history.length - 1].mover === AI_COLOR) {
          history.pop();
        }
        if (history.length > 0 && history[history.length - 1].mover === HUMAN_COLOR) {
          const targetEntry = history.pop();
          state = cloneState(targetEntry.prevState);
          lastMove = targetEntry.prevLastMove ? { ...targetEntry.prevLastMove } : null;
        }
      } else {
        const lastEntry = history.pop();
        state = cloneState(lastEntry.prevState);
        lastMove = lastEntry.prevLastMove ? { ...lastEntry.prevLastMove } : null;
      }

      selectedSquare = null;
      legalMovesForSelected = [];
      gameOver = false;
      renderBoard();
      updateStatus();
    }

    function resetGame() {
      if (aiTimer) {
        clearTimeout(aiTimer);
        aiTimer = null;
      }
      state = createInitialState();
      history = [];
      selectedSquare = null;
      legalMovesForSelected = [];
      lastMove = null;
      gameOver = false;
      syncDifficultyVisibility();
      renderBoard();
      updateStatus();
    }

    undoBtn?.addEventListener("click", undoMove);
    resetBtn?.addEventListener("click", resetGame);
    modeSelect?.addEventListener("change", resetGame);
    difficultySelect?.addEventListener("change", resetGame);

    resetGame();
  }

  window.initChessGame = initChessGame;
  window.ChessGameManager = { init: initChessGame };
})();
