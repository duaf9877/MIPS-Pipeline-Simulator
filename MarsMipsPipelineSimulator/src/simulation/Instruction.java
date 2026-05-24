package simulation;

import java.awt.*;

public class Instruction {

    private String fullInstruction;

    private String opcode;

    private String destination;

    private String source1;

    private String source2;

    private Color color;

    private int currentStage;

    private boolean active;

    private boolean completed;

    public Instruction(String instructionText,
                       Color color) {

        this.fullInstruction = instructionText;

        this.color = color;

        parseInstruction();

        currentStage = -1;

        active = false;

        completed = false;
    }

    private void parseInstruction() {

        String cleaned =
                fullInstruction.replace(",", " ");

        String[] parts =
                cleaned.split("\\s+");

        opcode = parts[0].toUpperCase();

        if(parts.length > 1)
            destination = parts[1];

        if(parts.length > 2)
            source1 = parts[2];

        if(parts.length > 3)
            source2 = parts[3];
    }

    public String getOpcode() {
        return opcode;
    }

    public String getDestination() {
        return destination;
    }

    public String getSource1() {
        return source1;
    }

    public String getSource2() {
        return source2;
    }

    public String getFullInstruction() {
        return fullInstruction;
    }

    public Color getColor() {
        return color;
    }

    public int getCurrentStage() {
        return currentStage;
    }

    public boolean isActive() {
        return active;
    }

    public boolean isCompleted() {
        return completed;
    }

    public void activate() {

        active = true;

        currentStage = 0;
    }

    public void moveNextStage() {

        if(active && !completed) {

            currentStage++;

            if(currentStage > 4) {

                completed = true;
            }
        }
    }
}