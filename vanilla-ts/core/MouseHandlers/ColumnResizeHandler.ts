import { BaseResizeHandler } from "./BaseResizeHandler.js";
import { ResizeColumnCommand } from "../../commands/ResizeColumnCommand.js";

/**
 * Handler for resizing columns
 */
export class ColumnResizeHandler extends BaseResizeHandler {
    /**
     * Get the initial width of the column
     * @param index - The column index
     */
    protected getInitialSize(index: number): number {
        return this.grid.getColumnWidth(index);
    }

    /**
     * Handles mouse move events for resizing columns
     * @param event - The mouse event
     * @returns True if handled, false otherwise
     */
    handleMouseMove(event: MouseEvent): boolean {
        const zoomFactor = this.renderer.getZoom();

        // Calculate the drag delta, accounting for zoom
        const rawDelta = event.offsetX - this.lastMousePos.x;

        // Adjust delta based on zoom factor to ensure resize works properly at any zoom level
        const delta = rawDelta / zoomFactor;

        // Check for selected columns
        const selection = this.grid.getSelection();
        if (selection && selection.isActive) {
            const minCol = Math.min(selection.startCol, selection.endCol);
            const maxCol = Math.max(selection.startCol, selection.endCol);

            // Check if the resized column is part of a multi-column selection
            if (
                this.resizeIndex >= minCol &&
                this.resizeIndex <= maxCol &&
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
                const currentWidth = this.grid.getColumnWidth(this.resizeIndex);
                const newWidth = Math.max(50, currentWidth + delta);
                this.grid.setColumnWidth(this.resizeIndex, newWidth);
            }
        } else {
            // No selection, just resize the target column
            const currentWidth = this.grid.getColumnWidth(this.resizeIndex);
            const newWidth = Math.max(50, currentWidth + delta);
            this.grid.setColumnWidth(this.resizeIndex, newWidth);
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
        // Check if we have a selection to handle multiple columns
        const selection = this.grid.getSelection();

        // Check if we're handling a multi-column resize
        if (selection && selection.isActive) {
            const minCol = Math.min(selection.startCol, selection.endCol);
            const maxCol = Math.max(selection.startCol, selection.endCol);

            // If the resize target is part of a multi-column selection
            if (
                this.resizeIndex >= minCol &&
                this.resizeIndex <= maxCol &&
                maxCol - minCol > 0
            ) {
                // Get final width from the target column
                const finalWidth = this.grid.getColumnWidth(this.resizeIndex);

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

                // Reset after handling multiple columns
                this.resizeIndex = -1;
                this.resizeStartSize = -1;
                return true;
            }
        }

        // Single column resize (original behavior)
        const finalWidth = this.grid.getColumnWidth(this.resizeIndex);

        // Only create a command if the size actually changed
        if (finalWidth !== this.resizeStartSize) {
            const command = new ResizeColumnCommand(
                this.grid,
                this.resizeIndex,
                finalWidth,
                this.resizeStartSize // Use the original size as old width
            );

            // First revert to the original size
            this.grid.setColumnWidth(this.resizeIndex, this.resizeStartSize);

            // Then execute the command which will apply the final size and enable undo
            this.commandManager.executeCommand(command);
        }

        this.resizeIndex = -1;
        this.resizeStartSize = -1;

        return true;
    }

    /**
     * Gets the cursor style for column resizing
     * @returns The cursor style
     */
    getCursor(x: number, y: number): string {
        return "col-resize";
    }

    /**
     * Gets the column resize target at the specified position
     * @param x - The x position
     * @param y - The y position
     * @param grid - The grid instance
     * @param renderer - The renderer instance
     * @returns The column index to resize, or -1 if none
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

        // Check column resize handles - only in the header row
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
                    return col;
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

        return -1;
    }
}
