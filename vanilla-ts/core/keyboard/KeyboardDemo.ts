// src/core/keyboard/KeyboardDemo.ts

import { KeyboardManager, IKeyboardContext } from "./index.js";
import { Selection } from "../../models/Selection.js";

/**
 * Demonstration of how to use the keyboard management system
 * This shows how the EventHandler could be modified to use the new keyboard classes
 */
export class KeyboardDemo implements IKeyboardContext {
    private keyboardManager: KeyboardManager;

    // Mock implementations for demo purposes
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

    // IKeyboardContext implementation
    public getCellRect(
        row: number,
        col: number
    ): { x: number; y: number; width: number; height: number } | null {
        return { x: col * 100, y: row * 20, width: 100, height: 20 };
    }

    public startCellEdit(row: number, col: number, x: number, y: number): void {
        console.log(`Starting cell edit at ${row}, ${col}`);
        this.editingCell = { row, col };
    }

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

    public findLastUsedColumn(row: number): number {
        return Math.min(50, this.grid.getMaxCols() - 1);
    }

    public highlightHeadersForSelection(): void {
        console.log("Highlighting headers for selection");
    }

    public ensureCellVisible(row: number, col: number): void {
        console.log(`Ensuring cell ${row}, ${col} is visible`);
    }

    public updateSelectionStats(): void {
        console.log("Updating selection stats");
    }

    public deleteSelectedCells(): void {
        console.log("Deleting selected cells");
    }

    public insertRowAbove(row: number): void {
        console.log(`Inserting row above ${row}`);
    }

    public insertRowBelow(row: number): void {
        console.log(`Inserting row below ${row}`);
    }

    public insertColumnLeft(col: number): void {
        console.log(`Inserting column left of ${col}`);
    }

    public insertColumnRight(col: number): void {
        console.log(`Inserting column right of ${col}`);
    }
}
