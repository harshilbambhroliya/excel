// src/core/keyboard/ShiftKeyHandler.ts

import { BaseKeyboardHandler } from "./BaseKeyboardHandler.js";
import { Selection } from "../../models/Selection.js";

/**
 * Handles Shift key combinations for extending selections (without Ctrl)
 */
export class ShiftKeyHandler extends BaseKeyboardHandler {
    /**
     * Create a new ShiftKeyHandler
     * @param context - The keyboard context providing access to the grid and commands
     */
    canHandle(event: KeyboardEvent): boolean {
        const modifiers = this.hasModifierKeys(event);
        return modifiers.shift && !modifiers.ctrl && !modifiers.alt;
    }
    /**
     * Handle the keyboard event for Shift key combinations
     * @param event - The keyboard event to handle
     * @param selection - The current selection in the grid
     * @returns true if the event was handled, false otherwise
     */
    handle(event: KeyboardEvent, selection: Selection): boolean {
        if (!this.canHandle(event) || !selection.isActive) {
            return false;
        }

        return this.handleShiftKeys(event, selection);
    }
    /**
     * Handle Shift key combinations for extending selections
     * @param event - The keyboard event to handle
     * @param selection - The current selection in the grid
     * @returns true if the event was handled, false otherwise
     */
    private handleShiftKeys(
        event: KeyboardEvent,
        selection: Selection
    ): boolean {
        switch (event.key) {
            case "Tab":
                this.preventDefault(event);
                const newCol = Math.max(0, selection.startCol - 1);
                this.context.handleSelectionAfterKeyDown(
                    selection,
                    selection.startRow,
                    newCol
                );
                return true;
            case "ArrowUp":
                this.preventDefault(event);
                selection.extend(
                    Math.max(0, selection.endRow - 1),
                    selection.endCol
                );
                this.updateSelectionAfterExtend(
                    selection,
                    selection.endRow,
                    selection.endCol
                );
                return true;
            case "ArrowDown":
                this.preventDefault(event);
                selection.extend(
                    Math.min(
                        this.context.grid.getMaxRows() - 1,
                        selection.endRow + 1
                    ),
                    selection.endCol
                );
                this.updateSelectionAfterExtend(
                    selection,
                    selection.endRow,
                    selection.endCol
                );
                return true;
            case "ArrowLeft":
                this.preventDefault(event);
                selection.extend(
                    selection.endRow,
                    Math.max(0, selection.endCol - 1)
                );
                this.updateSelectionAfterExtend(
                    selection,
                    selection.endRow,
                    selection.endCol
                );
                return true;
            case "ArrowRight":
                this.preventDefault(event);
                selection.extend(
                    selection.endRow,
                    Math.min(
                        this.context.grid.getMaxCols() - 1,
                        selection.endCol + 1
                    )
                );
                this.updateSelectionAfterExtend(
                    selection,
                    selection.endRow,
                    selection.endCol
                );
                return true;
            case "Home":
                this.preventDefault(event);
                selection.extend(selection.endRow, 0);
                this.updateSelectionAfterExtend(selection, selection.endRow, 0);
                return true;
            case "End":
                this.preventDefault(event);
                const lastUsedCol = this.context.findLastUsedColumn(
                    selection.endRow
                );
                selection.extend(selection.endRow, lastUsedCol);
                this.updateSelectionAfterExtend(
                    selection,
                    selection.endRow,
                    lastUsedCol
                );
                return true;
        }

        return false;
    }
    /**
     * Update the selection and UI after extending the selection
     * @param selection - The current selection in the grid
     * @param row - The row to which the selection was extended
     * @param col - The column to which the selection was extended
     */
    private updateSelectionAfterExtend(
        selection: Selection,
        row: number,
        col: number
    ): void {
        this.context.grid.clearHeaderSelections();
        this.context.highlightHeadersForSelection();
        this.context.ensureCellVisible(row, col);
        this.context.renderer.render();
        this.context.updateSelectionStats();
    }
}
