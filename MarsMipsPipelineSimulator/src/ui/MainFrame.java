package ui;

import javax.swing.*;
import java.awt.*;

public class MainFrame extends JFrame {

    public MainFrame() {

        setTitle("Interactive Pipeline Performance Controller");

        setSize(1400, 800);

        setLocationRelativeTo(null);

        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);

        setLayout(new BorderLayout());

        // MAIN BACKGROUND

        getContentPane().setBackground(
                new Color(18,18,18)
        );

        // TOP PANEL

        JPanel topPanel = new JPanel();

        topPanel.setBackground(
                new Color(30,30,30)
        );

        topPanel.setPreferredSize(
                new Dimension(1400,70)
        );

        JLabel title = new JLabel(
                "MIPS PIPELINE SIMULATOR"
        );

        title.setForeground(Color.WHITE);

        title.setFont(
                new Font(
                        "Consolas",
                        Font.BOLD,
                        28
                )
        );

        topPanel.add(title);

        // PIPELINE PANEL

        PipelinePanel pipelinePanel =
                new PipelinePanel();

        // CONTROL PANEL

        ControlPanel controlPanel =
                new ControlPanel(
                        pipelinePanel
                );

        // ADD COMPONENTS

        add(topPanel, BorderLayout.NORTH);

        JScrollPane scrollPane =
        new JScrollPane(pipelinePanel);

scrollPane.setVerticalScrollBarPolicy(
        JScrollPane.VERTICAL_SCROLLBAR_ALWAYS
);

scrollPane.setHorizontalScrollBarPolicy(
        JScrollPane.HORIZONTAL_SCROLLBAR_AS_NEEDED
);

scrollPane.getVerticalScrollBar()
        .setUnitIncrement(16);

scrollPane.setBorder(null);

add(scrollPane, BorderLayout.CENTER);

        add(controlPanel, BorderLayout.SOUTH);

        setVisible(true);
    }
}