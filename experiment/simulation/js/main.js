(function () {
  const state = {
    a: "",
    b: "",
    n: 0,
    m: 0,
    dp: [],
    dir: [],
    phase: "idle",
    i: 1,
    j: 1,
    lastFillI: null,
    lastFillJ: null,
    traceI: null,
    traceJ: null,
    lastTraceI: null,
    lastTraceJ: null,
    playing: false,
    intervalId: null,
    speed: 175,
    lcsChars: [],
    totalSteps: 0,
    currentStep: 0,
    theme: "dark",
    algorithm: "standard",
    backtrackingPath: [],
    rollingDP: null,
    history: [],
    historyIndex: -1
  };

  const els = {};

  const pseudocode = {
    standard: [
      { code: "outer", text: "for i ← 1 to n:" },
      { code: "inner", text: "  for j ← 1 to m:" },
      { code: "if", text: "    if A[i] == B[j]:" },
      { code: "match", text: "      dp[i][j] ← dp[i-1][j-1] + 1" },
      { code: "else", text: "    else:" },
      { code: "mismatch", text: "      dp[i][j] ← max(dp[i-1][j], dp[i][j-1])" },
      { code: "trace", text: "# traceback from (n,m) to recover LCS" }
    ],
    rolling: [
      { code: "init", text: "prev ← array[0..m]" },
      { code: "outer", text: "for i ← 1 to n:" },
      { code: "inner", text: "  curr[0] ← 0" },
      { code: "forj", text: "  for j ← 1 to m:" },
      { code: "if", text: "    if A[i] == B[j]:" },
      { code: "match", text: "      curr[j] ← prev[j-1] + 1" },
      { code: "else", text: "    else:" },
      { code: "mismatch", text: "      curr[j] ← max(prev[j], curr[j-1])" },
      { code: "swap", text: "  prev ← curr" },
      { code: "result", text: "# result in prev[m]" }
    ]
  };

  function grab(id) {
    return document.getElementById(id);
  }

  function saveState() {
    const snapshot = {
      phase: state.phase,
      i: state.i,
      j: state.j,
      dp: JSON.parse(JSON.stringify(state.dp)),
      dir: state.dir.map(row => row ? [...row] : []),
      lastFillI: state.lastFillI,
      lastFillJ: state.lastFillJ,
      traceI: state.traceI,
      traceJ: state.traceJ,
      lastTraceI: state.lastTraceI,
      lastTraceJ: state.lastTraceJ,
      currentStep: state.currentStep,
      lcsChars: [...state.lcsChars],
      backtrackingPath: state.backtrackingPath.map(path => [...path])
    };
    
    if (state.historyIndex < state.history.length - 1) {
      state.history = state.history.slice(0, state.historyIndex + 1);
    }
    
    state.history.push(snapshot);
    state.historyIndex = state.history.length - 1;
  }

  function restoreState(snapshot) {
    state.phase = snapshot.phase;
    state.i = snapshot.i;
    state.j = snapshot.j;
    state.dp = snapshot.dp;
    state.dir = snapshot.dir;
    state.lastFillI = snapshot.lastFillI;
    state.lastFillJ = snapshot.lastFillJ;
    state.traceI = snapshot.traceI;
    state.traceJ = snapshot.traceJ;
    state.lastTraceI = snapshot.lastTraceI;
    state.lastTraceJ = snapshot.lastTraceJ;
    state.currentStep = snapshot.currentStep;
    state.lcsChars = snapshot.lcsChars;
    state.backtrackingPath = snapshot.backtrackingPath;
  }

  function cacheElements() {
    els.seqA = grab("seqA");
    els.seqB = grab("seqB");
    els.prevStepBtn = grab("prevStepBtn");
    els.nextStepBtn = grab("nextStepBtn");
    els.autoPlayBtn = grab("autoPlayBtn");
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
    els.lcsString = grab("lcs-string");

    els.visLenA = grab("vis-lenA");
    els.visLenB = grab("vis-lenB");
    els.charsA = grab("charsA");
    els.charsB = grab("charsB");
    els.comparisonArrow = grab("comparisonArrow");

    els.dpTableContainer = grab("dp-table-container");
    els.dpTableTitle = grab("dp-table-title");
    els.codeLines = grab("codeLines");
    els.codeDescription = grab("code-description");
    els.algoInfo = grab("algoInfo");
    
    els.backtrackingVisual = grab("backtrackingVisual");
    els.backtrackingPath = grab("backtrackingPath");
    
    els.currentSpeedDisplay = grab("currentSpeedDisplay");
  }

  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", state.theme);
    
    if (state.theme === "light") {
      els.themeIcon.textContent = "☀️";
      els.themeText.textContent = "Light";
    } else {
      els.themeIcon.textContent = "🌙";
      els.themeText.textContent = "Dark";
    }
    
    localStorage.setItem("lcs-visualizer-theme", state.theme);
  }

  function loadTheme() {
    const savedTheme = localStorage.getItem("lcs-visualizer-theme");
    if (savedTheme) {
      state.theme = savedTheme;
    }
    document.documentElement.setAttribute("data-theme", state.theme);
    
    if (state.theme === "light") {
      els.themeIcon.textContent = "☀️";
      els.themeText.textContent = "Light";
    } else {
      els.themeIcon.textContent = "🌙";
      els.themeText.textContent = "Dark";
    }
  }

  function setAlgorithm(algo) {
    if (state.algorithm === algo) return;
    
    state.algorithm = algo;
    
    document.querySelectorAll('.algo-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.algo === algo);
    });
    
    const algoInfo = {
      standard: "<strong><i class='fas fa-info-circle'></i> Standard DP:</strong> Builds full DP table, O(n²) space, allows full backtracking",
      rolling: "<strong><i class='fas fa-info-circle'></i> Rolling Array:</strong> Uses only 2 rows, O(n) space, can reconstruct with extra steps"
    };
    els.algoInfo.innerHTML = algoInfo[algo];
    
    els.codeDescription.textContent = 
      algo === "standard" ? "Standard DP" : "Rolling Array";
    
    renderPseudocode();
    
    stopAutoPlay();
    
    if (state.n > 0 && state.m > 0) {
      initDp();
    }
  }

  function renderPseudocode() {
    const code = pseudocode[state.algorithm];
    let html = '';
    code.forEach(line => {
      html += `<div class="code-line" data-code="${line.code}">${line.text}</div>`;
    });
    els.codeLines.innerHTML = html;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function updateSpeedLabel() {
    const value = state.speed;
    els.currentSpeedDisplay.textContent = value + 'ms';
  }

  function updateStats() {
    const a = (els.seqA.value || "").trim();
    const b = (els.seqB.value || "").trim();
    const n = a.length;
    const m = b.length;
    
    els.statsN.textContent = n;
    els.statsM.textContent = m;
    
    if (state.n > 0 && state.m > 0) {
      const space = state.algorithm === "standard" ? state.n * state.m : 
                   state.algorithm === "rolling" ? 2 * state.m :
                   state.m;
      els.statsSpace.textContent = space || 0;
    } else {
      els.statsSpace.textContent = "0";
    }
    
    els.visLenA.textContent = n;
    els.visLenB.textContent = m;

    els.statsStep.textContent = state.currentStep;
    els.statsTotal.textContent = state.totalSteps;
  }

  function setExplanation(text) {
    els.explanation.innerHTML = text;
  }

  function setLcsDisplay() {
    const lcs = state.lcsChars.join("");
    els.lcsString.textContent = lcs || "–";
    els.lcsLength.textContent = lcs.length;
  }

  function clearLcsDisplay() {
    state.lcsChars = [];
    setLcsDisplay();
  }

  function highlightCode(which) {
    document.querySelectorAll("#codeLines .code-line").forEach((line) => {
      const codeId = line.getAttribute("data-code");
      if (codeId === which) {
        line.classList.add("code-line-active");
      } else {
        line.classList.remove("code-line-active");
      }
    });
  }

  function renderCharBoxes() {
    const a = state.a;
    const b = state.b;
    
    let htmlA = "";
    for (let i = 0; i < a.length; i++) {
      const idx = i + 1;
      htmlA += `<div class="char-box" data-char-a="${idx}">
        <span class="char-box-index">${idx}</span>
        ${escapeHtml(a[i])}
      </div>`;
    }
    els.charsA.innerHTML = htmlA || '<div style="color: var(--text-muted); font-size: 10px;"><i class="fas fa-exclamation-circle"></i> No characters</div>';

    let htmlB = "";
    for (let j = 0; j < b.length; j++) {
      const idx = j + 1;
      htmlB += `<div class="char-box" data-char-b="${idx}">
        <span class="char-box-index">${idx}</span>
        ${escapeHtml(b[j])}
      </div>`;
    }
    els.charsB.innerHTML = htmlB || '<div style="color: var(--text-muted); font-size: 10px;"><i class="fas fa-exclamation-circle"></i> No characters</div>';
  }

  function updateCharHighlights() {
  document.querySelectorAll('.char-box').forEach(box => {
    box.classList.remove('char-box-current-a', 'char-box-current-b', 'char-box-match', 'char-box-in-lcs');
  });

  // Highlight all LCS characters (permanently green) during trace/done
  if (state.phase === "done" || state.phase === "trace") {
    state.backtrackingPath.forEach(cell => {
      const [i, j, isMatch] = cell;
      if (isMatch) {
        const charBoxA = document.querySelector(`[data-char-a="${i}"]`);
        const charBoxB = document.querySelector(`[data-char-b="${j}"]`);
        if (charBoxA) charBoxA.classList.add('char-box-in-lcs');
        if (charBoxB) charBoxB.classList.add('char-box-in-lcs');
      }
    });
  }

  // Highlight current comparison during filling
  if (state.phase === "filling" && state.lastFillI !== null && state.lastFillJ !== null) {
    const i = state.lastFillI;
    const j = state.lastFillJ;
    
    const charBoxA = document.querySelector(`[data-char-a="${i}"]`);
    const charBoxB = document.querySelector(`[data-char-b="${j}"]`);
    
    if (charBoxA) charBoxA.classList.add('char-box-current-a');
    if (charBoxB) charBoxB.classList.add('char-box-current-b');

    // If it's a match, also add match highlight (temporary during filling)
    if (state.a[i - 1] === state.b[j - 1]) {
      if (charBoxA) charBoxA.classList.add('char-box-match');
      if (charBoxB) charBoxB.classList.add('char-box-match');
    }

    els.comparisonArrow.classList.add('visible');
    els.comparisonArrow.innerHTML = 
      state.a[i - 1] === state.b[j - 1] 
        ? `<i class="fas fa-check-circle"></i> Match! A[${i}] = B[${j}] = '${state.a[i - 1]}'`
        : `<i class="fas fa-times-circle"></i> Different: A[${i}] = '${state.a[i - 1]}', B[${j}] = '${state.b[j - 1]}'`;
  } else {
    els.comparisonArrow.classList.remove('visible');
  }
}

  function renderBacktrackingPath() {
  if (state.algorithm !== "standard" || state.backtrackingPath.length === 0) {
    els.backtrackingPath.innerHTML = 
      '<div style="color: var(--text-muted); font-size: 9px; padding: 10px; text-align: center;">' +
      (state.algorithm === "standard" 
        ? '<i class="fas fa-info-circle"></i> Backtracking path will appear here after DP table is filled' 
        : '<i class="fas fa-info-circle"></i> Full backtracking only available in Standard DP algorithm') +
      '</div>';
    return;
  }

  let html = '';
  let prevCell = null;
  
  state.backtrackingPath.forEach((cell, idx) => {
    const [i, j, isMatch] = cell;
    const char = isMatch ? state.a[i-1] : '';
    
    if (prevCell) {
      html += `<div class="path-arrow"><i class="fas fa-arrow-right"></i></div>`;
    }
    
    let cellClass = "path-cell";
    if (isMatch) cellClass += " path-match";
    if (idx === 0) cellClass += " path-start";
    else if (idx === state.backtrackingPath.length - 1 && state.phase === "trace") {
      cellClass += " path-trace";
    }
    
    html += `<div class="${cellClass}" title="(${i}, ${j})${isMatch ? ` - Match: ${char}` : ''}">
      ${isMatch ? `<i class="fas fa-check"></i> ${char}` : `${i},${j}`}
    </div>`;
    
    prevCell = cell;
  });
  
  els.backtrackingPath.innerHTML = html;
}

  function scrollToVisualization() {
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        const panels = document.querySelectorAll('.panel');
        const vizPanel = panels[1];
        if (vizPanel) {
          vizPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }
  }

  function initDp() {
    const a = (els.seqA.value || "").trim();
    const b = (els.seqB.value || "").trim();

    state.a = a;
    state.b = b;
    state.n = a.length;
    state.m = b.length;

    if (state.n === 0 || state.m === 0) {
      setExplanation("<i class='fas fa-exclamation-triangle'></i> One sequence is empty. LCS length is 0. Try entering both sequences!");
    } else if (state.n * state.m > 900 && state.algorithm === "standard") {
      setExplanation(
        "<i class='fas fa-exclamation-triangle'></i> Large table! Animation may be slower. Try rolling array optimization for better performance."
      );
    } else {
      setExplanation(`<i class='fas fa-check-circle'></i> Table initialized using ${state.algorithm} algorithm! Click 'Step' to see each comparison.`);
    }

    state.totalSteps = state.n * state.m + 1;
    state.currentStep = 0;
    state.backtrackingPath = [];
    updateStats();
    clearLcsDisplay();
    renderCharBoxes();
    updateCharHighlights();
    renderBacktrackingPath();

    if (state.algorithm === "standard") {
      state.dp = Array.from({ length: state.n + 1 }, () =>
        Array(state.m + 1).fill(0)
      );
      state.dir = Array.from({ length: state.n + 1 }, () =>
        Array(state.m + 1).fill(null)
      );
    } else if (state.algorithm === "rolling") {
      state.dp = [
        Array(state.m + 1).fill(0),
        Array(state.m + 1).fill(0)
      ];
      state.dir = Array.from({ length: state.n + 1 }, () =>
        Array(state.m + 1).fill(null)
      );
    }

    state.phase = "filling";
    state.i = 1;
    state.j = 1;
    state.lastFillI = null;
    state.lastFillJ = null;
    state.traceI = null;
    state.traceJ = null;
    state.lastTraceI = null;
    state.lastTraceJ = null;

    state.history = [];
    state.historyIndex = -1;
    
    saveState();

    renderDpTable();
    highlightCode(state.algorithm === "rolling" ? "init" : "outer");
    scrollToVisualization();
  }

  function renderDpTable() {
  const n = state.n;
  const m = state.m;
  const a = state.a;
  const b = state.b;
  const dp = state.dp;
  const dir = state.dir;

  if (state.algorithm === "rolling") {
    els.dpTableTitle.innerHTML = `<i class='fas fa-layer-group'></i> Rolling Array (row ${state.i > 0 ? state.i : 1} of ${n})`;
  } else {
    els.dpTableTitle.innerHTML = `<i class='fas fa-table'></i> DP Table dp[i][j]`;
  }

  let html = '<table class="dp-table"><thead><tr>';
  html += '<th class="corner header-cell">dp</th>';
  html += '<th class="header-cell">∅</th>';
  for (let j = 1; j <= m; j++) {
    const char = b[j - 1] || "";
    html += '<th class="header-cell">' + 
      '<span style="display: block; font-size: 12px;">' + escapeHtml(char) + '</span>' +
      '<small style="font-size: 9px; opacity: 0.6; line-height: 1;">[' + j + ']</small>' +
      '</th>';
  }
  html += "</tr></thead><tbody>";

  const rowsToShow = state.algorithm === "rolling" ? Math.min(state.i, 2) : n + 1;
  
  // Track match cells from backtracking path (for trace phase)
  const matchCells = new Set();
  if (state.backtrackingPath.length > 0) {
    state.backtrackingPath.forEach(cell => {
      const [i, j, isMatch] = cell;
      if (isMatch) {
        matchCells.add(`${i},${j}`);
      }
    });
  }
  
  for (let i = 0; i < rowsToShow; i++) {
    if (state.algorithm === "rolling" && i > 1) continue;
    
    html += "<tr>";
    const rowIndex = state.algorithm === "rolling" ? 
                    (i === 0 ? 0 : (i === 1 ? state.i - 1 : state.i)) : i;
    
    if (rowIndex === 0) {
      html += '<td class="header-col header-cell">∅</td>';
    } else {
      const displayChar = rowIndex <= n ? a[rowIndex - 1] : '';
      html +=
        '<td class="header-col header-cell">' + escapeHtml(displayChar || "") + 
        "<br><small style='font-size:9px;opacity:0.6;'>[" + rowIndex + "]</small></td>";
    }

    for (let j = 0; j <= m; j++) {
      const isBase = rowIndex === 0 || j === 0;
      
      // Check if characters match in sequences
      const isSequenceMatch = rowIndex > 0 && j > 0 &&
                             rowIndex <= n && j <= m &&
                             a[rowIndex - 1] === b[j - 1];
      
      // Check if this is the current cell being filled
      const isCurrentFill =
        state.phase === "filling" &&
        ((state.algorithm === "rolling" && state.lastFillI === state.i && state.lastFillJ === j) ||
         (state.algorithm !== "rolling" && state.lastFillI === i && state.lastFillJ === j));
      
      // Check if this cell is currently being traced
      const isTraceCell =
        (state.phase === "trace" || state.phase === "done") &&
        state.lastTraceI === i &&
        state.lastTraceJ === j;
      
      // Check if this cell is part of LCS (from backtracking path)
      const isLcsCell = matchCells.has(`${rowIndex},${j}`);
      
      // FIXED: Check if this cell was a match when it was computed (has diagonal arrow)
      const hasDiagonalArrow = !isBase && dir[rowIndex] && dir[rowIndex][j] === "diag";

      const classes = ["dp-cell"];
      if (isBase) classes.push("dp-cell-base");
      
      // Apply match highlighting for:
      // 1. Current match during filling phase (when characters match)
      // 2. Any cell that has a diagonal arrow (was a match when computed)
      // 3. All LCS cells during trace/done phase (permanent green)
      if ((state.phase === "filling" && isCurrentFill && isSequenceMatch) || 
          (state.phase === "filling" && hasDiagonalArrow) ||
          ((state.phase === "trace" || state.phase === "done") && isLcsCell)) {
        classes.push("dp-cell-match");
      }
      
      if (isCurrentFill) classes.push("dp-cell-current");
      if (isTraceCell) classes.push("dp-cell-trace");

      let arrow = "";
      if (!isBase && dir[rowIndex] && dir[rowIndex][j]) {
        const d = dir[rowIndex][j];
        if (d === "diag") arrow = "↖";
        else if (d === "up") arrow = "↑";
        else if (d === "left") arrow = "←";
      }

      let val = "";
      if (dp && dp[i]) {
        val = dp[i][j] !== undefined ? dp[i][j] : "";
      }
      const valClass = val === "" ? "dp-empty" : "";

      html += `<td class="${classes.join(" ")}">` +
        '<div class="dp-cell-inner">' +
        `<span class="dp-val ${valClass}">${val}</span>` +
        `<span class="dp-arrow">${arrow}</span>` +
        "</div></td>";
    }

    html += "</tr>";
  }

  if (state.algorithm === "rolling" && n > 2) {
    html += `<tr><td colspan="${m+2}" style="text-align: center; color: var(--text-muted); font-size: 9px; padding: 8px;">
      <i class="fas fa-ellipsis-h"></i> rolling array only stores current and previous rows
    </td></tr>`;
  }

  html += "</tbody></table>";
  els.dpTableContainer.innerHTML = html;
  
  setTimeout(() => {
    const tableContainer = els.dpTableContainer.parentElement;
    if (tableContainer) {
      tableContainer.style.minHeight = "200px";
    }
  }, 10);
}

  function stepFilling() {
    const n = state.n;
    const m = state.m;
    const a = state.a;
    const b = state.b;

    if (n === 0 || m === 0) {
      saveState();
      
      state.phase = "trace";
      state.traceI = n;
      state.traceJ = m;
      setExplanation("<i class='fas fa-info-circle'></i> Trivial case: at least one sequence is empty, so LCS length is 0.");
      highlightCode("trace");
      renderDpTable();
      updateCharHighlights();
      return;
    }

    if (state.i > n) {
      saveState();
      
      state.phase = "trace";
      state.traceI = n;
      state.traceJ = m;
      state.lastFillI = null;
      state.lastFillJ = null;
      
      if (state.algorithm === "standard") {
        buildBacktrackingPath();
      } else {
        state.phase = "done";
        const lcsLength = state.algorithm === "rolling" ? state.dp[1][m] : state.dp[Math.min(n, 10)][m];
        setExplanation(`<i class='fas fa-check-circle'></i> Algorithm complete! LCS length = ${lcsLength}. Rolling array doesn't store full backtracking information.`);
        highlightCode(state.algorithm === "rolling" ? "result" : "recurse");
        renderDpTable();
        updateCharHighlights();
        renderBacktrackingPath();
        return;
      }
      
      setExplanation(`<i class='fas fa-check-circle'></i> DP table filled! LCS length = ${state.dp[n][m]}. Now tracing back from (${n}, ${m}) to find one LCS...`);
      highlightCode("trace");
      renderDpTable();
      updateCharHighlights();
      renderBacktrackingPath();
      return;
    }

    saveState();

    const i = state.i;
    const j = state.j;

    const charA = a[i - 1];
    const charB = b[j - 1];

    state.currentStep++;
    let explain = "";

    if (state.algorithm === "rolling") {
      highlightCode("if");
      if (charA === charB) {
        const val = (state.dp[0] ? state.dp[0][j - 1] : 0) + 1;
        state.dp[1][j] = val;
        state.dir[i][j] = "diag";
        explain = `<i class="fas fa-check-circle" style="color: var(--match);"></i> <strong>MATCH!</strong> A[${i}]='${charA}', B[${j}]='${charB}'. curr[${j}] = prev[${j-1}] + 1 = ${val}.`;
      } else {
        const top = state.dp[0][j];
        const left = state.dp[1][j - 1];
        if (top >= left) {
          state.dp[1][j] = top;
          state.dir[i][j] = "up";
          explain = `<i class="fas fa-times-circle" style="color: var(--danger);"></i> <strong>Different:</strong> A[${i}]='${charA}', B[${j}]='${charB}'. curr[${j}] = max(prev[${j}]=${top}, curr[${j-1}]=${left}) = ${top}.`;
        } else {
          state.dp[1][j] = left;
          state.dir[i][j] = "left";
          explain = `<i class="fas fa-times-circle" style="color: var(--danger);"></i> <strong>Different:</strong> A[${i}]='${charA}', B[${j}]='${charB}'. curr[${j}] = max(prev[${j}]=${top}, curr[${j-1}]=${left}) = ${left}.`;
        }
      }
      
      if (state.dp.length <= i) {
        state.dp.push([...state.dp[1]]);
      } else {
        state.dp[i] = [...state.dp[1]];
      }
    } else {
      if (charA === charB) {
        highlightCode("match");
        const val = state.dp[i - 1][j - 1] + 1;
        state.dp[i][j] = val;
        state.dir[i][j] = "diag";
        explain = `<i class="fas fa-check-circle" style="color: var(--match);"></i> <strong>MATCH!</strong> A[${i}]='${charA}', B[${j}]='${charB}'. dp[${i}][${j}] = dp[${i-1}][${j-1}] + 1 = ${val}.`;
      } else {
        highlightCode("mismatch");
        const top = state.dp[i - 1][j];
        const left = state.dp[i][j - 1];
        if (top >= left) {
          state.dp[i][j] = top;
          state.dir[i][j] = "up";
          explain = `<i class="fas fa-times-circle" style="color: var(--danger);"></i> <strong>Different:</strong> A[${i}]='${charA}', B[${j}]='${charB}'. dp[${i}][${j}] = max(${top}, ${left}) = ${top}.`;
        } else {
          state.dp[i][j] = left;
          state.dir[i][j] = "left";
          explain = `<i class="fas fa-times-circle" style="color: var(--danger);"></i> <strong>Different:</strong> A[${i}]='${charA}', B[${j}]='${charB}'. dp[${i}][${j}] = max(${top}, ${left}) = ${left}.`;
        }
      }
    }

    state.lastFillI = i;
    state.lastFillJ = j;
    setExplanation(explain);
    updateStats();

    state.j++;
    if (state.j > m) {
      state.j = 1;
      
      if (state.algorithm === "rolling") {
        state.dp[0] = [...state.dp[1]];
        state.dp[1] = Array(m + 1).fill(0);
        highlightCode("swap");
      }
      
      state.i++;
      if (state.i <= n) {
        highlightCode(state.algorithm === "rolling" ? "forj" : "inner");
      }
    }

    renderDpTable();
    updateCharHighlights();
  }

  function buildBacktrackingPath() {
    state.backtrackingPath = [];
    let i = state.n;
    let j = state.m;
    
    while (i > 0 && j > 0) {
      const isMatch = state.dir[i][j] === "diag";
      state.backtrackingPath.unshift([i, j, isMatch]);
      
      if (state.dir[i][j] === "diag") {
        i--;
        j--;
      } else if (state.dir[i][j] === "up") {
        i--;
      } else {
        j--;
      }
    }
    
    if (i === 0 && j === 0) {
      state.backtrackingPath.unshift([0, 0, false]);
    }
  }

  function stepTraceback() {
    const n = state.n;
    const m = state.m;
    const a = state.a;

    if (state.traceI === null || state.traceJ === null) {
      state.traceI = n;
      state.traceJ = m;
    }

    const i = state.traceI;
    const j = state.traceJ;

    if (i <= 0 || j <= 0) {
      saveState();
      
      state.phase = "done";
      setExplanation(
        `<i class="fas fa-trophy" style="color: var(--trace);"></i> <strong>Traceback finished!</strong> Found LCS: "${state.lcsChars.join("")}" with length ${state.lcsChars.length}. The yellow path shows how we recovered it.`
      );
      highlightCode("trace");
      renderDpTable();
      updateCharHighlights();
      renderBacktrackingPath();
      return;
    }

    saveState();

    const direction = state.dir[i][j];
    const charA = a[i - 1];

    state.lastTraceI = i;
    state.lastTraceJ = j;

    const pathIndex = state.backtrackingPath.findIndex(cell => 
      cell[0] === i && cell[1] === j
    );
    if (pathIndex >= 0) {
      renderBacktrackingPath();
    }

    if (direction === "diag") {
      state.lcsChars.unshift(charA);
      setExplanation(
        `<i class="fas fa-map-marker-alt" style="color: var(--trace);"></i> Cell (${i}, ${j}) has diagonal arrow ↖. This means A[${i}]='${charA}' is part of the LCS! Moving to (${i - 1}, ${j - 1}).`
      );
      state.traceI = i - 1;
      state.traceJ = j - 1;
    } else if (direction === "up") {
      setExplanation(
        `<i class="fas fa-map-marker-alt" style="color: var(--trace);"></i> Cell (${i}, ${j}) has upward arrow ↑. Moving to (${i - 1}, ${j}). We skip A[${i}]='${charA}'.`
      );
      state.traceI = i - 1;
    } else if (direction === "left") {
      setExplanation(
        `<i class="fas fa-map-marker-alt" style="color: var(--trace);"></i> Cell (${i}, ${j}) has left arrow ←. Moving to (${i}, ${j - 1}).`
      );
      state.traceJ = j - 1;
    } else {
      state.traceI = i - 1;
      state.traceJ = j;
    }

    setLcsDisplay();
    highlightCode("trace");
    renderDpTable();
    updateCharHighlights();
  }

  function stepOnce() {
    if (state.phase === "idle") {
      const a = (els.seqA.value || "").trim();
      const b = (els.seqB.value || "").trim();
      
      if (a.length === 0 || b.length === 0) {
        setExplanation("<i class='fas fa-exclamation-triangle'></i> Please enter both sequences first!");
        return;
      }
      
      initDp();
      return;
    }

    if (state.phase === "filling") {
      stepFilling();
      return;
    }

    if (state.phase === "trace") {
      stepTraceback();
      return;
    }

    if (state.phase === "done") {
      setExplanation("<i class='fas fa-check-circle'></i> Algorithm complete! Click 'Reset' or change inputs to try again.");
    }
  }

  function stepBackward() {
    if (state.phase === "idle") return;
    
    stopAutoPlay();
    
    if (state.historyIndex <= 0) {
      if (state.currentStep > 0) {
        setExplanation("<i class='fas fa-info-circle'></i> Back to start");
        initDp();
      }
      return;
    }
    
    state.historyIndex--;
    const prevState = state.history[state.historyIndex];
    restoreState(prevState);
    
    updateStats();
    setLcsDisplay();
    renderDpTable();
    updateCharHighlights();
    renderBacktrackingPath();
    
    let explanation = `<i class='fas fa-step-backward'></i> <strong>Step back:</strong> `;
    if (state.phase === "filling") {
      explanation += `Now at cell (${state.i}, ${state.j})`;
    } else if (state.phase === "trace") {
      explanation += `Tracing at (${state.traceI}, ${state.traceJ})`;
    } else {
      explanation += `At step ${state.currentStep} of ${state.totalSteps}`;
    }
    setExplanation(explanation);
    
    if (state.phase === "filling") {
      highlightCode(state.algorithm === "rolling" ? "forj" : "inner");
    } else if (state.phase === "trace") {
      highlightCode("trace");
    }
  }

  function startAutoPlay() {
    if (state.playing) return;
    
    const currentA = (els.seqA.value || "").trim();
    const currentB = (els.seqB.value || "").trim();
    
    if (state.phase === "idle" || currentA !== state.a || currentB !== state.b) {
      state.a = currentA;
      state.b = currentB;
      state.n = currentA.length;
      state.m = currentB.length;
      
      if (state.n === 0 || state.m === 0) {
        setExplanation("<i class='fas fa-exclamation-triangle'></i> One sequence is empty. LCS length is 0. Try entering both sequences!");
        return;
      }
      
      initDp();
    }
    
    state.playing = true;
    
    if (state.intervalId) clearInterval(state.intervalId);
    state.intervalId = setInterval(() => {
      if (state.phase === "done") {
        stopAutoPlay();
        return;
      }
      stepOnce();
    }, state.speed);
    
    els.autoPlayBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
  }

  function stopAutoPlay() {
    state.playing = false;
    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
    
    els.autoPlayBtn.innerHTML = '<i class="fas fa-play"></i> Auto-Play';
  }

  function resetAll() {
    stopAutoPlay();
    
    state.history = [];
    state.historyIndex = -1;
    
    state.a = "";
    state.b = "";
    state.n = 0;
    state.m = 0;
    state.dp = [];
    state.dir = [];
    state.phase = "idle";
    state.i = 1;
    state.j = 1;
    state.lastFillI = null;
    state.lastFillJ = null;
    state.traceI = null;
    state.traceJ = null;
    state.lastTraceI = null;
    state.lastTraceJ = null;
    state.currentStep = 0;
    state.totalSteps = 0;
    state.backtrackingPath = [];
    state.rollingDP = null;
    clearLcsDisplay();
    updateStats();
    els.dpTableContainer.innerHTML = "";
    els.charsA.innerHTML = "";
    els.charsB.innerHTML = "";
    setExplanation("<i class='fas fa-info-circle'></i> Enter two sequences or select a preset. Use the step controls to visualize the algorithm.");
    highlightCode(null);
    updateCharHighlights();
    renderBacktrackingPath();
  }

  function initializePremiumSlider() {
    const slider = els.speedSlider;
    const thumb = document.getElementById('sliderThumb');
    const fill = document.getElementById('sliderFill');
    
    if (!slider || !thumb || !fill) return;
    
    slider.min = 50;
    slider.max = 2000;
    slider.value = 175;
    slider.step = 50;
    
    function updateSliderUI() {
      const value = parseInt(slider.value);
      const min = parseInt(slider.min);
      const max = parseInt(slider.max);
      
      const percentage = ((value - min) / (max - min)) * 100;
      
      thumb.style.transition = 'left 0.1s ease, transform 0.15s ease';
      thumb.style.left = `${percentage}%`;
      
      fill.style.width = `${percentage}%`;
      
      // Exponential mapping: left = slow (high ms), right = fast (low ms)
      // Use power curve so the fast zone (right) is less sensitive
      const t = (value - min) / (max - min); // 0 (left/slow) to 1 (right/fast)
      const curved = Math.pow(t, 2); // quadratic: gentle at right, steep at left
      state.speed = Math.round(max - curved * (max - min));
      updateSpeedLabel();
    }
    
    updateSliderUI();
    
    slider.addEventListener('input', function(e) {
      updateSliderUI();
      
      thumb.style.animation = 'none';
      setTimeout(() => {
        thumb.style.animation = 'thumbPulse 0.4s ease';
      }, 10);
      
      if (state.playing) {
        stopAutoPlay();
        startAutoPlay();
      }
    });
    
    let isDragging = false;
    
    thumb.addEventListener('mousedown', startDrag);
    thumb.addEventListener('touchstart', startDrag);
    
    function startDrag(e) {
      e.preventDefault();
      isDragging = true;
      thumb.classList.add('active');
      
      const sliderRect = slider.getBoundingClientRect();
      const sliderWidth = sliderRect.width;
      
      function moveHandler(clientX) {
        if (!isDragging) return;
        
        const x = Math.min(Math.max(clientX - sliderRect.left, 0), sliderWidth);
        const percentage = (x / sliderWidth) * 100;
        const min = parseInt(slider.min);
        const max = parseInt(slider.max);
        const step = parseInt(slider.step);
        
        let value = Math.round((percentage / 100) * (max - min)) + min;
        
        value = Math.round(value / step) * step;
        
        value = Math.max(min, Math.min(max, value));
        
        slider.value = value;
        updateSliderUI();
        
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      function onMouseMove(e) {
        moveHandler(e.clientX);
      }
      
      function onTouchMove(e) {
        if (e.touches.length > 0) {
          moveHandler(e.touches[0].clientX);
        }
      }
      
      function stopDrag() {
        isDragging = false;
        thumb.classList.remove('active');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', stopDrag);
      }
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', stopDrag);
      document.addEventListener('touchmove', onTouchMove);
      document.addEventListener('touchend', stopDrag);
    }
    
    slider.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        thumb.style.animation = 'thumbPulse 0.3s ease';
      }
    });
    
    function handleResize() {
      updateSliderUI();
    }
    
    window.addEventListener('resize', handleResize);
  }

  function attachEvents() {
    els.seqA.addEventListener("input", () => {
      updateStats();
    });
    
    els.seqB.addEventListener("input", () => {
      updateStats();
    });
    
    els.seqA.addEventListener("change", () => {
      if (state.playing) {
        stopAutoPlay();
      }
    });
    
    els.seqB.addEventListener("change", () => {
      if (state.playing) {
        stopAutoPlay();
      }
    });

    els.prevStepBtn.addEventListener("click", () => {
      stepBackward();
    });

    els.nextStepBtn.addEventListener("click", () => {
      stopAutoPlay();
      stepOnce();
    });

    els.autoPlayBtn.addEventListener("click", () => {
      if (state.playing) {
        stopAutoPlay();
      } else {
        startAutoPlay();
      }
    });

    els.themeToggle.addEventListener("click", toggleTheme);

    document.querySelectorAll(".algo-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        setAlgorithm(tab.dataset.algo);
      });
    });

    document.querySelectorAll(".chip[data-preset]").forEach((chip) => {
      chip.addEventListener("mouseover", (e) => {
        const preset = chip.getAttribute("data-preset");
        let tooltipText = "";
        
        if (preset === "classic") {
          tooltipText = "'ABCDEFG' vs 'ACDFGHPR'";
        } else if (preset === "match-heavy") {
          tooltipText = "'PROGRAM' vs 'PARAGRAM'";
        } else if (preset === "almost-equal") {
          tooltipText = "'BANANAS' vs 'ANANASBRA'";
        } else if (preset === "simple") {
          tooltipText = "'SUNDAYS' vs 'SATURDAY'";
        }
        
        const tooltip = document.createElement("div");
        tooltip.className = "preset-tooltip";
        tooltip.textContent = tooltipText;
        
        const rect = chip.getBoundingClientRect();
        let leftPosition = rect.left + (rect.width / 2) - 100;
        
        const viewportWidth = window.innerWidth;
        if (leftPosition + 200 > viewportWidth) {
          leftPosition = viewportWidth - 210;
        }
        if (leftPosition < 10) {
          leftPosition = 10;
        }
        
        tooltip.style.top = (rect.top - 40) + "px";
        tooltip.style.left = leftPosition + "px";
        
        document.body.appendChild(tooltip);
        
        chip._tooltip = tooltip;
      });
      
      chip.addEventListener("mouseout", () => {
        if (chip._tooltip) {
          chip._tooltip.remove();
          chip._tooltip = null;
        }
      });
      
      chip.addEventListener("click", () => {
        const preset = chip.getAttribute("data-preset");
        if (preset === "classic") {
          els.seqA.value = "ABCDEFG";
          els.seqB.value = "ACDFGHPR";
        } else if (preset === "match-heavy") {
          els.seqA.value = "PROGRAM";
          els.seqB.value = "PARAGRAM";
        } else if (preset === "almost-equal") {
          els.seqA.value = "BANANAS";
          els.seqB.value = "ANANASBRA";
        } else if (preset === "simple") {
          els.seqA.value = "SUNDAYS";
          els.seqB.value = "SATURDAY";
        }
        stopAutoPlay();
        updateStats();
        initDp();
      });
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      
      switch(e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          stepOnce();
          break;
        case 'r':
        case 'R':
          if (e.ctrlKey) {
            e.preventDefault();
            resetAll();
          }
          break;
        case 'i':
        case 'I':
          if (e.ctrlKey) {
            e.preventDefault();
            initDp();
          }
          break;
        case 'p':
        case 'P':
          if (e.ctrlKey) {
            e.preventDefault();
            if (state.playing) {
              stopAutoPlay();
            } else {
              startAutoPlay();
            }
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          stepBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          stepOnce();
          break;
      }
    });
  }

  function initDefaultValues() {
    els.seqA.value = "ABCDEFG";
    els.seqB.value = "ACDFGHPR";
    state.speed = 175;
    updateStats();
    updateSpeedLabel();
    renderPseudocode();
    
    initDp();
  }

  function init() {
    cacheElements();
    loadTheme();
    attachEvents();
    initializePremiumSlider();
    initDefaultValues();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();