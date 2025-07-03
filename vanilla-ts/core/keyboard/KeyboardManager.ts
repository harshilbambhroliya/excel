// src/core/keyboard/KeyboardManager.ts

import { IKeyboardHandler, IKeyboardContext } from "./IKeyboardHandler.js";
import { Selection } from "../../models/Selection.js";
import { NavigationKeyHandler } from "./NavigationKeyHandler.js";
import { CtrlKeyHandler } from "./CtrlKeyHandler.js";
import { ShiftKeyHandler } from "./ShiftKeyHandler.js";
import { CtrlShiftKeyHandler } from "./CtrlShiftKeyHandler.js";
import { CtrlShiftSelectionHandler } from "./CtrlShiftSelectionHandler.js";
import { SpecialKeyHandler } from "./SpecialKeyHandler.js";
import { TypingKeyHandler } from "./TypingKeyHandler.js";

/**
 * Manages keyboard event handling using the chain of responsibility pattern
 */
export class KeyboardManager {
    private handlers: IKeyboardHandler[] = [];
    private context: IKeyboardContext;

    constructor(context: IKeyboardContext) {
        this.context = context;
        this.initializeHandlers();
    }

    /**
     * Initialize the keyboard handlers in order of priority
     */
    private initializeHandlers(): void {
        // Order matters! More specific handlers should come first
        this.handlers = [
            new CtrlShiftKeyHandler(this.context), // Ctrl+Shift (row/column insertion)
            new CtrlShiftSelectionHandler(this.context), // Ctrl+Shift (selection extension)
            new CtrlKeyHandler(this.context), // Ctrl (without Shift)
            new ShiftKeyHandler(this.context), // Shift (without Ctrl)
            new SpecialKeyHandler(this.context), // Enter, Tab, Delete, etc.
            new NavigationKeyHandler(this.context), // Arrow keys, Home, End, etc.
            new TypingKeyHandler(this.context), // Printable characters
        ];
    }

    /**
     * Handle a keyboard event by passing it through the chain of handlers
     * @param event - The keyboard event
     * @param selection - The current selection
     * @returns true if the event was handled, false otherwise
     */
    public handleKeyboardEvent(
        event: KeyboardEvent,
        selection: Selection
    ): boolean {
        // Skip handling if currently editing a cell
        if (this.isEditingCell()) {
            return false;
        }

        for (const handler of this.handlers) {
            if (handler.handle(event, selection)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if a cell is currently being edited
     */
    private isEditingCell(): boolean {
        // This will need to be implemented based on your context
        // For now, we'll assume the context has this information
        return (this.context as any).editingCell !== null;
    }

    /**
     * Add a custom keyboard handler
     */
    public addHandler(handler: IKeyboardHandler): void {
        this.handlers.unshift(handler); // Add to beginning for highest priority
    }

    /**
     * Remove a keyboard handler
     */
    public removeHandler(
        handlerType: new (context: IKeyboardContext) => IKeyboardHandler
    ): void {
        this.handlers = this.handlers.filter(
            (handler) => !(handler instanceof handlerType)
        );
    }

    /**
     * Get all registered handlers
     */
    public getHandlers(): IKeyboardHandler[] {
        return [...this.handlers];
    }
}
