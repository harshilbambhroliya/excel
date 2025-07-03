// src/core/keyboard/BaseKeyboardHandler.ts

import { IKeyboardHandler, IKeyboardContext } from "./IKeyboardHandler.js";
import { Selection } from "../../models/Selection.js";

/**
 * Base class for keyboard handlers
 */
export abstract class BaseKeyboardHandler implements IKeyboardHandler {
    protected context: IKeyboardContext;

    constructor(context: IKeyboardContext) {
        this.context = context;
    }

    /**
     * Check if this handler can handle the given event
     */
    abstract canHandle(event: KeyboardEvent): boolean;

    /**
     * Handle the keyboard event
     */
    abstract handle(event: KeyboardEvent, selection: Selection): boolean;

    /**
     * Prevent default behavior and stop propagation
     */
    protected preventDefault(event: KeyboardEvent): void {
        event.preventDefault();
        event.stopPropagation();
    }

    /**
     * Check if the event has modifier keys
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
     */
    protected updateUI(selection: Selection): void {
        this.context.grid.clearHeaderSelections();
        this.context.highlightHeadersForSelection();
        this.context.renderer.render();
        this.context.updateSelectionStats();
    }

    /**
     * Ensure the current selection is visible
     */
    protected ensureSelectionVisible(selection: Selection): void {
        if (selection.isActive) {
            this.context.ensureCellVisible(selection.endRow, selection.endCol);
        }
    }
}
