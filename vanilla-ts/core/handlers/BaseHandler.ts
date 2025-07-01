import { Grid } from "../Grid.js";
import { Renderer } from "../Renderer.js";
import { CommandManager } from "../../commands/Command.js";
import { ScrollbarManager } from "../ScrollbarManager.js";

/**
 * Base interface for all event handlers
 */
export interface IEventHandler {
    /**
     * Handles mouse down events
     * @param event - The mouse event
     * @returns true if the event was handled and should not propagate
     */
    handleMouseDown(event: MouseEvent): boolean;

    /**
     * Handles mouse move events
     * @param event - The mouse event
     * @returns true if the event was handled and should not propagate
     */
    handleMouseMove(event: MouseEvent): boolean;

    /**
     * Handles mouse up events
     * @param event - The mouse event
     * @returns true if the event was handled and should not propagate
     */
    handleMouseUp(event: MouseEvent): boolean;

    /**
     * Called when the handler becomes active
     */
    onActivate(): void;

    /**
     * Called when the handler becomes inactive
     */
    onDeactivate(): void;

    /**
     * Gets the cursor style for this handler
     * @param x - Mouse X position
     * @param y - Mouse Y position
     * @returns The cursor style
     */
    getCursor(x: number, y: number): string;
}

/**
 * Base handler context shared between all handlers
 */
export interface IHandlerContext {
    canvas: HTMLCanvasElement;
    grid: Grid;
    renderer: Renderer;
    commandManager: CommandManager;
    scrollbarManager: ScrollbarManager | null;

    // Cell editing
    editingCell: { row: number; col: number } | null;
    cellEditor: HTMLInputElement | null;

    // Common methods
    updateSelectionStats(): void;
    highlightHeadersForCell(row: number, col: number): void;
    highlightHeadersForSelection(): void;
    ensureCellVisible(row: number, col: number): void;
    getCellRect(
        row: number,
        col: number
    ): { x: number; y: number; width: number; height: number } | null;
    startCellEdit(row: number, col: number, x: number, y: number): void;
    finishCellEdit(): void;
}

/**
 * Base abstract handler class
 */
export abstract class BaseHandler implements IEventHandler {
    protected context: IHandlerContext;

    constructor(context: IHandlerContext) {
        this.context = context;
    }

    abstract handleMouseDown(event: MouseEvent): boolean;
    abstract handleMouseMove(event: MouseEvent): boolean;
    abstract handleMouseUp(event: MouseEvent): boolean;
    abstract getCursor(x: number, y: number): string;

    onActivate(): void {
        // Override in subclasses if needed
    }

    onDeactivate(): void {
        // Override in subclasses if needed
    }

    protected get canvas(): HTMLCanvasElement {
        return this.context.canvas;
    }

    protected get grid(): Grid {
        return this.context.grid;
    }

    protected get renderer(): Renderer {
        return this.context.renderer;
    }

    protected get commandManager(): CommandManager {
        return this.context.commandManager;
    }

    protected get scrollbarManager(): ScrollbarManager | null {
        return this.context.scrollbarManager;
    }
}
