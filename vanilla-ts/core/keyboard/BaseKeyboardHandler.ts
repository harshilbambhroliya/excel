// src/core/keyboard/BaseKeyboardHandler.ts

import { IKeyboardHandler, IKeyboardContext } from "./IKeyboardHandler.js";
import { Selection } from "../../models/Selection.js";

/**
 * Base class for keyboard handlers
 */
export abstract class BaseKeyboardHandler implements IKeyboardHandler {
    protected context: IKeyboardContext;
    /**
     * Create a new BaseKeyboardHandler
     * @param context - The keyboard context providing access to the grid and commands
     */
    constructor(context: IKeyboardContext) {
        this.context = context;
    }

    /**
     * Check if this handler can handle the given event
     * @param event - The keyboard event to check
     * @returns true if this handler can handle the event, false otherwise
     */
    abstract canHandle(event: KeyboardEvent): boolean;

    /**
     * Handle the keyboard event
     * @param event - The keyboard event to handle
     * @param selection - The current selection in the grid
     */
    abstract handle(event: KeyboardEvent, selection: Selection): boolean;

    /**
     * Prevent default behavior and stop propagation
     * @param event - The keyboard event to prevent default for
     * This method is used to prevent the default browser behavior for certain keys
     */
    protected preventDefault(event: KeyboardEvent): void {
        event.preventDefault();
        event.stopPropagation();
    }

    /**
     * Check if the event has modifier keys
     * @param event - The keyboard event to check
     * @returns An object indicating if Ctrl, Shift, or Alt keys are pressed
     */
    protected hasModifierKeys(event: KeyboardEvent): {
        ctrl: boolean;
        shift: boolean;
        alt: boolean;
    } {
        return {
            ctrl: event.ctrlKey || event.metaKey,
            shift: event.shiftKey,
            alt: event.altKey,
        };
    }

    /**
     * Update the UI after handling a keyboard event
     * @param selection - The current selection in the grid
     * This method clears header selections, highlights headers for the current selection,
     */
    protected updateUI(selection: Selection): void {
        this.context.grid.clearHeaderSelections();
        this.context.highlightHeadersForSelection();
        this.context.renderer.render();
        this.context.updateSelectionStats();
    }

    /**
     * Ensure the current selection is visible
     * @param selection - The current selection in the grid
     * This method scrolls the grid to ensure the end of the selection is visible
     */
    protected ensureSelectionVisible(selection: Selection): void {
        if (selection.isActive) {
            this.context.ensureCellVisible(selection.endRow, selection.endCol);
        }
    }
}
