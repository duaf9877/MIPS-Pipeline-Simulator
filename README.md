MIPS Pipeline Simulator
An interactive, animated educational tool for visualizing how a 5-stage MIPS processor pipeline executes instructions in real time — with hazard detection, data forwarding, and live performance analytics.
Built with MARS + Java as a university semester project.
Features
Pipeline Engine

Full 5-stage simulation: IF → ID → EX → MEM → WB
Real data hazard detection (RAW hazards, load-use hazards)
Control hazard detection on branch instructions
Stall bubble insertion when forwarding is disabled
Data forwarding unit — toggle on/off to compare behavior

Visualizations

Neon cyberpunk dark theme with per-stage color coding
Live stage flash animations on hazard detection
Particle effects on instruction writeback
Forwarding arrows shown dynamically between stages
Animated instruction movement through the pipeline

Assembly Editor

Write your own MIPS assembly directly in the browser
4 built-in sample programs: basic, hazards, branches, forwarding
Line numbering and syntax-aware display
Comments supported with #

Supported instructions:
TypeInstructionsR-TypeADD, SUB, AND, OR, MUL, XOR, SLL, SRLLoad/StoreLW, SWBranchBEQ, BNE, J
Three View Tabs
Pipeline Tab — live stage visualization, instruction queue, hazard log
Table Tab — cycle-by-cycle execution table showing which instruction is in which stage each clock cycle
Stats Tab — real-time performance dashboard including:

CPI (Cycles Per Instruction)
Throughput
Stall ratio with progress bar
Pipeline efficiency percentage
Live CPI history chart
Instruction type breakdown (R-Type / Load-Store / Branch)

Register File

Displays R0–R15 with live hex values
Registers update on writeback


Pipeline Stages
StageNameColorIFInstruction FetchBlueIDInstruction DecodePurpleEXExecuteOrangeMEMMemory AccessGreenWBWrite BackRed

Hazard Detection Logic
LW  R1, 0(R2)     # writes R1 in MEM stage
ADD R3, R1, R4    # reads R1 in ID stage → DATA HAZARD
Without forwarding: stall bubble inserted, pipeline paused
With forwarding: result sent directly from MEM → EX stage, no stall

Performance Formulas
CPI        = Total Clock Cycles / Instructions Completed

mips-pipeline-simulator/
│
├── MipsPipelineSimulator.jsx   # Main application (all-in-one)
│
├── README.md                   # This file
│
└── (optional Java version)
    ├── src/
    │   ├── simulation/
    │   │   ├── PipelineEngine.java
    │   │   ├── Instruction.java
    │   │   ├── HazardDetector.java
    │   │   └── ForwardingUnit.java
    │   ├── ui/
    │   │   ├── MainFrame.java
    │   │   ├── PipelinePanel.java
    │   │   └── StatsPanel.java
    │   └── utils/
    │       ├── Constants.java
    │       └── InstructionParser.java
    └── README.md
Throughput = Instructions Completed / Total Clock Cycles
Efficiency = (Instructions / Cycles) × 100%
