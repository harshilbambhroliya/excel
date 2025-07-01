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
    private autoScrollSpeed: number = 15;
    private autoScrollZone: number = 30;

    constructor(context: any, dragType: "row" | "column", startIndex: number) {
        super(context);
        this.headerDragType = dragType;
        this.headerDragStart = startIndex;
        // Don't select immediately - wait for mouse down
    }
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
                // this.renderer.render();
                // this.context.updateSelectionStats();
            }
        }
        this.renderer.render();
        this.context.updateSelectionStats();

        // Check for auto-scrolling when dragging header selection
        this.handleAutoScroll(event.offsetX, event.offsetY);

        return true;
    }
    handleMouseUp(event: MouseEvent): boolean {
        // Stop auto-scrolling and clean up document listeners
        this.stopAutoScroll();
        this.removeDocumentMouseTracking();
        return true;
    }

    getCursor(x: number, y: number): string {
        return "cell";
    } // Auto-scrolling methods
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

    private startAutoScroll(): void {
        if (this.autoScrollTimer) return;

        this.autoScrollTimer = window.setInterval(() => {
            this.performAutoScroll();
        }, 16); // ~60fps
    }

    private stopAutoScroll(): void {
        if (this.autoScrollTimer) {
            clearInterval(this.autoScrollTimer);
            this.autoScrollTimer = null;
        }
        this.autoScrollDirection = { x: 0, y: 0 };
    }

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
        this.context.updateSelectionStats();
    }
    private updateSelectionDuringAutoScroll(): void {
        // Try to use actual mouse position if available
        const canvasRect = this.canvas.getBoundingClientRect();
        const canvasX = this.lastGlobalMousePos.x - canvasRect.left;
        const canvasY = this.lastGlobalMousePos.y - canvasRect.top;

        // For column header selection, only use X coordinates and ignore Y changes
        // For row header selection, only use Y coordinates and ignore X changes
        let targetX = canvasX;
        let targetY = canvasY;

        if (this.headerDragType === "column") {
            // Column header dragging - only handle horizontal movement
            if (canvasX < 0) {
                // Mouse is to the left - select leftmost visible column
                targetX = 0;
            } else if (canvasX > canvasRect.width) {
                // Mouse is to the right - select rightmost visible column
                targetX = canvasRect.width;
            }
            // Keep Y position within header area for column dragging
            targetY = Math.min(
                targetY,
                this.grid.getDimensions().headerHeight - 1
            );
        } else if (this.headerDragType === "row") {
            // Row header dragging - only handle vertical movement
            if (canvasY < 0) {
                // Mouse is above - select topmost visible row
                targetY = 0;
            } else if (canvasY > canvasRect.height) {
                // Mouse is below - select bottommost visible row
                targetY = canvasRect.height;
            }
            // Keep X position within header area for row dragging
            targetX = Math.min(
                targetX,
                this.grid.getDimensions().headerWidth - 1
            );
        }

        // Create a synthetic event to update the selection
        const syntheticEvent = {
            offsetX: targetX,
            offsetY: targetY,
            clientX: this.lastGlobalMousePos.x,
            clientY: this.lastGlobalMousePos.y,
            preventDefault: () => {},
            stopPropagation: () => {},
        } as MouseEvent;

        // Call the appropriate selection logic without auto-scroll to prevent recursion
        const dimensions = this.grid.getDimensions();

        if (this.headerDragType === "row") {
            // Row header dragging
            const zoomFactor = this.renderer.getZoom();
            const scrollY = this.renderer.getScrollPosition().y;

            const contentY =
                (syntheticEvent.offsetY - dimensions.headerHeight) /
                    zoomFactor +
                scrollY;

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

            // If we can't find a row (e.g., scrolled past the end), use the edge row
            if (currentRow < 0) {
                if (contentY < 0) {
                    currentRow = 0;
                } else {
                    currentRow = this.grid.getCurrentRows() - 1;
                }
            }

            if (currentRow >= 0 && currentRow < this.grid.getCurrentRows()) {
                this.grid.selectRowRange(this.headerDragStart, currentRow);
                this.context.highlightHeadersForSelection();
            }
        } else if (this.headerDragType === "column") {
            // Column header dragging
            const zoomFactor = this.renderer.getZoom();
            const scrollX = this.renderer.getScrollPosition().x;

            const contentX =
                (syntheticEvent.offsetX - dimensions.headerWidth) / zoomFactor +
                scrollX;

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

            // If we can't find a column (e.g., scrolled past the end), use the edge column
            if (currentCol < 0) {
                if (contentX < 0) {
                    currentCol = 0;
                } else {
                    currentCol = this.grid.getCurrentCols() - 1;
                }
            }

            if (currentCol >= 0 && currentCol < this.grid.getCurrentCols()) {
                this.grid.selectColumnRange(this.headerDragStart, currentCol);
                this.context.highlightHeadersForSelection();
            }
        }
    }
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
                scrollX =
                    -this.autoScrollSpeed *
                    Math.min(distance / this.autoScrollZone, 3);
            } else if (canvasX > canvasRect.width) {
                // Mouse is to the right of canvas
                const distance = canvasX - canvasRect.width;
                scrollX =
                    this.autoScrollSpeed *
                    Math.min(distance / this.autoScrollZone, 3);
            }
            // Don't scroll vertically for column header selection
        } else if (this.headerDragType === "row") {
            // Row header dragging - only vertical scrolling
            if (canvasY < 0) {
                // Mouse is above canvas
                const distance = Math.abs(canvasY);
                scrollY =
                    -this.autoScrollSpeed *
                    Math.min(distance / this.autoScrollZone, 3);
            } else if (canvasY > canvasRect.height) {
                // Mouse is below canvas
                const distance = canvasY - canvasRect.height;
                scrollY =
                    this.autoScrollSpeed *
                    Math.min(distance / this.autoScrollZone, 3);
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

    // Document-level mouse tracking methods
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

    private handleGlobalMouseMove(event: MouseEvent): void {
        // Update global mouse position
        this.lastGlobalMousePos = { x: event.clientX, y: event.clientY };

        // Get canvas bounds
        const canvasRect = this.canvas.getBoundingClientRect();

        // Convert global coordinates to canvas-relative coordinates
        const canvasX = event.clientX - canvasRect.left;
        const canvasY = event.clientY - canvasRect.top;

        // Check if mouse is outside canvas bounds
        const isOutsideCanvas =
            canvasX < 0 ||
            canvasX > canvasRect.width ||
            canvasY < 0 ||
            canvasY > canvasRect.height;
        if (isOutsideCanvas) {
            // Handle auto-scrolling when outside canvas
            this.handleAutoScrollOutsideCanvas(canvasX, canvasY, canvasRect);

            // Also update selection immediately with proper edge positioning
            this.updateSelectionDuringAutoScroll();
        } else {
            // If back inside canvas, let the normal canvas mouse move handler take over
            const syntheticEvent = {
                offsetX: canvasX,
                offsetY: canvasY,
                clientX: event.clientX,
                clientY: event.clientY,
                preventDefault: () => {},
                stopPropagation: () => {},
            } as MouseEvent;

            this.handleMouseMove(syntheticEvent);
        }
    }

    private handleGlobalMouseUp(event: MouseEvent): void {
        // Clean up document listeners
        this.removeDocumentMouseTracking();

        // Handle the mouse up normally
        this.handleMouseUp(event);
    }

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
