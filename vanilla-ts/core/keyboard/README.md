# Keyboard Event Management System

This directory contains a modular keyboard event handling system for the Excel application using the Chain of Responsibility pattern.

## Overview

The keyboard management system separates different types of keyboard events into specialized handler classes, making the code more maintainable and easier to extend.

## Architecture

### Core Classes

1. **IKeyboardHandler** - Interface that all keyboard handlers must implement
2. **IKeyboardContext** - Interface that provides the context (grid, renderer, etc.) to handlers
3. **BaseKeyboardHandler** - Abstract base class with common functionality
4. **KeyboardManager** - Orchestrates the chain of handlers

### Handler Classes

1. **CtrlShiftKeyHandler** - Handles Ctrl+Shift combinations for row/column insertion

    - Ctrl+Shift+Up/Down: Insert rows above/below
    - Ctrl+Shift+Left/Right: Insert columns left/right

2. **CtrlKeyHandler** - Handles Ctrl key combinations (without Shift)

    - Ctrl+Z: Undo
    - Ctrl+Y: Redo
    - Ctrl+C: Copy
    - Ctrl+X: Cut
    - Ctrl+V: Paste
    - Ctrl+A: Select All
    - Ctrl+Arrow: Navigate to data edges
    - Ctrl+Home/End: Navigate to beginning/end of row

3. **ShiftKeyHandler** - Handles Shift key combinations (without Ctrl)

    - Shift+Arrow: Extend selection
    - Shift+Tab: Move selection left
    - Shift+Home/End: Extend selection to beginning/end of row

4. **SpecialKeyHandler** - Handles special keys

    - Enter: Start cell editing
    - Tab: Move selection right
    - Delete/Backspace: Delete cell contents
    - Escape: Cancel operation/clear copied selection

5. **NavigationKeyHandler** - Handles basic navigation

    - Arrow keys: Move selection
    - Home/End: Navigate to beginning/end of row
    - Page Up/Down: Navigate by pages

6. **TypingKeyHandler** - Handles printable characters
    - Any printable character: Start cell editing with that character

## Usage

### Integration with EventHandler

```typescript
import { KeyboardManager, IKeyboardContext } from "./keyboard/index.js";

export class EventHandler implements IKeyboardContext {
    private keyboardManager: KeyboardManager;

    constructor(/* ... */) {
        // ... existing initialization
        this.keyboardManager = new KeyboardManager(this);
    }

    private handleKeyDown(event: KeyboardEvent): void {
        const selection = this.grid.getSelection();

        // Let the keyboard manager handle the event
        if (this.keyboardManager.handleKeyboardEvent(event, selection)) {
            return; // Event was handled
        }

        // Fallback to existing keyboard handling if needed
    }

    // Implement IKeyboardContext methods...
}
```

### Adding Custom Handlers

```typescript
// Create a custom handler
class CustomKeyHandler extends BaseKeyboardHandler {
    canHandle(event: KeyboardEvent): boolean {
        return event.ctrlKey && event.key === "k";
    }

    handle(event: KeyboardEvent, selection: Selection): boolean {
        this.preventDefault(event);
        // Custom logic here
        return true;
    }
}

// Add to keyboard manager
keyboardManager.addHandler(new CustomKeyHandler(context));
```

## Benefits

1. **Separation of Concerns** - Each handler focuses on a specific type of keyboard event
2. **Maintainability** - Easy to modify or debug specific keyboard behaviors
3. **Extensibility** - Simple to add new keyboard shortcuts or modify existing ones
4. **Testability** - Each handler can be tested independently
5. **Readability** - Clear structure makes it easy to understand what each key combination does

## Handler Priority

Handlers are processed in order of priority (most specific first):

1. CtrlShiftKeyHandler (Ctrl+Shift combinations)
2. CtrlShiftSelectionHandler (Ctrl+Shift selection extension)
3. CtrlKeyHandler (Ctrl combinations)
4. ShiftKeyHandler (Shift combinations)
5. SpecialKeyHandler (Enter, Tab, Delete, etc.)
6. NavigationKeyHandler (Arrow keys, Home, End)
7. TypingKeyHandler (Printable characters)

## Files

-   `IKeyboardHandler.ts` - Core interfaces
-   `BaseKeyboardHandler.ts` - Base class with common functionality
-   `KeyboardManager.ts` - Main orchestrator
-   `CtrlShiftKeyHandler.ts` - Ctrl+Shift combinations for insertion
-   `CtrlKeyHandler.ts` - Ctrl combinations
-   `ShiftKeyHandler.ts` - Shift combinations for selection extension
-   `SpecialKeyHandler.ts` - Special keys (Enter, Tab, Delete, Escape)
-   `NavigationKeyHandler.ts` - Basic navigation
-   `TypingKeyHandler.ts` - Printable character handling
-   `KeyboardDemo.ts` - Example implementation
-   `index.ts` - Exports all classes
