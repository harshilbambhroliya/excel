import { BaseResizeHandler } from "../Base/BaseResizeHandler.js";
import { ResizeRowCommand } from "../../../commands/ResizeRowCommand.js";

/**
 * Handler for resizing rows
 */
export class RowResizeHandler extends BaseResizeHandler {
    /**
     * Get the initial height of the row
     * @param index - The row index
     */
    protected getInitialSize(index: number): number {
        return this.grid.getRowHeight(index);
    }

    /**
     * Handles mouse move events for resizing rows
     * @param event - The mouse event
     * @returns True if handled, false otherwise
     */
    handleMouseMove(event: MouseEvent): boolean {
        const zoomFactor = this.renderer.getZoom();

        // Calculate the drag delta, accounting for zoom
        const rawDelta = event.offsetY - this.lastMousePos.y;

        // Adjust delta based on zoom factor to ensure resize works properly at any zoom level
        const delta = rawDelta / zoomFactor;

        // Check for selected rows
        const selection = this.grid.getSelection();
        if (selection && selection.isActive) {
            const minRow = Math.min(selection.startRow, selection.endRow);
            const maxRow = Math.max(selection.startRow, selection.endRow);

            // Check if the resized row is part of a multi-row selection
            if (
                this.resizeIndex >= minRow &&
                this.resizeIndex <= maxRow &&
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
                const currentHeight = this.grid.getRowHeight(this.resizeIndex);
                const newHeight = Math.max(20, currentHeight + delta);
                this.grid.setRowHeight(this.resizeIndex, newHeight);
            }
        } else {
            // No selection, just resize the target row
            const currentHeight = this.grid.getRowHeight(this.resizeIndex);
            const newHeight = Math.max(20, currentHeight + delta);
            this.grid.setRowHeight(this.resizeIndex, newHeight);
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
        // Check if we have a selection to handle multiple rows
        const selection = this.grid.getSelection();

        // Check if we're handling a multi-row resize
        if (selection && selection.isActive) {
            const minRow = Math.min(selection.startRow, selection.endRow);
            const maxRow = Math.max(selection.startRow, selection.endRow);

            // If the resize target is part of a multi-row selection
            if (
                this.resizeIndex >= minRow &&
                this.resizeIndex <= maxRow &&
                maxRow - minRow > 0
            ) {
                // Get final height from the target row
                const finalHeight = this.grid.getRowHeight(this.resizeIndex);

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

                // Reset after handling multiple rows
                this.resizeIndex = -1;
                this.resizeStartSize = -1;
                return true;
            }
        }

        // Single row resize (original behavior)
        const finalHeight = this.grid.getRowHeight(this.resizeIndex);

        // Only create a command if the size actually changed
        if (finalHeight !== this.resizeStartSize) {
            const command = new ResizeRowCommand(
                this.grid,
                this.resizeIndex,
                finalHeight,
                this.resizeStartSize // Use the original size as old height
            );

            // First revert to the original size
            this.grid.setRowHeight(this.resizeIndex, this.resizeStartSize);

            // Then execute the command which will apply the final size and enable undo
            this.commandManager.executeCommand(command);
        }

        this.resizeIndex = -1;
        this.resizeStartSize = -1;

        return true;
    }

    /**
     * Gets the cursor style for row resizing
     * @returns The cursor style
     */
    getCursor(x: number, y: number): string {
        return "row-resize";
    }

    /**
     * Gets the row resize target at the specified position
     * @param x - The x position
     * @param y - The y position
     * @param grid - The grid instance
     * @param renderer - The renderer instance
     * @returns The row index to resize, or -1 if none
     */
    static getResizeTarget(
        x: number,
        y: number,
        grid: any,
        renderer: any
    ): number {
        const dimensions = grid.getDimensions();
        const tolerance = 3;
        const zoomFactor = renderer.getZoom();

        // Check row resize handles - only in the header column
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
                    return row;
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

        return -1;
    }
}
