package simulation;

public class HazardDetector {

    private boolean hazardDetected;

    public HazardDetector() {

        hazardDetected = false;
    }

    public boolean checkHazard(
            Instruction current,
            Instruction previous) {

        if(current == null || previous == null) {

            hazardDetected = false;

            return false;
        }

        if(previous.getDestination() != null) {

            if(previous.getDestination()
                    .equals(current.getSource1())
                    ||
                    previous.getDestination()
                            .equals(current.getSource2())) {

                if(previous.getCurrentStage() < 3) {

                    hazardDetected = true;

                    return true;
                }
            }
        }

        hazardDetected = false;

        return false;
    }

    public boolean isHazardDetected() {

        return hazardDetected;
    }
}