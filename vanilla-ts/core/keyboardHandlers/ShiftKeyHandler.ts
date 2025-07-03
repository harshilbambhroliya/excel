// src/core/keyboard/ShiftKeyHandler.ts

import { BaseKeyboardHandler } from "./BaseKeyboardHandler.js";
import { Selection } from "../../models/Selection.js";

/**
 * Handles Shift key combinations for extending selections (without Ctrl)
 */
export class ShiftKeyHandler extends BaseKeyboardHandler {
    /**
     * Create a new ShiftKeyHandler
     * @param context - The keyboard context providing access to the grid and commands
     */
    canHandle(event: KeyboardEvent): boolean {
        const modifiers = this.hasModifierKeys(event);
        return modifiers.shift && !modifiers.ctrl && !modifiers.alt;
    }
    /**
     * Handle the keyboard event for Shift key combinations
     * @param event - The keyboard event to handle
     * @param selection - The current selection in the grid
     * @returns true if the event was handled, false otherwise
     */
    handle(event: KeyboardEvent, selection: Selection): boolean {
        if (!this.canHandle(event) || !selection.isActive) {
            return false;
        }

        return this.handleShiftKeys(event, selection);
    }
    /**
     * Handle Shift key combinations for extending selections
     * @param event - The keyboard event to handle
     * @param selection - The current selection in the grid
     * @returns true if the event was handled, false otherwise
     */
    private handleShiftKeys(
        event: KeyboardEvent,
        selection: Selection
    ): boolean {
        switch (event.key) {
            case "Tab":
                this.preventDefault(event);
                const newCol = Math.max(0, selection.startCol - 1);
                this.context.handleSelectionAfterKeyDown(
                    selection,
                    selection.startRow,
                    newCol
                );
                return true;
            case "ArrowUp":
                this.preventDefault(event);
                const newUpRow = Math.max(0, selection.endRow - 1);
                selection.extend(newUpRow, selection.endCol);
                this.updateSelectionAfterExtend(
                    selection,
                    selection.endRow,
                    selection.endCol,
                    "vertical"
                );
                return true;
            case "ArrowDown":
                this.preventDefault(event);
                const newDownRow = Math.min(
                    this.context.grid.getMaxRows() - 1,
                    selection.endRow + 1
                );
                selection.extend(newDownRow, selection.endCol);
                this.updateSelectionAfterExtend(
                    selection,
                    selection.endRow,
                    selection.endCol,
                    "vertical"
                );
                return true;
            case "ArrowLeft":
                this.preventDefault(event);
                const newLeftCol = Math.max(0, selection.endCol - 1);
                selection.extend(selection.endRow, newLeftCol);
                this.updateSelectionAfterExtend(
                    selection,
                    selection.endRow,
                    selection.endCol,
                    "horizontal"
                );
                return true;
            case "ArrowRight":
                this.preventDefault(event);
                const newRightCol = Math.min(
                    this.context.grid.getMaxCols() - 1,
                    selection.endCol + 1
                );
                selection.extend(selection.endRow, newRightCol);
                this.updateSelectionAfterExtend(
                    selection,
                    selection.endRow,
                    selection.endCol,
                    "horizontal"
                );
                return true;
            case "Home":
                this.preventDefault(event);
                selection.extend(selection.endRow, 0);
                this.updateSelectionAfterExtend(
                    selection,
                    selection.endRow,
                    selection.endCol,
                    "horizontal"
                );
                return true;
            case "End":
                this.preventDefault(event);
                const lastUsedCol = this.context.findLastUsedColumn(
                    selection.endRow
                );
                selection.extend(selection.endRow, lastUsedCol);
                this.updateSelectionAfterExtend(
                    selection,
                    selection.endRow,
                    selection.endCol,
                    "horizontal"
                );
                return true;
        }

        return false;
    }
    /**
     * Update the selection and UI after extending the selection
     * @param selection - The current selection in the grid
     * @param row - The row to which the selection was extended
     * @param col - The column to which the selection was extended
     * @param direction - The direction of the selection extension ('vertical', 'horizontal', or 'both')
     */
    private updateSelectionAfterExtend(
        selection: Selection,
        row: number,
        col: number,
        direction: "vertical" | "horizontal" | "both" = "both"
    ): void {
        this.context.grid.clearHeaderSelections();
        this.context.highlightHeadersForSelection();

        // Smart auto-scrolling based on direction
        this.ensureCellVisibleInDirection(row, col, direction);

        this.context.renderer.render();
        this.context.updateSelectionStats();
    }

    /**
     * Ensures the cell is visible but only scrolls in the specified direction
     * @param row - The row to make visible
     * @param col - The column to make visible
     * @param direction - The direction to allow scrolling ('vertical', 'horizontal', or 'both')
     */
    private ensureCellVisibleInDirection(
        row: number,
        col: number,
        direction: "vertical" | "horizontal" | "both"
    ): void {
        const dimensions = this.context.grid.getDimensions();
        const scrollPos = this.context.renderer.getScrollPosition();
        const zoomFactor = this.context.renderer.getZoom();
        const cellRect = this.context.getCellRect(row, col);

        if (!cellRect) return;

        let newScrollX = scrollPos.x;
        let newScrollY = scrollPos.y;

        // Get viewport dimensions from the renderer
        const viewportWidth = this.context.renderer.viewport.width;
        const viewportHeight = this.context.renderer.viewport.height;

        // Only check horizontal scrolling if direction allows it
        if (direction === "horizontal" || direction === "both") {
            if (cellRect.x < dimensions.headerWidth) {
                // Need to scroll left
                newScrollX = 0;
                for (let i = 0; i < col; i++) {
                    newScrollX += this.context.grid.getColumnWidth(i);
                }
            } else if (cellRect.x + cellRect.width > viewportWidth) {
                // Need to scroll right
                newScrollX = 0;
                for (let i = 0; i <= col; i++) {
                    newScrollX += this.context.grid.getColumnWidth(i);
                }
                newScrollX =
                    newScrollX -
                    (viewportWidth - dimensions.headerWidth) / zoomFactor;
            }
        }

        // Only check vertical scrolling if direction allows it
        if (direction === "vertical" || direction === "both") {
            if (cellRect.y < dimensions.headerHeight) {
                // Need to scroll up
                newScrollY = 0;
                for (let i = 0; i < row; i++) {
                    newScrollY += this.context.grid.getRowHeight(i);
                }
            } else if (cellRect.y + cellRect.height > viewportHeight) {
                // Need to scroll down
                newScrollY = 0;
                for (let i = 0; i <= row; i++) {
                    newScrollY += this.context.grid.getRowHeight(i);
                }
                newScrollY =
                    newScrollY -
                    (viewportHeight - dimensions.headerHeight) / zoomFactor;
            }
        }

        if (newScrollX !== scrollPos.x || newScrollY !== scrollPos.y) {
            this.context.renderer.setScroll(
                Math.max(0, newScrollX),
                Math.max(0, newScrollY)
            );
        }
    }
}
