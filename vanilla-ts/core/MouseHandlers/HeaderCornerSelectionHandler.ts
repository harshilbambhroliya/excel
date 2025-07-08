import { BaseHandler } from "./BaseHandler.js";

/**
 * Handler for selecting all cells via the header corner
 */
export class HeaderCornerSelectionHandler extends BaseHandler {
    private isMouseDown: boolean = false;

    /**
     * Handles mouse down events for header corner selection (select all)
     * @param event - The mouse event
     * @returns True if handled, false otherwise
     */
    handleMouseDown(event: MouseEvent): boolean {
        const dimensions = this.context.grid.getDimensions();

        // Check if clicking on header corner (select all)
        if (
            event.offsetX < dimensions.headerWidth &&
            event.offsetY < dimensions.headerHeight
        ) {
            this.isMouseDown = true;
            this.context.grid.clearAllSelections();
            this.context.grid.getSelection().start(0, 0);
            this.context.grid
                .getSelection()
                .extend(
                    this.context.grid.getCurrentRows() - 1,
                    this.context.grid.getCurrentCols() - 1
                );
            this.context.highlightHeadersForSelection();
            this.context.renderer.render();
            this.context.updateSelectionStats();
            return true;
        }

        return false;
    }

    /**
     * Handles mouse move events
     * @param event - The mouse event
     * @returns True if handled, false otherwise
     */
    handleMouseMove(event: MouseEvent): boolean {
        // No special handling needed for header corner selection when moving
        return false;
    }

    /**
     * Handles mouse up events
     * @param event - The mouse event
     * @returns True if handled, false otherwise
     */
    handleMouseUp(event: MouseEvent): boolean {
        if (this.isMouseDown) {
            this.isMouseDown = false;
            return true;
        }
        return false;
    }

    /**
     * Gets the cursor style
     * @param x - The x position
     * @param y - The y position
     * @returns The cursor style
     */
    getCursor(x: number, y: number): string {
        const dimensions = this.context.grid.getDimensions();

        // Set pointer cursor when hovering over header corner
        if (x < dimensions.headerWidth && y < dimensions.headerHeight) {
            return "pointer";
        }

        return "default";
    }

    /**
     * Activates the handler
     */
    onActivate(): void {
        // Nothing special needed on activation
    }

    /**
     * Deactivates the handler
     */
    onDeactivate(): void {
        this.isMouseDown = false;
    }
}
