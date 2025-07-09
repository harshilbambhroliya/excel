import { BaseHandler } from "./BaseHandler.js";

/**
 * Base handler for dragging row/column headers to select ranges
 */
export abstract class BaseHeaderDragHandler extends BaseHandler {
    protected headerDragStart: number;

    // Document-level event handlers for outside canvas mouse tracking
    protected documentMouseMoveHandler: ((event: PointerEvent) => void) | null =
        null;
    protected documentMouseUpHandler: ((event: PointerEvent) => void) | null =
        null;
    protected lastGlobalMousePos: { x: number; y: number } = { x: 0, y: 0 };

    // Auto-scrolling properties
    protected autoScrollTimer: number | null = null;
    protected autoScrollDirection: { x: number; y: number } = { x: 0, y: 0 };
    protected autoScrollSpeed: number = 20; // Increased for better responsiveness
    protected autoScrollZone: number = 50; // Increased for larger detection area
    protected autoScrollMaxFactor: number = 5; // Maximum scroll speed multiplier

    // Debouncing properties for updateSelectionStats
    protected updateSelectionStatsTimer: number | null = null;
    protected updateSelectionStatsDelay: number = 100; // 100ms debounce delay

    /**
     * Creates a new BaseHeaderDragHandler instance
     * @param context - Context containing grid and renderer
     * @param startIndex - Starting index for the drag operation
     */
    constructor(context: any, startIndex: number) {
        super(context);
        this.headerDragStart = startIndex;
    }

    /**
     * Debounced version of updateSelectionStats
     * Delays execution until after the specified delay has passed since the last call
     */
    protected debouncedUpdateSelectionStats(): void {
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
    protected immediateUpdateSelectionStats(): void {
        // Cancel any pending debounced update
        if (this.updateSelectionStatsTimer) {
            clearTimeout(this.updateSelectionStatsTimer);
            this.updateSelectionStatsTimer = null;
        }

        // Update immediately
        this.context.updateSelectionStats();
    }

    /**
     * Handles pointer down event to start header dragging
     * @param event - Pointer event
     * @returns true if handled, false otherwise
     */
    abstract handlePointerDown(event: PointerEvent): boolean;

    /**
     * Handles pointer move event to update header selection
     * @param event - Pointer event
     * @returns true if handled, false otherwise
     */
    abstract handlePointerMove(event: PointerEvent): boolean;

    /**
     * Handles pointer up event to finalize header selection
     * @param event - Pointer event
     * @returns true if handled, false otherwise
     */
    handlePointerUp(event: PointerEvent): boolean {
        // Stop auto-scrolling and clean up document listeners
        this.stopAutoScroll();
        this.removeDocumentMouseTracking();
        this.immediateUpdateSelectionStats();
        return true;
    }

    /**
     * Gets the cursor style for header dragging
     * @returns "cell" cursor style
     */
    getCursor(x: number, y: number): string {
        return "cell";
    }

    /**
     * Starts the auto-scrolling animation
     * Uses requestAnimationFrame for smoother performance
     */
    protected startAutoScroll(): void {
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
    protected stopAutoScroll(): void {
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
    protected performAutoScroll(): void {
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
    protected updateSelectionDuringAutoScroll(): void {
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

        // Reuse the same handlePointerMove logic for consistency
        this.handlePointerMove(syntheticEvent as unknown as PointerEvent);
    }

    /**
     * Abstract method to handle auto-scrolling based on header type
     * @param canvasX - Mouse X position relative to canvas
     * @param canvasY - Mouse Y position relative to canvas
     * @param canvasRect - The bounding rectangle of the canvas
     */
    protected abstract handleAutoScrollOutsideCanvas(
        canvasX: number,
        canvasY: number,
        canvasRect: DOMRect
    ): void;

    /**
     * Abstract method to handle auto-scrolling when dragging near edges
     * @param mouseX - Mouse X position
     * @param mouseY - Mouse Y position
     */
    protected abstract handleAutoScroll(mouseX: number, mouseY: number): void;

    /**
     * Sets up document-level mouse tracking for header dragging
     * @param initialEvent - The initial mouse event to capture
     */
    protected setupDocumentMouseTracking(initialEvent: MouseEvent): void {
        // Store initial global mouse position
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
     * Abstract method to handle global mouse movement based on header type
     * @param event - The pointer event from the document
     */
    protected abstract handleGlobalMouseMove(event: PointerEvent): void;

    /**
     * Handles global mouse up events when dragging headers
     * This allows cleaning up listeners when mouse is released outside the canvas
     * @param event - The pointer event from the document
     */
    protected handleGlobalMouseUp(event: PointerEvent): void {
        // Clean up document listeners
        this.removeDocumentMouseTracking();

        // Handle the pointer up normally
        this.handlePointerUp(event);
    }

    /**
     * Removes document-level mouse tracking listeners
     * This is called when the mouse is released or when dragging ends
     */
    protected removeDocumentMouseTracking(): void {
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
}
