// src/core/keyboard/IKeyboardHandler.ts

import { Selection } from "../../models/Selection.js";

/**
 * Interface for keyboard event handlers
 */
export interface IKeyboardHandler {
    /**
     * Handle a keyboard event
     * @param event - The keyboard event
     * @param selection - The current selection
     * @returns true if the event was handled, false otherwise
     */
    handle(event: KeyboardEvent, selection: Selection): boolean;
}

/**
 * Context interface for keyboard handlers
 */
export interface IKeyboardContext {
    /**
     * The grid instance
     */
    grid: any;

    /**
     * The renderer instance
     */
    renderer: any;

    /**
     * The command manager instance
     */
    commandManager: any;

    /**
     * Get cell rectangle coordinates
     */
    getCellRect(
        row: number,
        col: number
    ): { x: number; y: number; width: number; height: number } | null;

    /**
     * Start editing a cell
     */
    startCellEdit(row: number, col: number, x: number, y: number): void;

    /**
     * Handle selection after key navigation
     */
    handleSelectionAfterKeyDown(
        selection: Selection,
        newRow: number,
        newCol: number
    ): void;

    /**
     * Find the next data edge in a direction
     */
    findNextDataEdge(
        row: number,
        col: number,
        direction: "up" | "down" | "left" | "right"
    ): number;

    /**
     * Find the last used column in a row
     */
    findLastUsedColumn(row: number): number;

    /**
     * Highlight headers for selection
     */
    highlightHeadersForSelection(): void;

    /**
     * Ensure cell is visible
     */
    ensureCellVisible(row: number, col: number): void;

    /**
     * Update selection statistics
     */
    updateSelectionStats(): void;

    /**
     * Delete selected cells
     */
    deleteSelectedCells(): void;

    /**
     * Insert row above
     */
    insertRowAbove(row: number): void;

    /**
     * Insert row below
     */
    insertRowBelow(row: number): void;

    /**
     * Insert column left
     */
    insertColumnLeft(col: number): void;

    /**
     * Insert column right
     */
    insertColumnRight(col: number): void;
}
