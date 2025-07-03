// src/core/keyboard/KeyboardDemo.ts

import { KeyboardManager, IKeyboardContext } from "./index.js";
import { Selection } from "../../models/Selection.js";

/**
 * Demonstration of how to use the keyboard management system
 * This shows how the EventHandler could be modified to use the new keyboard classes
 */
export class KeyboardDemo implements IKeyboardContext {
    private keyboardManager: KeyboardManager;

    // Mock grid and renderer for demonstration purposes
    public grid: any = {
        getMaxRows: () => 1000,
        getMaxCols: () => 100,
        getCell: (row: number, col: number) => ({
            value: "",
            setValue: (value: any) => {},
            getDisplayValue: () => "",
        }),
        clearAllSelections: () => {},
        clearHeaderSelections: () => {},
        selectRowHeader: (row: number) => {},
        selectColumnHeader: (col: number) => {},
    };

    public renderer: any = {
        render: () => {},
        clearCopiedSelection: () => {},
        renderDottedLineAcrossSelection: (selection: Selection) => {},
        clearFormulaRangeSelection: () => {},
        getScrollPosition: () => ({ x: 0, y: 0 }),
        setScroll: (x: number, y: number) => {},
        getZoom: () => 1,
    };

    public commandManager: any = {
        undo: () => {},
        redo: () => {},
        executeCommand: (command: any) => {},
    };

    public editingCell: { row: number; col: number } | null = null;

    constructor() {
        this.keyboardManager = new KeyboardManager(this);
    }

    /**
     * This method would replace the existing handleKeyDown in EventHandler
     * It handles keyboard events and delegates them to the keyboard manager
     * @param event - The keyboard event to handle
     */
    public handleKeyDown(event: KeyboardEvent): void {
        const selection = new Selection(); // This would come from this.grid.getSelection()

        // Let the keyboard manager handle the event
        if (this.keyboardManager.handleKeyboardEvent(event, selection)) {
            return; // Event was handled
        }

        // Fallback to any existing keyboard handling
        console.log("Event not handled by keyboard manager:", event.key);
    }

    /**
     * Get the rectangle for a cell
     * @param row - The row index of the cell
     * @param col - The column index of the cell
     * @returns The rectangle for the cell
     */
    public getCellRect(
        row: number,
        col: number
    ): { x: number; y: number; width: number; height: number } | null {
        return { x: col * 100, y: row * 20, width: 100, height: 20 };
    }

    /**
     * Start editing a cell
     * @param row - The row index of the cell to edit
     * @param col - The column index of the cell to edit
     * @param x - The x coordinate for the cell
     * @param y - The y coordinate for the cell
     */
    public startCellEdit(row: number, col: number, x: number, y: number): void {
        console.log(`Starting cell edit at ${row}, ${col}`);
        this.editingCell = { row, col };
    }

    /**
     * Handle selection after key down
     * @param selection - The current selection
     * @param newRow - The new row index
     * @param newCol - The new column index
     */
    public handleSelectionAfterKeyDown(
        selection: Selection,
        newRow: number,
        newCol: number
    ): void {
        console.log(`Selection after key down: ${newRow}, ${newCol}`);
        this.grid.clearAllSelections();
        selection.start(newRow, newCol);
        this.renderer.render();
        this.updateSelectionStats();
    }

    /**
     * Find the next data edge in a direction
     * @param row - The row index to start searching from
     * @param col - The column index to start searching from
     * @param direction - The direction to search in
     * @returns The index of the next data edge
     */
    public findNextDataEdge(
        row: number,
        col: number,
        direction: "up" | "down" | "left" | "right"
    ): number {
        // Simplified implementation for demo
        switch (direction) {
            case "right":
                return Math.min(col + 10, this.grid.getMaxCols() - 1);
            case "left":
                return Math.max(col - 10, 0);
            case "down":
                return Math.min(row + 10, this.grid.getMaxRows() - 1);
            case "up":
                return Math.max(row - 10, 0);
        }
    }

    /**
     * Find the last used column in a row
     * @param row - The row index to search in
     * @returns The index of the last used column
     */
    public findLastUsedColumn(row: number): number {
        return Math.min(50, this.grid.getMaxCols() - 1);
    }

    /**
     * Clear all header selections
     * This method would clear any header selections in the grid
     */
    public highlightHeadersForSelection(): void {
        console.log("Highlighting headers for selection");
    }

    /**
     * Ensure the cell at the specified row and column is visible
     * @param row - The row index of the cell
     * @param col - The column index of the cell
     * This method would scroll the grid to ensure the specified cell is visible
     */
    public ensureCellVisible(row: number, col: number): void {
        console.log(`Ensuring cell ${row}, ${col} is visible`);
    }

    /**
     * Update the selection statistics
     * This method would update the UI to reflect the current selection stats
     */
    public updateSelectionStats(): void {
        console.log("Updating selection stats");
    }

    /**
     * Delete selected cells
     * This method would clear the values of the currently selected cells
     */
    public deleteSelectedCells(): void {
        console.log("Deleting selected cells");
    }

    /**
     * Insert a new row above the specified row index
     * @param row - The row index above which to insert
     * This method would insert a new row above the specified row index
     */
    public insertRowAbove(row: number): void {
        console.log(`Inserting row above ${row}`);
    }

    /**
     * Insert a new row below the specified row index
     * @param row - The row index below which to insert
     * This method would insert a new row below the specified row index
     */
    public insertRowBelow(row: number): void {
        console.log(`Inserting row below ${row}`);
    }

    /**
     * Insert a new column to the left of the specified column index
     * @param col - The column index to the left of which to insert
     */
    public insertColumnLeft(col: number): void {
        console.log(`Inserting column left of ${col}`);
    }

    /**
     * Insert a new column to the right of the specified column index
     * @param col - The column index to the right of which to insert
     */
    public insertColumnRight(col: number): void {
        console.log(`Inserting column right of ${col}`);
    }
}
