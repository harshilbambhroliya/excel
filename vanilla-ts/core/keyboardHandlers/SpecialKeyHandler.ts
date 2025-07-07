// src/core/keyboard/SpecialKeyHandler.ts

import { BaseKeyboardHandler } from "./BaseKeyboardHandler.js";
import { Selection } from "../../models/Selection.js";

/**
 * Handles special keys (Enter, Tab, Delete, Backspace, Escape)
 */
export class SpecialKeyHandler extends BaseKeyboardHandler {
    private readonly SPECIAL_KEYS = [
        "Enter",
        "Tab",
        "Delete",
        "Backspace",
        "Escape",
    ];
    /**
     * Create a new SpecialKeyHandler
     * @param context - The keyboard context providing access to the grid and commands
     */
    canHandle(event: KeyboardEvent): boolean {
        const modifiers = this.hasModifierKeys(event);
        return (
            this.SPECIAL_KEYS.indexOf(event.key) !== -1 &&
            !modifiers.ctrl &&
            !modifiers.alt
        );
    }
    /**
     * Handle the keyboard event for special keys
     * @param event - The keyboard event to handle
     * @param selection - The current selection in the grid
     * @returns true if the event was handled, false otherwise
     */
    handle(event: KeyboardEvent, selection: Selection): boolean {
        if (!this.canHandle(event)) {
            return false;
        }

        switch (event.key) {
            case "Enter":
                return this.handleEnter(event, selection);
            case "Tab":
                return this.handleTab(event, selection);
            case "Delete":
            case "Backspace":
                return this.handleDelete(event, selection);
            case "Escape":
                return this.handleEscape(event, selection);
        }

        return false;
    }
    /**
     * Handle the Enter key for starting cell edit
     * @param event - The keyboard event to handle
     * @param selection - The current selection in the grid
     * @returns true if the event was handled, false otherwise
     */
    private handleEnter(event: KeyboardEvent, selection: Selection): boolean {
        if (!selection.isActive) return false;

        const cellRect = this.context.getCellRect(
            selection.startRow,
            selection.startCol
        );
        if (cellRect) {
            this.context.startCellEdit(
                selection.startRow,
                selection.startCol,
                cellRect.x,
                cellRect.y,
                false
            );
        }
        this.context.renderer.render();
        this.context.updateSelectionStats();
        return true;
    }
    /**
     * Handle the Tab key for moving selection
     * @param event - The keyboard event to handle
     * @param selection - The current selection in the grid
     * @returns true if the event was handled, false otherwise
     */
    private handleTab(event: KeyboardEvent, selection: Selection): boolean {
        if (!selection.isActive) return false;

        this.preventDefault(event);

        const modifiers = this.hasModifierKeys(event);
        let newCol: number;

        if (modifiers.shift) {
            // Shift+Tab moves left
            newCol = Math.max(0, selection.startCol - 1);
        } else {
            // Tab moves right
            newCol = Math.min(
                this.context.grid.getMaxCols() - 1,
                selection.startCol + 1
            );
        }

        this.context.grid.clearAllSelections();
        selection.start(selection.startRow, newCol);
        this.context.renderer.render();
        this.context.updateSelectionStats();
        this.context.handleSelectionAfterKeyDown(
            selection,
            selection.startRow,
            newCol
        );
        return true;
    }
    /**
     * Handle the Delete or Backspace key for deleting selected cells
     * @param event - The keyboard event to handle
     * @param selection - The current selection in the grid
     * @returns true if the event was handled, false otherwise
     */
    private handleDelete(event: KeyboardEvent, selection: Selection): boolean {
        if (!selection.isActive) return false;

        this.context.deleteSelectedCells();
        this.context.renderer.render();
        this.context.updateSelectionStats();

        // If Backspace, start editing the cell
        if (event.key === "Backspace") {
            this.context.startCellEdit(
                selection.startRow,
                selection.startCol,
                0,
                0,
                true,
                "" // For backspace, we want to clear the cell
            );
        }

        return true;
    }
    /**
     * Handle the Escape key for clearing copy selection
     * @param event - The keyboard event to handle
     * @param selection - The current selection in the grid
     * @returns true if the event was handled, false otherwise
     */
    private handleEscape(event: KeyboardEvent, selection: Selection): boolean {
        this.preventDefault(event);

        // Clear copy selection when Escape is pressed (Excel behavior)
        this.context.renderer.clearCopiedSelection();
        this.context.renderer.render();
        return true;
    }
}
