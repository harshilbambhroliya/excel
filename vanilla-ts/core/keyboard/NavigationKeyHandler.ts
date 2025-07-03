// src/core/keyboard/NavigationKeyHandler.ts

import { BaseKeyboardHandler } from "./BaseKeyboardHandler.js";
import { Selection } from "../../models/Selection.js";

/**
 * Handles basic navigation keys (arrows, home, end, page up/down)
 */
export class NavigationKeyHandler extends BaseKeyboardHandler {
    private readonly NAVIGATION_KEYS = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
        "PageUp",
        "PageDown",
    ];

    canHandle(event: KeyboardEvent): boolean {
        const modifiers = this.hasModifierKeys(event);
        return (
            this.NAVIGATION_KEYS.indexOf(event.key) !== -1 &&
            !modifiers.ctrl &&
            !modifiers.shift &&
            !modifiers.alt
        );
    }

    handle(event: KeyboardEvent, selection: Selection): boolean {
        if (!this.canHandle(event) || !selection.isActive) {
            return false;
        }

        this.preventDefault(event);

        let newRow = selection.startRow;
        let newCol = selection.startCol;

        switch (event.key) {
            case "ArrowUp":
                newRow = Math.max(0, newRow - 1);
                break;
            case "ArrowDown":
                newRow = Math.min(
                    this.context.grid.getMaxRows() - 1,
                    newRow + 1
                );
                break;
            case "ArrowLeft":
                newCol = Math.max(0, newCol - 1);
                break;
            case "ArrowRight":
                newCol = Math.min(
                    this.context.grid.getMaxCols() - 1,
                    newCol + 1
                );
                break;
            case "Home":
                newCol = 0;
                break;
            case "End":
                newCol = this.context.findLastUsedColumn(newRow);
                break;
            case "PageUp":
                newRow = Math.max(0, newRow - 10);
                break;
            case "PageDown":
                newRow = Math.min(
                    this.context.grid.getMaxRows() - 1,
                    newRow + 10
                );
                break;
        }

        this.context.handleSelectionAfterKeyDown(selection, newRow, newCol);
        return true;
    }
}
