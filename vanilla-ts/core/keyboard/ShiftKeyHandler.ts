// src/core/keyboard/ShiftKeyHandler.ts

import { BaseKeyboardHandler } from "./BaseKeyboardHandler.js";
import { Selection } from "../../models/Selection.js";

/**
 * Handles Shift key combinations for extending selections (without Ctrl)
 */
export class ShiftKeyHandler extends BaseKeyboardHandler {
    canHandle(event: KeyboardEvent): boolean {
        const modifiers = this.hasModifierKeys(event);
        return modifiers.shift && !modifiers.ctrl && !modifiers.alt;
    }

    handle(event: KeyboardEvent, selection: Selection): boolean {
        if (!this.canHandle(event) || !selection.isActive) {
            return false;
        }

        return this.handleShiftKeys(event, selection);
    }

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
