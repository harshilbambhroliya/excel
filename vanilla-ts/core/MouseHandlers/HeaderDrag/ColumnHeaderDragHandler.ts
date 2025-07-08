import { BaseHeaderDragHandler } from "../Base/BaseHeaderDragHandler.js";

/**
 * Handler for dragging column headers to select column ranges
 */
export class ColumnHeaderDragHandler extends BaseHeaderDragHandler {
    /**
     * Creates a new ColumnHeaderDragHandler instance
     * @param context - Context containing grid and renderer
     * @param startIndex - Starting column index for the drag operation
     */
    constructor(context: any, startIndex: number) {
        super(context, startIndex);
    }

    /**
     * Handles mouse down event to start column header dragging
     * @param event - Mouse event
     * @returns true if handled, false otherwise
     */
    handleMouseDown(event: MouseEvent): boolean {
        // Set up document-level mouse tracking for when mouse leaves canvas
        this.setupDocumentMouseTracking(event);

        // Select the starting column when mouse is actually pressed
        this.grid.selectColumn(this.headerDragStart, true); // true = direct selection (user clicked)
        this.context.highlightHeadersForSelection();
        this.immediateUpdateSelectionStats();
        this.renderer.render();
        return true;
    }

    /**
     * Handles mouse move event to update column selection
     * @param event - Mouse event
     * @returns true if handled, false otherwise
     */
    handleMouseMove(event: MouseEvent): boolean {
        const dimensions = this.grid.getDimensions();

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

        // Handle edge cases when mouse is outside grid boundaries
        if (currentCol < 0) {
            if (contentX < 0) {
                currentCol = 0; // At left edge
            } else {
                currentCol = this.grid.getCurrentCols() - 1; // At right edge
            }
        }

        // Always update selection, whether we're at an edge or within bounds
        if (currentCol >= 0 && currentCol < this.grid.getCurrentCols()) {
            // Select the range of columns
            this.grid.selectColumnRange(this.headerDragStart, currentCol, true); // true = direct selection
            this.context.highlightHeadersForSelection();
        }

        this.debouncedUpdateSelectionStats();
        this.renderer.render();
        // Check for auto-scrolling when dragging header selection
        this.handleAutoScroll(event.offsetX, event.offsetY);

        return true;
    }

    /**
     * Handles auto-scrolling when dragging column headers
     * @param mouseX - Mouse X position
     * @param mouseY - Mouse Y position
     */
    protected handleAutoScroll(mouseX: number, mouseY: number): void {
        const canvasWidth = this.canvas.clientWidth;

        // Calculate distance from edges
        const leftDistance = mouseX;
        const rightDistance = canvasWidth - mouseX;

        // Determine horizontal scroll direction for column header dragging
        let scrollX = 0;

        // Column header selection - only horizontal scrolling
        if (leftDistance < this.autoScrollZone && leftDistance >= 0) {
            scrollX =
                -this.autoScrollSpeed *
                (1 - leftDistance / this.autoScrollZone);
        } else if (rightDistance < this.autoScrollZone && rightDistance >= 0) {
            scrollX =
                this.autoScrollSpeed *
                (1 - rightDistance / this.autoScrollZone);
        }

        // Update auto-scroll direction
        this.autoScrollDirection = { x: scrollX, y: 0 };

        // Start auto-scrolling if needed
        if (scrollX !== 0 && !this.autoScrollTimer) {
            this.startAutoScroll();
        } else if (scrollX === 0 && this.autoScrollTimer) {
            this.stopAutoScroll();
        }
    }

    /**
     * Handles auto-scrolling when the mouse is outside the canvas
     * Calculates scroll speed based on distance from edges
     * @param canvasX - Mouse X position relative to canvas
     * @param canvasY - Mouse Y position relative to canvas
     * @param canvasRect - The bounding rectangle of the canvas
     */
    protected handleAutoScrollOutsideCanvas(
        canvasX: number,
        canvasY: number,
        canvasRect: DOMRect
    ): void {
        // Only horizontal scrolling for column header dragging
        let scrollX = 0;

        if (canvasX < 0) {
            // Mouse is to the left of canvas
            const distance = Math.abs(canvasX);
            // Use an exponential function for more responsive distant scrolling
            const factor = Math.min(
                this.autoScrollMaxFactor,
                1 + Math.pow(distance / this.autoScrollZone, 1.5)
            );
            scrollX = -this.autoScrollSpeed * factor;
        } else if (canvasX > canvasRect.width) {
            // Mouse is to the right of canvas
            const distance = canvasX - canvasRect.width;
            // Use an exponential function for more responsive distant scrolling
            const factor = Math.min(
                this.autoScrollMaxFactor,
                1 + Math.pow(distance / this.autoScrollZone, 1.5)
            );
            scrollX = this.autoScrollSpeed * factor;
        }

        // Update auto-scroll direction
        this.autoScrollDirection = { x: scrollX, y: 0 };

        // Start auto-scrolling if needed
        if (scrollX !== 0 && !this.autoScrollTimer) {
            this.startAutoScroll();
        } else if (scrollX === 0 && this.autoScrollTimer) {
            this.stopAutoScroll();
        }
    }

    /**
     * Handles global mouse move events when dragging column headers
     * This allows tracking mouse movement even when outside the canvas
     * @param event - The mouse event from the document
     */
    protected handleGlobalMouseMove(event: MouseEvent): void {
        // Update global mouse position
        this.lastGlobalMousePos = { x: event.clientX, y: event.clientY };

        // Get canvas bounds
        const canvasRect = this.canvas.getBoundingClientRect();

        // Convert global coordinates to canvas-relative coordinates
        const canvasX = event.clientX - canvasRect.left;
        const canvasY = event.clientY - canvasRect.top;

        // Get dimensions for checking row headers
        const dimensions = this.grid.getDimensions();

        // Check if mouse is over a row header (left side of grid)
        const isOverRowHeader =
            canvasX >= 0 &&
            canvasX < dimensions.headerWidth &&
            canvasY >= dimensions.headerHeight;

        // Create a synthetic event that always works whether inside or outside canvas
        const syntheticEvent = {
            offsetX: canvasX,
            offsetY: canvasY,
            clientX: event.clientX,
            clientY: event.clientY,
            preventDefault: () => {},
            stopPropagation: () => {},
        } as MouseEvent;

        // Check if mouse is outside canvas bounds
        const isOutsideCanvas =
            canvasX < 0 ||
            canvasX > canvasRect.width ||
            canvasY < 0 ||
            canvasY > canvasRect.height;

        // Handle special case: when dragging column headers and over row headers (left side)
        if (isOverRowHeader) {
            // Force scroll to the left when over row headers during column selection
            this.autoScrollDirection = { x: -this.autoScrollSpeed, y: 0 };

            // Start auto-scrolling if not already started
            if (!this.autoScrollTimer) {
                this.startAutoScroll();
            }

            // Update selection during auto-scroll
            this.updateSelectionDuringAutoScroll();
        } else if (isOutsideCanvas) {
            // Handle auto-scrolling when outside canvas
            this.handleAutoScrollOutsideCanvas(canvasX, canvasY, canvasRect);

            // Update selection during auto-scroll with current mouse position
            this.updateSelectionDuringAutoScroll();
        } else {
            // Even when back inside canvas, we should stop auto-scrolling
            if (this.autoScrollTimer) {
                this.stopAutoScroll();
            }

            // Always handle the mouse move regardless of position
            this.handleMouseMove(syntheticEvent);
        }
    }

    /**
     * Gets the column header drag target at the specified position
     * @param x - The x position
     * @param y - The y position
     * @param grid - The grid instance
     * @param renderer - The renderer instance
     * @returns The column index if on a column header, -1 if not
     */
    static getHeaderDragTarget(
        x: number,
        y: number,
        grid: any,
        renderer: any
    ): number {
        const dimensions = grid.getDimensions();

        // Check if clicking on column header
        if (y < dimensions.headerHeight && x >= dimensions.headerWidth) {
            // Get the zoom factor to properly adjust calculations
            const zoomFactor = renderer.getZoom();
            const scrollX = renderer.getScrollPosition().x;

            // Convert screen X to grid X coordinate
            const contentX =
                (x - dimensions.headerWidth) / zoomFactor + scrollX;
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
                return col;
            }
        }

        return -1;
    }
}
