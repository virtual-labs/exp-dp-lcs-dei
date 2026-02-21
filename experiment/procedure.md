## Step 1: Access the Simulation

1. Navigate to the simulation page from the main experiment interface
2. The simulation loads with default example sequences "AGGTAB" and "GXTXAYB"

## Step 2: Input Sequences

1. **Enter Sequence A** in the first input field (e.g., "ABCDGH")
2. **Enter Sequence B** in the second input field (e.g., "AEDFHR")
3. Alternatively, use preset buttons for quick examples:
   - **Classic**: "AGGTAB" vs "GXTXAYB"
   - **Match-heavy**: "ABCDGH" vs "AEDFHR"
   - **Almost equal**: "ABCDEF" vs "ABDFEF"
   - **Simple**: "ABC" vs "AC"

## Step 3: Select Algorithm

Choose one of three algorithms to visualize:

1. **Standard DP** (O(n²) space): Shows complete DP table with backtracking
2. **Rolling Array** (O(n) space): Uses only two rows, space-efficient
3. **Hirschberg** (O(n) space): Divide-and-conquer approach

## Step 4: Initialize the DP Table

1. Click the **Initialize** button (or press Ctrl+I)
2. Observe:
   - Character boxes appear for both sequences
   - Empty DP table structure is prepared
   - Statistics update with sequence lengths

## Step 5: Step Through Execution

1. Click **Step** (or press Space/Enter) to execute one step
2. Observe in each step:
   - **Character Comparison**: Two characters are highlighted and compared
   - **DP Table Update**: Corresponding cell in DP table updates
   - **Explanation**: Step-by-step explanation appears in the left panel

## Step 6: Auto-play Mode

1. Click **Play** to run algorithm automatically
2. Adjust speed using the slider (20ms to 1.5s per step)
3. Click **Pause** to stop auto-play

## Step 7: Trace Backtracking

1. After DP table is filled, algorithm automatically switches to trace mode
2. Watch the backtracking path highlight in yellow
3. Observe how LCS is reconstructed character by character

## Step 8: Reset and Experiment

1. Click **Reset** to start over with new sequences
2. Try different sequence combinations
3. Compare different algorithms on the same sequences

## Keyboard Shortcuts

- **Space/Enter**: Step forward
- **Ctrl+P**: Toggle Play/Pause
- **Ctrl+I**: Initialize
- **Ctrl+R**: Reset