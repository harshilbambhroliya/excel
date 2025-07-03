// src/core/keyboard/TypingKeyHandler.ts

import { BaseKeyboardHandler } from "./BaseKeyboardHandler.js";
import { Selection } from "../../models/Selection.js";

/**
 * Handles printable character keys to start cell editing
 */
export class TypingKeyHandler extends BaseKeyboardHandler {
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

    handle(event: KeyboardEvent, selection: Selection): boolean {
        if (!this.canHandle(event) || !selection.isActive) {
            return false;
        }

        const cellRect = this.context.getCellRect(
            selection.startRow,
            selection.startCol
        );
        if (cellRect) {
            this.context.startCellEdit(
                selection.startRow,
                selection.startCol,
                cellRect.x,
                cellRect.y
            );
        }

        return true;
    }
}
