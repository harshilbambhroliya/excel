// src/core/keyboard/CtrlShiftSelectionHandler.ts

import { BaseKeyboardHandler } from "./BaseKeyboardHandler.js";
import { Selection } from "../../models/Selection.js";

/**
 * Handles Ctrl+Shift key combinations for extending selections to data edges
 * Note: This should only handle combinations that are NOT used for row/column insertion
 */
export class CtrlShiftSelectionHandler extends BaseKeyboardHandler {
    /**
     * Create a new CtrlShiftSelectionHandler
     * @param context - The keyboard context providing access to the grid and commands
     */
    canHandle(event: KeyboardEvent): boolean {
        const modifiers = this.hasModifierKeys(event);
        return (
            modifiers.ctrl &&
            modifiers.shift &&
            this.isSelectionExtensionKey(event.key)
        );
    }

    /**
     * Check if the key is one of the selection extension keys
     * @param key - The key pressed
     * @returns true if the key is a selection extension key, false otherwise
     */
    private isSelectionExtensionKey(key: string): boolean {
        return ["Home", "End"].indexOf(key) !== -1;
    }

    /**
     * Handle the keyboard event for extending selections to data edges
     * @param event - The keyboard event to handle
     * @param selection - The current selection in the grid
     * @returns true if the event was handled, false otherwise
     */
    handle(event: KeyboardEvent, selection: Selection): boolean {
        if (!this.canHandle(event) || !selection.isActive) {
            return false;
        }

        const currentRow = selection.endRow;
        const currentCol = selection.endCol;

        switch (event.key) {
            case "Home":
                this.preventDefault(event);
                selection.extend(currentRow, 0);
                this.updateSelectionAfterExtend(selection, currentRow, 0);
                return true;
            case "End":
                this.preventDefault(event);
                const lastCol = this.context.findLastUsedColumn(currentRow);
                selection.extend(currentRow, lastCol);
                this.updateSelectionAfterExtend(selection, currentRow, lastCol);
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
