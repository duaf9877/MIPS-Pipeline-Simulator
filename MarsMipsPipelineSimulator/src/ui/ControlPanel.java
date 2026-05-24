package ui;

import javax.swing.*;
import java.awt.*;

public class ControlPanel extends JPanel {

    public ControlPanel(PipelinePanel pipelinePanel) {

        setBackground(new Color(25,25,25));

        JButton startBtn = createButton("START");
        JButton pauseBtn = createButton("PAUSE");
        JButton resetBtn = createButton("RESET");
        JButton stepBtn = createButton("STEP");

        // START

        startBtn.addActionListener(e -> {

            pipelinePanel
                    .getClock()
                    .start();
        });

        // PAUSE

        pauseBtn.addActionListener(e -> {

            pipelinePanel
                    .getClock()
                    .stop();
        });

        // STEP

        stepBtn.addActionListener(e -> {

            pipelinePanel
                    .getEngine()
                    .nextCycle();

            pipelinePanel.repaint();
        });

        // RESET

        resetBtn.addActionListener(e -> {

            pipelinePanel
                    .getClock()
                    .stop();

            pipelinePanel
                    .getEngine()
                    .reset();

            pipelinePanel.repaint();
        });

        add(startBtn);
        add(pauseBtn);
        add(resetBtn);
        add(stepBtn);
    }

    private JButton createButton(String text) {

        JButton btn = new JButton(text);

        btn.setFocusPainted(false);

        btn.setFont(
                new Font(
                        "Consolas",
                        Font.BOLD,
                        18
                )
        );

        btn.setBackground(
                new Color(52,152,219)
        );

        btn.setForeground(Color.WHITE);

        btn.setPreferredSize(
                new Dimension(120,45)
        );

        return btn;
    }
}