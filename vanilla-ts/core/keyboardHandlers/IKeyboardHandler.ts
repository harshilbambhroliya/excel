// src/core/keyboard/IKeyboardHandler.ts

import { CommandManager } from "../../commands/Command.js";
import { Selection } from "../../models/Selection.js";
import { Grid } from "../Grid.js";
import { Renderer } from "../Renderer.js";

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
    grid: Grid;

    /**
     * The renderer instance
     */
    renderer: Renderer;

    /**
     * The command manager instance
     */
    commandManager: CommandManager;

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
    startCellEdit(
        row: number,
        col: number,
        x: number,
        y: number,
        isTypingEvent: boolean,
        initialValue?: string
    ): void;

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
     * @param row - The row index above which to insert
     */
    insertRowAbove(row: number): void;

    /**
     * Insert row below
     * @param row - The row index below which to insert
     */
    insertRowBelow(row: number): void;

    /**
     * Insert column left
     * @param col - The column index to the left of which to insert
     */
    insertColumnLeft(col: number): void;

    /**
     * Insert column right
     * @param col - The column index to the right of which to insert
     */
    insertColumnRight(col: number): void;
}
