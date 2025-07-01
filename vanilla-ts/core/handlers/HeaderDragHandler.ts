import { BaseHandler } from "./BaseHandler.js";

/**
 * Handler for dragging row/column headers to select ranges
 */
export class HeaderDragHandler extends BaseHandler {
    private headerDragType: "row" | "column";
    private headerDragStart: number;
    constructor(context: any, dragType: "row" | "column", startIndex: number) {
        super(context);
        this.headerDragType = dragType;
        this.headerDragStart = startIndex;
        // Don't select immediately - wait for mouse down
    }
    handleMouseDown(event: MouseEvent): boolean {
        // Select the starting row/column when mouse is actually pressed
        if (this.headerDragType === "row") {
            this.grid.selectRow(this.headerDragStart);
        } else {
            this.grid.selectColumn(this.headerDragStart);
        }
        this.context.highlightHeadersForSelection();
        this.renderer.render();
        this.context.updateSelectionStats();
        return true;
    }

    handleMouseMove(event: MouseEvent): boolean {
        const dimensions = this.grid.getDimensions();

        if (this.headerDragType === "row") {
            // Row header dragging
            // Get the zoom factor to properly adjust calculations
            const zoomFactor = this.renderer.getZoom();
            const scrollY = this.renderer.getScrollPosition().y;

            // Convert screen Y to grid Y coordinate
            const contentY =
                (event.offsetY - dimensions.headerHeight) / zoomFactor +
                scrollY;

            // Find the current row under the cursor
            let currentRow = -1;
            let y = 0;
            for (let i = 0; i < this.grid.getCurrentRows(); i++) {
                const rowHeight = this.grid.getRowHeight(i);
                if (contentY >= y && contentY < y + rowHeight) {
                    currentRow = i;
                    break;
                }
                y += rowHeight;
            }

            // If we found a valid row and it's different from the initial row
            if (currentRow >= 0 && currentRow < this.grid.getCurrentRows()) {
                // Select the range of rows
                this.grid.selectRowRange(this.headerDragStart, currentRow);
                // Highlight headers for the current selection range
                this.context.highlightHeadersForSelection();
                this.renderer.render();
                this.context.updateSelectionStats();
            }
        } else if (this.headerDragType === "column") {
            // Column header dragging
            // Get the zoom factor to properly adjust calculations
            const zoomFactor = this.renderer.getZoom();
            const scrollX = this.renderer.getScrollPosition().x;

            // Convert screen X to grid X coordinate
            const contentX =
                (event.offsetX - dimensions.headerWidth) / zoomFactor + scrollX;

            // Find the current column under the cursor
            let currentCol = -1;
            let x = 0;
            for (let i = 0; i < this.grid.getCurrentCols(); i++) {
                const colWidth = this.grid.getColumnWidth(i);
                if (contentX >= x && contentX < x + colWidth) {
                    currentCol = i;
                    break;
                }
                x += colWidth;
            }

            // If we found a valid column and it's different from the initial column
            if (currentCol >= 0 && currentCol < this.grid.getCurrentCols()) {
                // Select the range of columns
                this.grid.selectColumnRange(this.headerDragStart, currentCol);
                this.context.highlightHeadersForSelection();
                this.renderer.render();
                this.context.updateSelectionStats();
            }
        }

        return true;
    }

    handleMouseUp(event: MouseEvent): boolean {
        return true;
    }

    getCursor(x: number, y: number): string {
        return "cell";
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
        const dimensions = grid.getDimensions();

        // Check if clicking on row header
        if (
            event.offsetX < dimensions.headerWidth &&
            event.offsetY >= dimensions.headerHeight
        ) {
            // Get the zoom factor to properly adjust calculations
            const zoomFactor = renderer.getZoom();
            const scrollY = renderer.getScrollPosition().y;

            // Convert screen Y to grid Y coordinate
            const contentY =
                (event.offsetY - dimensions.headerHeight) / zoomFactor +
                scrollY;
            const gridY = contentY + dimensions.headerHeight;

            // Find the row using binary search for better performance
            let row = -1;
            let left = 0;
            let right = grid.getMaxRows() - 1;

            while (left <= right) {
                const mid = Math.floor((left + right) / 2);

                // Calculate row boundaries
                let rowTop = dimensions.headerHeight;
                for (let i = 0; i < mid; i++) {
                    rowTop += grid.getRowHeight(i);
                }

                const rowBottom = rowTop + grid.getRowHeight(mid);

                if (gridY >= rowTop && gridY < rowBottom) {
                    row = mid;
                    break;
                } else if (gridY < rowTop) {
                    right = mid - 1;
                } else {
                    left = mid + 1;
                }
            }

            if (row >= 0 && row < grid.getMaxRows()) {
                return { type: "row", index: row };
            }
        }

        // Check if clicking on column header
        if (
            event.offsetY < dimensions.headerHeight &&
            event.offsetX >= dimensions.headerWidth
        ) {
            // Get the zoom factor to properly adjust calculations
            const zoomFactor = renderer.getZoom();
            const scrollX = renderer.getScrollPosition().x;

            // Convert screen X to grid X coordinate
            const contentX =
                (event.offsetX - dimensions.headerWidth) / zoomFactor + scrollX;
            const gridX = contentX + dimensions.headerWidth;

            // Find the column using binary search for better performance
            let col = -1;
            let left = 0;
            let right = grid.getMaxCols() - 1;

            while (left <= right) {
                const mid = Math.floor((left + right) / 2);

                // Calculate column boundaries
                let colLeft = dimensions.headerWidth;
                for (let i = 0; i < mid; i++) {
                    colLeft += grid.getColumnWidth(i);
                }

                const colRight = colLeft + grid.getColumnWidth(mid);

                if (gridX >= colLeft && gridX < colRight) {
                    col = mid;
                    break;
                } else if (gridX < colLeft) {
                    right = mid - 1;
                } else {
                    left = mid + 1;
                }
            }

            if (col >= 0 && col < grid.getMaxCols()) {
                return { type: "column", index: col };
            }
        }

        return null;
    }
}
