# EventHandler Refactoring Guide

## Overview

The EventHandler has been refactored to use a handler pattern that separates different mouse interaction modes into individual handler classes. This makes the code more maintainable and extensible.

## Key Changes

### Before (Old EventHandler):

-   Single monolithic class with `handleMouseDown`, `handleMouseMove`, `handleMouseUp` methods
-   All interaction logic mixed together in these three methods
-   Complex state tracking with multiple boolean flags

### After (New EventHandler):

-   **HandlerManager**: Manages the current active handler and delegates events
-   **BaseHandler**: Abstract base class for all handlers
-   **DefaultHandler**: Normal cell selection and interaction
-   **ResizeHandler**: Column/row resizing operations
-   **HeaderDragHandler**: Row/column header dragging for range selection

## Handler Classes

### 1. BaseHandler (Abstract)

```typescript
interface IEventHandler {
    handleMouseDown(event: MouseEvent): boolean;
    handleMouseMove(event: MouseEvent): boolean;
    handleMouseUp(event: MouseEvent): boolean;
    onActivate(): void;
    onDeactivate(): void;
    getCursor(x: number, y: number): string;
}
```

### 2. DefaultHandler

-   Handles normal cell selection
-   Auto-scrolling during selection
-   Document-level mouse tracking for selection outside canvas

### 3. ResizeHandler

-   Manages column/row resizing operations
-   Creates undo/redo commands for resize operations
-   Handles zoom-aware resize calculations

### 4. HeaderDragHandler

-   Handles row/column header dragging for range selection
-   Manages row/column range selection

### 5. HandlerManager

-   Determines which handler to use based on mouse position
-   Switches between handlers automatically
-   Manages handler lifecycle (activate/deactivate)

## Usage

### To replace the old EventHandler:

1. **Replace the import in your main file:**

```typescript
// Old
import { EventHandler } from "./core/EventHandler.js";

// New
import { EventHandler } from "./core/EventHandlerRefactored.js";
```

2. **The public API remains the same:**

```typescript
const eventHandler = new EventHandler(canvas, grid, renderer, commandManager);
eventHandler.setScrollbarManager(scrollbarManager);
```

## Benefits

1. **Separation of Concerns**: Each handler focuses on one specific interaction mode
2. **Extensibility**: Easy to add new interaction modes (e.g., drawing, annotation)
3. **Maintainability**: Each handler is smaller and easier to understand
4. **Testability**: Individual handlers can be tested in isolation
5. **Cleaner State Management**: No more complex boolean flags for different modes

## Adding New Handlers

To add a new interaction mode:

1. Create a new handler class extending `BaseHandler`
2. Implement the required methods
3. Add detection logic to `HandlerManager.determineHandler()`
4. The handler will be automatically integrated into the system

Example:

```typescript
export class DrawingHandler extends BaseHandler {
    handleMouseDown(event: MouseEvent): boolean {
        // Start drawing
        return true;
    }

    handleMouseMove(event: MouseEvent): boolean {
        // Continue drawing
        return true;
    }

    handleMouseUp(event: MouseEvent): boolean {
        // Finish drawing
        return true;
    }

    getCursor(x: number, y: number): string {
        return "crosshair";
    }
}
```

## Migration Notes

-   The new EventHandler implements the same `IHandlerContext` interface
-   All public methods remain the same
-   Internal implementation is completely refactored
-   Performance should be similar or better due to better separation

## File Structure

```
core/
  handlers/
    BaseHandler.ts       - Base interface and abstract class
    DefaultHandler.ts    - Normal cell selection
    ResizeHandler.ts     - Column/row resizing
    HeaderDragHandler.ts - Header dragging for range selection
    HandlerManager.ts    - Central handler coordinator
    index.ts            - Exports
  EventHandlerRefactored.ts - New EventHandler implementation
```
