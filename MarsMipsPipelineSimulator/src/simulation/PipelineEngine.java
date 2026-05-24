package simulation;

import java.awt.*;
import java.util.ArrayList;

public class PipelineEngine {

    private ArrayList<Instruction> instructions;

    private int cycle;

    private int nextInstructionIndex;

    private HazardDetector hazardDetector;

    private boolean stalled;

    private boolean forwardingEnabled;

    private boolean forwardingActive;

    private boolean hazardHandled;

    private int hazardCount;

    private int forwardingCount;

    private int stallCycles;

    private String[][] matrix;

    private int completedInstructions;

    private double cpi;

    private String forwardingPath;

    private String[] registers;

    public PipelineEngine() {

        instructions = new ArrayList<>();

        cycle = 0;

        nextInstructionIndex = 0;

        hazardDetector = new HazardDetector();

        stalled = false;

        forwardingEnabled = true;

        forwardingActive = false;

        hazardHandled = false;

        hazardCount = 0;

        forwardingCount = 0;

        stallCycles = 0;

        completedInstructions = 0;

        cpi = 0;

        forwardingPath = "MEM -> EX";

        // FIXED MATRIX SIZE

        matrix = new String[200][5];

        registers = new String[10];

        initializeRegisters();

        loadInstructions();
    }

    private void initializeRegisters() {

        for(int i=0; i<10; i++) {

            registers[i] =
                    "R" + i + " = " + (i * 10);
        }
    }

    private void loadInstructions() {

        InstructionLoader loader =
                new InstructionLoader();

        ArrayList<String> program =
                loader.loadProgram();

        Color[] colors = {

                new Color(46,204,113),
                new Color(231,76,60),
                new Color(52,152,219),
                new Color(155,89,182),
                new Color(241,196,15),
                new Color(26,188,156)
        };

        int colorIndex = 0;

        for(String line : program) {

            instructions.add(

                    new Instruction(
                            line,
                            colors[colorIndex %
                                    colors.length]
                    )
            );

            colorIndex++;
        }
    }

    public void nextCycle() {

        cycle++;

        stalled = false;

        forwardingActive = false;

        if(stallCycles > 0) {

            stallCycles--;

            return;
        }

        if(!hazardHandled
                && nextInstructionIndex >= 2) {

            Instruction previous =
                    instructions.get(
                            nextInstructionIndex - 2
                    );

            Instruction current =
                    instructions.get(
                            nextInstructionIndex - 1
                    );

            if(hazardDetector.checkHazard(
                    current,
                    previous)) {

                if(forwardingEnabled) {

                    forwardingActive = true;

                    forwardingCount++;

                    forwardingPath =
                            previous.getCurrentStage() >= 3
                                    ? "WB -> EX"
                                    : "MEM -> EX";

                    hazardHandled = true;
                }

                else {

                    stalled = true;

                    hazardCount++;

                    stallCycles = 1;

                    hazardHandled = true;

                    return;
                }
            }
        }

        for(Instruction instruction :
                instructions) {

            if(instruction.isActive()
                    && !instruction.isCompleted()) {

                instruction.moveNextStage();
            }

            if(instruction.isCompleted()) {

                completedInstructions++;
            }
        }

        if(nextInstructionIndex <
                instructions.size()) {

            instructions
                    .get(nextInstructionIndex)
                    .activate();

            nextInstructionIndex++;
        }

        updateMatrix();

        calculateCPI();
    }

    private void calculateCPI() {

        if(completedInstructions > 0) {

            cpi =
                    (double) cycle /
                            completedInstructions;
        }
    }

    private void updateMatrix() {

        for(Instruction instruction :
                instructions) {

            int stage =
                    instruction.getCurrentStage();

            // FIXED MATRIX LIMIT

            if(stage >= 0
                    && stage < 5
                    && cycle-1 < 200) {

                matrix[cycle-1][stage] =
                        instruction.getOpcode();
            }
        }
    }

    public boolean isFinished() {

        for(Instruction instruction :
                instructions) {

            if(!instruction.isCompleted()) {

                return false;
            }
        }

        return true;
    }

    public void reset() {

        instructions.clear();

        cycle = 0;

        nextInstructionIndex = 0;

        stalled = false;

        forwardingActive = false;

        hazardHandled = false;

        hazardCount = 0;

        forwardingCount = 0;

        stallCycles = 0;

        completedInstructions = 0;

        cpi = 0;

        // FIXED MATRIX SIZE

        matrix = new String[200][5];

        initializeRegisters();

        loadInstructions();
    }

    public ArrayList<Instruction> getInstructions() {
        return instructions;
    }

    public int getCycle() {
        return cycle;
    }

    public boolean isStalled() {
        return stalled;
    }

    public int getHazardCount() {
        return hazardCount;
    }

    public boolean isForwardingActive() {
        return forwardingActive;
    }

    public int getForwardingCount() {
        return forwardingCount;
    }

    public boolean isForwardingEnabled() {
        return forwardingEnabled;
    }

    public void toggleForwarding() {

        forwardingEnabled =
                !forwardingEnabled;
    }

    public String[][] getMatrix() {
        return matrix;
    }

    public double getCPI() {
        return cpi;
    }

    public String getForwardingPath() {
        return forwardingPath;
    }

    public String[] getRegisters() {
        return registers;
    }
}