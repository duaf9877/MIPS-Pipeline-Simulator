package ui;

import simulation.*;

import javax.swing.*;
import java.awt.*;

public class PipelinePanel extends JPanel {

    private PipelineEngine engine;

    private ClockManager clock;

    private int[] stageX = {80,330,580,830,1080};

    private String[] stageNames = {
            "IF","ID","EX","MEM","WB"
    };

    public PipelinePanel() {

        setBackground(new Color(18,18,18));

        // IMPORTANT FOR SCROLLING

        setPreferredSize(
                new Dimension(1600,4000)
        );

        engine = new PipelineEngine();

        clock = new ClockManager(() -> {

            engine.nextCycle();

            repaint();

            if(engine.isFinished()) {

                clock.stop();
            }
        });
    }

    public PipelineEngine getEngine() {
        return engine;
    }

    public ClockManager getClock() {
        return clock;
    }

    @Override
    protected void paintComponent(Graphics g) {

        super.paintComponent(g);

        Graphics2D g2 = (Graphics2D) g;

        g2.setRenderingHint(
                RenderingHints.KEY_ANTIALIASING,
                RenderingHints.VALUE_ANTIALIAS_ON
        );

        GradientPaint gradient =
                new GradientPaint(
                        0,0,
                        new Color(10,10,10),
                        0,getHeight(),
                        new Color(25,25,25)
                );

        g2.setPaint(gradient);

        g2.fillRect(
                0,
                0,
                getWidth(),
                getHeight()
        );

        drawPipeline(g2);

        drawInstructions(g2);

        drawCycleCounter(g2);

        drawHazardWarning(g2);

        drawBubble(g2);

        drawForwarding(g2);

        drawPipelineMatrix(g2);
    }

    private void drawPipeline(Graphics2D g2) {

        Color[] colors = {
                new Color(52,152,219),
                new Color(155,89,182),
                new Color(230,126,34),
                new Color(46,204,113),
                new Color(231,76,60)
        };

        for(int i=0; i<5; i++) {

            drawStage(
                    g2,
                    stageNames[i],
                    stageX[i],
                    250,
                    colors[i]
            );

            if(i < 4) {

                drawArrow(
                        g2,
                        stageX[i] + 150,
                        300,
                        stageX[i+1],
                        300
                );
            }
        }
    }

    private void drawInstructions(Graphics2D g2) {

        int y = 150;

        for(Instruction instruction :
                engine.getInstructions()) {

            if(!instruction.isActive()) {
                continue;
            }

            int stage =
                    instruction.getCurrentStage();

            if(stage > 4) {
                continue;
            }

            int x = stageX[stage] + 10;

            // GLOW EFFECT

            g2.setColor(new Color(
                    instruction.getColor().getRed(),
                    instruction.getColor().getGreen(),
                    instruction.getColor().getBlue(),
                    80
            ));

            g2.fillRoundRect(
                    x - 5,
                    y - 5,
                    130,
                    50,
                    25,
                    25
            );

            // MAIN BLOCK

            g2.setColor(
                    instruction.getColor()
            );

            g2.fillRoundRect(
                    x,
                    y,
                    120,
                    40,
                    20,
                    20
            );

            // TEXT

            g2.setColor(Color.WHITE);

            g2.setFont(
                    new Font(
                            "Consolas",
                            Font.BOLD,
                            12
                    )
            );

            g2.drawString(
                    instruction.getOpcode(),
                    x + 10,
                    y + 25
            );

            y += 85;
        }
    }

    private void drawCycleCounter(Graphics2D g2) {

        g2.setColor(Color.WHITE);

        g2.setFont(
                new Font(
                        "Consolas",
                        Font.BOLD,
                        28
                )
        );

        g2.drawString(
                "CLOCK CYCLE : " +
                        engine.getCycle(),
                40,
                60
        );

        g2.drawString(
                "HAZARDS : " +
                        engine.getHazardCount(),
                40,
                100
        );

        g2.drawString(
                "FORWARDING : " +
                        engine.getForwardingCount(),
                40,
                140
        );

        g2.drawString(
                String.format(
                        "CPI : %.2f",
                        engine.getCPI()
                ),
                40,
                180
        );
    }

    private void drawStage(Graphics2D g2,
                           String text,
                           int x,
                           int y,
                           Color color) {

        // OUTER GLOW

        g2.setColor(new Color(
                color.getRed(),
                color.getGreen(),
                color.getBlue(),
                80
        ));

        g2.fillRoundRect(
                x - 8,
                y - 8,
                166,
                116,
                40,
                40
        );

        // MAIN STAGE BOX

        g2.setColor(color);

        g2.fillRoundRect(
                x,
                y,
                150,
                100,
                30,
                30
        );

        // TEXT

        g2.setColor(Color.WHITE);

        g2.setFont(
                new Font(
                        "Consolas",
                        Font.BOLD,
                        28
                )
        );

        FontMetrics fm = g2.getFontMetrics();

        int textWidth =
                fm.stringWidth(text);

        g2.drawString(
                text,
                x + (150 - textWidth)/2,
                y + 58
        );
    }

    private void drawArrow(Graphics2D g2,
                           int x1,
                           int y1,
                           int x2,
                           int y2) {

        g2.setColor(Color.WHITE);

        g2.setStroke(
                new BasicStroke(4)
        );

        g2.drawLine(x1,y1,x2,y2);

        g2.fillPolygon(
                new int[]{
                        x2,
                        x2-12,
                        x2-12
                },
                new int[]{
                        y2,
                        y2-8,
                        y2+8
                },
                3
        );
    }

    private void drawHazardWarning(Graphics2D g2) {

        // FORWARDING MESSAGE

        if(engine.isForwardingActive()) {

            g2.setColor(
                    new Color(0,180,90,220)
            );

            g2.fillRoundRect(
                    430,
                    80,
                    520,
                    60,
                    20,
                    20
            );

            g2.setColor(Color.WHITE);

            g2.setFont(
                    new Font(
                            "Consolas",
                            Font.BOLD,
                            22
                    )
            );

            g2.drawString(
                    "HAZARD RESOLVED USING FORWARDING",
                    455,
                    118
            );
        }

        // STALL MESSAGE

        else if(engine.isStalled()) {

            g2.setColor(
                    new Color(255,0,0,180)
            );

            g2.fillRoundRect(
                    500,
                    80,
                    350,
                    60,
                    20,
                    20
            );

            g2.setColor(Color.WHITE);

            g2.setFont(
                    new Font(
                            "Consolas",
                            Font.BOLD,
                            24
                    )
            );

            g2.drawString(
                    "DATA HAZARD DETECTED!",
                    520,
                    118
            );
        }
    }

    private void drawBubble(Graphics2D g2) {

        if(engine.isStalled()) {

            g2.setColor(Color.WHITE);

            g2.fillOval(
                    540,
                    200,
                    50,
                    50
            );

            g2.setColor(Color.BLACK);

            g2.setFont(
                    new Font(
                            "Consolas",
                            Font.BOLD,
                            14
                    )
            );

            g2.drawString(
                    "STALL",
                    548,
                    228
            );
        }
    }

    private void drawForwarding(Graphics2D g2) {

        if(engine.isForwardingActive()) {

            // GLOW

            g2.setColor(
                    new Color(0,255,120,80)
            );

            g2.setStroke(
                    new BasicStroke(14)
            );

            g2.drawLine(
                    1030,
                    220,
                    760,
                    180
            );

            // MAIN LINE

            g2.setColor(
                    new Color(0,255,120)
            );

            g2.setStroke(
                    new BasicStroke(8)
            );

            g2.drawLine(
                    1030,
                    220,
                    760,
                    180
            );

            // ARROW HEAD

            g2.fillPolygon(
                    new int[]{
                            760,
                            775,
                            775
                    },
                    new int[]{
                            180,
                            170,
                            190
                    },
                    3
            );

            // LABEL

            g2.setFont(
                    new Font(
                            "Consolas",
                            Font.BOLD,
                            20
                    )
            );

            g2.drawString(
                    engine.getForwardingPath(),
                    780,
                    150
            );
        }
    }

    private void drawPipelineMatrix(Graphics2D g2) {

        String[][] matrix =
                engine.getMatrix();

        int startX = 50;

        int startY = 520;

        int cellWidth = 120;

        int cellHeight = 40;

        g2.setFont(
                new Font(
                        "Consolas",
                        Font.BOLD,
                        14
                )
        );

        // TITLE

        g2.setColor(Color.WHITE);

        g2.drawString(
                "PIPELINE EXECUTION MATRIX",
                startX,
                startY - 60
        );

        // HEADERS

        String[] headers = {
                "IF",
                "ID",
                "EX",
                "MEM",
                "WB"
        };

        for(int col=0; col<5; col++) {

            int x = startX + col * cellWidth;

            g2.setColor(
                    new Color(70,70,70)
            );

            g2.fillRect(
                    x,
                    startY - 40,
                    cellWidth,
                    cellHeight
            );

            g2.setColor(Color.WHITE);

            g2.drawRect(
                    x,
                    startY - 40,
                    cellWidth,
                    cellHeight
            );

            g2.drawString(
                    headers[col],
                    x + 45,
                    startY - 15
            );
        }

        // MATRIX BODY

        for(int row=0;
            row < matrix.length;
            row++) {

            for(int col=0; col<5; col++) {

                int x = startX + col * cellWidth;

                int y =
                        startY + row * cellHeight;

                g2.setColor(
                        new Color(40,40,40)
                );

                g2.fillRect(
                        x,
                        y,
                        cellWidth,
                        cellHeight
                );

                g2.setColor(Color.WHITE);

                g2.drawRect(
                        x,
                        y,
                        cellWidth,
                        cellHeight
                );

                if(matrix[row][col] != null) {

                    g2.drawString(
                            matrix[row][col],
                            x + 40,
                            y + 25
                    );
                }
            }
        }
    }
}