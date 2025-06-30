// src/core/EventHandler.ts
import { Grid } from "./Grid.js";
import { Renderer } from "./Renderer.js";
import { CommandManager, CompositeCommand } from "../commands/Command.js";
import { EditCellCommand } from "../commands/EditCellCommand.js";
import { ResizeColumnCommand } from "../commands/ResizeColumnCommand.js";
import { ResizeRowCommand } from "../commands/ResizeRowCommand.js";
import { InsertRowCommand } from "../commands/InsertRowCommand.js";
import { InsertColumnCommand } from "../commands/InsertColumnCommand.js";
import { MathUtils } from "../utils/MathUtils.js";
import { ScrollbarManager } from "./ScrollbarManager.js";
import { Selection } from "../models/Selection.js";
/**
 * EventHandler class
 * @description Handles all the events for the grid
 */
export class EventHandler {
    /**
     * The canvas element
     */
    private canvas: HTMLCanvasElement;

    /**
     * The grid
     */
    private grid: Grid;

    /**
     * The renderer
     */
    private renderer: Renderer;

    /**
     * The command manager
     */
    private commandManager: CommandManager;
    /**
     * Whether the mouse is down
     */
    private isMouseDown: boolean = false;

    /**
     * Whether the mouse is dragging
     */
    private isDragging: boolean = false;

    /**
     * Whether the mouse is resizing
     */
    private isResizing: boolean = false;

    /**
     * The target of the resize
     */
    private resizeTarget: { type: "row" | "column"; index: number } | null =
        null;

    /**
     * The last mouse position
     */
    private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };

    /**
     * The cell that is being edited
     */
    private editingCell: { row: number; col: number } | null = null;

    /**
     * The cell editor
     */
    private cellEditor: HTMLInputElement | null = null;

    /**
     * The resize timeout
     */
    private resizeTimeout: number | null = null;

    /**
     * The scrollbar manager
     */
    private scrollbarManager: ScrollbarManager | null = null;

    private BASE_EDITOR_FONT_SIZE = 14;

    /**
     * The context menu element
     */
    private contextMenu: HTMLElement | null = null;

    /**
     * The position where the context menu was opened
     */
    private contextMenuPosition: { row: number; col: number } | null = null; // Add these properties to track row/column header dragging
    private isHeaderDragging: boolean = false;
    private headerDragType: "row" | "column" | null = null;
    private headerDragStart: number = -1;

    // Add properties to track resize operation state
    private resizeStartSize: number = -1;

    /**
     * The constructor
     * @param canvas - The canvas element
     * @param grid - The grid
     * @param renderer - The renderer
     * @param commandManager - The command manager
     */
    constructor(
        canvas: HTMLCanvasElement,
        grid: Grid,
        renderer: Renderer,
        commandManager: CommandManager
    ) {
        this.canvas = canvas;
        this.grid = grid;
        this.renderer = renderer;
        this.commandManager = commandManager;

        // Initialize context menu immediately
        this.contextMenu = document.createElement("div");
        this.contextMenu.className = "excel-context-menu";
        this.contextMenu.style.position = "absolute";
        this.contextMenu.style.display = "none";
        this.contextMenu.style.zIndex = "1000";
        this.contextMenu.style.backgroundColor = "#ffffff";
        this.contextMenu.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
        this.contextMenu.style.border = "1px solid #ccc";
        this.contextMenu.style.padding = "5px 0";
        this.contextMenu.style.minWidth = "150px";
        document.body.appendChild(this.contextMenu);

        // Close context menu when clicking outside
        document.addEventListener("click", (e) => {
            if (
                this.contextMenu &&
                this.contextMenu.style.display === "block" &&
                !this.contextMenu.contains(e.target as Node)
            ) {
                this.hideContextMenu();
            }
        });

        // Close context menu when window is scrolled
        window.addEventListener("scroll", () => {
            this.hideContextMenu();
        });

        this.setupEventListeners();
        this.createCellEditor();
    }

    /**
     * Sets up the event listeners
     */
    private setupEventListeners(): void {
        // Mouse events
        this.canvas.addEventListener(
            "mousedown",
            this.handleMouseDown.bind(this)
        );
        this.canvas.addEventListener(
            "mousemove",
            this.handleMouseMove.bind(this)
        );
        this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
        this.canvas.addEventListener(
            "dblclick",
            this.handleDoubleClick.bind(this)
        );
        this.canvas.addEventListener("wheel", this.handleWheel.bind(this));
        this.canvas.addEventListener("keydown", this.handleKeyDown.bind(this));

        // Prevent default context menu and use our custom one
        this.canvas.addEventListener("contextmenu", (e) => {
            e.preventDefault();

            const dimensions = this.grid.getDimensions();
            const zoomFactor = this.renderer.getZoom();

            // Get scroll position
            const scrollX = this.renderer.getScrollPosition().x;
            const scrollY = this.renderer.getScrollPosition().y;

            // Calculate cell position
            const contentX =
                (e.offsetX - dimensions.headerWidth) / zoomFactor + scrollX;
            const contentY =
                (e.offsetY - dimensions.headerHeight) / zoomFactor + scrollY;

            // Convert to row and column indices
            let row = -1;
            let col = -1;
            let y = 0;

            // Find the row
            for (let i = 0; i < this.grid.getCurrentRows(); i++) {
                const rowHeight = this.grid.getRowHeight(i);
                if (contentY >= y && contentY < y + rowHeight) {
                    row = i;
                    break;
                }
                y += rowHeight;
            }

            // Find the column
            let x = 0;
            for (let i = 0; i < this.grid.getCurrentCols(); i++) {
                const colWidth = this.grid.getColumnWidth(i);
                if (contentX >= x && contentX < x + colWidth) {
                    col = i;
                    break;
                }
                x += colWidth;
            }

            // Show context menu if we found a valid cell
            if (row >= 0 && col >= 0) {
                this.showContextMenu(e.clientX, e.clientY, row, col);
            }
        });

        // Touch events for mobile support
        this.canvas.addEventListener(
            "touchstart",
            this.handleTouchStart.bind(this),
            { passive: false }
        );
        this.canvas.addEventListener(
            "touchmove",
            this.handleTouchMove.bind(this),
            { passive: false }
        );
        this.canvas.addEventListener(
            "touchend",
            this.handleTouchEnd.bind(this)
        );

        // Make canvas focusable
        this.canvas.tabIndex = 0;

        window.addEventListener("resize", this.handleResize.bind(this));
    }

    /**
     * Sets the scrollbar manager
     * @param scrollbarManager - The scrollbar manager
     */
    public setScrollbarManager(scrollbarManager: ScrollbarManager): void {
        this.scrollbarManager = scrollbarManager;
    }

    /**
     * Shows the context menu at the specified position
     * @param x - The x position
     * @param y - The y position
     * @param row - The row index
     * @param col - The column index
     */
    private showContextMenu(
        x: number,
        y: number,
        row: number,
        col: number
    ): void {
        // Store the position for later use
        this.contextMenuPosition = { row, col };

        // Clear previous menu items
        this.contextMenu!.innerHTML = "";

        // Create menu items
        const menuItems = [
            {
                label: "Insert Row Above",
                action: () => this.insertRowAbove(row),
            },
            {
                label: "Insert Row Below",
                action: () => this.insertRowBelow(row),
            },
            {
                label: "Insert Column Left",
                action: () => this.insertColumnLeft(col),
            },
            {
                label: "Insert Column Right",
                action: () => this.insertColumnRight(col),
            },
        ];

        // Add menu items to the context menu
        menuItems.forEach((item) => {
            const menuItem = document.createElement("div");
            menuItem.className = "excel-context-menu-item";
            menuItem.textContent = item.label;
            menuItem.style.padding = "8px 15px";
            menuItem.style.cursor = "pointer";

            menuItem.addEventListener("mouseover", () => {
                menuItem.style.backgroundColor = "#f0f0f0";
            });

            menuItem.addEventListener("mouseout", () => {
                menuItem.style.backgroundColor = "";
            });

            menuItem.addEventListener("click", () => {
                item.action();
                this.hideContextMenu();
            });

            this.contextMenu!.appendChild(menuItem);
        });

        // Position the context menu
        this.contextMenu!.style.left = `${x}px`;
        this.contextMenu!.style.top = `${y}px`;
        this.contextMenu!.style.display = "block";
    }

    /**
     * Hides the context menu
     */
    private hideContextMenu(): void {
        if (this.contextMenu) {
            this.contextMenu.style.display = "none";
            this.contextMenuPosition = null;
        }
    }
    /**
     * Inserts a row at the specified position
     * @param position - The position where the row will be inserted
     */
    private insertRow(position: number): void {
        const command = new InsertRowCommand(this.grid, position);
        this.commandManager.executeCommand(command);

        // Update the positions in the renderer and refresh scrollbars
        this.renderer.recalculatePositions();
        this.renderer.refreshScrollbars();

        // Select the newly inserted row
        this.grid.clearAllSelections();
        this.grid
            .getSelection()
            .start(position, this.grid.getSelection().startCol);
        this.highlightHeadersForCell(
            position,
            this.grid.getSelection().startCol
        );

        this.renderer.render();
    }
    /**
     * Inserts a column at the specified position
     * @param position - The position where the column will be inserted
     */
    private insertColumn(position: number): void {
        const command = new InsertColumnCommand(this.grid, position);
        this.commandManager.executeCommand(command);

        // Update the positions in the renderer and refresh scrollbars
        this.renderer.recalculatePositions();
        this.renderer.refreshScrollbars();

        // Select the newly inserted column
        this.grid.clearAllSelections();
        this.grid
            .getSelection()
            .start(this.grid.getSelection().startRow, position);
        this.highlightHeadersForCell(
            this.grid.getSelection().startRow,
            position
        );

        this.renderer.render();
    }

    /**
     * Public method to insert a row above the specified position
     * @param position - The row index
     */
    public insertRowAbove(position: number): void {
        this.insertRow(position);
    }

    /**
     * Public method to insert a row below the specified position
     * @param position - The row index
     */
    public insertRowBelow(position: number): void {
        this.insertRow(position + 1);
    }

    /**
     * Public method to insert a column to the left of the specified position
     * @param position - The column index
     */
    public insertColumnLeft(position: number): void {
        this.insertColumn(position);
    }

    /**
     * Public method to insert a column to the right of the specified position
     * @param position - The column index
     */
    public insertColumnRight(position: number): void {
        this.insertColumn(position + 1);
    }

    /**
     * Handles the mouse down event
     * @param event - The mouse event
     */
    private handleMouseDown(event: MouseEvent): void {
        // Close any open context menu
        this.hideContextMenu();

        this.canvas.focus();
        this.isMouseDown = true;
        this.lastMousePos = { x: event.offsetX, y: event.offsetY };

        const dimensions = this.grid.getDimensions(); // Check if clicking on resize handles
        const resizeTarget = this.getResizeTarget(event.offsetX, event.offsetY);
        if (resizeTarget) {
            this.isResizing = true;
            this.resizeTarget = resizeTarget;

            // Store the initial size when resize starts
            if (resizeTarget.type === "column") {
                this.resizeStartSize = this.grid.getColumnWidth(
                    resizeTarget.index
                );
            } else {
                this.resizeStartSize = this.grid.getRowHeight(
                    resizeTarget.index
                );
            }

            this.canvas.style.cursor =
                resizeTarget.type === "column" ? "col-resize" : "row-resize";
            return;
        }

        // Check if clicking on row header
        if (
            event.offsetX < dimensions.headerWidth &&
            event.offsetY >= dimensions.headerHeight
        ) {
            // Get the zoom factor to properly adjust calculations
            const zoomFactor = this.renderer.getZoom();
            const scrollY = this.renderer.getScrollPosition().y;

            // Convert screen Y to grid Y coordinate
            const contentY =
                (event.offsetY - dimensions.headerHeight) / zoomFactor +
                scrollY;
            const gridY = contentY + dimensions.headerHeight;

            // Find the row using binary search for better performance
            let row = -1;
            let left = 0;
            let right = this.grid.getMaxRows() - 1;

            while (left <= right) {
                const mid = Math.floor((left + right) / 2);

                // Calculate row boundaries
                let rowTop = dimensions.headerHeight;
                for (let i = 0; i < mid; i++) {
                    rowTop += this.grid.getRowHeight(i);
                }

                const rowBottom = rowTop + this.grid.getRowHeight(mid);

                if (gridY >= rowTop && gridY < rowBottom) {
                    row = mid;
                    break;
                } else if (gridY < rowTop) {
                    right = mid - 1;
                } else {
                    left = mid + 1;
                }
            }

            if (row >= 0 && row < this.grid.getMaxRows()) {
                // Set up for row header dragging
                this.isHeaderDragging = true;
                this.headerDragType = "row";
                this.headerDragStart = row;

                // Initially select just this row
                this.grid.selectRow(row);
                // this.highlightHeadersForCell(row, 0);
                this.highlightHeadersForSelection();
                this.renderer.render();
                this.updateSelectionStats();
                return;
            }
        }

        // Check if clicking on column header
        if (
            event.offsetY < dimensions.headerHeight &&
            event.offsetX >= dimensions.headerWidth
        ) {
            // Get the zoom factor to properly adjust calculations
            const zoomFactor = this.renderer.getZoom();
            const scrollX = this.renderer.getScrollPosition().x;

            // Convert screen X to grid X coordinate
            const contentX =
                (event.offsetX - dimensions.headerWidth) / zoomFactor + scrollX;
            const gridX = contentX + dimensions.headerWidth;

            // Find the column using binary search for better performance
            let col = -1;
            let left = 0;
            let right = this.grid.getMaxCols() - 1;

            while (left <= right) {
                const mid = Math.floor((left + right) / 2);

                // Calculate column boundaries
                let colLeft = dimensions.headerWidth;
                for (let i = 0; i < mid; i++) {
                    colLeft += this.grid.getColumnWidth(i);
                }

                const colRight = colLeft + this.grid.getColumnWidth(mid);

                if (gridX >= colLeft && gridX < colRight) {
                    col = mid;
                    break;
                } else if (gridX < colLeft) {
                    right = mid - 1;
                } else {
                    left = mid + 1;
                }
            }

            if (col >= 0 && col < this.grid.getMaxCols()) {
                // Set up for column header dragging
                this.isHeaderDragging = true;
                this.headerDragType = "column";
                this.headerDragStart = col;

                // Initially select just this column
                this.grid.selectColumn(col);
                this.highlightHeadersForSelection();
                this.renderer.render();
                this.updateSelectionStats();
                return;
            }
        }

        // Check if clicking on header corner (select all)
        if (
            event.offsetX < dimensions.headerWidth &&
            event.offsetY < dimensions.headerHeight
        ) {
            this.grid.clearAllSelections();
            this.grid.selectAll();
            this.renderer.render();
            this.updateSelectionStats();
            return;
        }

        // Cell selection
        const cellPos = this.renderer.getCellAtPosition(
            event.offsetX,
            event.offsetY
        );
        if (cellPos) {
            this.renderer.dottedLineAcrossSelection = false;
            this.finishCellEdit();

            // Clear all selections (cell and header)
            this.grid.clearAllSelections();

            // Start a new cell selection
            this.grid.getSelection().start(cellPos.row, cellPos.col);

            // Highlight the corresponding row and column headers
            this.highlightHeadersForCell(cellPos.row, cellPos.col);

            this.renderer.render();
            this.updateSelectionStats();
        } else {
            // Clicked in an empty area, clear selection
            this.grid.clearAllSelections();
            this.renderer.render();
        }
    }

    /**
     * Handles the mouse move event
     * @param event - The mouse event
     */
    private handleMouseMove(event: MouseEvent): void {
        // Update cursor for resize handles
        if (!this.isMouseDown) {
            // Check if cursor is over a resize handle, accounting for zoom
            const resizeTarget = this.getResizeTarget(
                event.offsetX,
                event.offsetY
            );
            this.canvas.style.cursor = resizeTarget
                ? resizeTarget.type === "column"
                    ? "col-resize"
                    : "row-resize"
                : "cell";
        }

        if (!this.isMouseDown) return;

        if (this.isResizing && this.resizeTarget) {
            this.handleResizeDrag(event);
            return;
        }

        // Handle header dragging
        if (this.isHeaderDragging && this.headerDragType) {
            const dimensions = this.grid.getDimensions();

            if (this.headerDragType === "row") {
                // Row header dragging
                // Get the zoom factor to properly adjust calculations
                const zoomFactor = this.renderer.getZoom();
                const scrollY = this.renderer.getScrollPosition().y;

                // Convert screen Y to grid Y coordinate
                const contentY =
                    (event.offsetY - dimensions.headerHeight) / zoomFactor +
                    scrollY;

                // Find the current row under the cursor
                let currentRow = -1;
                let y = 0;
                for (let i = 0; i < this.grid.getCurrentRows(); i++) {
                    const rowHeight = this.grid.getRowHeight(i);
                    if (contentY >= y && contentY < y + rowHeight) {
                        currentRow = i;
                        break;
                    }
                    y += rowHeight;
                }

                // If we found a valid row and it's different from the initial row
                if (
                    currentRow >= 0 &&
                    currentRow < this.grid.getCurrentRows()
                ) {
                    // Select the range of rows
                    this.grid.selectRowRange(this.headerDragStart, currentRow);
                    // Highlight headers for the current selection range
                    this.highlightHeadersForSelection();
                    this.renderer.render();
                    this.updateSelectionStats();
                }
            } else if (this.headerDragType === "column") {
                // Column header dragging
                // Get the zoom factor to properly adjust calculations
                const zoomFactor = this.renderer.getZoom();
                const scrollX = this.renderer.getScrollPosition().x;

                // Convert screen X to grid X coordinate
                const contentX =
                    (event.offsetX - dimensions.headerWidth) / zoomFactor +
                    scrollX;

                // Find the current column under the cursor
                let currentCol = -1;
                let x = 0;
                for (let i = 0; i < this.grid.getCurrentCols(); i++) {
                    const colWidth = this.grid.getColumnWidth(i);
                    if (contentX >= x && contentX < x + colWidth) {
                        currentCol = i;
                        break;
                    }
                    x += colWidth;
                }

                // If we found a valid column and it's different from the initial column
                if (
                    currentCol >= 0 &&
                    currentCol < this.grid.getCurrentCols()
                ) {
                    // Select the range of columns
                    this.grid.selectColumnRange(
                        this.headerDragStart,
                        currentCol
                    );
                    this.highlightHeadersForSelection();
                    this.renderer.render();
                    this.updateSelectionStats();
                }
            }
            return;
        }

        // Handle cell selection dragging
        const cellPos = this.renderer.getCellAtPosition(
            event.offsetX,
            event.offsetY
        );
        if (cellPos && this.grid.getSelection().isActive) {
            this.isDragging = true;

            // Store previous selection end coordinates
            const prevEndRow = this.grid.getSelection().endRow;
            const prevEndCol = this.grid.getSelection().endCol;

            // Extend the selection
            this.grid.getSelection().extend(cellPos.row, cellPos.col);

            // If the end cell changed, update header highlighting
            if (
                prevEndRow !== this.grid.getSelection().endRow ||
                prevEndCol !== this.grid.getSelection().endCol
            ) {
                // Clear all header selections first
                this.grid.clearHeaderSelections();

                // Highlight headers for the current selection range
                this.highlightHeadersForSelection();
            }

            this.renderer.render();
            this.updateSelectionStats();
        }
    }
    /**
     * Handles the mouse up event
     */
    private handleMouseUp(): void {
        this.isMouseDown = false;
        this.isDragging = false;
        this.isHeaderDragging = false;
        this.headerDragType = null;

        if (this.isResizing && this.resizeTarget) {
            // Create and execute the final resize command when mouse is released
            const dimensions = this.grid.getDimensions();

            if (this.resizeTarget.type === "column") {
                const finalWidth = this.grid.getColumnWidth(
                    this.resizeTarget.index
                );

                // Only create a command if the size actually changed
                if (finalWidth !== this.resizeStartSize) {
                    const command = new ResizeColumnCommand(
                        this.grid,
                        this.resizeTarget.index,
                        finalWidth,
                        this.resizeStartSize // Use the original size as old width
                    );

                    // First revert to the original size
                    this.grid.setColumnWidth(
                        this.resizeTarget.index,
                        this.resizeStartSize
                    );

                    // Then execute the command which will apply the final size and enable undo
                    this.commandManager.executeCommand(command);
                }
            } else {
                const finalHeight = this.grid.getRowHeight(
                    this.resizeTarget.index
                );

                // Only create a command if the size actually changed
                if (finalHeight !== this.resizeStartSize) {
                    const command = new ResizeRowCommand(
                        this.grid,
                        this.resizeTarget.index,
                        finalHeight,
                        this.resizeStartSize // Use the original size as old height
                    );

                    // First revert to the original size
                    this.grid.setRowHeight(
                        this.resizeTarget.index,
                        this.resizeStartSize
                    );

                    // Then execute the command which will apply the final size and enable undo
                    this.commandManager.executeCommand(command);
                }
            }

            this.isResizing = false;
            this.resizeTarget = null;
            this.resizeStartSize = -1;
            this.canvas.style.cursor = "cell";
        }
    }

    /**
     * Handles the double click event
     * @param event - The mouse event
     */
    private handleDoubleClick(event: MouseEvent): void {
        const cellPos = this.renderer.getCellAtPosition(
            event.offsetX,
            event.offsetY
        );
        if (cellPos) {
            this.startCellEdit(
                cellPos.row,
                cellPos.col,
                event.offsetX,
                event.offsetY
            );
        }
    }

    /**
     * Handles the wheel event
     * @param event - The wheel event
     */
    private handleWheel(event: WheelEvent): void {
        event.preventDefault();

        // Check if Ctrl key is pressed for zooming
        if (event.ctrlKey) {
            // Use renderer's handleWheel method for zooming
            this.renderer.handleWheel(event, true);
            return;
        }

        if (this.scrollbarManager) {
            // Use scrollbar manager for smooth scrolling
            this.scrollbarManager.scrollBy(event.deltaX, event.deltaY);
        } else {
            // Fallback to direct renderer scrolling
            const scrollPos = this.renderer.getScrollPosition();
            const newScrollX = Math.max(0, scrollPos.x + event.deltaX);
            const newScrollY = Math.max(0, scrollPos.y + event.deltaY);

            this.renderer.setScroll(newScrollX, newScrollY);
            this.renderer.render();
        }

        // Update cell editor position if editing
        if (this.editingCell) {
            this.updateCellEditorPosition();
        }
    }

    /**
     * Handles the key down event
     * @param event - The keyboard event
     */
    private handleKeyDown(event: KeyboardEvent): void {
        // Handle keyboard shortcuts for undo/redo
        if (event.ctrlKey && event.key === "z") {
            this.commandManager.undo();
            this.renderer.render();
            event.preventDefault();
            return;
        }

        if (event.ctrlKey && event.key === "y") {
            this.commandManager.redo();
            this.renderer.render();
            event.preventDefault();
            return;
        } // Keyboard shortcuts for inserting rows and columns
        if (event.ctrlKey && event.shiftKey) {
            const selection = this.grid.getSelection();

            // Ctrl+Shift+Up Arrow: Insert row above
            if (event.key === "ArrowUp" && selection.startRow >= 0) {
                this.insertRowAbove(selection.startRow);
                event.preventDefault();
                return;
            }

            // Ctrl+Shift+Down Arrow: Insert row below
            if (event.key === "ArrowDown" && selection.startRow >= 0) {
                this.insertRowBelow(selection.startRow);
                event.preventDefault();
                return;
            }

            // Ctrl+Shift+Left Arrow: Insert column left
            if (event.key === "ArrowLeft" && selection.startCol >= 0) {
                this.insertColumnLeft(selection.startCol);
                event.preventDefault();
                return;
            }

            // Ctrl+Shift+Right Arrow: Insert column right
            if (event.key === "ArrowRight" && selection.startCol >= 0) {
                this.insertColumnRight(selection.startCol);
                event.preventDefault();
                return;
            }
        }

        // If we are editing a cell, don't process any other keyboard events
        if (this.editingCell !== null) {
            return;
        }

        const selection = this.grid.getSelection();
        if (!selection.isActive) return;

        let newRow = selection.startRow;
        let newCol = selection.startCol;

        // Start editing if a printable character is typed (single character, letter, number, symbol)
        // Don't start editing for control keys, arrows, etc.
        if (
            event.key.length === 1 &&
            !event.ctrlKey &&
            !event.altKey &&
            !event.metaKey
        ) {
            const cellRect = this.getCellRect(newRow, newCol);
            if (cellRect) {
                this.startCellEdit(newRow, newCol, cellRect.x, cellRect.y);

                // Clear the existing value since the user wants to start typing from scratch
                if (this.cellEditor) {
                    // Move cursor to the end of the input
                    const valueLength = this.cellEditor.value.length;
                    this.cellEditor.setSelectionRange(valueLength, valueLength);
                }
            }
            return;
        }

        // Check for shift key and handle combinations properly
        if (event.shiftKey) {
            switch (event.key) {
                case "Tab":
                    event.preventDefault(); // Prevent default tab behavior
                    newCol = Math.max(0, newCol - 1);
                    break;
                case "ArrowUp":
                    event.preventDefault();
                    // Extend selection upwards
                    selection.extend(
                        Math.max(0, selection.endRow - 1),
                        selection.endCol
                    );

                    // Update header highlighting
                    this.grid.clearHeaderSelections();
                    this.highlightHeadersForSelection();

                    this.ensureCellVisible(selection.endRow, selection.endCol);
                    this.renderer.render();
                    this.updateSelectionStats();
                    return;
                case "ArrowDown":
                    event.preventDefault();
                    // Extend selection downwards
                    selection.extend(
                        Math.min(
                            this.grid.getMaxRows() - 1,
                            selection.endRow + 1
                        ),
                        selection.endCol
                    );

                    // Update header highlighting
                    this.grid.clearHeaderSelections();
                    this.highlightHeadersForSelection();

                    this.ensureCellVisible(selection.endRow, selection.endCol);
                    this.renderer.render();
                    this.updateSelectionStats();
                    return;
                case "ArrowLeft":
                    event.preventDefault();
                    // Extend selection to the left
                    selection.extend(
                        selection.endRow,
                        Math.max(0, selection.endCol - 1)
                    );

                    // Update header highlighting
                    this.grid.clearHeaderSelections();
                    this.highlightHeadersForSelection();

                    this.ensureCellVisible(selection.endRow, selection.endCol);
                    this.renderer.render();
                    this.updateSelectionStats();
                    return;
                case "ArrowRight":
                    event.preventDefault();
                    // Extend selection to the right
                    selection.extend(
                        selection.endRow,
                        Math.min(
                            this.grid.getMaxCols() - 1,
                            selection.endCol + 1
                        )
                    );

                    // Update header highlighting
                    this.grid.clearHeaderSelections();
                    this.highlightHeadersForSelection();

                    this.ensureCellVisible(selection.endRow, selection.endCol);
                    this.renderer.render();
                    this.updateSelectionStats();
                    return;
                default:
                    break;
            }
        } else if (event.ctrlKey) {
            switch (event.key) {
                case "c":
                    {
                        const selection = this.grid.getSelection();
                        // dotted line should be drawn
                        this.renderer.renderDottedLineAcrossSelection(
                            selection
                        );
                        if (selection.isActive) {
                            const range = selection.getRange();
                            let prevRow = -1;
                            let values: string[] = [];
                            let text = "";
                            range.forEach((pos) => {
                                const cell = this.grid.getCell(
                                    pos.row,
                                    pos.col
                                );
                                const value = cell.getDisplayValue();
                                if (pos.row !== prevRow) {
                                    text += values.join("\t") + "\n";
                                    values = [];
                                    prevRow = pos.row;
                                }
                                values.push(value);
                            });
                            text += values.join("\t") + "\n";
                            navigator.clipboard.writeText(text);
                        }
                        this.renderer.render();
                        this.updateSelectionStats();
                    }
                    break;
                case "x":
                    {
                        event.preventDefault();
                        const selection = this.grid.getSelection();
                        this.renderer.renderDottedLineAcrossSelection(
                            selection
                        );
                        if (selection.isActive) {
                            const range = selection.getRange();
                            let prevRow = -1;
                            let values: string[] = [];
                            let text = "";
                            range.forEach((pos) => {
                                const cell = this.grid.getCell(
                                    pos.row,
                                    pos.col
                                );
                                const value = cell.getDisplayValue();
                                if (pos.row !== prevRow) {
                                    text += values.join("\t") + "\n";
                                    values = [];
                                    prevRow = pos.row;
                                }
                                values.push(value);
                            });
                            text += values.join("\t") + "\n";
                            navigator.clipboard.writeText(text);
                        }
                        this.deleteSelectedCells();
                        this.renderer.render();
                        this.updateSelectionStats();
                    }
                    break;
                case "v": {
                    event.preventDefault();
                    this.grid.clearAllSelections();
                    selection.start(newRow, newCol);
                    this.renderer.dottedLineAcrossSelection = false;
                    navigator.clipboard
                        .readText()
                        .then((text) => {
                            const rows = text.trim().split("\n");
                            const compositeCommand = new CompositeCommand();

                            rows.forEach((row, rowIndex) => {
                                const cells = row.split("\t");
                                cells.forEach((cellValue, colIndex) => {
                                    const targetRow = newRow + rowIndex;
                                    const targetCol = newCol + colIndex;

                                    // Check if target cell is within grid bounds
                                    if (
                                        targetRow < this.grid.getMaxRows() &&
                                        targetCol < this.grid.getMaxCols()
                                    ) {
                                        const command = new EditCellCommand(
                                            this.grid,
                                            targetRow,
                                            targetCol,
                                            this.parseValue(cellValue)
                                        );
                                        compositeCommand.addCommand(command);
                                    }
                                });
                            });

                            if (compositeCommand.count() > 0) {
                                this.commandManager.executeCommand(
                                    compositeCommand
                                );

                                // Select the pasted range
                                const lastRow = Math.min(
                                    newRow + rows.length - 1,
                                    this.grid.getMaxRows() - 1
                                );
                                const lastCol = Math.min(
                                    newCol +
                                        Math.max(
                                            ...rows.map(
                                                (r) => r.split("\t").length
                                            )
                                        ) -
                                        1,
                                    this.grid.getMaxCols() - 1
                                );

                                selection.start(newRow, newCol);
                                selection.extend(lastRow, lastCol);

                                // Highlight headers for the selection
                                this.grid.clearHeaderSelections();
                                this.highlightHeadersForSelection();
                            }

                            this.renderer.render();
                            this.updateSelectionStats();
                        })
                        .catch((err) => {
                            console.error(
                                "Failed to read clipboard contents: ",
                                err
                            );
                        });

                    this.renderer.render();
                    this.updateSelectionStats();
                    break;
                }
                case "ArrowRight":
                    event.preventDefault();
                    this.grid.clearAllSelections();
                    selection.start(newRow, newCol);
                    newCol = this.grid.getMaxCols() - 1;
                    this.renderer.render();
                    this.updateSelectionStats();
                    break;
                case "ArrowLeft":
                    event.preventDefault();
                    this.grid.clearAllSelections();
                    selection.start(newRow, newCol);
                    newCol = 0;
                    this.renderer.render();
                    this.updateSelectionStats();
                    break;
                case "ArrowDown":
                    event.preventDefault();
                    this.grid.clearAllSelections();
                    selection.start(newRow, newCol);
                    newRow = this.grid.getMaxRows() - 1;
                    this.renderer.render();
                    this.updateSelectionStats();
                    break;
                case "ArrowUp":
                    event.preventDefault();
                    this.grid.clearAllSelections();
                    selection.start(newRow, newCol);
                    newRow = 0;
                    this.renderer.render();
                    this.updateSelectionStats();
                    break;
                default:
                    return;
            }
        } else {
            // Handle regular key presses (without shift)
            switch (event.key) {
                case "ArrowUp":
                    event.preventDefault();
                    newRow = Math.max(0, newRow - 1);
                    this.handleSelectionAfterKeyDown(selection, newRow, newCol);
                    break;
                case "ArrowDown":
                    event.preventDefault();
                    newRow = Math.min(this.grid.getMaxRows() - 1, newRow + 1);
                    this.handleSelectionAfterKeyDown(selection, newRow, newCol);
                    break;
                case "ArrowLeft":
                    event.preventDefault();
                    newCol = Math.max(0, newCol - 1);
                    this.handleSelectionAfterKeyDown(selection, newRow, newCol);
                    break;
                case "ArrowRight":
                    event.preventDefault();
                    newCol = Math.min(this.grid.getMaxCols() - 1, newCol + 1);
                    this.handleSelectionAfterKeyDown(selection, newRow, newCol);
                    break;
                case "Enter":
                    const cellRect = this.getCellRect(newRow, newCol);
                    if (cellRect) {
                        this.startCellEdit(
                            newRow,
                            newCol,
                            cellRect.x,
                            cellRect.y
                        );
                    }
                    this.renderer.render();
                    this.updateSelectionStats();
                    return;
                case "Delete":
                    this.deleteSelectedCells();
                    this.renderer.render();
                    this.updateSelectionStats();
                    return;
                case "Backspace":
                    this.deleteSelectedCells();
                    this.renderer.render();
                    this.updateSelectionStats();
                    this.startCellEdit(newRow, newCol, 0, 0);
                    return;
                case "Tab":
                    event.preventDefault(); // Prevent default tab behavior
                    newCol = Math.min(this.grid.getMaxCols() - 1, newCol + 1);
                    this.grid.clearAllSelections();
                    selection.start(newRow, newCol);
                    this.renderer.render();
                    this.updateSelectionStats();
                    break;
                default:
                    return;
            }
        }

        // Highlight corresponding headers for the new cell
        this.highlightHeadersForCell(newRow, newCol);

        // Make sure the cell is visible
        this.ensureCellVisible(newRow, newCol);
    }

    /**
     * Handles the selection after a key down event
     * @param selection - The current selection
     * @param newRow - The new row index
     * @param newCol - The new column index
     */
    private handleSelectionAfterKeyDown(
        selection: Selection,
        newRow: number,
        newCol: number
    ): void {
        this.grid.clearAllSelections();
        selection.start(newRow, newCol);
        this.highlightHeadersForCell(newRow, newCol);
        this.renderer.render();
        this.updateSelectionStats();
    }

    /**
     * Handles the scroll event
     */
    public handleScroll(): void {
        // Update cell editor position during any scroll event
        if (this.editingCell) {
            this.updateCellEditorPosition();
        }
    }

    /**
     * Handles the key down event for the cell editor
     * @param event - The keyboard event
     */
    private handleEditorKeyDown(event: KeyboardEvent): void {
        if (event.key === "Enter") {
            this.finishCellEdit();
        } else if (event.key === "Escape") {
            this.cellEditor!.style.display = "none";
            this.editingCell = null;
            this.canvas.focus();
        }
    }

    /**
     * Handles the resize event
     */
    private handleResize(): void {
        // Use a timeout to debounce resize events
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        this.resizeTimeout = setTimeout(() => {
            this.renderer.handleWindowResize();
        }, 100);
    }

    /**
     * Gets the resize target
     * @param x - The x position
     * @param y - The y position
     * @returns The resize target
     */
    private getResizeTarget(
        x: number,
        y: number
    ): { type: "row" | "column"; index: number } | null {
        const dimensions = this.grid.getDimensions();
        const tolerance = 3;
        const zoomFactor = this.renderer.getZoom();

        // Check column resize handles
        if (y <= dimensions.headerHeight) {
            const scrollX = this.renderer.getScrollPosition().x;
            let currentX = dimensions.headerWidth;

            // Apply zoom factor to position calculations
            for (let col = 0; col < this.grid.getMaxCols(); col++) {
                const colWidth = this.grid.getColumnWidth(col) * zoomFactor;
                currentX += colWidth;

                // Adjust position based on scroll and zoom
                const adjustedX = currentX - scrollX * zoomFactor;

                if (Math.abs(x - adjustedX) <= tolerance * zoomFactor) {
                    return { type: "column", index: col };
                }

                // Break early if we're past the viewport
                if (
                    adjustedX >
                    x +
                        tolerance * zoomFactor +
                        dimensions.columnWidth * zoomFactor
                ) {
                    break;
                }
            }
        }

        // Check row resize handles
        if (x <= dimensions.headerWidth) {
            const scrollY = this.renderer.getScrollPosition().y;
            let currentY = dimensions.headerHeight;

            // Apply zoom factor to position calculations
            for (let row = 0; row < this.grid.getMaxRows(); row++) {
                const rowHeight = this.grid.getRowHeight(row) * zoomFactor;
                currentY += rowHeight;

                // Adjust position based on scroll and zoom
                const adjustedY = currentY - scrollY * zoomFactor;

                if (Math.abs(y - adjustedY) <= tolerance * zoomFactor) {
                    return { type: "row", index: row };
                }

                // Break early if we're past the viewport
                if (
                    adjustedY >
                    y +
                        tolerance * zoomFactor +
                        dimensions.rowHeight * zoomFactor
                ) {
                    break;
                }
            }
        }

        return null;
    }
    /**
     * Handles the resize drag event
     * @param event - The mouse event
     */
    private handleResizeDrag(event: MouseEvent): void {
        if (!this.resizeTarget) return;

        const dimensions = this.grid.getDimensions();
        const zoomFactor = this.renderer.getZoom();

        // Calculate the drag delta, accounting for zoom
        const rawDelta =
            this.resizeTarget.type === "column"
                ? event.offsetX - this.lastMousePos.x
                : event.offsetY - this.lastMousePos.y;

        // Adjust delta based on zoom factor to ensure resize works properly at any zoom level
        const delta = rawDelta / zoomFactor;

        if (this.resizeTarget.type === "column") {
            const currentWidth = this.grid.getColumnWidth(
                this.resizeTarget.index
            );
            const newWidth = Math.max(50, currentWidth + delta);

            // Directly update the grid without creating a command
            // The command will be created only when the resize operation is complete (on mouse up)
            this.grid.setColumnWidth(this.resizeTarget.index, newWidth);
        } else {
            const currentHeight = this.grid.getRowHeight(
                this.resizeTarget.index
            );
            const newHeight = Math.max(20, currentHeight + delta);

            // Directly update the grid without creating a command
            // The command will be created only when the resize operation is complete (on mouse up)
            this.grid.setRowHeight(this.resizeTarget.index, newHeight);
        }

        this.lastMousePos = { x: event.offsetX, y: event.offsetY };

        // Update the UI
        if (this.scrollbarManager) {
            requestAnimationFrame(() => {
                this.renderer.render();
            });
        }
    }

    /**
     * Handles the calculation
     * @param value - The value
     * @param editingCellRow - The row of the cell containing the formula (optional)
     * @param editingCellCol - The column of the cell containing the formula (optional)
     * @returns The calculated result or null if not a formula
     */
    public handleCalculation(value: string): number | null {
        // Check if it's a formula starting with =
        if (!value.startsWith("=")) {
            return null;
        }

        // Extract the function and range, e.g., "=SUM(A1:A10)"
        const formulaMatch = value.match(/^=(\w+)\(([A-Z]+\d+:[A-Z]+\d+)\)$/);
        if (!formulaMatch) return null;

        const functionName = formulaMatch[1].toUpperCase();
        const range = formulaMatch[2];

        // Parse the range
        const rangeMatch = range.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
        if (!rangeMatch) return null;

        const startRow = rangeMatch[2];
        const startCol = rangeMatch[1];
        const endRow = rangeMatch[4];
        const endCol = rangeMatch[3];

        const startRowIndex = parseInt(startRow) - 1;
        const startColIndex = startCol.charCodeAt(0) - 65;
        const endRowIndex = parseInt(endRow) - 1;
        const endColIndex = endCol.charCodeAt(0) - 65;

        const cellsInRange = this.grid.getCellsInRange(
            startRowIndex,
            startColIndex,
            endRowIndex,
            endColIndex
        );

        // Calculate the result based on the function
        let result: number | null = null;

        switch (functionName) {
            case "SUM":
                result = this.calculateSum(cellsInRange);
                break;
            case "AVG":
            case "AVERAGE":
                result = this.calculateAverage(cellsInRange);
                break;
            case "MIN":
                result = this.calculateMin(cellsInRange);
                break;
            case "MAX":
                result = this.calculateMax(cellsInRange);
                break;
            case "COUNT":
                result = this.calculateCount(cellsInRange);
                break;
            default:
                console.warn(`Unsupported function: ${functionName}`);
                return null;
        } // Select the cells in the range for visual feedback

        this.grid.getSelection().start(startRowIndex, startColIndex);
        this.grid.getSelection().extend(endRowIndex, endColIndex);
        this.updateSelectionStats();
        this.highlightHeadersForSelection();
        this.renderer.render();

        return result;
    }

    /**
     * Handles the touch start event for mobile devices
     * @param event - The touch event
     */
    private handleTouchStart(event: TouchEvent): void {
        // Prevent default to avoid scrolling the page
        event.preventDefault();

        if (event.touches.length === 1) {
            const touch = event.touches[0];
            const rect = this.canvas.getBoundingClientRect();

            // Convert touch coordinates to canvas coordinates
            const offsetX = touch.clientX - rect.left;
            const offsetY = touch.clientY - rect.top;

            // Create a synthetic mouse event
            const mouseEvent = {
                offsetX,
                offsetY,
                preventDefault: () => {},
                stopPropagation: () => {},
                button: 0, // Left mouse button
            } as unknown as MouseEvent;

            // Handle as a mouse down event
            this.handleMouseDown(mouseEvent);

            // Store the touch position for potential double-tap detection
            this.lastTouchPosition = { x: offsetX, y: offsetY };
            this.lastTouchTime = Date.now();
        }
    }

    /**
     * Handles the touch move event for mobile devices
     * @param event - The touch event
     */
    private handleTouchMove(event: TouchEvent): void {
        // Prevent default to avoid scrolling the page when manipulating the grid
        event.preventDefault();

        if (
            event.touches.length === 1 &&
            (this.isMouseDown || this.isHeaderDragging)
        ) {
            const touch = event.touches[0];
            const rect = this.canvas.getBoundingClientRect();

            // Convert touch coordinates to canvas coordinates
            const offsetX = touch.clientX - rect.left;
            const offsetY = touch.clientY - rect.top;

            // Create a synthetic mouse event
            const mouseEvent = {
                offsetX,
                offsetY,
                preventDefault: () => {},
                stopPropagation: () => {},
            } as unknown as MouseEvent;

            // Handle as a mouse move event
            this.handleMouseMove(mouseEvent);
        }
    }

    /**
     * Handles the touch end event for mobile devices
     * @param event - The touch event
     */
    private handleTouchEnd(event: TouchEvent): void {
        // Create a synthetic mouse event
        const mouseEvent = {
            preventDefault: () => {},
            stopPropagation: () => {},
        } as unknown as MouseEvent;

        // Handle as a mouse up event
        this.handleMouseUp();

        // Check for double-tap (similar to double-click)
        if (this.lastTouchPosition && this.lastTouchTime) {
            const now = Date.now();
            const timeDiff = now - this.lastTouchTime;

            if (timeDiff < 300) {
                // 300ms threshold for double-tap
                const touch = event.changedTouches[0];
                const rect = this.canvas.getBoundingClientRect();

                // Convert touch coordinates to canvas coordinates
                const offsetX = touch.clientX - rect.left;
                const offsetY = touch.clientY - rect.top;

                // Create a synthetic mouse event for double-click
                const dblClickEvent = {
                    offsetX,
                    offsetY,
                    preventDefault: () => {},
                    stopPropagation: () => {},
                } as unknown as MouseEvent;

                // Simulate double-click to edit cell
                this.handleDoubleClick(dblClickEvent);
            }

            // Reset touch tracking
            this.lastTouchPosition = null;
            this.lastTouchTime = 0;
        }
    }

    /**
     * Creates the cell editor
     */
    private createCellEditor(): void {
        this.cellEditor = document.createElement("input");
        this.cellEditor.type = "text";
        this.cellEditor.style.position = "absolute";
        this.cellEditor.style.display = "none";
        // this.cellEditor.style.border = '2px solid #316AC5';
        this.cellEditor.style.padding = "2px";
        // this.cellEditor.style.fontSize = '16px';
        this.cellEditor.style.fontFamily = "Calibri";
        // this.cellEditor.style.zIndex = '10';
        this.cellEditor.style.outline = "none";
        this.cellEditor.style.boxSizing = "border-box";
        this.cellEditor.style.margin = "0";

        this.cellEditor.addEventListener(
            "blur",
            this.finishCellEdit.bind(this)
        );
        this.cellEditor.addEventListener(
            "keydown",
            this.handleEditorKeyDown.bind(this)
        );

        // Mobile-specific events
        this.cellEditor.addEventListener("touchend", (e) => {
            // Prevent bubbling to allow the virtual keyboard to appear
            e.stopPropagation();
        });

        document.body.appendChild(this.cellEditor);
    }

    /**
     * Starts editing a cell
     * @param row - The row index
     * @param col - The column index
     * @param x - The x coordinate
     * @param y - The y coordinate
     */
    private startCellEdit(
        row: number,
        col: number,
        x: number,
        y: number
    ): void {
        this.finishCellEdit(); // Finish any existing edit

        const cell = this.grid.getCell(row, col);
        const cellRect = this.getCellRect(row, col);

        if (!cellRect) return;

        this.editingCell = { row, col };

        if (this.cellEditor) {
            // Position and size the editor
            const canvasRect = this.canvas.getBoundingClientRect();
            const zoomFactor = this.renderer.getZoom();
            this.cellEditor.style.left = canvasRect.left + cellRect.x + "px";
            this.cellEditor.style.top = canvasRect.top + cellRect.y + "px";
            this.cellEditor.style.width = cellRect.width + "px";
            this.cellEditor.style.height = cellRect.height + "px";
            this.cellEditor.style.display = "block";
            this.cellEditor.style.fontSize =
                this.BASE_EDITOR_FONT_SIZE * zoomFactor + "px";
            // Set the initial value - use edit value to show formula if present
            this.cellEditor.value = cell.getEditValue();

            // Focus and go to the end of the input
            this.cellEditor.focus();
            const valueLength = this.cellEditor.value.length;
            this.cellEditor.setSelectionRange(valueLength, valueLength);

            // On mobile, try to open the keyboard by simulating a click
            if ("ontouchstart" in window) {
                setTimeout(() => {
                    this.cellEditor?.click();
                }, 100);
            }
        }
    }

    /**
     * Finishes the cell edit
     */
    private finishCellEdit(): void {
        if (!this.editingCell || !this.cellEditor) return;

        const newValue = this.cellEditor.value;
        const oldValue = this.grid.getCellValue(
            this.editingCell.row,
            this.editingCell.col
        );
        if (newValue !== String(oldValue)) {
            let finalValue: any = newValue;
            let formula: string | undefined = undefined; // Check if it's a formula
            if (newValue.startsWith("=")) {
                const calculatedResult = this.handleCalculation(newValue);
                if (calculatedResult !== null) {
                    formula = newValue;
                    finalValue = calculatedResult; // Store the calculated number directly
                } else {
                    // If formula parsing failed, just store as string
                    finalValue = this.parseValue(newValue);
                }
            } else {
                finalValue = this.parseValue(newValue);
            }

            // Create and execute the command
            const command = new EditCellCommand(
                this.grid,
                this.editingCell.row,
                this.editingCell.col,
                finalValue,
                undefined, // style (keep existing)
                formula // store the formula
            );
            this.commandManager.executeCommand(command);
            this.renderer.render();
        } else {
            // Even if value didn't change, check if it was a formula to show selection
            if (newValue.startsWith("=")) {
                this.handleCalculation(newValue);
            }
        }

        this.cellEditor.style.display = "none";
        this.editingCell = null;
        this.canvas.focus();
    }

    /**
     * Parses the value
     * @param value - The value
     * @returns The parsed value
     */
    private parseValue(value: string): any {
        if (value === "") return "";

        // Try to parse as number
        const num = parseFloat(value);
        if (!isNaN(num) && isFinite(num)) {
            return num;
        }

        // Try to parse as boolean
        if (value.toLowerCase() === "true") return true;
        if (value.toLowerCase() === "false") return false;

        // Return as string
        return value;
    }

    /**
     * Deletes the selected cells as a single undoable operation
     */
    private deleteSelectedCells(): void {
        const selection = this.grid.getSelection();
        if (!selection.isActive) return;

        const positions = selection.getRange();

        const compositeCommand = new CompositeCommand();

        positions.forEach((pos) => {
            const cell = this.grid.getCell(pos.row, pos.col);
            const command = new EditCellCommand(
                this.grid,
                pos.row,
                pos.col,
                ""
            );
            compositeCommand.addCommand(command);
        });

        if (compositeCommand.count() > 0) {
            this.commandManager.executeCommand(compositeCommand);
        }

        this.renderer.render();
        this.updateSelectionStats();
    }

    /**
     * Gets the cell rectangle
     * @param row - The row index
     * @param col - The column index
     * @returns The cell rectangle
     */
    private getCellRect(
        row: number,
        col: number
    ): { x: number; y: number; width: number; height: number } | null {
        const dimensions = this.grid.getDimensions();
        const scrollPos = this.renderer.getScrollPosition();
        const zoomFactor = this.renderer.getZoom();

        // Use the renderer's position calculation if available
        let xPos = 0;
        let yPos = 0;

        // Get the column position (unzoomed)
        let colPos = dimensions.headerWidth;
        for (let i = 0; i < col; i++) {
            colPos += this.grid.getColumnWidth(i);
        }

        // Get the row position (unzoomed)
        let rowPos = dimensions.headerHeight;
        for (let i = 0; i < row; i++) {
            rowPos += this.grid.getRowHeight(i);
        }

        // Calculate zoomed position with proper scroll offset
        // Formula: header + (position - header - scroll) * zoom
        xPos =
            dimensions.headerWidth +
            (colPos - dimensions.headerWidth - scrollPos.x) * zoomFactor;
        yPos =
            dimensions.headerHeight +
            (rowPos - dimensions.headerHeight - scrollPos.y) * zoomFactor;

        // Apply zoom to width and height to ensure correct sizing
        const width = this.grid.getColumnWidth(col) * zoomFactor;
        const height = this.grid.getRowHeight(row) * zoomFactor;

        return { x: xPos, y: yPos, width, height };
    }

    /**
     * Ensures the cell is visible
     * @param row - The row index
     * @param col - The column index
     */
    private ensureCellVisible(row: number, col: number): void {
        const dimensions = this.grid.getDimensions();
        const scrollPos = this.renderer.getScrollPosition();
        const zoomFactor = this.renderer.getZoom();
        const cellRect = this.getCellRect(row, col);

        if (!cellRect) return;

        let newScrollX = scrollPos.x;
        let newScrollY = scrollPos.y;

        // Check horizontal scrolling
        if (cellRect.x < dimensions.headerWidth) {
            // Need to scroll left
            // Calculate required scroll position by summing column widths
            newScrollX = 0;
            for (let i = 0; i < col; i++) {
                newScrollX += this.grid.getColumnWidth(i);
            }
        } else if (cellRect.x + cellRect.width > this.canvas.width) {
            // Need to scroll right
            // Calculate position that puts the right edge of the cell at the right edge of the viewport
            newScrollX = 0;

            // Sum widths up to and including the current column
            for (let i = 0; i <= col; i++) {
                newScrollX += this.grid.getColumnWidth(i);
            }

            // Adjust to align with right edge of viewport
            newScrollX =
                newScrollX -
                (this.canvas.width - dimensions.headerWidth) / zoomFactor;
        }

        // Check vertical scrolling
        if (cellRect.y < dimensions.headerHeight) {
            newScrollY = 0;
            for (let i = 0; i < row; i++) {
                newScrollY += this.grid.getRowHeight(i);
            }
        } else if (cellRect.y + cellRect.height > this.canvas.height) {
            newScrollY = 0;

            for (let i = 0; i <= row; i++) {
                newScrollY += this.grid.getRowHeight(i);
            }

            newScrollY =
                newScrollY -
                (this.canvas.height - dimensions.headerHeight) / zoomFactor;
        }

        if (newScrollX !== scrollPos.x || newScrollY !== scrollPos.y) {
            this.renderer.setScroll(
                Math.max(0, newScrollX),
                Math.max(0, newScrollY)
            );
        }
    }

    /**
     * Updates the selection stats
     */
    private updateSelectionStats(): void {
        const statsElement = document.getElementById("selectionStats");
        if (!statsElement) return;

        const selectedCells = this.grid.getCellsInSelection();

        if (selectedCells.length === 0) {
            statsElement.textContent = "";
            return;
        }

        const stats = MathUtils.calculateStats(selectedCells);

        if (stats.count > 0) {
            statsElement.innerHTML = `
                <div class="stat-item" id="count">Count: <span class="stat-value">${
                    stats.count
                }</span></div>
                <div class="stat-item" id="sum">Sum: <span class="stat-value">${stats.sum.toLocaleString()}</span></div>
                <div class="stat-item" id="avg">Avg: <span class="stat-value">${stats.average.toFixed(
                    2
                )}</span></div>
                <div class="stat-item" id="min">Min: <span class="stat-value">${
                    stats.min
                }</span></div>
                <div class="stat-item" id="max">Max: <span class="stat-value">${
                    stats.max
                }</span></div>
                <div class="stat-item" id="selected">Selected: <span class="stat-value">${
                    selectedCells.length
                } cells</span></div>
            `;
        } else {
            statsElement.innerHTML = `<div class="stat-item" id="selected">Selected: <span class="stat-value">${selectedCells.length} cells</span></div>`;
        }
    }

    /**
     * Updates the cell editor position
     */
    private updateCellEditorPosition(): void {
        if (!this.editingCell || !this.cellEditor) return;

        // Get the cell rectangle which already accounts for zoom
        const cellRect = this.getCellRect(
            this.editingCell.row,
            this.editingCell.col
        );

        if (cellRect) {
            const canvasRect = this.canvas.getBoundingClientRect();
            const zoomFactor = this.renderer.getZoom();

            // Position the editor at the exact cell position
            // Make sure we align to pixel boundaries for sharp rendering
            const left = Math.round(canvasRect.left + cellRect.x);
            const top = Math.round(canvasRect.top + cellRect.y);
            const width = Math.round(cellRect.width);
            const height = Math.round(cellRect.height);

            this.cellEditor.style.left = left + "px";
            this.cellEditor.style.top = top + "px";
            this.cellEditor.style.width = width + "px";
            this.cellEditor.style.height = height + "px";

            // Update font size based on zoom factor
            this.cellEditor.style.fontSize =
                this.BASE_EDITOR_FONT_SIZE * zoomFactor + "px";
        }
    }

    // Properties for tracking touch for double-tap detection
    private lastTouchPosition: { x: number; y: number } | null = null;
    private lastTouchTime: number = 0;

    /**
     * Updates the resize handles when zoom changes
     * This is called from the renderer when zoom changes
     */
    public updateResizeHandlesOnZoom(): void {
        // Clear any active resize operations if we're in the middle of one
        if (this.isResizing) {
            this.isResizing = false;
            this.resizeTarget = null;
            this.canvas.style.cursor = "cell";
        }

        // Force a re-render to update all positions with new zoom
        this.renderer.render();
    }

    /**
     * Highlights the corresponding row and column headers for a cell
     * @param row - The row index
     * @param col - The column index
     */
    public highlightHeadersForCell(row: number, col: number): void {
        console.log(`Highlighting headers for cell at (${row}, ${col})`);

        // Get the row and column objects
        const rowObj = this.grid.getRow(row);
        const colObj = this.grid.getColumn(col);

        // Highlight the row header without selecting the entire row
        if (rowObj) {
            rowObj.select();
        }

        // Highlight the column header without selecting the entire column
        if (colObj) {
            colObj.select();
        }
    }

    /**
     * Highlights the corresponding row and column headers for a selection
     */
    private highlightHeadersForSelection(): void {
        const selection = this.grid.getSelection();
        if (!selection.isActive) return;

        const startRow = selection.startRow;
        const endRow = selection.endRow;
        const startCol = selection.startCol;
        const endCol = selection.endCol;

        for (
            let row = Math.min(startRow, endRow);
            row <= Math.max(startRow, endRow);
            row++
        ) {
            const rowObj = this.grid.getRow(row);
            if (rowObj) {
                rowObj.select();
            }
        }

        for (
            let col = Math.min(startCol, endCol);
            col <= Math.max(startCol, endCol);
            col++
        ) {
            const colObj = this.grid.getColumn(col);
            if (colObj) {
                colObj.select();
            }
        }
    }

    public toggleStyle(
        style: "bold" | "italic" | "underline" | "strikethrough"
    ): void {
        const selection = this.grid.getSelection();
        if (!selection.isActive) return;

        const positions = selection.getRange();
        const compositeCommand = new CompositeCommand();

        positions.forEach((pos) => {
            const cell = this.grid.getCell(pos.row, pos.col);
            const currentStyle = cell.getStyle();
            const newStyle = {
                ...currentStyle,
                fontWeight:
                    style === "bold"
                        ? currentStyle.fontWeight === "bold"
                            ? "normal"
                            : "bold"
                        : currentStyle.fontWeight,
                fontStyle:
                    style === "italic"
                        ? currentStyle.fontStyle === "italic"
                            ? "normal"
                            : "italic"
                        : currentStyle.fontStyle,
                textDecoration:
                    style === "strikethrough"
                        ? currentStyle.textDecoration === "line-through"
                            ? "none"
                            : "line-through"
                        : currentStyle.textDecoration,
                textDecorationLine:
                    style === "underline"
                        ? currentStyle.textDecorationLine === "underline"
                            ? "none"
                            : "underline"
                        : currentStyle.textDecorationLine,
            };
            const command = new EditCellCommand(
                this.grid,
                pos.row,
                pos.col,
                cell.value,
                newStyle
            );
            compositeCommand.addCommand(command);
        });

        if (compositeCommand.count() > 0) {
            this.commandManager.executeCommand(compositeCommand);
            this.renderer.render();
            this.updateSelectionStats();
        }
    }

    /**
     * Calculates the sum of cells
     * @param cells - Array of cells
     * @returns The sum
     */
    private calculateSum(cells: any[]): number {
        let sum = 0;
        for (const cell of cells) {
            const numericValue = cell.getNumericValue();
            if (numericValue !== null) {
                sum += numericValue;
            }
        }
        return sum;
    }

    /**
     * Calculates the average of cells
     * @param cells - Array of cells
     * @returns The average
     */
    private calculateAverage(cells: any[]): number {
        const numericValues = cells
            .map((cell) => cell.getNumericValue())
            .filter((value) => value !== null);

        if (numericValues.length === 0) return 0;

        const sum = numericValues.reduce((acc, val) => acc + val, 0);
        return sum / numericValues.length;
    }

    /**
     * Calculates the minimum value of cells
     * @param cells - Array of cells
     * @returns The minimum value
     */
    private calculateMin(cells: any[]): number {
        const numericValues = cells
            .map((cell) => cell.getNumericValue())
            .filter((value) => value !== null);

        if (numericValues.length === 0) return 0;

        return Math.min(...numericValues);
    }

    /**
     * Calculates the maximum value of cells
     * @param cells - Array of cells
     * @returns The maximum value
     */
    private calculateMax(cells: any[]): number {
        const numericValues = cells
            .map((cell) => cell.getNumericValue())
            .filter((value) => value !== null);

        if (numericValues.length === 0) return 0;

        return Math.max(...numericValues);
    }

    /**
     * Counts the number of cells with numeric values
     * @param cells - Array of cells
     * @returns The count
     */
    private calculateCount(cells: any[]): number {
        return cells
            .map((cell) => cell.getNumericValue())
            .filter((value) => value !== null).length;
    }
}
