package simulation;

import javax.swing.*;

public class ClockManager {

    private Timer timer;

    public ClockManager(Runnable task) {

        timer = new Timer(700, e -> {
            task.run();
        });
    }

    public void start() {

        timer.start();
    }

    public void stop() {

        timer.stop();
    }

    public boolean isRunning() {

        return timer.isRunning();
    }
}