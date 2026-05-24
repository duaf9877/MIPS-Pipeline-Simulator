import { useState, useEffect, useRef, useCallback } from "react";

const STAGE_COLORS = {
  IF:  { bg: "#0d2a4a", border: "#1a6bbd", text: "#4db8ff", glow: "#1a6bbd" },
  ID:  { bg: "#2a0d4a", border: "#8b1abd", text: "#c84dff", glow: "#8b1abd" },
  EX:  { bg: "#2a1a0d", border: "#bd6a1a", text: "#ff9f4d", glow: "#bd6a1a" },
  MEM: { bg: "#0d2a15", border: "#1abd4a", text: "#4dff80", glow: "#1abd4a" },
  WB:  { bg: "#2a0d0d", border: "#bd1a1a", text: "#ff4d4d", glow: "#bd1a1a" },
};

const SAMPLE_PROGRAMS = {
  basic: `LW R1, 0(R2)\nADD R3, R1, R4\nSUB R5, R3, R6\nAND R7, R5, R8\nOR R9, R7, R10`,
  hazards: `LW R1, 0(R2)\nADD R3, R1, R4\nLW R5, 4(R2)\nSUB R6, R5, R3\nMUL R7, R6, R1`,
  branches: `ADD R1, R2, R3\nBEQ R1, R0, skip\nLW R4, 0(R1)\nADD R5, R4, R3\nSUB R6, R5, R2`,
  forwarding: `ADD R1, R2, R3\nSUB R4, R1, R5\nAND R6, R4, R7\nOR R8, R6, R9\nADD R10, R8, R1`,
};

function parseInstruction(line) {
  line = line.trim();
  if (!line || line.startsWith("#")) return null;
  const parts = line.replace(/,/g, " ").split(/\s+/);
  const op = parts[0].toUpperCase();
  const isLoad = op === "LW" || op === "SW";
  const isBranch = op === "BEQ" || op === "BNE" || op === "J";
  const isRType = ["ADD","SUB","AND","OR","MUL","XOR","SLL","SRL"].includes(op);
  
  let rd = null, rs = null, rt = null;
  if (isLoad) {
    rd = parts[1]; 
    const match = parts[2]?.match(/(\d+)\((\w+)\)/);
    rs = match ? match[2] : parts[3];
  } else if (isBranch) {
    rs = parts[1]; rt = parts[2];
  } else if (isRType) {
    rd = parts[1]; rs = parts[2]; rt = parts[3];
  } else {
    rd = parts[1]; rs = parts[2]; rt = parts[3];
  }

  return {
    id: Math.random().toString(36).slice(2),
    raw: line,
    op,
    rd, rs, rt,
    isLoad, isBranch, isRType,
    type: isLoad ? "load" : isBranch ? "branch" : "rtype",
  };
}

function detectHazard(instr, pipeline, forwardingEnabled) {
  const stages = ["EX","MEM","WB"];
  for (const stageKey of stages) {
    const prev = pipeline[stageKey];
    if (!prev) continue;
    const writes = prev.rd;
    if (!writes) continue;
    const readsFrom = [instr.rs, instr.rt].filter(Boolean);
    if (readsFrom.includes(writes)) {
      if (forwardingEnabled) {
        return { type: "forwarding", from: stageKey, severity: "warn" };
      }
      return { type: "stall", from: stageKey, severity: "error" };
    }
  }
  if (instr.isBranch) return { type: "branch", severity: "warn" };
  return null;
}

export default function MipsPipelineSimulator() {
  const [code, setCode] = useState(SAMPLE_PROGRAMS.hazards);
  const [instructions, setInstructions] = useState([]);
  const [cycleTable, setCycleTable] = useState([]);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [pipeline, setPipeline] = useState({ IF: null, ID: null, EX: null, MEM: null, WB: null });
  const [hazards, setHazards] = useState([]);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const [forwardingEnabled, setForwardingEnabled] = useState(true);
  const [stats, setStats] = useState({ cycles: 0, instructions: 0, stalls: 0, forwards: 0, cpi: 0, throughput: 0 });
  const [completedCount, setCompletedCount] = useState(0);
  const [registers, setRegisters] = useState(() => {
    const r = {};
    for (let i = 0; i <= 31; i++) r[`R${i}`] = Math.floor(Math.random() * 256);
    r.R0 = 0;
    return r;
  });
  const [flashStages, setFlashStages] = useState({});
  const [particles, setParticles] = useState([]);
  const [activeTab, setActiveTab] = useState("pipeline");
  const [cpiHistory, setCpiHistory] = useState([]);
  const [error, setError] = useState("");
  const timerRef = useRef(null);
  const queueRef = useRef([]);
  const stageQueueRef = useRef({ IF: null, ID: null, EX: null, MEM: null, WB: null });
  const statsRef = useRef({ cycles: 0, instructions: 0, stalls: 0, forwards: 0 });
  const completedRef = useRef(0);
  const tableRef = useRef([]);

  const compile = useCallback(() => {
    const lines = code.split("\n");
    const parsed = lines.map(parseInstruction).filter(Boolean);
    if (parsed.length === 0) { setError("No valid instructions found."); return; }
    setError("");
    setInstructions(parsed);
    queueRef.current = [...parsed];
    stageQueueRef.current = { IF: null, ID: null, EX: null, MEM: null, WB: null };
    setPipeline({ IF: null, ID: null, EX: null, MEM: null, WB: null });
    setCurrentCycle(0);
    setCycleTable([]);
    tableRef.current = [];
    statsRef.current = { cycles: 0, instructions: 0, stalls: 0, forwards: 0 };
    completedRef.current = 0;
    setCompletedCount(0);
    setHazards([]);
    setFlashStages({});
    setStats({ cycles: 0, instructions: 0, stalls: 0, forwards: 0, cpi: 0, throughput: 0 });
    setCpiHistory([]);
    return parsed;
  }, [code]);

  const addParticle = useCallback((stage) => {
    const id = Math.random().toString(36).slice(2);
    setParticles(p => [...p.slice(-20), { id, stage, born: Date.now() }]);
    setTimeout(() => setParticles(p => p.filter(x => x.id !== id)), 1200);
  }, []);

  const step = useCallback(() => {
    const cur = stageQueueRef.current;
    const queue = queueRef.current;
    const newStages = { ...cur };
    const newHazards = [];
    let stalled = false;

    if (cur.ID) {
      const h = detectHazard(cur.ID, cur, forwardingEnabled);
      if (h && h.type === "stall") {
        stalled = true;
        statsRef.current.stalls++;
        newHazards.push({ stage: "ID", ...h });
        setFlashStages(f => ({ ...f, ID: "error", [h.from]: "error" }));
        setTimeout(() => setFlashStages(f => { const n = { ...f }; delete n.ID; delete n[h.from]; return n; }), 500);
      } else if (h && h.type === "forwarding") {
        statsRef.current.forwards++;
        newHazards.push({ stage: "ID", ...h });
        setFlashStages(f => ({ ...f, [h.from]: "warn", ID: "warn" }));
        setTimeout(() => setFlashStages(f => { const n = { ...f }; delete n.ID; delete n[h.from]; return n; }), 500);
      } else if (h && h.type === "branch") {
        newHazards.push({ stage: "IF", type: "branch", severity: "warn" });
      }
    }

    if (!stalled) {
      if (cur.WB) {
        completedRef.current++;
        setCompletedCount(completedRef.current);
        if (cur.WB.rd) {
          const val = Math.floor(Math.random() * 256);
          setRegisters(r => ({ ...r, [cur.WB.rd]: val }));
        }
        addParticle("WB");
      }
      newStages.WB = cur.MEM;
      newStages.MEM = cur.EX;
      newStages.EX = cur.ID;
      newStages.ID = cur.IF;
      newStages.IF = queue.length > 0 ? queue.shift() : null;
    } else {
      newStages.WB = cur.MEM;
      newStages.MEM = cur.EX;
      newStages.EX = null;
      newStages.ID = cur.ID;
    }

    stageQueueRef.current = newStages;
    statsRef.current.cycles++;
    if (completedRef.current > 0) statsRef.current.instructions = completedRef.current;

    const cpi = statsRef.current.cycles / Math.max(1, completedRef.current);
    const tput = completedRef.current / Math.max(1, statsRef.current.cycles);
    const newStats = { ...statsRef.current, cpi: parseFloat(cpi.toFixed(2)), throughput: parseFloat(tput.toFixed(2)) };
    setStats(newStats);
    setCpiHistory(h => [...h.slice(-29), { cycle: statsRef.current.cycles, cpi: parseFloat(cpi.toFixed(2)) }]);

    setPipeline({ ...newStages });
    setHazards(newHazards);
    setCurrentCycle(statsRef.current.cycles);

    const snapshot = {};
    Object.entries(newStages).forEach(([k, v]) => { if (v) snapshot[k] = v.raw; });
    tableRef.current = [...tableRef.current, { cycle: statsRef.current.cycles, stages: snapshot }];
    setCycleTable([...tableRef.current]);

    ["IF","ID","EX","MEM","WB"].forEach(s => { if (newStages[s]) addParticle(s); });

    const allDone = !newStages.IF && !newStages.ID && !newStages.EX && !newStages.MEM && !newStages.WB && queue.length === 0;
    if (allDone) {
      setRunning(false);
      clearInterval(timerRef.current);
    }
  }, [forwardingEnabled, addParticle]);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(step, speed);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [running, speed, step]);

  const handleStart = () => {
    const parsed = compile();
    if (!parsed || parsed.length === 0) return;
    setTimeout(() => setRunning(true), 100);
  };

  const handleReset = () => {
    setRunning(false);
    clearInterval(timerRef.current);
    compile();
  };

  const stageOrder = ["IF", "ID", "EX", "MEM", "WB"];
  const stageLabels = { IF: "Instruction Fetch", ID: "Instruction Decode", EX: "Execute", MEM: "Memory Access", WB: "Write Back" };

  const getForwardArrow = () => {
    const fwdHazard = hazards.find(h => h.type === "forwarding");
    if (!fwdHazard) return null;
    const fromIdx = stageOrder.indexOf(fwdHazard.from);
    const toIdx = stageOrder.indexOf("ID");
    if (fromIdx < 0 || toIdx < 0) return null;
    return { from: fromIdx, to: toIdx };
  };

  const fwdArrow = getForwardArrow();

  const miniChart = () => {
    if (cpiHistory.length < 2) return null;
    const w = 260, h = 80;
    const maxCpi = Math.max(...cpiHistory.map(d => d.cpi), 2);
    const pts = cpiHistory.map((d, i) => {
      const x = (i / (cpiHistory.length - 1)) * w;
      const y = h - (d.cpi / maxCpi) * h;
      return `${x},${y}`;
    }).join(" ");
    return (
      <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
        <polyline points={pts} fill="none" stroke="#4dff80" strokeWidth="2" />
        {cpiHistory.slice(-1).map((d, i) => (
          <circle key={i} cx={(cpiHistory.length - 1) / (cpiHistory.length - 1) * w} cy={h - (d.cpi / maxCpi) * h} r="4" fill="#4dff80" />
        ))}
        <text x="0" y={h - 2} fill="#4dff80" fontSize="10" opacity="0.5">1.0</text>
        <text x="0" y="10" fill="#4dff80" fontSize="10" opacity="0.5">{maxCpi.toFixed(1)}</text>
      </svg>
    );
  };

  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh", fontFamily: "'Courier New', monospace", color: "#e0e0e0", padding: "0" }}>
      <h2 className="sr-only">MIPS Pipeline Simulator — Interactive processor visualization</h2>

      {/* Header */}
      <div style={{ background: "linear-gradient(90deg, #0d1a2a 0%, #1a0d2a 100%)", borderBottom: "1px solid #1a3a5a", padding: "12px 20px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 32, height: 32, background: "#0d2a4a", border: "1px solid #1a6bbd", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#4db8ff", fontSize: 16 }}>⬡</span>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: "bold", color: "#4db8ff", letterSpacing: 2 }}>MIPS PIPELINE SIMULATOR</div>
            <div style={{ fontSize: 10, color: "#4a6a8a", letterSpacing: 1 }}>5-STAGE PROCESSOR VISUALIZATION</div>
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ background: "#0d2a15", border: "1px solid #1abd4a", borderRadius: 4, padding: "4px 12px", fontSize: 12, color: "#4dff80" }}>
            CYCLE: {currentCycle}
          </div>
          <div style={{ background: "#0d2a4a", border: "1px solid #1a6bbd", borderRadius: 4, padding: "4px 12px", fontSize: 12, color: "#4db8ff" }}>
            CPI: {stats.cpi.toFixed(2)}
          </div>
          <div style={{ background: "#2a0d2a", border: "1px solid #8b1abd", borderRadius: 4, padding: "4px 12px", fontSize: 12, color: "#c84dff" }}>
            DONE: {completedCount}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 0, height: "calc(100vh - 57px)" }}>
        {/* Left Panel */}
        <div style={{ borderRight: "1px solid #1a2a3a", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Editor */}
          <div style={{ padding: "12px", borderBottom: "1px solid #1a2a3a" }}>
            <div style={{ fontSize: 10, color: "#4a6a8a", letterSpacing: 2, marginBottom: 6 }}>ASSEMBLY EDITOR</div>
            <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
              {Object.entries(SAMPLE_PROGRAMS).map(([key, val]) => (
                <button key={key} onClick={() => { setCode(val); }}
                  style={{ background: "#0d1a2a", border: "1px solid #1a3a5a", borderRadius: 3, padding: "2px 8px", fontSize: 10, color: "#4a8abd", cursor: "pointer" }}>
                  {key}
                </button>
              ))}
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 0, top: 0, padding: "8px 0", width: 24, userSelect: "none" }}>
                {code.split("\n").map((_, i) => (
                  <div key={i} style={{ fontSize: 10, color: "#2a4a6a", textAlign: "right", paddingRight: 4, lineHeight: "18px" }}>{i + 1}</div>
                ))}
              </div>
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                style={{ width: "100%", background: "#050510", border: "1px solid #1a2a3a", borderRadius: 4, padding: "8px 8px 8px 28px", color: "#e0e0e0", fontSize: 12, fontFamily: "monospace", resize: "vertical", minHeight: 120, boxSizing: "border-box", lineHeight: "18px" }}
              />
            </div>
            {error && <div style={{ color: "#ff4d4d", fontSize: 11, marginTop: 4 }}>{error}</div>}
          </div>

          {/* Controls */}
          <div style={{ padding: "12px", borderBottom: "1px solid #1a2a3a" }}>
            <div style={{ fontSize: 10, color: "#4a6a8a", letterSpacing: 2, marginBottom: 8 }}>CONTROLS</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              <button onClick={handleStart} disabled={running}
                style={{ flex: 1, background: running ? "#0d1a2a" : "#0d2a15", border: `1px solid ${running ? "#1a2a3a" : "#1abd4a"}`, borderRadius: 4, padding: "6px 12px", color: running ? "#2a4a2a" : "#4dff80", cursor: running ? "not-allowed" : "pointer", fontSize: 12, fontFamily: "monospace" }}>
                ▶ RUN
              </button>
              <button onClick={() => { setRunning(false); step(); }} disabled={running}
                style={{ flex: 1, background: "#0d1a2a", border: "1px solid #1a3a5a", borderRadius: 4, padding: "6px 12px", color: "#4db8ff", cursor: "pointer", fontSize: 12, fontFamily: "monospace" }}>
                ⏭ STEP
              </button>
              <button onClick={() => setRunning(false)}
                style={{ flex: 1, background: "#2a0d0d", border: "1px solid #bd1a1a", borderRadius: 4, padding: "6px 12px", color: "#ff4d4d", cursor: "pointer", fontSize: 12, fontFamily: "monospace" }}>
                ⏹ STOP
              </button>
              <button onClick={handleReset}
                style={{ flex: 1, background: "#0d1a0d", border: "1px solid #1a5a1a", borderRadius: 4, padding: "6px 12px", color: "#4daa4d", cursor: "pointer", fontSize: 12, fontFamily: "monospace" }}>
                ↺ RESET
              </button>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "#4a6a8a" }}>SPEED</span>
                <span style={{ fontSize: 11, color: "#4db8ff" }}>{(1000 / speed).toFixed(1)} Hz</span>
              </div>
              <input type="range" min="100" max="2000" step="100" value={speed}
                onChange={e => setSpeed(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#4db8ff" }} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={forwardingEnabled} onChange={e => setForwardingEnabled(e.target.checked)}
                style={{ accentColor: "#4dff80" }} />
              <span style={{ fontSize: 11, color: forwardingEnabled ? "#4dff80" : "#4a6a8a" }}>
                {forwardingEnabled ? "⚡ FORWARDING ON" : "⚡ FORWARDING OFF"}
              </span>
            </label>
          </div>

          {/* Register File */}
          <div style={{ padding: "12px", flex: 1, overflow: "auto" }}>
            <div style={{ fontSize: 10, color: "#4a6a8a", letterSpacing: 2, marginBottom: 8 }}>REGISTER FILE (R0–R15)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
              {Object.entries(registers).filter((_, i) => i < 16).map(([reg, val]) => (
                <div key={reg} style={{ background: "#050510", border: "1px solid #1a2a3a", borderRadius: 3, padding: "3px 6px", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, color: "#4a6a8a" }}>{reg}</span>
                  <span style={{ fontSize: 10, color: "#c84dff", fontFamily: "monospace" }}>0x{val.toString(16).padStart(2, "0").toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Tabs */}
          <div style={{ borderBottom: "1px solid #1a2a3a", display: "flex", gap: 0 }}>
            {["pipeline", "table", "stats"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ background: activeTab === tab ? "#0d1a2a" : "transparent", border: "none", borderBottom: activeTab === tab ? "2px solid #4db8ff" : "2px solid transparent", padding: "10px 20px", color: activeTab === tab ? "#4db8ff" : "#4a6a8a", cursor: "pointer", fontSize: 11, letterSpacing: 2, fontFamily: "monospace" }}>
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          {activeTab === "pipeline" && (
            <div style={{ flex: 1, overflow: "auto", padding: "24px 20px" }}>
              {/* Pipeline Visualization */}
              <div style={{ position: "relative", marginBottom: 24 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "stretch", justifyContent: "center" }}>
                  {stageOrder.map((stage, i) => {
                    const c = STAGE_COLORS[stage];
                    const instr = pipeline[stage];
                    const isFlashError = flashStages[stage] === "error";
                    const isFlashWarn = flashStages[stage] === "warn";
                    const flashColor = isFlashError ? "#ff4d4d" : isFlashWarn ? "#ffaa00" : null;
                    const hasHazard = hazards.some(h => h.stage === stage || h.from === stage);

                    return (
                      <div key={stage} style={{ position: "relative" }}>
                        {/* Arrow between stages */}
                        {i < 4 && (
                          <div style={{ position: "absolute", right: -18, top: "50%", transform: "translateY(-50%)", zIndex: 10, color: "#1a3a5a", fontSize: 20, pointerEvents: "none" }}>
                            →
                          </div>
                        )}
                        <div style={{
                          width: 110,
                          minHeight: 120,
                          background: flashColor ? `${c.bg}cc` : c.bg,
                          border: `2px solid ${flashColor || c.border}`,
                          borderRadius: 8,
                          padding: "12px 8px",
                          textAlign: "center",
                          transition: "border-color 0.2s, box-shadow 0.2s",
                          boxShadow: flashColor ? `0 0 20px ${flashColor}60` : instr ? `0 0 12px ${c.glow}40` : "none",
                          position: "relative",
                          overflow: "hidden",
                        }}>
                          {/* Stage particles */}
                          {particles.filter(p => p.stage === stage).map(p => (
                            <div key={p.id} style={{
                              position: "absolute", width: 4, height: 4, borderRadius: "50%",
                              background: c.border, top: "50%", left: "50%",
                              animation: "particle 1.2s ease-out forwards",
                              pointerEvents: "none",
                            }} />
                          ))}

                          <div style={{ fontSize: 18, fontWeight: "bold", color: c.text, letterSpacing: 2, marginBottom: 4 }}>{stage}</div>
                          <div style={{ fontSize: 9, color: "#4a6a8a", marginBottom: 10, letterSpacing: 1 }}>{stageLabels[stage].split(" ").map(w => w[0]).join("")}</div>

                          <div style={{
                            minHeight: 40,
                            background: instr ? "#05050f" : "#030308",
                            border: `1px solid ${instr ? c.border : "#1a2a3a"}`,
                            borderRadius: 4,
                            padding: "6px 4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}>
                            {instr ? (
                              <div>
                                <div style={{ fontSize: 11, color: c.text, fontFamily: "monospace", fontWeight: "bold" }}>{instr.op}</div>
                                <div style={{ fontSize: 9, color: "#6a8aaa", fontFamily: "monospace" }}>
                                  {[instr.rd, instr.rs, instr.rt].filter(Boolean).join(",")}
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontSize: 9, color: "#1a3a5a" }}>—</div>
                            )}
                          </div>

                          {hasHazard && (
                            <div style={{ marginTop: 6, fontSize: 9, color: flashColor || "#ffaa00", animation: "blink 0.5s ease infinite" }}>
                              {hazards.find(h => h.stage === stage || h.from === stage)?.type === "forwarding" ? "⚡ FWD" : "⚠ HAZ"}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Forwarding arrow visualization */}
                {fwdArrow && (
                  <div style={{ textAlign: "center", marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: "#4dff80", fontFamily: "monospace" }}>
                      ⚡ FORWARDING: {stageOrder[fwdArrow.from]} → {stageOrder[fwdArrow.to]}
                    </div>
                  </div>
                )}
              </div>

              {/* Live instruction queue */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: "#4a6a8a", letterSpacing: 2, marginBottom: 8 }}>INSTRUCTION QUEUE</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {queueRef.current.slice(0, 8).map((instr, i) => (
                    <div key={instr.id} style={{
                      background: "#050510", border: "1px solid #1a2a3a", borderRadius: 4,
                      padding: "4px 10px", fontSize: 11, color: i === 0 ? "#4db8ff" : "#4a6a8a",
                      fontFamily: "monospace", borderLeft: i === 0 ? "2px solid #4db8ff" : undefined
                    }}>
                      {instr.op} {[instr.rd, instr.rs, instr.rt].filter(Boolean).join(",")}
                    </div>
                  ))}
                  {queueRef.current.length === 0 && <div style={{ fontSize: 11, color: "#1a3a5a" }}>Queue empty</div>}
                </div>
              </div>

              {/* Hazard log */}
              {hazards.length > 0 && (
                <div style={{ background: "#0d0505", border: "1px solid #5a1a1a", borderRadius: 6, padding: "10px 14px" }}>
                  <div style={{ fontSize: 10, color: "#ff4d4d", letterSpacing: 2, marginBottom: 6 }}>HAZARD DETECTED</div>
                  {hazards.map((h, i) => (
                    <div key={i} style={{ fontSize: 11, color: h.severity === "error" ? "#ff6060" : "#ffaa44", fontFamily: "monospace" }}>
                      {h.type === "stall" && `⚠ DATA HAZARD (${h.stage} ← ${h.from}): STALL INSERTED`}
                      {h.type === "forwarding" && `⚡ DATA HAZARD (${h.stage} ← ${h.from}): FORWARDED`}
                      {h.type === "branch" && `⚠ CONTROL HAZARD: BRANCH AT ${h.stage}`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "table" && (
            <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
              <div style={{ fontSize: 10, color: "#4a6a8a", letterSpacing: 2, marginBottom: 12 }}>PIPELINE EXECUTION TABLE</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", fontSize: 11, fontFamily: "monospace", minWidth: 500 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1a3a5a" }}>
                      <th style={{ padding: "6px 12px", color: "#4a6a8a", textAlign: "left", whiteSpace: "nowrap" }}>CYCLE</th>
                      {stageOrder.map(s => (
                        <th key={s} style={{ padding: "6px 12px", color: STAGE_COLORS[s].text, textAlign: "left", whiteSpace: "nowrap" }}>{s}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cycleTable.slice(-20).map(row => (
                      <tr key={row.cycle} style={{ borderBottom: "1px solid #0d1a2a" }}>
                        <td style={{ padding: "4px 12px", color: "#4db8ff" }}>{row.cycle}</td>
                        {stageOrder.map(s => (
                          <td key={s} style={{ padding: "4px 12px", color: row.stages[s] ? STAGE_COLORS[s].text : "#1a3a5a" }}>
                            {row.stages[s] ? row.stages[s].split(" ")[0] : "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {cycleTable.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: "20px 12px", color: "#1a3a5a", textAlign: "center" }}>Run simulation to see table</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "stats" && (
            <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
              <div style={{ fontSize: 10, color: "#4a6a8a", letterSpacing: 2, marginBottom: 16 }}>PERFORMANCE ANALYTICS</div>

              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "TOTAL CYCLES", value: stats.cycles, color: "#4db8ff" },
                  { label: "INSTRUCTIONS DONE", value: completedCount, color: "#c84dff" },
                  { label: "CPI", value: stats.cpi.toFixed(2), color: "#4dff80" },
                  { label: "THROUGHPUT", value: stats.throughput.toFixed(2), color: "#ff9f4d" },
                  { label: "STALLS", value: stats.stalls, color: "#ff4d4d" },
                  { label: "FORWARDS", value: stats.forwards, color: "#4dff80" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: "#050510", border: "1px solid #1a2a3a", borderRadius: 6, padding: "12px" }}>
                    <div style={{ fontSize: 9, color: "#4a6a8a", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 22, fontWeight: "bold", color, fontFamily: "monospace" }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Efficiency bar */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: "#4a6a8a", letterSpacing: 1 }}>PIPELINE EFFICIENCY</span>
                  <span style={{ fontSize: 10, color: "#4dff80" }}>{stats.cycles > 0 ? Math.round((completedCount / stats.cycles) * 100) : 0}%</span>
                </div>
                <div style={{ background: "#0d1a0d", height: 8, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ background: "#1abd4a", height: "100%", width: `${stats.cycles > 0 ? Math.min(100, (completedCount / stats.cycles) * 100) : 0}%`, transition: "width 0.3s", borderRadius: 4 }} />
                </div>
              </div>

              {/* Stall breakdown */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: "#4a6a8a", letterSpacing: 1 }}>STALL RATIO</span>
                  <span style={{ fontSize: 10, color: "#ff4d4d" }}>{stats.cycles > 0 ? ((stats.stalls / stats.cycles) * 100).toFixed(1) : 0}%</span>
                </div>
                <div style={{ background: "#1a0d0d", height: 8, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ background: "#bd1a1a", height: "100%", width: `${stats.cycles > 0 ? Math.min(100, (stats.stalls / stats.cycles) * 100) : 0}%`, transition: "width 0.3s", borderRadius: 4 }} />
                </div>
              </div>

              {/* CPI History chart */}
              <div>
                <div style={{ fontSize: 10, color: "#4a6a8a", letterSpacing: 2, marginBottom: 8 }}>CPI HISTORY</div>
                <div style={{ background: "#050510", border: "1px solid #1a2a3a", borderRadius: 6, padding: "12px" }}>
                  {cpiHistory.length >= 2 ? miniChart() : (
                    <div style={{ color: "#1a3a5a", fontSize: 11, textAlign: "center", padding: "20px 0" }}>Run simulation to see CPI chart</div>
                  )}
                </div>
              </div>

              {/* Instruction breakdown */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 10, color: "#4a6a8a", letterSpacing: 2, marginBottom: 8 }}>INSTRUCTION BREAKDOWN</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {(() => {
                    const types = { rtype: 0, load: 0, branch: 0 };
                    instructions.forEach(i => { if (i.type in types) types[i.type]++; });
                    const total = instructions.length || 1;
                    return [
                      { label: "R-TYPE", count: types.rtype, color: "#4db8ff" },
                      { label: "LOAD/STORE", count: types.load, color: "#c84dff" },
                      { label: "BRANCH", count: types.branch, color: "#ff9f4d" },
                    ].map(({ label, count, color }) => (
                      <div key={label} style={{ background: "#050510", border: "1px solid #1a2a3a", borderRadius: 4, padding: "8px" }}>
                        <div style={{ fontSize: 9, color: "#4a6a8a" }}>{label}</div>
                        <div style={{ fontSize: 16, color, fontWeight: "bold" }}>{count}</div>
                        <div style={{ fontSize: 9, color: color + "80" }}>{Math.round((count / total) * 100)}%</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes particle {
          0% { transform: translate(0,0); opacity: 1; }
          100% { transform: translate(${Math.random() > 0.5 ? "" : "-"}${20 + Math.random() * 30}px, ${Math.random() > 0.5 ? "" : "-"}${20 + Math.random() * 30}px); opacity: 0; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        textarea:focus { outline: 1px solid #1a6bbd; }
        input[type=range] { cursor: pointer; }
        button:hover { filter: brightness(1.2); }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #050510; }
        ::-webkit-scrollbar-thumb { background: #1a3a5a; border-radius: 2px; }
      `}</style>
    </div>
  );
}
