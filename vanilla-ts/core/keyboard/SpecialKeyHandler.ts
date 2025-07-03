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

    canHandle(event: KeyboardEvent): boolean {
        const modifiers = this.hasModifierKeys(event);
        return (
            this.SPECIAL_KEYS.indexOf(event.key) !== -1 &&
            !modifiers.ctrl &&
            !modifiers.alt
        );
    }

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
                cellRect.y
            );
        }
        this.context.renderer.render();
        this.context.updateSelectionStats();
        return true;
    }

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
        return true;
    }

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
                0
            );
        }

        return true;
    }

    private handleEscape(event: KeyboardEvent, selection: Selection): boolean {
        this.preventDefault(event);

        // Clear copy selection when Escape is pressed (Excel behavior)
        this.context.renderer.clearCopiedSelection();
        this.context.renderer.render();
        return true;
    }
}
