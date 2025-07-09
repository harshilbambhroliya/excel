import { BaseHandler } from "../Base/BaseHandler.js";
import { ColumnResizeHandler } from "./ColumnResizeHandler.js";
import { RowResizeHandler } from "./RowResizeHandler.js";

/**
 * Handler for resizing rows and columns
 * Acts as a facade that delegates to specialized handlers
 */
export class ResizeHandler extends BaseHandler {
    private resizeTarget: { type: "row" | "column"; index: number } | null =
        null;
    private delegateHandler: ColumnResizeHandler | RowResizeHandler | null =
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

        // Create the appropriate delegate handler
        if (resizeTarget.type === "column") {
            this.delegateHandler = new ColumnResizeHandler(
                context,
                resizeTarget.index
            );
            this.resizeStartSize = this.grid.getColumnWidth(resizeTarget.index);
        } else {
            this.delegateHandler = new RowResizeHandler(
                context,
                resizeTarget.index
            );
            this.resizeStartSize = this.grid.getRowHeight(resizeTarget.index);
        }
    }

    /**
     * Handles mouse down events to initiate resizing
     * @param event - The mouse event
     * @returns True if handled, false otherwise
     */
    handlePointerDown(event: PointerEvent): boolean {
        if (this.delegateHandler) {
            return this.delegateHandler.handlePointerDown(event);
        }
        return false;
    }

    /**
     * Handles mouse move events for resizing rows or columns
     * @param event - The mouse event
     * @returns True if handled, false otherwise
     */
    handlePointerMove(event: PointerEvent): boolean {
        if (this.delegateHandler) {
            return this.delegateHandler.handlePointerMove(event);
        }
        return false;
    }

    /**
     * Handles mouse up events
     * This finalizes the resize operation and creates the appropriate command
     * @param event - The mouse event
     * @returns True if handled, false otherwise
     */
    handlePointerUp(event: PointerEvent): boolean {
        if (this.delegateHandler) {
            const result = this.delegateHandler.handlePointerUp(event);

            // Clean up after the operation is complete
            if (result) {
                this.resizeTarget = null;
                this.resizeStartSize = -1;
            }

            return result;
        }
        return false;
    }

    /**
     * Gets the cursor style based on the current resize target
     * @param x - The x position
     * @param y - The y position
     * @returns The cursor style
     */
    getCursor(x: number, y: number): string {
        if (this.delegateHandler) {
            return this.delegateHandler.getCursor(x, y);
        }
        return "cell";
    }

    /**
     * Activates the resize handler
     * Sets the cursor style to the appropriate resize cursor
     */
    onActivate(): void {
        if (this.delegateHandler) {
            this.delegateHandler.onActivate();
        } else {
            this.canvas.style.cursor = this.getCursor(0, 0);
        }
    }

    /**
     * Deactivates the resize handler
     * Sets the cursor style back to the default cell cursor
     */
    onDeactivate(): void {
        if (this.delegateHandler) {
            this.delegateHandler.onDeactivate();
        } else {
            this.canvas.style.cursor = "cell";
        }
    }

    /**
     * Gets the resize target at the specified position
     * @param x - The x position
     * @param y - The y position
     * @returns The resize target
     */
    getResizeTarget(
        x: number,
        y: number,
        grid: any,
        renderer: any
    ): { type: "row" | "column"; index: number } | null {
        // First check for column resize targets
        const columnIndex = ColumnResizeHandler.getResizeTarget(
            x,
            y,
            grid,
            renderer
        );
        if (columnIndex >= 0) {
            return { type: "column", index: columnIndex };
        }

        // Then check for row resize targets
        const rowIndex = RowResizeHandler.getResizeTarget(x, y, grid, renderer);
        if (rowIndex >= 0) {
            return { type: "row", index: rowIndex };
        }

        return null;
    }
}
