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

    handleMouseDown(event: MouseEvent): boolean {
        this.lastMousePos = { x: event.offsetX, y: event.offsetY };
        return true;
    }

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
            const currentWidth = this.grid.getColumnWidth(
                this.resizeTarget.index
            );
            const newWidth = Math.max(50, currentWidth + delta);

            // Directly update the grid without creating a command
            // The command will be created only when the resize operation is complete (on mouse up)
            this.grid.setColumnWidth(this.resizeTarget.index, newWidth);
        } else {
            const currentHeight = this.grid.getRowHeight(
                this.resizeTarget.index
            );
            const newHeight = Math.max(20, currentHeight + delta);

            // Directly update the grid without creating a command
            // The command will be created only when the resize operation is complete (on mouse up)
            this.grid.setRowHeight(this.resizeTarget.index, newHeight);
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

    handleMouseUp(event: MouseEvent): boolean {
        if (!this.resizeTarget) return false;

        // Create and execute the final resize command when mouse is released
        if (this.resizeTarget.type === "column") {
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

    getCursor(x: number, y: number): string {
        if (!this.resizeTarget) return "cell";
        return this.resizeTarget.type === "column"
            ? "col-resize"
            : "row-resize";
    }

    onActivate(): void {
        this.canvas.style.cursor = this.getCursor(0, 0);
    }

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
