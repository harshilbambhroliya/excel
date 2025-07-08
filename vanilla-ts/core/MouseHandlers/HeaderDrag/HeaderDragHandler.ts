import { BaseHandler } from "../Base/BaseHandler.js";
import { RowHeaderDragHandler } from "./RowHeaderDragHandler.js";
import { ColumnHeaderDragHandler } from "./ColumnHeaderDragHandler.js";

/**
 * Handler for dragging row/column headers to select ranges
 * Acts as a facade that delegates to specialized handlers
 */
export class HeaderDragHandler extends BaseHandler {
    private headerDragType: "row" | "column";
    private headerDragStart: number;
    private delegateHandler: RowHeaderDragHandler | ColumnHeaderDragHandler;

    // No need for these properties as they're in the delegate handlers
    /**
     * Creates a new HeaderDragHandler instance
     * @param context - Context containing grid and renderer
     * @param dragType - Type of header being dragged ("row" or "column")
     * @param startIndex - Starting index for the drag operation
     */
    constructor(context: any, dragType: "row" | "column", startIndex: number) {
        super(context);
        this.headerDragType = dragType;
        this.headerDragStart = startIndex;

        // Create the appropriate delegate handler
        if (dragType === "row") {
            this.delegateHandler = new RowHeaderDragHandler(
                context,
                startIndex
            );
        } else {
            this.delegateHandler = new ColumnHeaderDragHandler(
                context,
                startIndex
            );
        }
    }
    /**
     * Handles mouse down event to start header dragging
     * @param event - Mouse event
     * @returns true if handled, false otherwise
     */
    handleMouseDown(event: MouseEvent): boolean {
        return this.delegateHandler.handleMouseDown(event);
    }

    /**
     * Handles mouse move event to update header selection
     * @param event - Mouse event
     * @returns true if handled, false otherwise
     */
    handleMouseMove(event: MouseEvent): boolean {
        return this.delegateHandler.handleMouseMove(event);
    }

    /**
     * Handles mouse up event to finalize header selection
     * @param event - Mouse event
     * @returns true if handled, false otherwise
     */
    handleMouseUp(event: MouseEvent): boolean {
        return this.delegateHandler.handleMouseUp(event);
    }

    /**
     * Gets the cursor style for header dragging
     * @returns cursor style
     */
    getCursor(x: number, y: number): string {
        return this.delegateHandler.getCursor(x, y);
    }

    /**
     * Determines if a mouse position is in a header area and returns the drag info
     * @param event - Mouse event
     * @param grid - Grid instance
     * @param renderer - Renderer instance
     * @returns Header drag info or null
     */
    static getHeaderDragInfo(
        event: MouseEvent,
        grid: any,
        renderer: any
    ): { type: "row" | "column"; index: number } | null {
        // First check for row header target
        const rowIndex = RowHeaderDragHandler.getHeaderDragTarget(
            event.offsetX,
            event.offsetY,
            grid,
            renderer
        );

        if (rowIndex >= 0) {
            return { type: "row", index: rowIndex };
        }

        // Then check for column header target
        const colIndex = ColumnHeaderDragHandler.getHeaderDragTarget(
            event.offsetX,
            event.offsetY,
            grid,
            renderer
        );

        if (colIndex >= 0) {
            return { type: "column", index: colIndex };
        }

        return null;
    }
}
