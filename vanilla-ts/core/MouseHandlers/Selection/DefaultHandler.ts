import { BaseHandler, IHandlerContext } from "../Base/BaseHandler.js";
import { CellSelectionHandler } from "./CellSelectionHandler.js";
import { HeaderCornerSelectionHandler } from "./HeaderCornerSelectionHandler.js";

/**
 * Default handler for normal cell selection and interaction
 */
export class DefaultHandler extends BaseHandler {
    private isMouseDown: boolean = false;
    private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };

    // Specialized handlers
    private cellSelectionHandler: CellSelectionHandler;
    private headerCornerSelectionHandler: HeaderCornerSelectionHandler;
    constructor(context: IHandlerContext) {
        super(context);

        // Initialize specialized handlers
        this.cellSelectionHandler = new CellSelectionHandler(context);
        this.headerCornerSelectionHandler = new HeaderCornerSelectionHandler(
            context
        );
    }

    /**
     * Handles mouse down events by delegating to the appropriate handler
     * @param event - The mouse event
     * @returns True if handled, false otherwise
     */
    handleMouseDown(event: MouseEvent): boolean {
        this.canvas.focus();
        this.isMouseDown = true;
        this.lastMousePos = { x: event.offsetX, y: event.offsetY };

        // Try header corner handler first
        if (this.headerCornerSelectionHandler.handleMouseDown(event)) {
            return true;
        }

        // Then try cell selection handler
        if (this.cellSelectionHandler.handleMouseDown(event)) {
            return true;
        }

        return false;
    }

    /**
     * Handles mouse move events by delegating to the appropriate handler
     * @param event - The mouse event
     * @returns True if handled, false otherwise
     */
    handleMouseMove(event: MouseEvent): boolean {
        if (!this.isMouseDown) return false;

        // Delegate to cell selection handler for all mouse movement
        if (this.cellSelectionHandler.handleMouseMove(event)) {
            return true;
        }

        return false;
    }

    /**
     * Handles mouse up events by delegating to the appropriate handler
     * @param event - The mouse event
     * @returns True if handled, false otherwise
     */
    handleMouseUp(event: MouseEvent): boolean {
        this.isMouseDown = false;

        // Notify both handlers about mouse up to clean up their state
        let handlersCleaned = false;

        if (this.headerCornerSelectionHandler.handleMouseUp(event)) {
            handlersCleaned = true;
        }

        if (this.cellSelectionHandler.handleMouseUp(event)) {
            handlersCleaned = true;
        }

        return handlersCleaned;
    }

    /**
     * Gets the cursor style based on the current position
     * @param x - The x position
     * @param y - The y position
     * @returns The cursor style
     */
    getCursor(x: number, y: number): string {
        const dimensions = this.grid.getDimensions();

        // Check header corner first
        if (x < dimensions.headerWidth && y < dimensions.headerHeight) {
            return this.headerCornerSelectionHandler.getCursor(x, y);
        }

        // Otherwise use cell selection handler's cursor
        return this.cellSelectionHandler.getCursor(x, y);
    }

    /**
     * Activates the default handler
     * Also activates child handlers
     */
    onActivate(): void {
        this.headerCornerSelectionHandler.onActivate();
        this.cellSelectionHandler.onActivate();
    }

    /**
     * Deactivates the default handler
     * Also deactivates child handlers
     */
    onDeactivate(): void {
        this.headerCornerSelectionHandler.onDeactivate();
        this.cellSelectionHandler.onDeactivate();
    }
}
