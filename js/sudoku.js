window.initSudokuGame = function () {
  const gridEl = document.getElementById("sudokuGrid");
  const statusEl = document.getElementById("sudokuStatus");
  const hintBtn = document.getElementById("sudokuHintBtn");
  const checkBtn = document.getElementById("sudokuCheckBtn");
  const newBtn = document.getElementById("sudokuNewBtn");
  if (!gridEl) return;

  const PUZZLES = [
    {
      board: [
        [5, 3, 0, 0, 7, 0, 0, 0, 0],
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],
        [8, 0, 0, 0, 6, 0, 0, 0, 3],
        [4, 0, 0, 8, 0, 3, 0, 0, 1],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],
        [0, 6, 0, 0, 0, 0, 2, 8, 0],
        [0, 0, 0, 4, 1, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 9]
      ],
      solution: [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 5, 2, 8, 6, 1, 7, 9]
      ]
    },
    {
      board: [
        [0, 2, 0, 6, 0, 8, 0, 0, 0],
        [5, 8, 0, 0, 0, 9, 7, 0, 0],
        [0, 0, 0, 0, 4, 0, 0, 0, 0],
        [3, 7, 0, 0, 0, 0, 5, 0, 0],
        [6, 0, 0, 0, 0, 0, 0, 0, 4],
        [0, 0, 8, 0, 0, 0, 0, 1, 3],
        [0, 0, 0, 0, 2, 0, 0, 0, 0],
        [0, 0, 9, 8, 0, 0, 0, 3, 6],
        [0, 0, 0, 3, 0, 6, 0, 9, 0]
      ],
      solution: [
        [1, 2, 3, 6, 7, 8, 9, 4, 5],
        [5, 8, 4, 2, 3, 9, 7, 6, 1],
        [9, 6, 7, 1, 4, 5, 3, 2, 8],
        [3, 7, 2, 4, 6, 1, 5, 8, 9],
        [6, 9, 1, 5, 8, 3, 2, 7, 4],
        [4, 5, 8, 7, 9, 2, 6, 1, 3],
        [8, 3, 6, 9, 2, 4, 1, 5, 7],
        [2, 1, 9, 8, 5, 7, 4, 3, 6],
        [7, 4, 5, 3, 1, 6, 8, 9, 2]
      ]
    }
  ];

  let puzzleIdx = 0;
  let initialBoard = [];
  let currentBoard = [];
  let solutionBoard = [];
  let selected = null;

  function loadPuzzle(idx) {
    const p = PUZZLES[idx % PUZZLES.length];
    initialBoard = p.board.map((row) => [...row]);
    currentBoard = p.board.map((row) => [...row]);
    solutionBoard = p.solution.map((row) => [...row]);
    selected = null;
    if (statusEl) statusEl.textContent = "Điền số 1–9 không trùng hàng, cột, ô 3x3";
    renderGrid();
  }

  function hasConflict(r, c, val) {
    if (!val) return false;
    for (let i = 0; i < 9; i++) {
      if (i !== c && currentBoard[r][i] === val) return true;
      if (i !== r && currentBoard[i][c] === val) return true;
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let i = br; i < br + 3; i++) {
      for (let j = bc; j < bc + 3; j++) {
        if ((i !== r || j !== c) && currentBoard[i][j] === val) return true;
      }
    }
    return false;
  }

  function renderGrid() {
    gridEl.innerHTML = "";
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement("div");
        cell.className = "sudoku-cell";
        if (c === 2 || c === 5) cell.classList.add("border-right-thick");
        if (r === 2 || r === 5) cell.classList.add("border-bottom-thick");

        const val = currentBoard[r][c];
        if (val !== 0) {
          cell.textContent = val;
          if (initialBoard[r][c] !== 0) {
            cell.classList.add("given");
          } else {
            cell.classList.add("user-val");
            if (hasConflict(r, c, val)) cell.classList.add("conflict");
          }
        }

        if (selected && selected[0] === r && selected[1] === c) {
          cell.classList.add("selected");
        }

        cell.addEventListener("click", () => {
          selected = [r, c];
          renderGrid();
        });

        gridEl.appendChild(cell);
      }
    }
  }

  function inputNumber(num) {
    if (!selected) return;
    const [r, c] = selected;
    if (initialBoard[r][c] !== 0) return;
    currentBoard[r][c] = num;
    renderGrid();
  }

  document.querySelectorAll(".num-btn").forEach((btn) => {
    btn.addEventListener("click", () => inputNumber(Number(btn.dataset.num)));
  });

  hintBtn?.addEventListener("click", () => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (currentBoard[r][c] === 0) {
          currentBoard[r][c] = solutionBoard[r][c];
          selected = [r, c];
          renderGrid();
          return;
        }
      }
    }
  });

  checkBtn?.addEventListener("click", () => {
    let complete = true;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (currentBoard[r][c] !== solutionBoard[r][c]) {
          complete = false;
          break;
        }
      }
    }
    if (statusEl) {
      statusEl.textContent = complete
        ? "🎉 Xuất sắc! Bạn đã giải đúng toàn bộ bảng Sudoku!"
        : "Chưa hoàn tất hoặc còn ô chưa khớp, tiếp tục nhé!";
    }
  });

  newBtn?.addEventListener("click", () => {
    puzzleIdx += 1;
    loadPuzzle(puzzleIdx);
  });

  window.addEventListener("keydown", (e) => {
    const panel = document.getElementById("gamePanelSudoku");
    if (!panel || panel.classList.contains("hidden")) return;
    if (e.key >= "1" && e.key <= "9") inputNumber(Number(e.key));
    if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") inputNumber(0);
  });

  loadPuzzle(0);
};
