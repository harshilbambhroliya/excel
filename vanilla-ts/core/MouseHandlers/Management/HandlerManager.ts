import { IEventHandler, IHandlerContext } from "../Base/BaseHandler.js";
import { DefaultHandler } from "../Selection/DefaultHandler.js";
import { ResizeHandler } from "../Resize/ResizeHandler.js";
import { HeaderDragHandler } from "../HeaderDrag/HeaderDragHandler.js";

/**
 * Manages the current event handler and delegates events appropriately
 */
export class HandlerManager {
    private currentHandler: IEventHandler;
    private context: IHandlerContext;
    private resizeHandler: ResizeHandler | null = null;
    private headerDragHandler: HeaderDragHandler | null = null;
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
    public handleMouseDown(event: PointerEvent): void {
        // First check if we should switch handlers based on the mouse position
        const newHandler = this.determineHandler(event);

        if (newHandler !== this.currentHandler) {
            this.switchHandler(newHandler);
        }

        // Let the current handler handle the event
        this.currentHandler.handleMouseDown(event);
    }

    /**
     * Handles pointer move events
     * @param event - The pointer event
     */
    public handleMouseMove(event: PointerEvent): void {
        // Update cursor if not currently handling an operation
        if (!this.isHandling()) {
            this.updateCursor(event);
        }
        this.currentHandler.handleMouseMove(event);
    }

    /**
     * Handles pointer up events
     * @param event - The pointer event
     */
    public handleMouseUp(event: PointerEvent): void {
        this.currentHandler.handleMouseUp(event);

        // After mouse up, potentially switch back to default handler
        if (!(this.currentHandler instanceof DefaultHandler)) {
            this.switchHandler(new DefaultHandler(this.context));
        }
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

    /**
     * Updates the cursor based on mouse position
     * @param event - The pointer event
     */
    private updateCursor(event: PointerEvent): void {
        this.updateHeaderHoverState(event);
        const cursor = this.getCursor(event);
        this.context.canvas.style.cursor = cursor;
    }

    /**
     * Updates the header hover state in the renderer based on mouse position
     * @param event - The pointer event
     */
    private updateHeaderHoverState(event: PointerEvent): void {
        const { grid, renderer } = this.context;
        const dimensions = grid.getDimensions();
        const { offsetX, offsetY } = event;

        // Store previous hover states to detect changes
        const prevRowHeader = renderer.hoverRowHeader;
        const prevColHeader = renderer.hoverColumnHeader;

        // Reset hover states
        renderer.hoverRowHeader = null;
        renderer.hoverColumnHeader = null;

        const zoomFactor = renderer.getZoom();

        // Check if mouse is over column headers
        if (offsetY < dimensions.headerHeight) {
            // Find which column the mouse is over
            for (let col = 0; col < grid.getCurrentCols(); col++) {
                const colPos = renderer.getColumnHeaderPosition(col);
                const colWidth = grid.getColumnWidth(col) * zoomFactor;
                if (offsetX >= colPos && offsetX < colPos + colWidth) {
                    renderer.hoverColumnHeader = col;
                    break;
                }
            }
        }

        // Check if mouse is over row headers
        if (offsetX < dimensions.headerWidth) {
            // Find which row the mouse is over
            for (let row = 0; row < grid.getCurrentRows(); row++) {
                const rowPos = renderer.getRowHeaderPosition(row);
                const rowHeight = grid.getRowHeight(row) * zoomFactor;
                if (offsetY >= rowPos && offsetY < rowPos + rowHeight) {
                    renderer.hoverRowHeader = row;
                    break;
                }
            }
        }

        // Trigger a redraw if hover state changed (either started hovering or stopped hovering)
        if (
            prevRowHeader !== renderer.hoverRowHeader ||
            prevColHeader !== renderer.hoverColumnHeader
        ) {
            renderer.render();
        }
    }

    /**
     * Determines which handler should be used for the given mouse event
     * @param event - The mouse event
     * @returns The appropriate handler
     */
    private determineHandler(event: PointerEvent): IEventHandler {
        // Check for resize handles first
        // this.resizeHandler is a instance of ResizeHandler
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
        // this.headerDragHandler is a instance of HeaderDragHandler
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
}
