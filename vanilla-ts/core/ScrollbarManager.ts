// src/core/ScrollbarManager.ts
/**
 * Manages the scrollbars in the grid
 */

export class ScrollbarManager {
    /** @type {HTMLElement} The container element for the scrollbars */
    private container: HTMLElement;

    /** @type {HTMLElement} The horizontal scrollbar element */
    private horizontalScrollbar: HTMLElement;

    /** @type {HTMLElement} The vertical scrollbar element */
    private verticalScrollbar: HTMLElement;

    /** @type {HTMLElement} The horizontal thumb element */
    private horizontalThumb: HTMLElement;

    /** @type {HTMLElement} The vertical thumb element */
    private verticalThumb: HTMLElement;

    /** @type {Function} The callback function to be called when the scroll position changes */
    private onScrollCallback: (scrollX: number, scrollY: number) => void;

    /** @type {number} The maximum scroll position in the X direction */
    private maxScrollX: number = 0;

    /** @type {number} The maximum scroll position in the Y direction */
    private maxScrollY: number = 0;

    /** @type {number} The current scroll position in the X direction */
    private currentScrollX: number = 0;

    /** @type {number} The current scroll position in the Y direction */
    private currentScrollY: number = 0;

    /** @type {number} The width of the viewport */
    private viewportWidth: number = 0;

    /** @type {number} The height of the viewport */
    private viewportHeight: number = 0;

    /** @type {number} The width of the content */
    private contentWidth: number = 0;

    /** @type {number} The height of the content */
    private contentHeight: number = 0;

    /** @type {boolean} Whether the horizontal scrollbar is being dragged */
    private isDraggingHorizontal: boolean = false;

    /** @type {boolean} Whether the vertical scrollbar is being dragged */
    private isDraggingVertical: boolean = false;

    /** @type {number} The starting X position of the horizontal scrollbar */
    private dragStartX: number = 0;

    /** @type {number} The starting Y position of the vertical scrollbar */
    private dragStartY: number = 0;

    /** @type {number} The starting scroll position in the X direction */
    private dragStartScrollX: number = 0;
    /** @type {number} The starting scroll position in the Y direction */
    private dragStartScrollY: number = 0;

    /** @type {number} Animation frame ID for throttling updates */
    private animationFrameId: number | null = null;

    /** @type {boolean} Whether a scroll update is pending */
    private isUpdatePending: boolean = false;

    /**
     * Initializes a new ScrollbarManager instance
     * @param {HTMLElement} container The container element for the scrollbars
     * @param {Function} onScroll The callback function to be called when the scroll position changes
     */
    constructor(
        container: HTMLElement,
        onScroll: (scrollX: number, scrollY: number) => void
    ) {
        this.container = container;
        this.onScrollCallback = onScroll;

        this.horizontalScrollbar = container.querySelector(
            ".horizontal-scrollbar"
        ) as HTMLElement;
        this.verticalScrollbar = container.querySelector(
            ".vertical-scrollbar"
        ) as HTMLElement;
        this.horizontalThumb = container.querySelector(
            ".horizontal-thumb"
        ) as HTMLElement;
        this.verticalThumb = container.querySelector(
            ".vertical-thumb"
        ) as HTMLElement;

        this.setupEventListeners();
    }

    /**
     * Sets up event listeners for the scrollbars
     */
    private setupEventListeners(): void {
        // Horizontal scrollbar events
        this.horizontalThumb.addEventListener(
            "mousedown",
            this.handleHorizontalMouseDown.bind(this)
        );
        this.horizontalScrollbar.addEventListener(
            "click",
            this.handleHorizontalTrackClick.bind(this)
        );

        // Vertical scrollbar events
        this.verticalThumb.addEventListener(
            "mousedown",
            this.handleVerticalMouseDown.bind(this)
        );
        this.verticalScrollbar.addEventListener(
            "click",
            this.handleVerticalTrackClick.bind(this)
        );

        // Global mouse events for dragging
        document.addEventListener("mousemove", this.handleMouseMove.bind(this));
        document.addEventListener("mouseup", this.handleMouseUp.bind(this));

        // Prevent text selection during drag
        this.horizontalThumb.addEventListener("selectstart", (e) =>
            e.preventDefault()
        );
        this.verticalThumb.addEventListener("selectstart", (e) =>
            e.preventDefault()
        );
    }
    /**
     * Handles the mouse down event for the horizontal scrollbar
     * @param {MouseEvent} event The mouse down event
     */
    private handleHorizontalMouseDown(event: MouseEvent): void {
        event.preventDefault();
        this.isDraggingHorizontal = true;
        this.dragStartX = event.clientX;
        this.dragStartScrollX = this.currentScrollX;
        document.body.style.userSelect = "none";

        // Add dragging class for performance optimization
        this.horizontalThumb.classList.add("dragging");
    }

    /**
     * Handles the mouse down event for the vertical scrollbar
     * @param {MouseEvent} event The mouse down event
     */
    private handleVerticalMouseDown(event: MouseEvent): void {
        event.preventDefault();
        this.isDraggingVertical = true;
        this.dragStartY = event.clientY;
        this.dragStartScrollY = this.currentScrollY;
        document.body.style.userSelect = "none";

        // Add dragging class for performance optimization
        this.verticalThumb.classList.add("dragging");
    }
    /**
     * Handles the mouse move event for the scrollbars
     * @param {MouseEvent} event The mouse move event
     */
    private handleMouseMove(event: MouseEvent): void {
        if (this.isDraggingHorizontal) {
            const deltaX = event.clientX - this.dragStartX;
            const trackWidth = this.horizontalScrollbar.clientWidth;
            const thumbWidth = this.horizontalThumb.clientWidth;
            const scrollableWidth = trackWidth - thumbWidth;

            if (scrollableWidth > 0) {
                const scrollRatio = deltaX / scrollableWidth;
                const newScrollX = Math.max(
                    0,
                    Math.min(
                        this.maxScrollX,
                        this.dragStartScrollX + scrollRatio * this.maxScrollX
                    )
                );

                // Update scroll position immediately for responsiveness
                this.currentScrollX = newScrollX;

                // Update thumb position immediately
                this.updateHorizontalThumbPosition();

                // Throttle callback execution using requestAnimationFrame
                this.scheduleScrollUpdate();
            }
        }

        if (this.isDraggingVertical) {
            const deltaY = event.clientY - this.dragStartY;
            const trackHeight = this.verticalScrollbar.clientHeight;
            const thumbHeight = this.verticalThumb.clientHeight;
            const scrollableHeight = trackHeight - thumbHeight;

            if (scrollableHeight > 0) {
                const scrollRatio = deltaY / scrollableHeight;
                const newScrollY = Math.max(
                    0,
                    Math.min(
                        this.maxScrollY,
                        this.dragStartScrollY + scrollRatio * this.maxScrollY
                    )
                );

                // Update scroll position immediately for responsiveness
                this.currentScrollY = newScrollY;

                // Update thumb position immediately
                this.updateVerticalThumbPosition();

                // Throttle callback execution using requestAnimationFrame
                this.scheduleScrollUpdate();
            }
        }
    }

    /**
     * Schedules a scroll update using requestAnimationFrame for smooth performance
     */
    private scheduleScrollUpdate(): void {
        if (this.isUpdatePending) {
            return; // Already scheduled
        }

        this.isUpdatePending = true;
        this.animationFrameId = requestAnimationFrame(() => {
            this.onScrollCallback(this.currentScrollX, this.currentScrollY);
            this.isUpdatePending = false;
            this.animationFrameId = null;
        });
    }

    /**
     * Updates only the horizontal thumb position without triggering callbacks
     */
    private updateHorizontalThumbPosition(): void {
        if (this.maxScrollX > 0) {
            const trackWidth = this.horizontalScrollbar.clientWidth;
            const thumbWidth = this.horizontalThumb.clientWidth;
            const scrollableWidth = trackWidth - thumbWidth;
            const thumbPosition =
                (this.currentScrollX / this.maxScrollX) * scrollableWidth;
            this.horizontalThumb.style.left = thumbPosition + "px";
        }
    }

    /**
     * Updates only the vertical thumb position without triggering callbacks
     */
    private updateVerticalThumbPosition(): void {
        if (this.maxScrollY > 0) {
            const trackHeight = this.verticalScrollbar.clientHeight;
            const thumbHeight = this.verticalThumb.clientHeight;
            const scrollableHeight = trackHeight - thumbHeight;
            const thumbPosition =
                (this.currentScrollY / this.maxScrollY) * scrollableHeight;
            this.verticalThumb.style.top = thumbPosition + "px";
        }
    }
    /**
     * Handles the mouse up event for the scrollbars
     */
    private handleMouseUp(): void {
        const wasHorizontalDragging = this.isDraggingHorizontal;
        const wasVerticalDragging = this.isDraggingVertical;

        this.isDraggingHorizontal = false;
        this.isDraggingVertical = false;
        document.body.style.userSelect = "";

        // Remove dragging classes
        if (wasHorizontalDragging) {
            this.horizontalThumb.classList.remove("dragging");
        }
        if (wasVerticalDragging) {
            this.verticalThumb.classList.remove("dragging");
        }

        // Cancel any pending animation frame and execute final callback
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Execute final scroll callback if there was a pending update
        if (this.isUpdatePending) {
            this.onScrollCallback(this.currentScrollX, this.currentScrollY);
            this.isUpdatePending = false;
        }
    }

    /**
     * Handles the click event for the horizontal scrollbar
     * @param {MouseEvent} event The click event
     */
    private handleHorizontalTrackClick(event: MouseEvent): void {
        if (event.target === this.horizontalThumb) return;

        const rect = this.horizontalScrollbar.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const thumbWidth = this.horizontalThumb.clientWidth;
        const trackWidth = this.horizontalScrollbar.clientWidth;

        const scrollRatio =
            (clickX - thumbWidth / 2) / (trackWidth - thumbWidth);
        const newScrollX = Math.max(
            0,
            Math.min(this.maxScrollX, scrollRatio * this.maxScrollX)
        );
        this.setScrollX(newScrollX);
    }

    /**
     * Handles the click event for the vertical scrollbar
     * @param {MouseEvent} event The click event
     */
    private handleVerticalTrackClick(event: MouseEvent): void {
        if (event.target === this.verticalThumb) return;

        const rect = this.verticalScrollbar.getBoundingClientRect();
        const clickY = event.clientY - rect.top;
        const thumbHeight = this.verticalThumb.clientHeight;
        const trackHeight = this.verticalScrollbar.clientHeight;

        const scrollRatio =
            (clickY - thumbHeight / 2) / (trackHeight - thumbHeight);
        const newScrollY = Math.max(
            0,
            Math.min(this.maxScrollY, scrollRatio * this.maxScrollY)
        );
        this.setScrollY(newScrollY);
    }

    /**
     * Updates the scrollbars based on the viewport and content dimensions
     * @param {number} viewportWidth The width of the viewport
     * @param {number} viewportHeight The height of the viewport
     * @param {number} contentWidth The width of the content
     * @param {number} contentHeight The height of the content
     */
    public updateScrollbars(
        viewportWidth: number,
        viewportHeight: number,
        contentWidth: number,
        contentHeight: number
    ): void {
        this.viewportWidth = viewportWidth;
        this.viewportHeight = viewportHeight;
        this.contentWidth = contentWidth;
        this.contentHeight = contentHeight;

        this.maxScrollX = Math.max(0, contentWidth - viewportWidth);
        this.maxScrollY = Math.max(0, contentHeight - viewportHeight);

        this.updateHorizontalScrollbar();
        this.updateVerticalScrollbar();
    }
    /**
     * Updates the horizontal scrollbar based on the viewport and content dimensions
     */
    private updateHorizontalScrollbar(): void {
        const needsScrollbar = this.maxScrollX > 0;
        this.horizontalScrollbar.style.display = needsScrollbar
            ? "block"
            : "none";

        if (needsScrollbar) {
            const trackWidth = this.horizontalScrollbar.clientWidth;
            const thumbWidth = Math.max(
                20,
                (this.viewportWidth / this.contentWidth) * trackWidth
            );

            this.horizontalThumb.style.width = thumbWidth + "px";
            this.updateHorizontalThumbPosition();
        }
    }
    /**
     * Updates the vertical scrollbar based on the viewport and content dimensions
     */
    private updateVerticalScrollbar(): void {
        const needsScrollbar = this.maxScrollY > 0;
        this.verticalScrollbar.style.display = needsScrollbar
            ? "block"
            : "none";

        if (needsScrollbar) {
            const trackHeight = this.verticalScrollbar.clientHeight;
            const thumbHeight = Math.max(
                20,
                (this.viewportHeight / this.contentHeight) * trackHeight
            );

            this.verticalThumb.style.height = thumbHeight + "px";
            this.updateVerticalThumbPosition();
        }
    }

    /**
     * Sets the scroll position in the X direction
     * @param {number} scrollX The new scroll position in the X direction
     */
    public setScrollX(scrollX: number): void {
        this.currentScrollX = Math.max(0, Math.min(this.maxScrollX, scrollX));
        this.updateHorizontalScrollbar();
        this.onScrollCallback(this.currentScrollX, this.currentScrollY);
    }

    /**
     * Sets the scroll position in the Y direction
     * @param {number} scrollY The new scroll position in the Y direction
     */
    public setScrollY(scrollY: number): void {
        this.currentScrollY = Math.max(0, Math.min(this.maxScrollY, scrollY));
        this.updateVerticalScrollbar();
        this.onScrollCallback(this.currentScrollX, this.currentScrollY);
    }

    /**
     * Sets the scroll position in both directions
     * @param {number} scrollX The new scroll position in the X direction
     * @param {number} scrollY The new scroll position in the Y direction
     */
    public setScroll(scrollX: number, scrollY: number): void {
        this.currentScrollX = Math.max(0, Math.min(this.maxScrollX, scrollX));
        this.currentScrollY = Math.max(0, Math.min(this.maxScrollY, scrollY));
        this.updateHorizontalScrollbar();
        this.updateVerticalScrollbar();
        this.onScrollCallback(this.currentScrollX, this.currentScrollY);
    }

    /**
     * Gets the current scroll position
     * @returns {Object} An object containing the current scroll position in the X and Y directions
     */
    public getScrollPosition(): { x: number; y: number } {
        return { x: this.currentScrollX, y: this.currentScrollY };
    }

    /**
     * Scrolls the content by a given amount
     * @param {number} deltaX The amount to scroll in the X direction
     * @param {number} deltaY The amount to scroll in the Y direction
     */
    public scrollBy(deltaX: number, deltaY: number): void {
        this.setScroll(
            this.currentScrollX + deltaX,
            this.currentScrollY + deltaY
        );
    }
}
