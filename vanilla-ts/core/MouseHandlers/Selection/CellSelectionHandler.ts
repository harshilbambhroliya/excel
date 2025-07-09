import { BaseHandler } from "../Base/BaseHandler.js";

/**
 * Handler for cell selection and interaction
 */
export class CellSelectionHandler extends BaseHandler {
    private isMouseDown: boolean = false;
    private isDragging: boolean = false;
    private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };

    // Auto-scrolling properties
    private autoScrollTimer: number | null = null;
    private autoScrollDirection: { x: number; y: number } = { x: 0, y: 0 };
    private autoScrollSpeed: number = 15;
    private autoScrollZone: number = 30;

    // Document-level event handlers for outside canvas pointer tracking
    private documentMouseMoveHandler: ((event: PointerEvent) => void) | null =
        null;
    private documentMouseUpHandler: ((event: PointerEvent) => void) | null =
        null;
    private lastGlobalMousePos: { x: number; y: number } = { x: 0, y: 0 };

    /**
     * Reference to the canvas element
     */
    protected get canvas(): HTMLCanvasElement {
        return this.context.canvas;
    }

    /**
     * Reference to the grid
     */
    protected get grid() {
        return this.context.grid;
    }

    /**
     * Reference to the renderer
     */
    protected get renderer() {
        return this.context.renderer;
    }

    /**
     * Reference to the scrollbar manager
     */
    protected get scrollbarManager() {
        return this.context.scrollbarManager;
    }

    /**
     * Handles mouse down events for cell selection
     * @param event - The mouse event
     * @returns True if handled, false otherwise
     */
    handlePointerDown(event: PointerEvent): boolean {
        this.canvas.focus();
        this.isMouseDown = true;
        this.lastMousePos = { x: event.offsetX, y: event.offsetY };

        // Set up document-level mouse tracking for when mouse leaves canvas
        this.setupDocumentMouseTracking(event);

        const dimensions = this.grid.getDimensions();

        // Check if we're in the header area - if so, let another handler handle it
        if (
            event.offsetX < dimensions.headerWidth &&
            event.offsetY < dimensions.headerHeight
        ) {
            return false;
        }

        // Cell selection
        const cellPos = this.renderer.getCellAtPosition(
            event.offsetX,
            event.offsetY
        );

        if (cellPos) {
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
            return true;
        } else {
            // Clicked in an empty area, clear selection
            this.grid.clearAllSelections();
            this.renderer.clearOriginCell();
            this.renderer.clearFormulaRangeSelection();
            this.renderer.render();
            return true;
        }
    }

    /**
     * Handles mouse move events for cell selection and dragging
     * @param event - The mouse event
     * @returns True if handled, false otherwise
     */
    handlePointerMove(event: PointerEvent): boolean {
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
    handlePointerUp(event: PointerEvent): boolean {
        this.isMouseDown = false;
        this.isDragging = false;

        // Clean up document-level mouse tracking
        this.removeDocumentMouseTracking();

        // Stop auto-scrolling when mouse is released
        this.stopAutoScroll();

        return true;
    }

    /**
     * Gets the cursor style based on the current position
     * @param x - The x position
     * @param y - The y position
     * @returns The cursor style
     */
    getCursor(x: number, y: number): string {
        return "cell";
    }

    /**
     * Activates the handler
     * Sets up initial state and cursor
     */
    onActivate(): void {
        // Nothing special needed on activation
    }

    /**
     * Deactivates the handler
     * Cleans up any resources or states
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

            // For smoother up-down selection, we'll update the selection before scrolling
            // This is particularly important when selecting from bottom to top
            if (this.autoScrollDirection.y < 0) {
                // When scrolling up, update selection first
                this.updateSelectionDuringAutoScroll();
            }

            // Apply the scroll
            if (this.scrollbarManager) {
                this.scrollbarManager.setScroll(newScrollX, newScrollY);
            } else {
                this.renderer.setScroll(newScrollX, newScrollY);
            }

            // For other scroll directions, update selection after scrolling
            if (this.autoScrollDirection.y >= 0) {
                this.updateSelectionDuringAutoScroll();
            }

            // Always render at the end to show both selection and scroll changes
            this.renderer.render();

            // Update cell editor position if editing
            if (this.context.editingCell) {
                // Would need to expose updateCellEditorPosition in context
            }
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

        // Adjust the coordinates based on auto-scroll direction
        // This helps predict the cell the user is trying to select
        let adjustedCanvasX = canvasX;
        let adjustedCanvasY = canvasY;

        // If we're scrolling up and mouse is above the viewport
        if (this.autoScrollDirection.y < 0 && canvasY < 0) {
            // Project position based on scroll direction and speed
            adjustedCanvasY = -5; // Just above the top edge but still valid
        }
        // If we're scrolling down and mouse is below the viewport
        else if (
            this.autoScrollDirection.y > 0 &&
            canvasY > canvasRect.height
        ) {
            adjustedCanvasY = canvasRect.height + 5; // Just below the bottom edge
        }

        // Similarly for horizontal scrolling
        if (this.autoScrollDirection.x < 0 && canvasX < 0) {
            adjustedCanvasX = -5;
        } else if (
            this.autoScrollDirection.x > 0 &&
            canvasX > canvasRect.width
        ) {
            adjustedCanvasX = canvasRect.width + 5;
        }

        // Try to get a cell at the adjusted position
        const cellPos = this.renderer.getCellAtPosition(
            Math.max(0, Math.min(canvasRect.width, adjustedCanvasX)),
            Math.max(0, Math.min(canvasRect.height, adjustedCanvasY))
        );

        let targetRow = selection.endRow;
        let targetCol = selection.endCol;

        if (cellPos) {
            // Use the actual cell position if we can calculate it
            targetRow = cellPos.row;
            targetCol = cellPos.col;
        } else {
            // For smoother selection experience, be more aggressive with scrolling direction
            // This makes selection feel more responsive, especially when going up
            if (this.autoScrollDirection.y > 0) {
                // Scrolling down, extend selection downward
                targetRow = Math.min(
                    this.grid.getCurrentRows() - 1,
                    targetRow +
                        Math.max(
                            1,
                            Math.abs(Math.round(this.autoScrollDirection.y / 5))
                        )
                );
            } else if (this.autoScrollDirection.y < 0) {
                // Scrolling up, extend selection upward
                // More aggressive scroll rate when going up for better user experience
                targetRow = Math.max(
                    0,
                    targetRow -
                        Math.max(
                            1,
                            Math.abs(Math.round(this.autoScrollDirection.y / 3))
                        )
                );
            }

            if (this.autoScrollDirection.x > 0) {
                // Scrolling right, extend selection rightward
                targetCol = Math.min(
                    this.grid.getCurrentCols() - 1,
                    targetCol +
                        Math.max(
                            1,
                            Math.abs(Math.round(this.autoScrollDirection.x / 5))
                        )
                );
            } else if (this.autoScrollDirection.x < 0) {
                // Scrolling left, extend selection leftward
                targetCol = Math.max(
                    0,
                    targetCol -
                        Math.max(
                            1,
                            Math.abs(Math.round(this.autoScrollDirection.x / 5))
                        )
                );
            }
        }

        // Only update if the target position changed
        if (targetRow !== selection.endRow || targetCol !== selection.endCol) {
            selection.extend(targetRow, targetCol);
            // Update header highlighting
            this.grid.clearHeaderSelections();
            this.context.highlightHeadersForSelection();

            // Don't render here, as the main loop will handle rendering
            // This prevents multiple renders per frame and ensures selection
            // and scrolling appear more synchronized
            this.context.updateSelectionStats();
        }
    }

    /**
     * Sets up document-level mouse tracking for when the mouse leaves the canvas
     *  - Listens for pointermove and pointerup events on the document
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
        this.documentMouseMoveHandler = (event: PointerEvent) => {
            this.handleGlobalMouseMove(event);
        };

        // Create document mouse up handler
        this.documentMouseUpHandler = (event: PointerEvent) => {
            this.handleGlobalMouseUp(event);
        };

        // Add document-level listeners
        document.addEventListener("pointermove", this.documentMouseMoveHandler);
        document.addEventListener("pointerup", this.documentMouseUpHandler);
    }

    /**
     * Handles global mouse move events when the mouse is outside the canvas
     *  - Updates global mouse position
     *  - Checks if mouse is over row headers or outside canvas bounds
     *  - Handles auto-scrolling and selection extension
     * @param event - The mouse event
     */
    private handleGlobalMouseMove(event: PointerEvent): void {
        if (!this.isMouseDown) return;

        this.lastGlobalMousePos = { x: event.clientX, y: event.clientY };
        const canvasRect = this.canvas.getBoundingClientRect();

        const canvasX = event.clientX - canvasRect.left;
        const canvasY = event.clientY - canvasRect.top;

        const dimensions = this.grid.getDimensions();

        const isOverRowHeader =
            canvasX >= 0 &&
            canvasX < dimensions.headerWidth &&
            canvasY >= dimensions.headerHeight;

        const isOutsideCanvas =
            canvasX < 0 ||
            canvasX > canvasRect.width ||
            canvasY < 0 ||
            canvasY > canvasRect.height;

        if (isOverRowHeader && this.isMouseDown && this.isDragging) {
            this.autoScrollDirection = { x: -this.autoScrollSpeed, y: 0 };
            if (!this.autoScrollTimer) {
                this.startAutoScroll();
            }
            this.updateSelectionDuringAutoScroll();
        } else if (isOutsideCanvas) {
            this.handleAutoScrollOutsideCanvas(canvasX, canvasY, canvasRect);
        } else {
            const syntheticEvent = {
                offsetX: canvasX,
                offsetY: canvasY,
                clientX: event.clientX,
                clientY: event.clientY,
                preventDefault: () => {},
                stopPropagation: () => {},
            } as MouseEvent;

            this.handlePointerMove(syntheticEvent as PointerEvent);
        }
    }

    /**
     * Handles global mouse up events when the mouse is outside the canvas
     *  - Cleans up document listeners
     *  - Calls the normal mouse up handler
     * @param event - The mouse event
     */
    private handleGlobalMouseUp(event: PointerEvent): void {
        this.removeDocumentMouseTracking();
        this.handlePointerUp(event);
    }

    /**
     * Removes document-level mouse tracking
     */
    private removeDocumentMouseTracking(): void {
        if (this.documentMouseMoveHandler) {
            document.removeEventListener(
                "pointermove",
                this.documentMouseMoveHandler
            );
            this.documentMouseMoveHandler = null;
        }

        if (this.documentMouseUpHandler) {
            document.removeEventListener(
                "pointerup",
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
