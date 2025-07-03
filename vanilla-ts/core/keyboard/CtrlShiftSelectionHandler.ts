// src/core/keyboard/CtrlShiftSelectionHandler.ts

import { BaseKeyboardHandler } from "./BaseKeyboardHandler.js";
import { Selection } from "../../models/Selection.js";

/**
 * Handles Ctrl+Shift key combinations for extending selections to data edges
 * Note: This should only handle combinations that are NOT used for row/column insertion
 */
export class CtrlShiftSelectionHandler extends BaseKeyboardHandler {
    canHandle(event: KeyboardEvent): boolean {
        const modifiers = this.hasModifierKeys(event);
        return (
            modifiers.ctrl &&
            modifiers.shift &&
            this.isSelectionExtensionKey(event.key)
        );
    }

    private isSelectionExtensionKey(key: string): boolean {
        // These are Ctrl+Shift combinations used for selection extension
        // Row/column insertion shortcuts are handled by CtrlShiftKeyHandler
        return ["Home", "End"].indexOf(key) !== -1;
    }

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
