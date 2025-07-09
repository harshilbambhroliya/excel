import { BaseHeaderDragHandler } from "../Base/BaseHeaderDragHandler.js";

/**
 * Handler for dragging row headers to select row ranges
 */
export class RowHeaderDragHandler extends BaseHeaderDragHandler {
    /**
     * Creates a new RowHeaderDragHandler instance
     * @param context - Context containing grid and renderer
     * @param startIndex - Starting row index for the drag operation
     */
    constructor(context: any, startIndex: number) {
        super(context, startIndex);
    }

    /**
     * Handles mouse down event to start row header dragging
     * @param event - Mouse event
     * @returns true if handled, false otherwise
     */
    handlePointerDown(event: PointerEvent): boolean {
        // Set up document-level mouse tracking for when mouse leaves canvas
        this.setupDocumentMouseTracking(event);

        // Select the starting row when mouse is actually pressed
        this.grid.selectRow(this.headerDragStart, true); // true = direct selection (user clicked)
        this.context.highlightHeadersForSelection();
        this.immediateUpdateSelectionStats();
        this.renderer.render();
        return true;
    }

    /**
     * Handles mouse move event to update row selection
     * @param event - Mouse event
     * @returns true if handled, false otherwise
     */
    handlePointerMove(event: PointerEvent): boolean {
        const dimensions = this.grid.getDimensions();

        // Row header dragging
        // Get the zoom factor to properly adjust calculations
        const zoomFactor = this.renderer.getZoom();
        const scrollY = this.renderer.getScrollPosition().y;

        // Convert screen Y to grid Y coordinate
        const contentY =
            (event.offsetY - dimensions.headerHeight) / zoomFactor + scrollY;

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

        // Handle edge cases when mouse is outside grid boundaries
        if (currentRow < 0) {
            if (contentY < 0) {
                currentRow = 0; // At top edge
            } else {
                currentRow = this.grid.getCurrentRows() - 1; // At bottom edge
            }
        }

        // Always update selection, whether we're at an edge or within bounds
        if (currentRow >= 0 && currentRow < this.grid.getCurrentRows()) {
            // Select the range of rows
            this.grid.selectRowRange(this.headerDragStart, currentRow, true); // true = direct selection
            // Highlight headers for the current selection range
            this.context.highlightHeadersForSelection();
        }

        this.debouncedUpdateSelectionStats();
        this.renderer.render();
        // Check for auto-scrolling when dragging header selection
        this.handleAutoScroll(event.offsetX, event.offsetY);

        return true;
    }

    /**
     * Handles auto-scrolling when dragging row headers
     * @param mouseX - Mouse X position
     * @param mouseY - Mouse Y position
     */
    protected handleAutoScroll(mouseX: number, mouseY: number): void {
        const canvasHeight = this.canvas.clientHeight;

        // Calculate distance from edges
        const topDistance = mouseY;
        const bottomDistance = canvasHeight - mouseY;

        // Determine vertical scroll direction for row header dragging
        let scrollY = 0;

        // Row header selection - only vertical scrolling
        if (topDistance < this.autoScrollZone && topDistance >= 0) {
            scrollY =
                -this.autoScrollSpeed * (1 - topDistance / this.autoScrollZone);
        } else if (
            bottomDistance < this.autoScrollZone &&
            bottomDistance >= 0
        ) {
            scrollY =
                this.autoScrollSpeed *
                (1 - bottomDistance / this.autoScrollZone);
        }

        // Update auto-scroll direction
        this.autoScrollDirection = { x: 0, y: scrollY };

        // Start auto-scrolling if needed
        if (scrollY !== 0 && !this.autoScrollTimer) {
            this.startAutoScroll();
        } else if (scrollY === 0 && this.autoScrollTimer) {
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
        // Only vertical scrolling for row header dragging
        let scrollY = 0;

        if (canvasY < 0) {
            // Mouse is above canvas
            const distance = Math.abs(canvasY);
            // Use an exponential function for more responsive distant scrolling
            const factor = Math.min(
                this.autoScrollMaxFactor,
                1 + Math.pow(distance / this.autoScrollZone, 1.5)
            );
            scrollY = -this.autoScrollSpeed * factor;
        } else if (canvasY > canvasRect.height) {
            // Mouse is below canvas
            const distance = canvasY - canvasRect.height;
            // Use an exponential function for more responsive distant scrolling
            const factor = Math.min(
                this.autoScrollMaxFactor,
                1 + Math.pow(distance / this.autoScrollZone, 1.5)
            );
            scrollY = this.autoScrollSpeed * factor;
        }

        // Update auto-scroll direction
        this.autoScrollDirection = { x: 0, y: scrollY };

        // Start auto-scrolling if needed
        if (scrollY !== 0 && !this.autoScrollTimer) {
            this.startAutoScroll();
        } else if (scrollY === 0 && this.autoScrollTimer) {
            this.stopAutoScroll();
        }
    }

    /**
     * Handles global mouse move events when dragging row headers
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

        // Create a synthetic event that always works whether inside or outside canvas
        const syntheticEvent = {
            offsetX: canvasX,
            offsetY: canvasY,
            clientX: event.clientX,
            clientY: event.clientY,
            preventDefault: () => {},
            stopPropagation: () => {},
        } as PointerEvent;

        // Check if mouse is outside canvas bounds
        const isOutsideCanvas =
            canvasX < 0 ||
            canvasX > canvasRect.width ||
            canvasY < 0 ||
            canvasY > canvasRect.height;

        if (isOutsideCanvas) {
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
            this.handlePointerMove(syntheticEvent);
        }
    }

    /**
     * Gets the row header drag target at the specified position
     * @param x - The x position
     * @param y - The y position
     * @param grid - The grid instance
     * @param renderer - The renderer instance
     * @returns The row index if on a row header, -1 if not
     */
    static getHeaderDragTarget(
        x: number,
        y: number,
        grid: any,
        renderer: any
    ): number {
        const dimensions = grid.getDimensions();

        // Check if clicking on row header
        if (x < dimensions.headerWidth && y >= dimensions.headerHeight) {
            // Get the zoom factor to properly adjust calculations
            const zoomFactor = renderer.getZoom();
            const scrollY = renderer.getScrollPosition().y;

            // Convert screen Y to grid Y coordinate
            const contentY =
                (y - dimensions.headerHeight) / zoomFactor + scrollY;
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
                return row;
            }
        }

        return -1;
    }
}
