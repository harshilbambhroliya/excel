import { BaseHandler } from "./BaseHandler.js";

/**
 * Default handler for normal cell selection and interaction
 */
export class DefaultHandler extends BaseHandler {
    private isMouseDown: boolean = false;
    private isDragging: boolean = false;
    private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };

    // Auto-scrolling properties
    private autoScrollTimer: number | null = null;
    private autoScrollDirection: { x: number; y: number } = { x: 0, y: 0 };
    private autoScrollSpeed: number = 15;
    private autoScrollZone: number = 30;

    // Document-level event handlers for outside canvas mouse tracking
    private documentMouseMoveHandler: ((event: MouseEvent) => void) | null =
        null;
    private documentMouseUpHandler: ((event: MouseEvent) => void) | null = null;
    private lastGlobalMousePos: { x: number; y: number } = { x: 0, y: 0 };

    /**
     * Handles mouse down events to initiate resizing
     * @param event - The mouse event
     * @returns True if handled, false otherwise
     */
    handleMouseDown(event: MouseEvent): boolean {
        this.canvas.focus();
        this.isMouseDown = true;
        this.lastMousePos = { x: event.offsetX, y: event.offsetY };

        // Set up document-level mouse tracking for when mouse leaves canvas
        this.setupDocumentMouseTracking(event);

        const dimensions = this.grid.getDimensions();

        // Check if clicking on header corner (select all)
        if (
            event.offsetX < dimensions.headerWidth &&
            event.offsetY < dimensions.headerHeight
        ) {
            this.grid.clearAllSelections();
            this.grid.selectAll();
            this.renderer.render();
            this.context.updateSelectionStats();
            return true;
        }

        // Cell selection
        const cellPos = this.renderer.getCellAtPosition(
            event.offsetX,
            event.offsetY
        );
        if (cellPos) {
            this.renderer.dottedLineAcrossSelection = false;
            this.context.finishCellEdit(); // Clear all selections (cell and header)
            this.grid.clearAllSelections(); // Clear any origin cell highlighting and formula range selection
            this.renderer.clearOriginCell();
            this.renderer.clearFormulaRangeSelection();

            // Start a new cell selection
            this.grid.getSelection().start(cellPos.row, cellPos.col);

            // Highlight the corresponding row and column headers
            this.context.highlightHeadersForCell(cellPos.row, cellPos.col);

            this.renderer.render();
            this.context.updateSelectionStats();
        } else {
            // Clicked in an empty area, clear selection
            this.grid.clearAllSelections();
            this.renderer.clearOriginCell();
            this.renderer.clearFormulaRangeSelection();
            this.renderer.render();
        }

        return true;
    }

    /**
     * Handles mouse move events for cell selection and dragging
     * @param event - The mouse event
     * @returns True if handled, false otherwise
     */
    handleMouseMove(event: MouseEvent): boolean {
        if (!this.isMouseDown) return false;

        // Handle cell selection dragging
        const cellPos = this.renderer.getCellAtPosition(
            event.offsetX,
            event.offsetY
        );
        if (cellPos && this.grid.getSelection().isActive) {
            this.isDragging = true;

            // Store previous selection end coordinates
            const prevEndRow = this.grid.getSelection().endRow;
            const prevEndCol = this.grid.getSelection().endCol;

            // Extend the selection
            this.grid.getSelection().extend(cellPos.row, cellPos.col);

            // If the end cell changed, update header highlighting
            if (
                prevEndRow !== this.grid.getSelection().endRow ||
                prevEndCol !== this.grid.getSelection().endCol
            ) {
                // Clear all header selections first
                this.grid.clearHeaderSelections();

                // Highlight headers for the current selection range
                this.context.highlightHeadersForSelection();
            }

            this.renderer.render();
            this.context.updateSelectionStats();

            // Check for auto-scrolling when dragging selection
            this.handleAutoScroll(event.offsetX, event.offsetY);
        } else {
            // Stop auto-scrolling if we're not in a valid cell
            this.stopAutoScroll();
        }

        return true;
    }

    /**
     * Handles mouse up events for cell selection and dragging
     * @param event - The mouse event
     * @returns True if handled, false otherwise
     */
    handleMouseUp(event: MouseEvent): boolean {
        this.isMouseDown = false;
        this.isDragging = false;

        // Clean up document-level mouse tracking
        this.removeDocumentMouseTracking();

        // Stop auto-scrolling when mouse is released
        this.stopAutoScroll();

        return true;
    }

    /**
     * Gets the cursor style based on the current resize target
     * @param x - The x position
     * @param y - The y position
     * @returns The cursor style
     */
    getCursor(x: number, y: number): string {
        return "cell";
    }

    /**
     * Activates the default handler
     * Sets up initial state and cursor
     */
    onDeactivate(): void {
        this.stopAutoScroll();
        this.removeDocumentMouseTracking();
    }

    /**
     * Handles auto-scrolling based on mouse position
     * @param mouseX - The x coordinate of the mouse
     * @param mouseY - The y coordinate of the mouse
     */
    private handleAutoScroll(mouseX: number, mouseY: number): void {
        const canvasWidth = this.canvas.clientWidth;
        const canvasHeight = this.canvas.clientHeight;

        // Calculate distance from edges
        const leftDistance = mouseX;
        const rightDistance = canvasWidth - mouseX;
        const topDistance = mouseY;
        const bottomDistance = canvasHeight - mouseY;

        // Determine scroll direction
        let scrollX = 0;
        let scrollY = 0;

        // Check horizontal scrolling
        if (leftDistance < this.autoScrollZone && leftDistance >= 0) {
            scrollX =
                -this.autoScrollSpeed *
                (1 - leftDistance / this.autoScrollZone);
        } else if (rightDistance < this.autoScrollZone && rightDistance >= 0) {
            scrollX =
                this.autoScrollSpeed *
                (1 - rightDistance / this.autoScrollZone);
        }

        // Check vertical scrolling
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
        this.autoScrollDirection = { x: scrollX, y: scrollY };

        // Start auto-scrolling if needed
        if ((scrollX !== 0 || scrollY !== 0) && !this.autoScrollTimer) {
            this.startAutoScroll();
        } else if (scrollX === 0 && scrollY === 0 && this.autoScrollTimer) {
            this.stopAutoScroll();
        }
    }

    /**
     * Starts the auto-scroll timer
     */
    private startAutoScroll(): void {
        if (this.autoScrollTimer) {
            return; // Already running
        }

        this.autoScrollTimer = setInterval(() => {
            if (!this.isDragging || !this.isMouseDown) {
                this.stopAutoScroll();
                return;
            }

            const currentScroll = this.renderer.getScrollPosition();
            const newScrollX = Math.max(
                0,
                currentScroll.x + this.autoScrollDirection.x
            );
            const newScrollY = Math.max(
                0,
                currentScroll.y + this.autoScrollDirection.y
            );

            // Apply the scroll
            if (this.scrollbarManager) {
                this.scrollbarManager.setScroll(newScrollX, newScrollY);
            } else {
                this.renderer.setScroll(newScrollX, newScrollY);
                this.renderer.render();
            }

            // Update cell editor position if editing
            if (this.context.editingCell) {
                // Would need to expose updateCellEditorPosition in context
            }

            // Continue extending selection based on current mouse position
            this.updateSelectionDuringAutoScroll();
        }, 16); // ~60fps
    }

    /**
     * Stops the auto-scroll timer
     */
    private stopAutoScroll(): void {
        if (this.autoScrollTimer) {
            clearInterval(this.autoScrollTimer);
            this.autoScrollTimer = null;
        }
        this.autoScrollDirection = { x: 0, y: 0 };
    }

    /**
     * Updates the selection during auto-scrolling
     * Uses the last known mouse position to extend the selection
     */
    private updateSelectionDuringAutoScroll(): void {
        if (!this.isDragging || !this.grid.getSelection().isActive) {
            return;
        }

        const selection = this.grid.getSelection();

        // Try to use actual mouse position if available
        const canvasRect = this.canvas.getBoundingClientRect();
        const canvasX = this.lastGlobalMousePos.x - canvasRect.left;
        const canvasY = this.lastGlobalMousePos.y - canvasRect.top;

        // If we can calculate a valid cell position from the actual mouse coordinates, use that
        const cellPos = this.renderer.getCellAtPosition(
            Math.max(0, Math.min(canvasRect.width, canvasX)),
            Math.max(0, Math.min(canvasRect.height, canvasY))
        );

        let targetRow = selection.endRow;
        let targetCol = selection.endCol;

        if (cellPos) {
            // Use the actual cell position if we can calculate it
            targetRow = cellPos.row;
            targetCol = cellPos.col;
        } else {
            // Fallback to directional extension based on scroll direction
            if (this.autoScrollDirection.y > 0) {
                // Scrolling down, extend selection downward
                targetRow = Math.min(
                    this.grid.getCurrentRows() - 1,
                    targetRow + 1
                );
            } else if (this.autoScrollDirection.y < 0) {
                // Scrolling up, extend selection upward
                targetRow = Math.max(0, targetRow - 1);
            }

            if (this.autoScrollDirection.x > 0) {
                // Scrolling right, extend selection rightward
                targetCol = Math.min(
                    this.grid.getCurrentCols() - 1,
                    targetCol + 1
                );
            } else if (this.autoScrollDirection.x < 0) {
                // Scrolling left, extend selection leftward
                targetCol = Math.max(0, targetCol - 1);
            }
        }

        // Only update if the target position changed
        if (targetRow !== selection.endRow || targetCol !== selection.endCol) {
            selection.extend(targetRow, targetCol);
            // Update header highlighting
            this.grid.clearHeaderSelections();
            this.context.highlightHeadersForSelection();

            this.renderer.render();
            this.context.updateSelectionStats();
        }
    }

    /**
     * Sets up document-level mouse tracking for when the mouse leaves the canvas
     *  - Listens for mousemove and mouseup events on the document
     *  - Handles global mouse move and mouse up events
     *  @param initialEvent - The initial mouse event that triggered the canvas mouse down
     * */
    private setupDocumentMouseTracking(initialEvent: MouseEvent): void {
        // Store initial global position
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
        if (!this.isMouseDown) return;

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

        // Check if mouse is outside canvas bounds
        const isOutsideCanvas =
            canvasX < 0 ||
            canvasX > canvasRect.width ||
            canvasY < 0 ||
            canvasY > canvasRect.height;

        // Handle special case: when mouse is over row headers during cell selection
        // This enables right-to-left scrolling
        if (isOverRowHeader && this.isMouseDown && this.isDragging) {
            // Force scroll to the left when over row headers during cell selection
            this.autoScrollDirection = { x: -this.autoScrollSpeed, y: 0 };

            // Start auto-scrolling if not already started
            if (!this.autoScrollTimer) {
                this.startAutoScroll();
            }

            // Continue extending selection based on current mouse position
            this.updateSelectionDuringAutoScroll();
        } else if (isOutsideCanvas) {
            // Handle auto-scrolling when outside canvas
            this.handleAutoScrollOutsideCanvas(canvasX, canvasY, canvasRect);
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

    /**
     * Handles global mouse up events when the mouse is outside the canvas
     *  - Cleans up document listeners
     *  - Calls the normal mouse up handler
     * @param event - The mouse event
     */
    private handleGlobalMouseUp(event: MouseEvent): void {
        // Clean up document listeners
        this.removeDocumentMouseTracking();

        // Handle the mouse up normally
        this.handleMouseUp(event);
    }

    /**
     * Removes document-level mouse tracking
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
     * Handles auto-scrolling when the mouse is outside the canvas
     * @param canvasX - The x coordinate of the mouse relative to the canvas
     * @param canvasY - The y coordinate of the mouse relative to the canvas
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

        // Horizontal scrolling
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

        // Vertical scrolling
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

        // Update auto-scroll direction
        this.autoScrollDirection = { x: scrollX, y: scrollY };

        // Start auto-scrolling if needed
        if ((scrollX !== 0 || scrollY !== 0) && !this.autoScrollTimer) {
            this.startAutoScroll();
        } else if (scrollX === 0 && scrollY === 0 && this.autoScrollTimer) {
            this.stopAutoScroll();
        }
    }
}
