// src/core/keyboard/CtrlShiftKeyHandler.ts

import { BaseKeyboardHandler } from "./BaseKeyboardHandler.js";
import { Selection } from "../../models/Selection.js";

/**
 * Handles Ctrl+Shift key combinations for inserting rows and columns
 */
export class CtrlShiftKeyHandler extends BaseKeyboardHandler {
    /**
     * Create a new CtrlShiftKeyHandler
     * @param context - The keyboard context providing access to the grid and commands
     */
    canHandle(event: KeyboardEvent): boolean {
        const modifiers = this.hasModifierKeys(event);
        return modifiers.ctrl && modifiers.shift;
    }

    /**
     * Handle the keyboard event for inserting rows and columns
     * @param event - The keyboard event to handle
     * @param selection - The current selection in the grid
     * @returns true if the event was handled, false otherwise
     */
    handle(event: KeyboardEvent, selection: Selection): boolean {
        if (!this.canHandle(event) || !selection.isActive) {
            return false;
        }

        switch (event.key) {
            case "ArrowUp":
                return this.handleInsertRowAbove(event, selection);
            case "ArrowDown":
                return this.handleInsertRowBelow(event, selection);
            case "ArrowLeft":
                return this.handleInsertColumnLeft(event, selection);
            case "ArrowRight":
                return this.handleInsertColumnRight(event, selection);
        }

        return false;
    }

    /**
     * Handle the insertion of a row above the current selection
     * @param event - The keyboard event to handle
     * @param selection - The current selection in the grid
     * @returns true if the event was handled, false otherwise
     */
    private handleInsertRowAbove(
        event: KeyboardEvent,
        selection: Selection
    ): boolean {
        if (selection.startRow < 0) return false;

        this.preventDefault(event);
        this.context.insertRowAbove(selection.startRow);
        return true;
    }

    /**
     * Handle the insertion of a row below the current selection
     * @param event - The keyboard event to handle
     * @param selection - The current selection in the grid
     * @returns true if the event was handled, false otherwise
     */
    private handleInsertRowBelow(
        event: KeyboardEvent,
        selection: Selection
    ): boolean {
        if (selection.startRow < 0) return false;

        this.preventDefault(event);
        this.context.insertRowBelow(selection.startRow);
        return true;
    }

    /**
     * Handle the insertion of a column to the left of the current selection
     * @param event - The keyboard event to handle
     * @param selection - The current selection in the grid
     * @returns true if the event was handled, false otherwise
     */
    private handleInsertColumnLeft(
        event: KeyboardEvent,
        selection: Selection
    ): boolean {
        if (selection.startCol < 0) return false;

        this.preventDefault(event);
        this.context.insertColumnLeft(selection.startCol);
        return true;
    }

    /**
     * Handle the insertion of a column to the right of the current selection
     * @param event - The keyboard event to handle
     * @param selection - The current selection in the grid
     * @returns true if the event was handled, false otherwise
     */
    private handleInsertColumnRight(
        event: KeyboardEvent,
        selection: Selection
    ): boolean {
        if (selection.startCol < 0) return false;

        this.preventDefault(event);
        this.context.insertColumnRight(selection.startCol);
        return true;
    }
}
