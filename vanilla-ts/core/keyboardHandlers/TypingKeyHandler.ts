// src/core/keyboard/TypingKeyHandler.ts

import { BaseKeyboardHandler } from "./BaseKeyboardHandler.js";
import { Selection } from "../../models/Selection.js";

/**
 * Handles printable character keys to start cell editing
 */
export class TypingKeyHandler extends BaseKeyboardHandler {
    /**
     * Create a new TypingKeyHandler
     * @param context - The keyboard context providing access to the grid and commands
     */
    canHandle(event: KeyboardEvent): boolean {
        const modifiers = this.hasModifierKeys(event);

        // Handle printable characters that aren't modified by Ctrl/Alt/Meta
        return (
            event.key.length === 1 &&
            !modifiers.ctrl &&
            !modifiers.alt &&
            !event.metaKey
        );
    }
    /**
     * Handle the keyboard event for typing keys
     * @param event - The keyboard event to handle
     * @param selection - The current selection in the grid
     * @returns true if the event was handled, false otherwise
     */
    handle(event: KeyboardEvent, selection: Selection): boolean {
        if (!this.canHandle(event) || !selection.isActive) {
            return false;
        }

        const cellRect = this.context.getCellRect(
            selection.startRow,
            selection.startCol
        );
        if (cellRect) {
            this.preventDefault(event);

            this.context.startCellEdit(
                selection.startRow,
                selection.startCol,
                cellRect.x,
                cellRect.y,
                true,
                event.key
            );
        }

        return true;
    }
}
