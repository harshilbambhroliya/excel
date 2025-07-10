import { IEventHandler, IHandlerContext } from "../Base/BaseHandler.js";
import { DefaultHandler } from "../Selection/DefaultHandler.js";
import { ResizeHandler } from "../Resize/ResizeHandler.js";
import { HeaderDragHandler } from "../HeaderDrag/HeaderDragHandler.js";

/**
 * Manages the current event handler and delegates events appropriately
 */
export class HandlerManager {
    /**
     * The current active event handler
     */
    private currentHandler: IEventHandler;
    /**
     * The context shared between all handlers
     */
    private context: IHandlerContext;
    /**
     * Handlers for resizing and header dragging
     * These are initialized but not always active
     */
    private resizeHandler: ResizeHandler | null = null;
    /**
     * Handler for dragging headers (row/column)
     * This is initialized but not always active
     */
    private headerDragHandler: HeaderDragHandler | null = null;

    /**
     * Constructor for HandlerManager
     * @param context - The handler context
     */

    constructor(context: IHandlerContext) {
        this.context = context;
        this.currentHandler = new DefaultHandler(context);
        this.currentHandler.onActivate();

        // Initialize resize and header drag handlers if needed
        this.resizeHandler = new ResizeHandler(context, {
            type: "column",
            index: -1,
        });
        this.headerDragHandler = new HeaderDragHandler(context, "column", -1);
    }

    /**
     * Handles pointer down events by determining the appropriate handler
     * @param event - The pointer event
     */
    public handlePointerDown(event: PointerEvent): void {
        // First check if we should switch handlers based on the mouse position
        const newHandler = this.determineHandler(event);

        if (newHandler !== this.currentHandler) {
            this.switchHandler(newHandler);
        }

        // Let the current handler handle the event
        this.currentHandler.handlePointerDown(event);
    }

    /**
     * Handles pointer move events
     * @param event - The pointer event
     */
    public handlePointerMove(event: PointerEvent): void {
        // Update cursor if not currently handling an operation
        if (!this.isHandling()) {
            this.updateCursor(event);
        }
        this.currentHandler.handlePointerMove(event);
    }

    /**
     * Handles pointer up events
     * @param event - The pointer event
     */
    public handlePointerUp(event: PointerEvent): void {
        this.currentHandler.handlePointerUp(event);

        // After pointer up, potentially switch back to default handler
        if (!(this.currentHandler instanceof DefaultHandler)) {
            this.switchHandler(new DefaultHandler(this.context));
        }
    }

    /**
     * Determines which handler should be used for the given pointer event
     * @param event - The pointer event
     * @returns The appropriate handler
     */
    private determineHandler(event: PointerEvent): IEventHandler {
        // Check for resize handles first
        const resizeTarget = this.resizeHandler!.getResizeTarget(
            event.offsetX,
            event.offsetY,
            this.context.grid,
            this.context.renderer
        );
        if (resizeTarget) {
            return new ResizeHandler(this.context, resizeTarget);
        }

        // Check for header drag areas
        const headerDragInfo = this.headerDragHandler!.getHeaderDragInfo(
            event,
            this.context.grid,
            this.context.renderer
        );
        if (headerDragInfo) {
            return new HeaderDragHandler(
                this.context,
                headerDragInfo.type,
                headerDragInfo.index
            );
        }

        // Default to normal cell selection handler
        return new DefaultHandler(this.context);
    }

    /**
     * Switches to a new handler
     * @param newHandler - The new handler to switch to
     */
    private switchHandler(newHandler: IEventHandler): void {
        // Deactivate current handler
        this.currentHandler.onDeactivate();

        // Switch to new handler
        this.currentHandler = newHandler;
        this.currentHandler.onActivate();
    }

    /**
     * Checks if the current handler is actively handling an operation
     * @returns True if handling an operation
     */
    private isHandling(): boolean {
        // This could be enhanced to check specific handler states
        // For now, assume we're handling if not using the default handler
        return !(this.currentHandler instanceof DefaultHandler);
    }

    /**
     * Forces a switch back to the default handler
     */
    public resetToDefault(): void {
        if (!(this.currentHandler instanceof DefaultHandler)) {
            this.switchHandler(new DefaultHandler(this.context));
        }
    }

    /**
     * Gets the current handler type for debugging
     */
    public getCurrentHandlerType(): string {
        return this.currentHandler.constructor.name;
    }

    /**
     * Updates the cursor based on mouse position
     * @param event - The pointer event
     */
    private updateCursor(event: PointerEvent): void {
        const cursor = this.getCursor(event);
        this.context.canvas.style.cursor = cursor;
    }

    /**
     * Gets the current cursor style
     * @param event - The pointer event
     * @returns The cursor style
     */
    public getCursor(event: PointerEvent): string {
        // Check what handler would be used for this position
        const handler = this.determineHandler(event);
        return handler.getCursor(event.offsetX, event.offsetY);
    }
}
