// src/core/keyboard/CtrlShiftKeyHandler.ts

import { BaseKeyboardHandler } from "./BaseKeyboardHandler.js";
import { Selection } from "../../models/Selection.js";

/**
 * Handles Ctrl+Shift key combinations for inserting rows and columns
 */
export class CtrlShiftKeyHandler extends BaseKeyboardHandler {
    canHandle(event: KeyboardEvent): boolean {
        const modifiers = this.hasModifierKeys(event);
        return modifiers.ctrl && modifiers.shift;
    }

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

    private handleInsertRowAbove(
        event: KeyboardEvent,
        selection: Selection
    ): boolean {
        if (selection.startRow < 0) return false;

        this.preventDefault(event);
        this.context.insertRowAbove(selection.startRow);
        return true;
    }

    private handleInsertRowBelow(
        event: KeyboardEvent,
        selection: Selection
    ): boolean {
        if (selection.startRow < 0) return false;

        this.preventDefault(event);
        this.context.insertRowBelow(selection.startRow);
        return true;
    }

    private handleInsertColumnLeft(
        event: KeyboardEvent,
        selection: Selection
    ): boolean {
        if (selection.startCol < 0) return false;

        this.preventDefault(event);
        this.context.insertColumnLeft(selection.startCol);
        return true;
    }

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
