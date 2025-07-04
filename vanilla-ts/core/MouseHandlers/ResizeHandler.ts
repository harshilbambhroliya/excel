import { BaseHandler } from "./BaseHandler.js";
import { ResizeColumnCommand } from "../../commands/ResizeColumnCommand.js";
import { ResizeRowCommand } from "../../commands/ResizeRowCommand.js";

/**
 * Handler for resizing rows and columns
 */
export class ResizeHandler extends BaseHandler {
    private resizeTarget: { type: "row" | "column"; index: number } | null =
        null;
    private resizeStartSize: number = -1;
    private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };

    /**
     * Creates a new ResizeHandler instance
     * @param context - The context containing grid, renderer, and command manager
     * @param resizeTarget - The target to resize (row or column)
     */
    constructor(
        context: any,
        resizeTarget: { type: "row" | "column"; index: number }
    ) {
        super(context);
        this.resizeTarget = resizeTarget;

        // Store the initial size when resize starts
        if (resizeTarget.type === "column") {
            this.resizeStartSize = this.grid.getColumnWidth(resizeTarget.index);
        } else {
            this.resizeStartSize = this.grid.getRowHeight(resizeTarget.index);
        }
    }

    /**
     * Handles mouse down events to initiate resizing
     * @param event - The mouse event
     * @returns True if handled, false otherwise
     */
    handleMouseDown(event: MouseEvent): boolean {
        this.lastMousePos = { x: event.offsetX, y: event.offsetY };
        return true;
    }

    /**
     * Handles mouse move events for resizing rows or columns
     * @param event - The mouse event
     * @returns True if handled, false otherwise
     */
    handleMouseMove(event: MouseEvent): boolean {
        if (!this.resizeTarget) return false;

        const zoomFactor = this.renderer.getZoom();

        // Calculate the drag delta, accounting for zoom
        const rawDelta =
            this.resizeTarget.type === "column"
                ? event.offsetX - this.lastMousePos.x
                : event.offsetY - this.lastMousePos.y;

        // Adjust delta based on zoom factor to ensure resize works properly at any zoom level
        const delta = rawDelta / zoomFactor;

        if (this.resizeTarget.type === "column") {
            // Check for selected columns
            const selection = this.grid.getSelection();
            if (selection && selection.isActive) {
                const minCol = Math.min(selection.startCol, selection.endCol);
                const maxCol = Math.max(selection.startCol, selection.endCol);

                // Check if the resized column is part of a multi-column selection
                if (
                    this.resizeTarget.index >= minCol &&
                    this.resizeTarget.index <= maxCol &&
                    maxCol - minCol > 0
                ) {
                    // Apply resize to all selected columns
                    for (let col = minCol; col <= maxCol; col++) {
                        const currentWidth = this.grid.getColumnWidth(col);
                        const newWidth = Math.max(50, currentWidth + delta);
                        this.grid.setColumnWidth(col, newWidth);
                    }
                } else {
                    // Just resize the target column (traditional behavior)
                    const currentWidth = this.grid.getColumnWidth(
                        this.resizeTarget.index
                    );
                    const newWidth = Math.max(50, currentWidth + delta);
                    this.grid.setColumnWidth(this.resizeTarget.index, newWidth);
                }
            } else {
                // No selection, just resize the target column
                const currentWidth = this.grid.getColumnWidth(
                    this.resizeTarget.index
                );
                const newWidth = Math.max(50, currentWidth + delta);
                this.grid.setColumnWidth(this.resizeTarget.index, newWidth);
            }
        } else {
            // Check for selected rows
            const selection = this.grid.getSelection();
            if (selection && selection.isActive) {
                const minRow = Math.min(selection.startRow, selection.endRow);
                const maxRow = Math.max(selection.startRow, selection.endRow);

                // Check if the resized row is part of a multi-row selection
                if (
                    this.resizeTarget.index >= minRow &&
                    this.resizeTarget.index <= maxRow &&
                    maxRow - minRow > 0
                ) {
                    // Apply resize to all selected rows
                    for (let row = minRow; row <= maxRow; row++) {
                        const currentHeight = this.grid.getRowHeight(row);
                        const newHeight = Math.max(20, currentHeight + delta);
                        this.grid.setRowHeight(row, newHeight);
                    }
                } else {
                    // Just resize the target row (traditional behavior)
                    const currentHeight = this.grid.getRowHeight(
                        this.resizeTarget.index
                    );
                    const newHeight = Math.max(20, currentHeight + delta);
                    this.grid.setRowHeight(this.resizeTarget.index, newHeight);
                }
            } else {
                // No selection, just resize the target row
                const currentHeight = this.grid.getRowHeight(
                    this.resizeTarget.index
                );
                const newHeight = Math.max(20, currentHeight + delta);
                this.grid.setRowHeight(this.resizeTarget.index, newHeight);
            }
        }

        this.lastMousePos = { x: event.offsetX, y: event.offsetY };

        // Update the UI
        if (this.scrollbarManager) {
            requestAnimationFrame(() => {
                this.renderer.render();
            });
        }

        return true;
    }

    /**
     * Handles mouse up events
     * This finalizes the resize operation and creates the appropriate command
     * @param event - The mouse event
     * @returns True if handled, false otherwise
     */
    handleMouseUp(event: MouseEvent): boolean {
        if (!this.resizeTarget) return false;

        // Check if we have a selection to handle multiple rows/columns
        const selection = this.grid.getSelection();

        // Create and execute the final resize command when mouse is released
        if (this.resizeTarget.type === "column") {
            // Check if we're handling a multi-column resize
            if (selection && selection.isActive) {
                const minCol = Math.min(selection.startCol, selection.endCol);
                const maxCol = Math.max(selection.startCol, selection.endCol);

                // If the resize target is part of a multi-column selection
                if (
                    this.resizeTarget.index >= minCol &&
                    this.resizeTarget.index <= maxCol &&
                    maxCol - minCol > 0
                ) {
                    // Get final width from the target column
                    const finalWidth = this.grid.getColumnWidth(
                        this.resizeTarget.index
                    );

                    // Only create commands if the size actually changed
                    if (finalWidth !== this.resizeStartSize) {
                        // We'll execute multiple commands in a batch
                        let batchCommands = [];

                        // For each selected column, create a resize command
                        for (let col = minCol; col <= maxCol; col++) {
                            const currentWidth = this.grid.getColumnWidth(col);
                            const originalWidth = this.resizeStartSize; // All columns will be resized by the same amount

                            // Create command
                            const command = new ResizeColumnCommand(
                                this.grid,
                                col,
                                currentWidth,
                                originalWidth
                            );

                            // Store command for batch execution
                            batchCommands.push(command);

                            // First revert to original size
                            this.grid.setColumnWidth(col, originalWidth);
                        }

                        // Execute all commands as a batch
                        for (const cmd of batchCommands) {
                            this.commandManager.executeCommand(cmd);
                        }

                        console.log(
                            `Resized ${batchCommands.length} columns simultaneously`
                        );
                    }

                    // Exit after handling multiple columns
                    this.resizeTarget = null;
                    this.resizeStartSize = -1;
                    return true;
                }
            }

            // Single column resize (original behavior)
            const finalWidth = this.grid.getColumnWidth(
                this.resizeTarget.index
            );

            // Only create a command if the size actually changed
            if (finalWidth !== this.resizeStartSize) {
                const command = new ResizeColumnCommand(
                    this.grid,
                    this.resizeTarget.index,
                    finalWidth,
                    this.resizeStartSize // Use the original size as old width
                );

                // First revert to the original size
                this.grid.setColumnWidth(
                    this.resizeTarget.index,
                    this.resizeStartSize
                );

                // Then execute the command which will apply the final size and enable undo
                this.commandManager.executeCommand(command);
            }
        } else {
            // Row resize handling

            // Check if we're handling a multi-row resize
            if (selection && selection.isActive) {
                const minRow = Math.min(selection.startRow, selection.endRow);
                const maxRow = Math.max(selection.startRow, selection.endRow);

                // If the resize target is part of a multi-row selection
                if (
                    this.resizeTarget.index >= minRow &&
                    this.resizeTarget.index <= maxRow &&
                    maxRow - minRow > 0
                ) {
                    // Get final height from the target row
                    const finalHeight = this.grid.getRowHeight(
                        this.resizeTarget.index
                    );

                    // Only create commands if the size actually changed
                    if (finalHeight !== this.resizeStartSize) {
                        // We'll execute multiple commands in a batch
                        let batchCommands = [];

                        // For each selected row, create a resize command
                        for (let row = minRow; row <= maxRow; row++) {
                            const currentHeight = this.grid.getRowHeight(row);
                            const originalHeight = this.resizeStartSize; // All rows will be resized by the same amount

                            // Create command
                            const command = new ResizeRowCommand(
                                this.grid,
                                row,
                                currentHeight,
                                originalHeight
                            );

                            // Store command for batch execution
                            batchCommands.push(command);

                            // First revert to original size
                            this.grid.setRowHeight(row, originalHeight);
                        }

                        // Execute all commands as a batch
                        for (const cmd of batchCommands) {
                            this.commandManager.executeCommand(cmd);
                        }

                        console.log(
                            `Resized ${batchCommands.length} rows simultaneously`
                        );
                    }

                    // Exit after handling multiple rows
                    this.resizeTarget = null;
                    this.resizeStartSize = -1;
                    return true;
                }
            }

            // Single row resize (original behavior)
            const finalHeight = this.grid.getRowHeight(this.resizeTarget.index);

            // Only create a command if the size actually changed
            if (finalHeight !== this.resizeStartSize) {
                const command = new ResizeRowCommand(
                    this.grid,
                    this.resizeTarget.index,
                    finalHeight,
                    this.resizeStartSize // Use the original size as old height
                );

                // First revert to the original size
                this.grid.setRowHeight(
                    this.resizeTarget.index,
                    this.resizeStartSize
                );

                // Then execute the command which will apply the final size and enable undo
                this.commandManager.executeCommand(command);
            }
        }

        this.resizeTarget = null;
        this.resizeStartSize = -1;

        return true;
    }

    /**
     * Gets the cursor style based on the current resize target
     * @param x - The x position
     * @param y - The y position
     * @returns The cursor style
     */
    getCursor(x: number, y: number): string {
        if (!this.resizeTarget) return "cell";
        return this.resizeTarget.type === "column"
            ? "col-resize"
            : "row-resize";
    }

    /**
     * Activates the resize handler
     * Sets the cursor style to the appropriate resize cursor
     */
    onActivate(): void {
        this.canvas.style.cursor = this.getCursor(0, 0);
    }

    /**
     * Deactivates the resize handler
     * Sets the cursor style back to the default cell cursor
     */
    onDeactivate(): void {
        this.canvas.style.cursor = "cell";
    }

    /**
     * Gets the resize target at the specified position
     * @param x - The x position
     * @param y - The y position
     * @returns The resize target
     */
    static getResizeTarget(
        x: number,
        y: number,
        grid: any,
        renderer: any
    ): { type: "row" | "column"; index: number } | null {
        const dimensions = grid.getDimensions();
        const tolerance = 3;
        const zoomFactor = renderer.getZoom();

        // Check column resize handles
        if (y <= dimensions.headerHeight) {
            const scrollX = renderer.getScrollPosition().x;
            let currentX = dimensions.headerWidth;

            // Apply zoom factor to position calculations
            for (let col = 0; col < grid.getMaxCols(); col++) {
                const colWidth = grid.getColumnWidth(col) * zoomFactor;
                currentX += colWidth;

                // Adjust position based on scroll and zoom
                const adjustedX = currentX - scrollX * zoomFactor;

                if (Math.abs(x - adjustedX) <= tolerance * zoomFactor) {
                    return { type: "column", index: col };
                }

                // Break early if we're past the viewport
                if (
                    adjustedX >
                    x +
                        tolerance * zoomFactor +
                        dimensions.columnWidth * zoomFactor
                ) {
                    break;
                }
            }
        }

        // Check row resize handles
        if (x <= dimensions.headerWidth) {
            const scrollY = renderer.getScrollPosition().y;
            let currentY = dimensions.headerHeight;

            // Apply zoom factor to position calculations
            for (let row = 0; row < grid.getMaxRows(); row++) {
                const rowHeight = grid.getRowHeight(row) * zoomFactor;
                currentY += rowHeight;

                // Adjust position based on scroll and zoom
                const adjustedY = currentY - scrollY * zoomFactor;

                if (Math.abs(y - adjustedY) <= tolerance * zoomFactor) {
                    return { type: "row", index: row };
                }

                // Break early if we're past the viewport
                if (
                    adjustedY >
                    y +
                        tolerance * zoomFactor +
                        dimensions.rowHeight * zoomFactor
                ) {
                    break;
                }
            }
        }

        return null;
    }
}
