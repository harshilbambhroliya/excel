import { BaseHandler } from "./BaseHandler.js";

/**
 * Handler for dragging row/column headers to select ranges
 */
export class HeaderDragHandler extends BaseHandler {
    private headerDragType: "row" | "column";
    private headerDragStart: number;

    // Document-level event handlers for outside canvas mouse tracking
    private documentMouseMoveHandler: ((event: MouseEvent) => void) | null =
        null;
    private documentMouseUpHandler: ((event: MouseEvent) => void) | null = null;
    private lastGlobalMousePos: { x: number; y: number } = { x: 0, y: 0 };

    // Auto-scrolling properties
    private autoScrollTimer: number | null = null;
    private autoScrollDirection: { x: number; y: number } = { x: 0, y: 0 };
    private autoScrollSpeed: number = 20; // Increased for better responsiveness
    private autoScrollZone: number = 50; // Increased for larger detection area
    private autoScrollMaxFactor: number = 5; // Maximum scroll speed multiplier

    // Debouncing properties for updateSelectionStats
    private updateSelectionStatsTimer: number | null = null;
    private updateSelectionStatsDelay: number = 100; // 100ms debounce delay
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
        // Don't select immediately - wait for mouse down
    }
    /**
     * Debounced version of updateSelectionStats
     * Delays execution until after the specified delay has passed since the last call
     */
    private debouncedUpdateSelectionStats(): void {
        // Clear any existing timer
        if (this.updateSelectionStatsTimer) {
            clearTimeout(this.updateSelectionStatsTimer);
        }

        // Set a new timer
        this.updateSelectionStatsTimer = setTimeout(() => {
            this.context.updateSelectionStats();
            this.updateSelectionStatsTimer = null;
        }, this.updateSelectionStatsDelay);
    }

    /**
     * Immediately updates selection stats and cancels any pending debounced update
     * Use this when you need immediate updates (e.g., on mouse up)
     */
    private immediateUpdateSelectionStats(): void {
        // Cancel any pending debounced update
        if (this.updateSelectionStatsTimer) {
            clearTimeout(this.updateSelectionStatsTimer);
            this.updateSelectionStatsTimer = null;
        }

        // Update immediately
        this.context.updateSelectionStats();
    }
    /**
     * Handles mouse down event to start header dragging
     * @param event - Mouse event
     * @returns true if handled, false otherwise
     */
    handleMouseDown(event: MouseEvent): boolean {
        // Set up document-level mouse tracking for when mouse leaves canvas
        this.setupDocumentMouseTracking(event);

        // Select the starting row/column when mouse is actually pressed
        if (this.headerDragType === "row") {
            this.grid.selectRow(this.headerDragStart);
        } else {
            this.grid.selectColumn(this.headerDragStart);
        }
        this.context.highlightHeadersForSelection();
        this.context.updateSelectionStats();
        this.renderer.render();
        this.immediateUpdateSelectionStats();
        return true;
    }

    /**
     * Handles mouse move event to update header selection
     * @param event - Mouse event
     * @returns true if handled, false otherwise
     */
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
                this.grid.selectRowRange(this.headerDragStart, currentRow);
                // Highlight headers for the current selection range
                this.context.highlightHeadersForSelection();
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
                this.grid.selectColumnRange(this.headerDragStart, currentCol);
                this.context.highlightHeadersForSelection();
            }
        }
        this.debouncedUpdateSelectionStats();
        this.renderer.render();
        // Check for auto-scrolling when dragging header selection
        this.handleAutoScroll(event.offsetX, event.offsetY);

        return true;
    }
    handleMouseUp(event: MouseEvent): boolean {
        // Stop auto-scrolling and clean up document listeners
        this.stopAutoScroll();
        this.removeDocumentMouseTracking();
        this.immediateUpdateSelectionStats();
        return true;
    }

    getCursor(x: number, y: number): string {
        return "cell";
    }
    /**
     * Handles auto-scrolling when dragging headers
     * @param mouseX - Mouse X position
     * @param mouseY - Mouse Y position
     */
    private handleAutoScroll(mouseX: number, mouseY: number): void {
        const canvasWidth = this.canvas.clientWidth;
        const canvasHeight = this.canvas.clientHeight;

        // Calculate distance from edges
        const leftDistance = mouseX;
        const rightDistance = canvasWidth - mouseX;
        const topDistance = mouseY;
        const bottomDistance = canvasHeight - mouseY;

        // Determine scroll direction based on header drag type
        let scrollX = 0;
        let scrollY = 0;

        if (this.headerDragType === "column") {
            // Column header selection - only horizontal scrolling
            if (leftDistance < this.autoScrollZone && leftDistance >= 0) {
                scrollX =
                    -this.autoScrollSpeed *
                    (1 - leftDistance / this.autoScrollZone);
            } else if (
                rightDistance < this.autoScrollZone &&
                rightDistance >= 0
            ) {
                scrollX =
                    this.autoScrollSpeed *
                    (1 - rightDistance / this.autoScrollZone);
            }
        } else if (this.headerDragType === "row") {
            // Row header selection - only vertical scrolling
            if (topDistance < this.autoScrollZone && topDistance >= 0) {
                scrollY =
                    -this.autoScrollSpeed *
                    (1 - topDistance / this.autoScrollZone);
            } else if (
                bottomDistance < this.autoScrollZone &&
                bottomDistance >= 0
            ) {
                scrollY =
                    this.autoScrollSpeed *
                    (1 - bottomDistance / this.autoScrollZone);
            }
        }

        // Update auto-scroll direction
        this.autoScrollDirection = { x: scrollX, y: scrollY };

        // Start auto-scrolling if needed
        if ((scrollX !== 0 || scrollY !== 0) && !this.autoScrollTimer) {
            this.startAutoScroll();
        } else if (scrollX === 0 && scrollY === 0 && this.autoScrollTimer) {
            this.stopAutoScroll();
        }
    }

    /**
     * Starts the auto-scrolling animation
     * Uses requestAnimationFrame for smoother performance
     */
    private startAutoScroll(): void {
        if (this.autoScrollTimer) return;

        // Use requestAnimationFrame for smoother scrolling across browsers
        let lastTimestamp = 0;
        const animateScroll = (timestamp: number) => {
            if (!this.autoScrollTimer) return;

            // Throttle to ~60fps
            if (timestamp - lastTimestamp > 16) {
                lastTimestamp = timestamp;
                this.performAutoScroll();
            }

            // Continue animation loop
            this.autoScrollTimer = requestAnimationFrame(animateScroll);
        };

        // Start the animation
        this.autoScrollTimer = requestAnimationFrame(animateScroll);
    }
    /**
     * Stops the auto-scrolling animation
     * Cancels the requestAnimationFrame loop
     */
    private stopAutoScroll(): void {
        if (this.autoScrollTimer) {
            cancelAnimationFrame(this.autoScrollTimer);
            this.autoScrollTimer = null;
        }
        this.autoScrollDirection = { x: 0, y: 0 };
    }
    /**
     * Performs the auto-scrolling based on the current direction
     * Updates the scroll position and selection during auto-scroll
     */
    private performAutoScroll(): void {
        if (
            this.autoScrollDirection.x === 0 &&
            this.autoScrollDirection.y === 0
        ) {
            return;
        }

        const scrollPos = this.renderer.getScrollPosition();
        const newScrollX = Math.max(
            0,
            scrollPos.x + this.autoScrollDirection.x
        );
        const newScrollY = Math.max(
            0,
            scrollPos.y + this.autoScrollDirection.y
        );

        this.renderer.setScroll(newScrollX, newScrollY);

        // Update selection during auto-scroll
        this.updateSelectionDuringAutoScroll();

        this.renderer.render();
        this.debouncedUpdateSelectionStats();
    }
    /**
     * Updates the selection based on the current mouse position during auto-scrolling
     * Uses the last known global mouse position to ensure consistent selection behavior
     */
    private updateSelectionDuringAutoScroll(): void {
        // Use actual global mouse position for selection
        const canvasRect = this.canvas.getBoundingClientRect();
        const canvasX = this.lastGlobalMousePos.x - canvasRect.left;
        const canvasY = this.lastGlobalMousePos.y - canvasRect.top;

        // Create a synthetic event with mouse position
        const syntheticEvent = {
            offsetX: canvasX,
            offsetY: canvasY,
            clientX: this.lastGlobalMousePos.x,
            clientY: this.lastGlobalMousePos.y,
            preventDefault: () => {},
            stopPropagation: () => {},
        } as MouseEvent;

        // Reuse the same handleMouseMove logic for consistency
        // This ensures both in-canvas and out-of-canvas selection work the same way
        this.handleMouseMove(syntheticEvent);
    }
    /**
     * Handles auto-scrolling when the mouse is outside the canvas
     * Calculates scroll speed based on distance from edges
     * @param canvasX - Mouse X position relative to canvas
     * @param canvasY - Mouse Y position relative to canvas
     * @param canvasRect - The bounding rectangle of the canvas
     */
    private handleAutoScrollOutsideCanvas(
        canvasX: number,
        canvasY: number,
        canvasRect: DOMRect
    ): void {
        // Calculate how far outside the canvas the mouse is
        let scrollX = 0;
        let scrollY = 0;

        // Only scroll in the relevant direction based on header drag type
        if (this.headerDragType === "column") {
            // Column header dragging - only horizontal scrolling
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
            // Don't scroll vertically for column header selection
        } else if (this.headerDragType === "row") {
            // Row header dragging - only vertical scrolling
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
            // Don't scroll horizontally for row header selection
        }

        // Update auto-scroll direction
        this.autoScrollDirection = { x: scrollX, y: scrollY };

        // Start auto-scrolling if needed
        if ((scrollX !== 0 || scrollY !== 0) && !this.autoScrollTimer) {
            this.startAutoScroll();
        } else if (scrollX === 0 && scrollY === 0 && this.autoScrollTimer) {
            this.stopAutoScroll();
        }
    }

    /**
     * Sets up document-level mouse tracking for header dragging
     * @param initialEvent - The initial mouse event to capture
     */
    private setupDocumentMouseTracking(initialEvent: MouseEvent): void {
        // Store initial global mouse position
        this.lastGlobalMousePos = {
            x: initialEvent.clientX,
            y: initialEvent.clientY,
        };

        // Create document mouse move handler
        this.documentMouseMoveHandler = (event: MouseEvent) => {
            this.handleGlobalMouseMove(event);
        };

        // Create document mouse up handler
        this.documentMouseUpHandler = (event: MouseEvent) => {
            this.handleGlobalMouseUp(event);
        };

        // Add document-level listeners
        document.addEventListener("mousemove", this.documentMouseMoveHandler);
        document.addEventListener("mouseup", this.documentMouseUpHandler);
    }
    /**
     * Handles global mouse move events when dragging headers
     * This allows tracking mouse movement even when outside the canvas
     * @param event - The mouse event from the document
     */
    private handleGlobalMouseMove(event: MouseEvent): void {
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
        // This enables right-to-left scrolling
        if (isOverRowHeader && this.headerDragType === "column") {
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
     * Handles global mouse up events when dragging headers
     * This allows cleaning up listeners when mouse is released outside the canvas
     * @param event - The mouse event from the document
     */
    private handleGlobalMouseUp(event: MouseEvent): void {
        // Clean up document listeners
        this.removeDocumentMouseTracking();

        // Handle the mouse up normally
        this.handleMouseUp(event);
    }
    /**
     * Removes document-level mouse tracking listeners
     * This is called when the mouse is released or when dragging ends
     */
    private removeDocumentMouseTracking(): void {
        if (this.documentMouseMoveHandler) {
            document.removeEventListener(
                "mousemove",
                this.documentMouseMoveHandler
            );
            this.documentMouseMoveHandler = null;
        }

        if (this.documentMouseUpHandler) {
            document.removeEventListener(
                "mouseup",
                this.documentMouseUpHandler
            );
            this.documentMouseUpHandler = null;
        }
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
