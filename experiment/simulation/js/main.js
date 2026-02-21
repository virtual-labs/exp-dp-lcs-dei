(function () {
  /* ===== STATE ===== */
  const state = {
    a: "", b: "",
    n: 0, m: 0,
    dp: [], dir: [],
    phase: "idle",       // idle | filling | trace | done
    i: 1, j: 1,
    lastFillI: null, lastFillJ: null,
    traceI: null, traceJ: null,
    lastTraceI: null, lastTraceJ: null,
    playing: false,
    intervalId: null,
    speed: 500,
    lcsChars: [],
    totalSteps: 0,
    currentStep: 0,
    theme: "light",
    algorithm: "standard",
    backtrackingPath: [],
    history: [],
    historyIndex: -1,
    allLcsStrings: []
  };

  const els = {};

  /* ===== PSEUDO-CODE (plain English, 3-4 lines) ===== */
  const logicTexts = {
    standard: [
      { id: "init", text: "1. Create a table of size (N+1)×(M+1), fill with zeros." },
      { id: "compare", text: "2. For each cell (i,j): compare A[i] with B[j]." },
      { id: "match", text: "3. If they match → take diagonal + 1. Else → take max of top or left." },
      { id: "trace", text: "4. Trace back from bottom-right following arrows to find the LCS." }
    ],
    rolling: [
      { id: "init", text: "1. Use only two rows: 'previous' and 'current'." },
      { id: "compare", text: "2. Fill 'current' row using 'previous' row values." },
      { id: "swap", text: "3. After each full row, swap: current → previous." },
      { id: "result", text: "4. Result is in the last cell. Path info is lost (space-efficient)." }
    ],
    hirschberg: [
      { id: "divide", text: "1. Split sequence A in half at midpoint." },
      { id: "forward", text: "2. Run forward pass on top half, reverse pass on bottom half." },
      { id: "cut", text: "3. Find optimal split point in B where scores combine." },
      { id: "recurse", text: "4. Recurse on both sub-problems, combine results." }
    ]
  };

  /* ===== DOM HELPERS ===== */
  function grab(id) { return document.getElementById(id); }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function cacheElements() {
    els.seqA = grab("seqA");
    els.seqB = grab("seqB");
    els.prevStepBtn = grab("prevStepBtn");
    els.nextStepBtn = grab("nextStepBtn");
    els.autoPlayBtn = grab("autoPlayBtn");
    els.resetBtn = grab("resetBtn");
    els.speedSlider = grab("speedSlider");
    els.themeToggle = grab("themeToggle");
    els.themeIcon = grab("themeIcon");
    els.themeText = grab("themeText");
    els.statsN = grab("stats-n");
    els.statsM = grab("stats-m");
    els.statsSpace = grab("stats-space");
    els.statsStep = grab("stats-step");
    els.statsTotal = grab("stats-total");
    els.explanation = grab("explanation-text");
    els.lcsLength = grab("lcs-length");
    els.charsA = grab("charsA");
    els.charsB = grab("charsB");
    els.comparisonArrow = grab("comparisonArrow");
    els.dpTableContainer = grab("dp-table-container");
    els.dpTableTitle = grab("dp-table-title");
    els.logicContent = grab("logicContent");
    els.currentSpeedDisplay = grab("currentSpeedDisplay");
    els.allLcsList = grab("allLcsList");
  }

  /* ===== THEME ===== */
  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
    localStorage.setItem("lcs-visualizer-theme", state.theme);
  }

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
    if (state.theme === "light") {
      els.themeIcon.textContent = "☀️";
      els.themeText.textContent = "Light";
    } else {
      els.themeIcon.textContent = "🌙";
      els.themeText.textContent = "Dark";
    }
  }

  function loadTheme() {
    const saved = localStorage.getItem("lcs-visualizer-theme");
    if (saved) state.theme = saved;
    applyTheme();
  }

  /* ===== ALGORITHM SELECTOR ===== */
  function setAlgorithm(algo) {
    if (state.algorithm === algo) return;
    state.algorithm = algo;
    document.querySelectorAll(".algo-tab").forEach(tab => {
      tab.classList.toggle("active", tab.dataset.algo === algo);
    });
    renderLogic();
    stopAutoPlay();
    if (state.n > 0 && state.m > 0) initDp();
  }

  /* ===== LOGIC PANE ===== */
  function renderLogic(activeId) {
    const steps = logicTexts[state.algorithm];
    let html = "";
    steps.forEach(s => {
      const cls = s.id === activeId ? "logic-step active" : "logic-step";
      html += `<div class="${cls}" data-logic="${s.id}"><strong>${s.text.split(".")[0]}.</strong>${s.text.substring(s.text.indexOf(".") + 1)}</div>`;
    });
    els.logicContent.innerHTML = html;
  }

  function highlightLogic(id) {
    document.querySelectorAll(".logic-step").forEach(el => {
      el.classList.toggle("active", el.dataset.logic === id);
    });
  }

  /* ===== STATS ===== */
  function updateStats() {
    const a = (els.seqA.value || "").trim();
    const b = (els.seqB.value || "").trim();
    els.statsN.textContent = a.length;
    els.statsM.textContent = b.length;
    if (state.n > 0 && state.m > 0) {
      const space = state.algorithm === "standard" ? (state.n + 1) * (state.m + 1) :
        state.algorithm === "rolling" ? 2 * (state.m + 1) : (state.m + 1);
      els.statsSpace.textContent = space;
    } else {
      els.statsSpace.textContent = "0";
    }
    els.statsStep.textContent = state.currentStep;
    els.statsTotal.textContent = state.totalSteps;
  }

  function setExplanation(text) { els.explanation.innerHTML = text; }

  function updateSpeedLabel() {
    els.currentSpeedDisplay.textContent = (2050 - state.speed) > 1000 ? "Fast" : state.speed + "ms";
  }

  /* ===== HISTORY (for step-backward) ===== */
  function saveState() {
    const snapshot = {
      phase: state.phase,
      i: state.i, j: state.j,
      dp: JSON.parse(JSON.stringify(state.dp)),
      dir: state.dir.map(row => row ? [...row] : []),
      lastFillI: state.lastFillI, lastFillJ: state.lastFillJ,
      traceI: state.traceI, traceJ: state.traceJ,
      lastTraceI: state.lastTraceI, lastTraceJ: state.lastTraceJ,
      currentStep: state.currentStep,
      lcsChars: [...state.lcsChars],
      backtrackingPath: state.backtrackingPath.map(p => [...p])
    };
    if (state.historyIndex < state.history.length - 1) {
      state.history = state.history.slice(0, state.historyIndex + 1);
    }
    state.history.push(snapshot);
    state.historyIndex = state.history.length - 1;
  }

  function restoreState(snap) {
    state.phase = snap.phase;
    state.i = snap.i; state.j = snap.j;
    state.dp = snap.dp; state.dir = snap.dir;
    state.lastFillI = snap.lastFillI; state.lastFillJ = snap.lastFillJ;
    state.traceI = snap.traceI; state.traceJ = snap.traceJ;
    state.lastTraceI = snap.lastTraceI; state.lastTraceJ = snap.lastTraceJ;
    state.currentStep = snap.currentStep;
    state.lcsChars = snap.lcsChars;
    state.backtrackingPath = snap.backtrackingPath;
  }

  /* ===== CHARACTER BOXES ===== */
  function renderCharBoxes() {
    const a = state.a, b = state.b;
    let htmlA = "";
    for (let i = 0; i < a.length; i++) {
      htmlA += `<div class="char-box" data-char-a="${i + 1}">${escapeHtml(a[i])}</div>`;
    }
    els.charsA.innerHTML = htmlA || '<span class="text-muted">—</span>';

    let htmlB = "";
    for (let j = 0; j < b.length; j++) {
      htmlB += `<div class="char-box" data-char-b="${j + 1}">${escapeHtml(b[j])}</div>`;
    }
    els.charsB.innerHTML = htmlB || '<span class="text-muted">—</span>';
  }

  function updateCharHighlights() {
    document.querySelectorAll(".char-box").forEach(box => {
      box.classList.remove("char-box-current-a", "char-box-current-b", "char-box-match", "char-box-in-lcs");
    });

    // LCS chars highlighted during trace/done
    if (state.phase === "done" || state.phase === "trace") {
      state.backtrackingPath.forEach(cell => {
        const [i, j, isMatch] = cell;
        if (isMatch) {
          const ca = document.querySelector(`[data-char-a="${i}"]`);
          const cb = document.querySelector(`[data-char-b="${j}"]`);
          if (ca) ca.classList.add("char-box-in-lcs");
          if (cb) cb.classList.add("char-box-in-lcs");
        }
      });
    }

    // Current comparison during filling
    if (state.phase === "filling" && state.lastFillI !== null && state.lastFillJ !== null) {
      const i = state.lastFillI, j = state.lastFillJ;
      const ca = document.querySelector(`[data-char-a="${i}"]`);
      const cb = document.querySelector(`[data-char-b="${j}"]`);
      if (ca) ca.classList.add("char-box-current-a");
      if (cb) cb.classList.add("char-box-current-b");
      if (state.a[i - 1] === state.b[j - 1]) {
        if (ca) ca.classList.add("char-box-match");
        if (cb) cb.classList.add("char-box-match");
      }

      els.comparisonArrow.classList.add("visible");
      els.comparisonArrow.innerHTML = state.a[i - 1] === state.b[j - 1]
        ? `<i class="fas fa-check-circle" style="color:var(--match)"></i> Match! A[${i}] = B[${j}] = '${state.a[i - 1]}'`
        : `<i class="fas fa-times-circle" style="color:var(--danger)"></i> A[${i}]='${state.a[i - 1]}' ≠ B[${j}]='${state.b[j - 1]}'`;
    } else {
      els.comparisonArrow.classList.remove("visible");
    }
  }

  /* ===== DP TABLE RENDERING ===== */
  function renderDpTable() {
    const n = state.n, m = state.m, a = state.a, b = state.b;
    const dp = state.dp, dir = state.dir;

    if (state.algorithm === "rolling") {
      els.dpTableTitle.innerHTML = `<i class='fas fa-layer-group'></i> Rolling Array (row ${Math.min(state.i, n)} of ${n})`;
    } else if (state.algorithm === "hirschberg") {
      els.dpTableTitle.innerHTML = `<i class='fas fa-code-branch'></i> Hirschberg (simplified view)`;
    } else {
      els.dpTableTitle.innerHTML = `<i class='fas fa-table'></i> DP Table dp[i][j]`;
    }

    let html = '<table class="dp-table"><thead><tr>';
    html += '<th class="corner header-cell">dp</th>';
    html += '<th class="header-cell">∅</th>';
    for (let j = 1; j <= m; j++) {
      html += `<th class="header-cell"><span style="display:block;font-size:12px;">${escapeHtml(b[j - 1])}</span><small style="font-size:9px;opacity:0.6">[${j}]</small></th>`;
    }
    html += "</tr></thead><tbody>";

    const rowsToShow = state.algorithm === "rolling" ? Math.min(state.i, n + 1) :
      state.algorithm === "hirschberg" ? Math.min(n + 1, 11) : n + 1;

    const matchCells = new Set();
    state.backtrackingPath.forEach(cell => {
      const [ci, cj, isMatch] = cell;
      if (isMatch) matchCells.add(`${ci},${cj}`);
    });

    for (let i = 0; i < rowsToShow; i++) {
      if (state.algorithm === "rolling" && i > 1 && i < state.i - 1) continue;

      html += "<tr>";
      const rowIndex = state.algorithm === "rolling"
        ? (i === 0 ? 0 : Math.min(i, state.i > 0 ? state.i : 1))
        : i;

      if (rowIndex === 0) {
        html += '<td class="header-col header-cell">∅</td>';
      } else {
        const ch = rowIndex <= n ? a[rowIndex - 1] : "";
        html += `<td class="header-col header-cell">${escapeHtml(ch)}<br><small style="font-size:9px;opacity:0.6">[${rowIndex}]</small></td>`;
      }

      for (let j = 0; j <= m; j++) {
        const isBase = rowIndex === 0 || j === 0;
        const isCurrentFill = state.phase === "filling" &&
          ((state.algorithm === "rolling" && state.lastFillI === state.i && state.lastFillJ === j) ||
            (state.algorithm !== "rolling" && state.lastFillI === rowIndex && state.lastFillJ === j));

        const isTraceCell = (state.phase === "trace" || state.phase === "done") &&
          state.lastTraceI === rowIndex && state.lastTraceJ === j;

        const isLcsCell = matchCells.has(`${rowIndex},${j}`);
        const hasDiag = !isBase && dir[rowIndex] && dir[rowIndex][j] === "diag";

        const classes = ["dp-cell"];
        if (isBase) classes.push("dp-cell-base");

        if ((state.phase === "filling" && isCurrentFill && rowIndex > 0 && j > 0 && a[rowIndex - 1] === b[j - 1]) ||
          (state.phase === "filling" && hasDiag) ||
          ((state.phase === "trace" || state.phase === "done") && isLcsCell)) {
          classes.push("dp-cell-match");
        }
        if (isCurrentFill) classes.push("dp-cell-current");
        if (isTraceCell) classes.push("dp-cell-trace");

        // Arrow
        let arrow = "";
        if (!isBase && dir[rowIndex] && dir[rowIndex][j]) {
          const d = dir[rowIndex][j];
          if (d === "diag") arrow = "↖";
          else if (d === "up") arrow = "↑";
          else if (d === "left") arrow = "←";
        }

        let val = "";
        if (dp && dp[i] !== undefined) {
          val = dp[i][j] !== undefined ? dp[i][j] : "";
        }

        html += `<td class="${classes.join(" ")}"><div class="dp-cell-inner"><span class="dp-val">${val}</span><span class="dp-arrow">${arrow}</span></div></td>`;
      }
      html += "</tr>";
    }

    if (state.algorithm === "hirschberg" && n > 10) {
      html += `<tr><td colspan="${m + 2}" style="text-align:center;color:var(--text-muted);font-size:9px;padding:8px"><i class="fas fa-ellipsis-h"></i> showing first 10 of ${n} rows</td></tr>`;
    } else if (state.algorithm === "rolling" && n > 2) {
      html += `<tr><td colspan="${m + 2}" style="text-align:center;color:var(--text-muted);font-size:9px;padding:8px"><i class="fas fa-ellipsis-h"></i> rolling array — only prev + current rows stored</td></tr>`;
    }

    html += "</tbody></table>";
    els.dpTableContainer.innerHTML = html;
  }

  /* ===== INIT DP ===== */
  function initDp() {
    const a = (els.seqA.value || "").trim().toUpperCase().substring(0, 8);
    const b = (els.seqB.value || "").trim().toUpperCase().substring(0, 8);
    els.seqA.value = a;
    els.seqB.value = b;

    state.a = a; state.b = b;
    state.n = a.length; state.m = b.length;

    if (state.n === 0 || state.m === 0) {
      setExplanation("<i class='fas fa-exclamation-triangle'></i> Enter both sequences first!");
      return;
    }

    state.totalSteps = state.n * state.m + 1;
    state.currentStep = 0;
    state.backtrackingPath = [];
    state.allLcsStrings = [];
    renderAllLcs();
    updateStats();
    renderCharBoxes();
    updateCharHighlights();

    if (state.algorithm === "standard") {
      state.dp = Array.from({ length: state.n + 1 }, () => Array(state.m + 1).fill(0));
      state.dir = Array.from({ length: state.n + 1 }, () => Array(state.m + 1).fill(null));
    } else if (state.algorithm === "rolling") {
      state.dp = [Array(state.m + 1).fill(0), Array(state.m + 1).fill(0)];
      state.dir = Array.from({ length: state.n + 1 }, () => Array(state.m + 1).fill(null));
    } else {
      const rows = Math.min(state.n, 10);
      state.dp = Array.from({ length: rows + 1 }, () => Array(state.m + 1).fill(0));
      state.dir = Array.from({ length: state.n + 1 }, () => Array(state.m + 1).fill(null));
    }

    state.phase = "filling";
    state.i = 1; state.j = 1;
    state.lastFillI = null; state.lastFillJ = null;
    state.traceI = null; state.traceJ = null;
    state.lastTraceI = null; state.lastTraceJ = null;
    state.lcsChars = [];
    state.history = []; state.historyIndex = -1;

    saveState();
    renderDpTable();
    renderLogic("init");
    highlightLogic("init");
    setExplanation(`<i class='fas fa-check-circle'></i> Table initialized (${state.algorithm}). Press Next or Play to begin.`);
  }

  /* ===== STEP FILLING ===== */
  function stepFilling() {
    const n = state.n, m = state.m, a = state.a, b = state.b;

    if (n === 0 || m === 0) {
      saveState();
      state.phase = "done";
      setExplanation("<i class='fas fa-info-circle'></i> One sequence is empty. LCS = 0.");
      renderDpTable(); updateCharHighlights();
      return;
    }

    if (state.i > n) {
      saveState();
      state.phase = "trace";
      state.traceI = n; state.traceJ = m;
      state.lastFillI = null; state.lastFillJ = null;

      if (state.algorithm === "standard") {
        buildBacktrackingPath();
        setExplanation(`<i class='fas fa-check-circle'></i> Table filled! LCS length = ${state.dp[n][m]}. Now tracing back...`);
        highlightLogic("trace");
      } else {
        state.phase = "done";
        const lcsLen = state.algorithm === "rolling" ? state.dp[1][m] : state.dp[Math.min(n, 10)][m];
        setExplanation(`<i class='fas fa-check-circle'></i> Done! LCS length = ${lcsLen}. (Full traceback only in Standard DP)`);
        highlightLogic("result");
        // For rolling/hirschberg, compute all LCS using a full DP pass internally
        computeAllLcsInternally();
      }
      renderDpTable(); updateCharHighlights();
      return;
    }

    saveState();

    const i = state.i, j = state.j;
    const charA = a[i - 1], charB = b[j - 1];
    state.currentStep++;

    let explain = "";
    highlightLogic("compare");

    if (state.algorithm === "rolling") {
      if (charA === charB) {
        const val = (state.dp[0][j - 1] || 0) + 1;
        state.dp[1][j] = val;
        state.dir[i][j] = "diag";
        explain = `<i class="fas fa-check-circle" style="color:var(--match)"></i> <strong>MATCH!</strong> A[${i}]='${charA}' = B[${j}]='${charB}'. curr[${j}] = prev[${j - 1}]+1 = ${val}`;
      } else {
        const top = state.dp[0][j] || 0;
        const left = state.dp[1][j - 1] || 0;
        if (top >= left) {
          state.dp[1][j] = top;
          state.dir[i][j] = "up";
        } else {
          state.dp[1][j] = left;
          state.dir[i][j] = "left";
        }
        explain = `<i class="fas fa-times-circle" style="color:var(--danger)"></i> A[${i}]='${charA}' ≠ B[${j}]='${charB}'. curr[${j}] = max(${top}, ${left}) = ${Math.max(top, left)}`;
      }
    } else {
      if (charA === charB) {
        highlightLogic("match");
        const val = state.dp[i - 1][j - 1] + 1;
        state.dp[i][j] = val;
        state.dir[i][j] = "diag";
        explain = `<i class="fas fa-check-circle" style="color:var(--match)"></i> <strong>MATCH!</strong> A[${i}]='${charA}' = B[${j}]='${charB}'. dp[${i}][${j}] = dp[${i - 1}][${j - 1}]+1 = ${val}`;
      } else {
        const top = state.dp[i - 1][j];
        const left = state.dp[i][j - 1];
        if (top >= left) {
          state.dp[i][j] = top;
          state.dir[i][j] = "up";
        } else {
          state.dp[i][j] = left;
          state.dir[i][j] = "left";
        }
        explain = `<i class="fas fa-times-circle" style="color:var(--danger)"></i> A[${i}]='${charA}' ≠ B[${j}]='${charB}'. dp[${i}][${j}] = max(${top}, ${left}) = ${Math.max(top, left)}`;
      }
    }

    state.lastFillI = i; state.lastFillJ = j;
    setExplanation(explain);
    updateStats();

    state.j++;
    if (state.j > m) {
      state.j = 1;
      if (state.algorithm === "rolling") {
        state.dp[0] = [...state.dp[1]];
        state.dp[1] = Array(m + 1).fill(0);
      }
      state.i++;
    }

    renderDpTable();
    updateCharHighlights();
  }

  /* ===== BACKTRACKING PATH (single path for traceback animation) ===== */
  function buildBacktrackingPath() {
    state.backtrackingPath = [];
    let i = state.n, j = state.m;
    while (i > 0 && j > 0) {
      const isMatch = state.dir[i][j] === "diag";
      state.backtrackingPath.unshift([i, j, isMatch]);
      if (state.dir[i][j] === "diag") { i--; j--; }
      else if (state.dir[i][j] === "up") { i--; }
      else { j--; }
    }
  }

  /* ===== STEP TRACEBACK ===== */
  function stepTraceback() {
    const n = state.n, m = state.m, a = state.a;

    if (state.traceI === null) { state.traceI = n; state.traceJ = m; }

    const i = state.traceI, j = state.traceJ;

    if (i <= 0 || j <= 0) {
      saveState();
      state.phase = "done";
      // Find ALL LCS strings
      findAllLCS();
      setExplanation(
        `<i class="fas fa-trophy" style="color:var(--match)"></i> <strong>Traceback finished!</strong> Found ${state.allLcsStrings.length} distinct LCS string(s) of length ${state.lcsChars.length}.`
      );
      highlightLogic("trace");
      renderDpTable(); updateCharHighlights(); renderAllLcs();
      return;
    }

    saveState();

    const direction = state.dir[i][j];
    state.lastTraceI = i; state.lastTraceJ = j;

    if (direction === "diag") {
      state.lcsChars.unshift(a[i - 1]);
      setExplanation(`<i class="fas fa-map-marker-alt" style="color:var(--trace)"></i> Cell (${i},${j}) ↖ diagonal: A[${i}]='${a[i - 1]}' is part of LCS. Moving to (${i - 1},${j - 1}).`);
      state.traceI = i - 1; state.traceJ = j - 1;
    } else if (direction === "up") {
      setExplanation(`<i class="fas fa-map-marker-alt" style="color:var(--trace)"></i> Cell (${i},${j}) ↑ up: skip A[${i}]. Moving to (${i - 1},${j}).`);
      state.traceI = i - 1;
    } else {
      setExplanation(`<i class="fas fa-map-marker-alt" style="color:var(--trace)"></i> Cell (${i},${j}) ← left: Moving to (${i},${j - 1}).`);
      state.traceJ = j - 1;
    }

    els.lcsLength.textContent = state.lcsChars.length;
    highlightLogic("trace");
    renderDpTable(); updateCharHighlights();
  }

  /* ===== FIND ALL LCS STRINGS ===== */
  function findAllLCS() {
    // Build a fresh full DP table to find ALL LCS
    const n = state.n, m = state.m, a = state.a, b = state.b;
    const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const results = new Set();

    function backtrack(i, j, current) {
      if (results.size >= 20) return; // cap at 20 to avoid explosion
      if (i === 0 || j === 0) {
        if (current.length === dp[n][m]) {
          results.add(current);
        }
        return;
      }
      if (a[i - 1] === b[j - 1]) {
        backtrack(i - 1, j - 1, a[i - 1] + current);
      } else {
        if (dp[i - 1][j] >= dp[i][j - 1]) {
          backtrack(i - 1, j, current);
        }
        if (dp[i][j - 1] >= dp[i - 1][j]) {
          backtrack(i, j - 1, current);
        }
      }
    }

    backtrack(n, m, "");
    state.allLcsStrings = [...results];
  }

  /* For rolling/hirschberg — compute internally */
  function computeAllLcsInternally() {
    findAllLCS();
    if (state.allLcsStrings.length > 0) {
      els.lcsLength.textContent = state.allLcsStrings[0].length;
    }
    renderAllLcs();
  }

  function renderAllLcs() {
    if (state.allLcsStrings.length === 0) {
      els.allLcsList.innerHTML = '<span class="text-muted">Will appear after algorithm completes.</span>';
      return;
    }
    let html = "";
    state.allLcsStrings.forEach((s, idx) => {
      html += `<div class="lcs-tag"><i class="fas fa-check"></i> ${escapeHtml(s)}</div>`;
    });
    if (state.allLcsStrings.length >= 20) {
      html += '<span class="text-muted" style="margin-left:8px">(capped at 20)</span>';
    }
    els.allLcsList.innerHTML = html;
  }

  /* ===== STEP ONCE ===== */
  function stepOnce() {
    if (state.phase === "idle") {
      const a = (els.seqA.value || "").trim();
      const b = (els.seqB.value || "").trim();
      if (!a || !b) {
        setExplanation("<i class='fas fa-exclamation-triangle'></i> Please enter both sequences first!");
        return;
      }
      initDp();
      return;
    }
    if (state.phase === "filling") { stepFilling(); return; }
    if (state.phase === "trace") { stepTraceback(); return; }
    if (state.phase === "done") {
      setExplanation("<i class='fas fa-check-circle'></i> Complete! Press Reset to try again.");
    }
  }

  /* ===== STEP BACKWARD ===== */
  function stepBackward() {
    if (state.phase === "idle") return;
    stopAutoPlay();
    if (state.historyIndex <= 0) {
      if (state.currentStep > 0) {
        setExplanation("<i class='fas fa-info-circle'></i> Back to start.");
        initDp();
      }
      return;
    }
    state.historyIndex--;
    restoreState(state.history[state.historyIndex]);
    updateStats();
    els.lcsLength.textContent = state.lcsChars.length;
    renderDpTable(); updateCharHighlights();
    setExplanation(`<i class='fas fa-step-backward'></i> <strong>Stepped back</strong> — step ${state.currentStep}`);
  }

  /* ===== AUTOPLAY ===== */
  function startAutoPlay() {
    if (state.playing) return;
    const curA = (els.seqA.value || "").trim();
    const curB = (els.seqB.value || "").trim();
    if (state.phase === "idle" || curA !== state.a || curB !== state.b) {
      if (!curA || !curB) {
        setExplanation("<i class='fas fa-exclamation-triangle'></i> Enter both sequences first!");
        return;
      }
      initDp();
    }
    state.playing = true;
    if (state.intervalId) clearInterval(state.intervalId);
    state.intervalId = setInterval(() => {
      if (state.phase === "done") { stopAutoPlay(); return; }
      stepOnce();
    }, state.speed);
    els.autoPlayBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
  }

  function stopAutoPlay() {
    state.playing = false;
    if (state.intervalId) { clearInterval(state.intervalId); state.intervalId = null; }
    els.autoPlayBtn.innerHTML = '<i class="fas fa-play"></i> Play';
  }

  /* ===== RESET ===== */
  function resetAll() {
    stopAutoPlay();
    state.history = []; state.historyIndex = -1;
    state.a = ""; state.b = "";
    state.n = 0; state.m = 0;
    state.dp = []; state.dir = [];
    state.phase = "idle";
    state.i = 1; state.j = 1;
    state.lastFillI = null; state.lastFillJ = null;
    state.traceI = null; state.traceJ = null;
    state.lastTraceI = null; state.lastTraceJ = null;
    state.currentStep = 0; state.totalSteps = 0;
    state.backtrackingPath = [];
    state.lcsChars = [];
    state.allLcsStrings = [];
    els.lcsLength.textContent = "0";
    updateStats();
    els.dpTableContainer.innerHTML = "";
    els.charsA.innerHTML = "";
    els.charsB.innerHTML = "";
    renderAllLcs();
    setExplanation("<i class='fas fa-info-circle'></i> Enter two sequences and press Next or Play to start.");
    renderLogic();
  }

  /* ===== EVENT LISTENERS ===== */
  function attachEvents() {
    els.seqA.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase().substring(0, 8);
      updateStats();
    });
    els.seqB.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase().substring(0, 8);
      updateStats();
    });

    els.prevStepBtn.addEventListener("click", stepBackward);
    els.nextStepBtn.addEventListener("click", () => { stopAutoPlay(); stepOnce(); });
    els.autoPlayBtn.addEventListener("click", () => {
      if (state.playing) stopAutoPlay(); else startAutoPlay();
    });
    els.resetBtn.addEventListener("click", resetAll);

    els.speedSlider.addEventListener("input", () => {
      state.speed = 2050 - parseInt(els.speedSlider.value);
      updateSpeedLabel();
      if (state.playing) { stopAutoPlay(); startAutoPlay(); }
    });

    els.themeToggle.addEventListener("click", toggleTheme);

    document.querySelectorAll(".algo-tab").forEach(tab => {
      tab.addEventListener("click", () => setAlgorithm(tab.dataset.algo));
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT") return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          if (state.playing) stopAutoPlay(); else startAutoPlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          stepBackward();
          break;
        case "ArrowRight":
          e.preventDefault();
          stopAutoPlay();
          stepOnce();
          break;
      }
    });
  }

  /* ===== INIT ===== */
  function init() {
    cacheElements();
    loadTheme();
    attachEvents();
    updateSpeedLabel();
    state.speed = 2050 - parseInt(els.speedSlider.value);
    renderLogic();

    // Set default sequences
    els.seqA.value = "AGGTAB";
    els.seqB.value = "GXTXAYB";
    updateStats();
    initDp();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();