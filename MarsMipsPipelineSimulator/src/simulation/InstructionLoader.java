package simulation;

import javax.swing.*;
import java.io.*;
import java.util.ArrayList;

public class InstructionLoader {

    public ArrayList<String> loadProgram() {

        ArrayList<String> lines =
                new ArrayList<>();

        JFileChooser chooser =
                new JFileChooser();

        chooser.setDialogTitle(
                "Select MARS ASM File"
        );

        int result =
                chooser.showOpenDialog(null);

        if(result ==
                JFileChooser.APPROVE_OPTION) {

            File file =
                    chooser.getSelectedFile();

            try {

                BufferedReader reader =
                        new BufferedReader(
                                new FileReader(file)
                        );

                String line;

                while((line = reader.readLine())
                        != null) {

                    line = line.trim();

                    // IGNORE EMPTY LINES

                    if(line.isEmpty()) {
                        continue;
                    }

                    // IGNORE COMMENTS

                    if(line.startsWith("#")) {
                        continue;
                    }

                    // IGNORE LABELS

                    if(line.endsWith(":")) {
                        continue;
                    }

                    lines.add(line);
                }

                reader.close();
            }

            catch(Exception e) {

                e.printStackTrace();
            }
        }

        return lines;
    }
}