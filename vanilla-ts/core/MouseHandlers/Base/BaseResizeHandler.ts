import { BaseHandler } from "./BaseHandler.js";

/**
 * Abstract base class for resize handlers
 */
export abstract class BaseResizeHandler extends BaseHandler {
    protected resizeIndex: number = -1;
    protected resizeStartSize: number = -1;
    protected lastMousePos: { x: number; y: number } = { x: 0, y: 0 };

    /**
     * Creates a new BaseResizeHandler instance
     * @param context - The context containing grid, renderer, and command manager
     * @param resizeIndex - The index of the row or column to resize
     */
    constructor(context: any, resizeIndex: number) {
        super(context);
        this.resizeIndex = resizeIndex;
        this.resizeStartSize = this.getInitialSize(resizeIndex);
    }

    /**
     * Get the initial size of the resize target
     * @param index - The index of the row or column
     */
    protected abstract getInitialSize(index: number): number;

    /**
     * Handles mouse down events to initiate resizing
     * @param event - The mouse event
     * @returns True if handled, false otherwise
     */
    handlePointerDown(event: PointerEvent): boolean {
        this.lastMousePos = { x: event.offsetX, y: event.offsetY };
        return true;
    }

    /**
     * Abstract method to handle mouse move events for resizing
     * @param event - The mouse event
     * @returns True if handled, false otherwise
     */
    abstract handlePointerMove(event: PointerEvent): boolean;

    /**
     * Abstract method to handle pointer up events and finalize resizing
     * @param event - The pointer event
     * @returns True if handled, false otherwise
     */
    abstract handlePointerUp(event: PointerEvent): boolean;

    /**
     * Gets the cursor style based on the current resize target
     * @param x - The x position
     * @param y - The y position
     * @returns The cursor style
     */
    abstract getCursor(x: number, y: number): string;

    /**
     * Activates the resize handler
     * Sets the cursor style to the appropriate resize cursor
     */
    onActivate(): void {
        this.canvas.style.cursor = this.getCursor(0, 0);
    }

    /**
     * Deactivates the resize handler
     * Sets the cursor style back to the default cell cursor
     */
    onDeactivate(): void {
        this.canvas.style.cursor = "cell";
    }
}
