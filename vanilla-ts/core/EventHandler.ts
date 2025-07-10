// src/core/EventHandler.ts
import { Grid } from "./Grid.js";
import { Renderer } from "./Renderer.js";
import { CommandManager, CompositeCommand } from "../commands/Command.js";
import { EditCellCommand } from "../commands/EditCellCommand.js";
import { InsertRowCommand } from "../commands/InsertRowCommand.js";
import { InsertColumnCommand } from "../commands/InsertColumnCommand.js";
import { MathUtils } from "../utils/MathUtils.js";
import { ScrollbarManager } from "./ScrollbarManager.js";
import { Selection } from "../models/Selection.js";
import { RemoveRowCommand } from "../commands/RemoveRowCommand.js";
import { RemoveColumnCommand } from "../commands/RemoveColumnCommand.js";
import { HandlerManager } from "./MouseHandlers/Management/HandlerManager.js";
import { IHandlerContext } from "./MouseHandlers/Base/BaseHandler.js";
import { KeyboardManager } from "./keyboardHandlers/KeyboardManager.js";
import { IKeyboardContext } from "./keyboardHandlers/IKeyboardHandler.js";
import { ICellStyle } from "../types/interfaces.js";

/**
 * EventHandler class
 * @description Handles all the events for the grid using a handler pattern
 */
export class EventHandler implements IHandlerContext, IKeyboardContext {
    /**
     * The canvas element
     */
    public canvas: HTMLCanvasElement;

    /**
     * The grid
     */
    public grid: Grid;

    /**
     * The renderer
     */
    public renderer: Renderer;

    /**
     * The command manager
     */
    public commandManager: CommandManager;

    /**
     * The scrollbar manager
     */
    public scrollbarManager: ScrollbarManager | null = null;

    /**
     * The cell that is being edited
     */
    public editingCell: { row: number; col: number } | null = null;

    /**
     * The cell editor
     */
    public cellEditor: HTMLInputElement | null = null;

    /**
     * The resize timeout
     */
    private resizeTimeout: number | null = null;

    private BASE_EDITOR_FONT_SIZE = 14;

    /**
     * The context menu element
     */
    private contextMenu: HTMLElement | null = null;
    /**
     * The position where the context menu was opened
     */
    private contextMenuPosition: { row: number; col: number } | null = null;

    // Properties for tracking touch for double-tap detection
    private lastTouchPosition: { x: number; y: number } | null = null;
    private lastTouchTime: number = 0;

    // Properties for touch scrolling
    private touchScrollLastX: number = 0;
    private touchScrollLastY: number = 0;
    private isTouchScrolling: boolean = false;

    // Properties for smooth inertial scrolling
    private scrollVelocityX: number = 0;
    private scrollVelocityY: number = 0;
    private lastTouchMoveTime: number = 0;
    private inertialScrollActive: boolean = false;
    private animationFrameId: number | null = null;

    // Property for special formatting cases
    private _treatAsNumeric: boolean = false;

    /**
     * The handler manager that manages different interaction modes
     */
    private handlerManager: HandlerManager;

    /**
     * The keyboard manager for handling keyboard events
     */
    private keyboardManager: KeyboardManager;

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

        this.handlerManager = new HandlerManager(this);
        this.keyboardManager = new KeyboardManager(this);

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
        // Mouse events - now delegated to handler manager
        this.canvas.addEventListener("pointerdown", (event: PointerEvent) =>
            this.handlerManager.handlePointerDown(event)
        );
        this.canvas.addEventListener("pointermove", (event: PointerEvent) =>
            this.handlerManager.handlePointerMove(event)
        );
        this.canvas.addEventListener("pointerup", (event: PointerEvent) =>
            this.handlerManager.handlePointerUp(event)
        );
        this.canvas.addEventListener(
            "dblclick",
            this.handleDoubleClick.bind(this)
        );
        this.canvas.addEventListener("wheel", this.handleWheel.bind(this));
        this.canvas.addEventListener("keydown", (event: KeyboardEvent) => {
            const selection = this.grid.getSelection();
            this.keyboardManager.handleKeyboardEvent(event, selection);
        });

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

    // IHandlerContext implementation methods
    public updateSelectionStats(): void {
        const statsElement = document.getElementById("selectionStats");
        if (!statsElement) return;

        // Update formatting buttons state, including text alignment
        this.updateAlignmentButtons();

        const selection = this.grid.getSelection();
        if (!selection.isActive) {
            statsElement.textContent = "";
            return;
        }

        // Calculate the number of cells without actually retrieving all cell objects
        const minRow = Math.min(selection.startRow, selection.endRow);
        const maxRow = Math.max(selection.startRow, selection.endRow);
        const minCol = Math.min(selection.startCol, selection.endCol);
        const maxCol = Math.max(selection.startCol, selection.endCol);

        const numRows = maxRow - minRow + 1;
        const numCols = maxCol - minCol + 1;
        const cellCount = numRows * numCols;

        if (cellCount === 0) {
            statsElement.textContent = "";
            return;
        }

        // For very large selections, only show the count immediately and defer the calculation
        if (cellCount > 10000) {
            // Show cell count immediately
            statsElement.innerHTML = `<div class="stat-item" id="selected">Selected: <span class="stat-value">${cellCount} cells</span></div><div class="stat-item">Calculating stats...</div>`;

            // Get the cells
            const selectedCells = this.grid.getCellsInSelection();

            // Calculate stats asynchronously to prevent UI blocking
            setTimeout(() => {
                const stats = MathUtils.calculateStatsSmart(selectedCells);
                this.updateStatsDisplay(statsElement, stats, cellCount);
            }, 0);

            return;
        }

        // For smaller selections, calculate full statistics synchronously
        const selectedCells = this.grid.getCellsInSelection();
        const stats = MathUtils.calculateStatsSmart(selectedCells);

        // Use the helper method to update the stats display
        this.updateStatsDisplay(statsElement, stats, cellCount);
    }

    /**
     * Highlights the row and column headers for a given cell
     * @param row - The row index
     * @param col - The column index
     */
    public highlightHeadersForCell(row: number, col: number): void {
        // Get the row and column objects
        const rowObj = this.grid.getRow(row);
        const colObj = this.grid.getColumn(col);

        // Highlight the row header without selecting the entire row
        // Use false for direct parameter to indicate indirect selection via cell selection
        if (rowObj) {
            rowObj.select(false);
        }

        // Highlight the column header without selecting the entire column
        // Use false for direct parameter to indicate indirect selection via cell selection
        if (colObj) {
            colObj.select(false);
        }
    }

    /**
     * Highlights the headers for the current selection
     * This method highlights the row and column headers for the currently selected cells
     * Optimized for performance with large selections
     */
    public highlightHeadersForSelection(): void {
        const selection = this.grid.getSelection();
        if (!selection.isActive) return;

        const startRow = selection.startRow;
        const endRow = selection.endRow;
        const startCol = selection.startCol;
        const endCol = selection.endCol;

        const minRow = Math.min(startRow, endRow);
        const maxRow = Math.max(startRow, endRow);
        const minCol = Math.min(startCol, endCol);
        const maxCol = Math.max(startCol, endCol);

        // Track which rows/columns were already selected to avoid duplicate work
        const selectedRows = new Set<number>();
        const selectedCols = new Set<number>();

        // For row headers
        for (let row = minRow; row <= maxRow; row++) {
            if (!selectedRows.has(row)) {
                const rowObj = this.grid.getRow(row);
                if (rowObj) {
                    // Use false for direct parameter to indicate indirect selection via cell selection
                    rowObj.select(false);
                    selectedRows.add(row);
                }
            }
        }

        // For column headers
        for (let col = minCol; col <= maxCol; col++) {
            if (!selectedCols.has(col)) {
                const colObj = this.grid.getColumn(col);
                if (colObj) {
                    // Use false for direct parameter to indicate indirect selection via cell selection
                    colObj.select(false);
                    selectedCols.add(col);
                }
            }
        }
    }

    /**
     * Ensures the cell at the specified row and column is visible
     * @param row - The row index of the cell
     * @param col - The column index of the cell
     * This method scrolls the grid to ensure the specified cell is visible
     */
    public ensureCellVisible(row: number, col: number): void {
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
     * Gets the rectangle for a cell at the specified row and column
     * @param row - The row index of the cell
     * @param col - The column index of the cell
     * @returns The rectangle for the cell, or null if invalid indices
     */
    public getCellRect(
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
     * Starts editing a cell at the specified row and column
     * @param row - The row index of the cell
     * @param col - The column index of the cell
     * @param x - The x-coordinate for positioning the editor
     * @param y - The y-coordinate for positioning the editor
     * @param isTypingEvent - Whether this edit was triggered by typing
     * @param firstChar - The first character typed if this was triggered by typing
     * @returns void
     */
    public startCellEdit(
        row: number,
        col: number,
        x: number,
        y: number,
        isTypingEvent: boolean = false,
        firstChar: string = ""
    ): void {
        this.finishCellEdit(); // Finish any existing edit

        const cell = this.grid.getCell(row, col);
        const cellRect = this.getCellRect(row, col);

        if (!cellRect) return;

        this.editingCell = { row, col };

        if (this.cellEditor) {
            // Position and size the editor
            const borderOffset = 2;
            const canvasRect = this.canvas.getBoundingClientRect();
            const zoomFactor = this.renderer.getZoom();

            // Adjust positioning to account for selection border
            this.cellEditor.style.left =
                canvasRect.left + cellRect.x + borderOffset + "px";
            this.cellEditor.style.top =
                canvasRect.top + cellRect.y + borderOffset + "px";
            this.cellEditor.style.width =
                cellRect.width - borderOffset * 2 + "px";
            this.cellEditor.style.height =
                cellRect.height - borderOffset * 2 + "px";
            this.cellEditor.style.display = "block";
            this.cellEditor.style.fontSize =
                this.BASE_EDITOR_FONT_SIZE * zoomFactor + "px";

            this.cellEditor.style.border = "none";
            this.cellEditor.style.zIndex = "10";

            // Set the initial value based on whether this is a typing event
            if (isTypingEvent) {
                // For typing events, set the value to the first character typed
                this.cellEditor.value = firstChar;
            } else {
                // Otherwise, use edit value to show formula if present
                this.cellEditor.value = cell.getEditValue();
            }

            // Focus and go to the end of the input
            this.cellEditor.focus();
            const valueLength = this.cellEditor.value.length;
            this.cellEditor.setSelectionRange(valueLength, valueLength);

            // On mobile, try to open the keyboard by simulating a click
            if (this.isMobileDevice()) {
                setTimeout(() => {
                    this.cellEditor?.click();
                }, 100);
            }
        }
    }
    /**
     * Creates the cell editor input element
     */
    public finishCellEdit(): void {
        if (!this.editingCell || !this.cellEditor) return;

        const newValue = this.cellEditor.value;
        const oldValue = this.grid.getCellValue(
            this.editingCell.row,
            this.editingCell.col
        );
        if (newValue !== String(oldValue)) {
            let finalValue: any = newValue;
            let formula: string | undefined = undefined;
            // Check if it's a formula
            if (newValue.startsWith("=")) {
                const calculatedResult = this.handleCalculation(newValue);
                if (calculatedResult !== null) {
                    formula = newValue;
                    finalValue = calculatedResult; // Store the calculated number directly
                } else {
                    // If formula parsing failed, just store as string
                    finalValue = newValue;
                }
            } else {
                // Try to parse numeric values, but only if the entire value is a number
                const cleanValue = newValue.replace(/,/g, ""); // Remove commas

                // First, check if it's a currency value ($123, €50, etc.) or percentage (50%)
                const currencyMatch = cleanValue.match(/^[$€£¥](\d+\.?\d*)$/);
                const percentMatch = cleanValue.match(/^(\d+\.?\d*)%$/);

                if (currencyMatch) {
                    // Extract the numeric part from currency
                    const numericPart = currencyMatch[1];
                    const parsedNum = parseFloat(numericPart);
                    if (!isNaN(parsedNum) && isFinite(parsedNum)) {
                        // Store the original string with the currency symbol
                        finalValue = newValue;

                        // We're still treating it as numeric for alignment purposes
                        console.log(
                            `Keeping currency format: ${newValue} (right aligned)`
                        );

                        // Set flag to treat as numeric for alignment
                        this._treatAsNumeric = true;
                    } else {
                        finalValue = newValue;
                    }
                } else if (percentMatch) {
                    // Extract the numeric part from percentage but keep the percentage symbol
                    const numericPart = percentMatch[1];
                    const parsedNum = parseFloat(numericPart); // Store as a regular number, not divided by 100

                    if (!isNaN(parsedNum) && isFinite(parsedNum)) {
                        // Store the original string with the percentage symbol
                        finalValue = newValue;

                        // We're still treating it as numeric for alignment purposes
                        console.log(
                            `Keeping percentage format: ${newValue} (right aligned)`
                        );

                        // Override the isNumeric determination later
                        // We'll set a flag here and use it later
                        this._treatAsNumeric = true;
                    } else {
                        finalValue = newValue;
                    }
                }
                // Use a strict regex to ensure the ENTIRE value is a valid number
                // This will prevent "123abc" from being treated as 123
                else if (/^-?\d*\.?\d+$/.test(cleanValue)) {
                    const parsedNum = parseFloat(cleanValue);

                    // Double-check it's a valid number
                    if (!isNaN(parsedNum) && isFinite(parsedNum)) {
                        finalValue = parsedNum; // Store as number
                        console.log(
                            `Parsed number: ${newValue} -> ${parsedNum}`
                        );
                    } else {
                        finalValue = newValue; // Keep as string
                    }
                }
                // Check explicitly for mixed content (numbers + text)
                else if (/\d/.test(newValue) && /[^\d,.\s]/.test(newValue)) {
                    // Contains both digits and non-numeric characters
                    console.log(
                        `Mixed content detected: ${newValue} (keeping as string)`
                    );
                    finalValue = newValue;
                } else {
                    // Any other value, keep as string
                    finalValue = newValue;
                    console.log(
                        `Non-numeric value: ${newValue} (keeping as string)`
                    );
                }
            }

            // Reset the flag at the beginning of each edit
            const hadSpecialFlag = this._treatAsNumeric;

            // Determine if the value is numeric for styling
            // Use the _treatAsNumeric flag for special cases like percentages
            const isNumeric =
                typeof finalValue === "number" || this._treatAsNumeric;

            // Reset the flag after use
            this._treatAsNumeric = false;

            // Create style object for alignment based on value type
            const style: ICellStyle = {
                textAlign: isNumeric ? "right" : "left",
            };

            // Log for debugging
            if (hadSpecialFlag) {
                console.log(
                    `Using special numeric treatment for: ${finalValue}`
                );
            }

            // Enhanced debug logging for cell text alignment
            console.log(
                `Cell value: ${finalValue}, Type: ${typeof finalValue}, isNumeric: ${isNumeric}, textAlign: ${
                    style.textAlign
                }`
            );

            // Create and execute the command with appropriate style
            const command = new EditCellCommand(
                this.grid,
                this.editingCell.row,
                this.editingCell.col,
                finalValue,
                style, // Apply numeric right alignment or text left alignment
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

        // Clear any origin cell highlighting when finishing edit
        this.clearOriginCell();
    }
    /**
     * Parses a value from the cell editor input
     * @param value - The input value
     * @returns The parsed value
     */
    private handleDoubleClick(event: MouseEvent): void {
        const cellPos = this.renderer.getCellAtPosition(
            event.offsetX,
            event.offsetY
        );
        if (cellPos) {
            // Check if the cell contains a formula
            this.renderer.clearCopiedSelection();
            this.renderer.render();

            const cell = this.grid.getCell(cellPos.row, cellPos.col);
            if (cell.formula && cell.formula.startsWith("=")) {
                // Show the range selection for the formula first, including the origin cell
                this.showFormulaRangeSelection(cell.formula, {
                    row: cellPos.row,
                    col: cellPos.col,
                });
            }

            this.startCellEdit(
                cellPos.row,
                cellPos.col,
                event.offsetX,
                event.offsetY,
                false // Not a typing event
            );

            // Force focus on mobile with a small delay to ensure the keyboard appears
            if (this.isMobileDevice()) {
                console.log(
                    "Mobile device: Focusing cell editor after double-tap"
                );
                setTimeout(() => {
                    if (this.cellEditor) {
                        this.cellEditor.focus();
                    }
                }, 50);
            }
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
            // Use requestAnimationFrame to ensure the editor position update happens after render
            requestAnimationFrame(() => {
                this.updateCellEditorPosition();
            });
        }
    }

    /**
     * Handles the selection after a key down event
     * @param selection - The current selection
     * @param newRow - The new row index
     * @param newCol - The new column index
     * @description Clears all selections, highlights the headers for the new cell,
     * ensures the selected cell is visible in the viewport, and updates the selection stats.
     * */
    public handleSelectionAfterKeyDown(
        selection: Selection,
        newRow: number,
        newCol: number
    ): void {
        this.grid.clearAllSelections();
        this.renderer.clearFormulaRangeSelection(); // Return to normal green selection
        selection.start(newRow, newCol);
        this.highlightHeadersForCell(newRow, newCol);
        // Ensure the selected cell is visible in the viewport
        this.ensureCellVisible(newRow, newCol);
        this.renderer.render();
        this.updateSelectionStats();
    }

    /**
     * Handles the touch start event
     * @param event - The touch event
     * Check if the current device is a mobile/touch device
     * @returns True if the device is a mobile/touch device, false otherwise
     */
    private isMobileDevice(): boolean {
        return (
            typeof window !== "undefined" &&
            ("ontouchstart" in window || navigator.maxTouchPoints > 0)
        );
    }

    /**
     * Handles the touch start event
     * @param event - The touch event
     * @description Initializes touch scrolling and simulates a pointer event for selection.
     */
    private handleTouchStart(event: TouchEvent): void {
        event.preventDefault();

        if (event.touches.length === 1) {
            const touch = event.touches[0];
            const rect = this.canvas.getBoundingClientRect();

            const offsetX = touch.clientX - rect.left;
            const offsetY = touch.clientY - rect.top;

            // Stop any ongoing inertial scrolling when a new touch starts
            if (this.inertialScrollActive) {
                this.inertialScrollActive = false;
                if (this.animationFrameId !== null) {
                    cancelAnimationFrame(this.animationFrameId);
                    this.animationFrameId = null;
                }
            }

            // Initialize touch scrolling coordinates for mobile
            this.touchScrollLastX = touch.clientX;
            this.touchScrollLastY = touch.clientY;
            this.isTouchScrolling = false;
            this.scrollVelocityX = 0;
            this.scrollVelocityY = 0;
            this.lastTouchMoveTime = Date.now();

            // Create a simulated pointer event
            const mouseEvent = {
                offsetX,
                offsetY,
                preventDefault: () => {},
                stopPropagation: () => {},
                button: 0,
            } as unknown as PointerEvent;

            // On mobile, we only want to select the cell on single tap, not start editing
            if (this.isMobileDevice()) {
                // Call handlePointerDown directly to select the cell but NOT start editing
                this.handlerManager.handlePointerDown(mouseEvent);
                console.log(
                    "Mobile device: Single tap detected - cell selected but not editing"
                );
            } else {
                // Non-mobile behavior (desktop): proceed as before
                this.handlerManager.handlePointerDown(mouseEvent);
            }

            this.lastTouchPosition = { x: offsetX, y: offsetY };
            this.lastTouchTime = Date.now();
        }
    }

    /**
     * Handles the touch move event
     * @param event - The touch event
     */
    private handleTouchMove(event: TouchEvent): void {
        event.preventDefault();

        if (event.touches.length === 1) {
            const touch = event.touches[0];
            const rect = this.canvas.getBoundingClientRect();

            const offsetX = touch.clientX - rect.left;
            const offsetY = touch.clientY - rect.top;

            if (this.isMobileDevice()) {
                // Calculate the time since last move for velocity calculation
                const now = Date.now();
                const timeDelta = now - this.lastTouchMoveTime;

                // Calculate the delta from the last touch position
                const deltaX = this.touchScrollLastX - touch.clientX;
                const deltaY = this.touchScrollLastY - touch.clientY;

                // Detect if we're scrolling (moved more than 3 pixels in any direction)
                if (
                    !this.isTouchScrolling &&
                    (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)
                ) {
                    this.isTouchScrolling = true;
                    console.log("Mobile: Starting smooth scroll operation");
                }

                // If we've determined this is a scroll action, perform scrolling
                if (this.isTouchScrolling) {
                    // Update scroll velocity for smooth inertial scrolling later
                    // Only update if time delta is reasonable to avoid spikes
                    if (timeDelta > 0 && timeDelta < 100) {
                        this.scrollVelocityX = deltaX * (16 / timeDelta); // Normalize to ~60fps
                        this.scrollVelocityY = deltaY * (16 / timeDelta);

                        // Limit maximum velocity to avoid extreme scrolling
                        const maxVelocity = 30;
                        this.scrollVelocityX = Math.max(
                            Math.min(this.scrollVelocityX, maxVelocity),
                            -maxVelocity
                        );
                        this.scrollVelocityY = Math.max(
                            Math.min(this.scrollVelocityY, maxVelocity),
                            -maxVelocity
                        );
                    }

                    // Apply the scroll
                    const scrollPos = this.renderer.getScrollPosition();
                    const newScrollX = Math.max(0, scrollPos.x + deltaX);
                    const newScrollY = Math.max(0, scrollPos.y + deltaY);

                    this.renderer.setScroll(newScrollX, newScrollY);
                    this.renderer.render();

                    // If we have a scrollbar manager, keep it synchronized
                    if (this.scrollbarManager) {
                        this.scrollbarManager.scrollBy(deltaX, deltaY);
                    }

                    // If we're scrolling, we should update cell editor position if active
                    if (this.editingCell) {
                        requestAnimationFrame(() => {
                            this.updateCellEditorPosition();
                        });
                    }
                }

                // Always update last touch position and time for next move event
                this.touchScrollLastX = touch.clientX;
                this.touchScrollLastY = touch.clientY;
                this.lastTouchMoveTime = now;

                // If we're scrolling, skip mouse move handling
                if (this.isTouchScrolling) {
                    return;
                }
            }

            // For non-scroll actions or desktop, handle as mouse move
            const pointerEvent = {
                offsetX,
                offsetY,
                preventDefault: () => {},
                stopPropagation: () => {},
            } as unknown as PointerEvent;

            this.handlerManager.handlePointerMove(pointerEvent);
        }
    }

    /**
     * Handles the touch end event
     * @param event - The touch event
     */
    private handleTouchEnd(event: TouchEvent): void {
        const pointerEvent = {
            preventDefault: () => {},
            stopPropagation: () => {},
        } as unknown as PointerEvent;

        this.handlerManager.handlePointerUp(pointerEvent);

        // Handle touch end for mobile devices
        if (this.isMobileDevice()) {
            // If we were scrolling, start inertial scrolling for smooth experience
            if (this.isTouchScrolling) {
                console.log(
                    "Mobile: Starting inertial scroll with velocity:",
                    this.scrollVelocityX.toFixed(2),
                    this.scrollVelocityY.toFixed(2)
                );

                // Only start inertial scrolling if we have significant velocity
                if (
                    Math.abs(this.scrollVelocityX) > 0.5 ||
                    Math.abs(this.scrollVelocityY) > 0.5
                ) {
                    this.inertialScrollActive = true;
                    // Start the inertial scrolling animation
                    this.animationFrameId = requestAnimationFrame(() =>
                        this.performInertialScroll()
                    );
                }

                // Reset for next interaction and prevent double-tap after scrolling
                this.isTouchScrolling = false;
                this.lastTouchPosition = null;
                this.lastTouchTime = 0;
                return;
            }

            // Always reset the scrolling flag when touch ends
            this.isTouchScrolling = false;
        }

        // Check for double-tap - only on mobile devices should this start editing
        if (
            this.lastTouchPosition &&
            this.lastTouchTime &&
            this.isMobileDevice()
        ) {
            const now = Date.now();
            const timeDiff = now - this.lastTouchTime;

            // Use a more generous time window for double-tap detection on mobile (500ms)
            if (timeDiff < 500) {
                const touch = event.changedTouches[0];
                const rect = this.canvas.getBoundingClientRect();

                const offsetX = touch.clientX - rect.left;
                const offsetY = touch.clientY - rect.top;

                console.log(
                    "Double-tap detected on mobile, starting cell edit"
                );

                const dblClickEvent = {
                    offsetX,
                    offsetY,
                    preventDefault: () => {},
                    stopPropagation: () => {},
                } as unknown as MouseEvent;

                // Force cell editing to start on double-tap (only on mobile)
                this.handleDoubleClick(dblClickEvent);
            }

            this.lastTouchPosition = null;
            this.lastTouchTime = 0;
        }
    }

    /**
     * Shows the context menu at the specified position
     * @param x - The x-coordinate of the context menu
     * @param y - The y-coordinate of the context menu
     * @param row - The row index for the context menu
     * @param col - The column index for the context menu
     */
    private showContextMenu(
        x: number,
        y: number,
        row: number,
        col: number
    ): void {
        this.contextMenuPosition = { row, col };

        this.contextMenu!.innerHTML = "";

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

        this.contextMenu!.style.left = `${x}px`;
        this.contextMenu!.style.top = `${y}px`;
        this.contextMenu!.style.display = "block";
    }

    /**
     * Hides the context menu
     * @description Sets the context menu display to none and clears the position
     */
    private hideContextMenu(): void {
        if (this.contextMenu) {
            this.contextMenu.style.display = "none";
            this.contextMenuPosition = null;
        }
    }

    /**
     * Inserts a new row above the specified position
     * @param position - The position where the row should be inserted
     * @description Inserts a new row above the specified position, updates the grid,
     */
    public insertRowAbove(position: number): void {
        const command = new InsertRowCommand(this.grid, position);
        this.commandManager.executeCommand(command);
        this.renderer.recalculatePositions();
        this.renderer.refreshScrollbars();
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
     * Inserts a new row below the specified position
     * @param position - The position where the row should be inserted
     * @description Inserts a new row below the specified position, updates the grid,
     */
    public insertRowBelow(position: number): void {
        const command = new InsertRowCommand(this.grid, position + 1);
        this.commandManager.executeCommand(command);
        this.renderer.recalculatePositions();
        this.renderer.refreshScrollbars();
        this.grid.clearAllSelections();
        this.grid
            .getSelection()
            .start(position + 1, this.grid.getSelection().startCol);
        this.highlightHeadersForCell(
            position + 1,
            this.grid.getSelection().startCol
        );
        this.renderer.render();
    }

    /**
     * Inserts a new column to the left of the specified position
     * @param position - The position where the column should be inserted
     * @description Inserts a new column to the left of the specified position, updates the grid,
     */
    public insertColumnLeft(position: number): void {
        const command = new InsertColumnCommand(this.grid, position);
        this.commandManager.executeCommand(command);
        this.renderer.recalculatePositions();
        this.renderer.refreshScrollbars();
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
     * Inserts a new column to the right of the specified position
     * @param position - The position where the column should be inserted
     * @description Inserts a new column to the right of the specified position, updates the grid,
     */
    public insertColumnRight(position: number): void {
        const command = new InsertColumnCommand(this.grid, position + 1);
        this.commandManager.executeCommand(command);
        this.renderer.recalculatePositions();
        this.renderer.refreshScrollbars();
        this.grid.clearAllSelections();
        this.grid
            .getSelection()
            .start(this.grid.getSelection().startRow, position + 1);
        this.highlightHeadersForCell(
            this.grid.getSelection().startRow,
            position + 1
        );
        this.renderer.render();
    }

    /**
     * Removes a row at the specified position
     * @param position - The position of the row to be removed
     * @description Removes a row at the specified position, updates the grid,
     */
    public removeRow(position: number): void {
        const command = new RemoveRowCommand(this.grid, position);
        this.commandManager.executeCommand(command);
        this.renderer.recalculatePositions();
        this.renderer.refreshScrollbars();
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
     * Removes a column at the specified position
     * @param position - The position of the column to be removed
     * @description Removes a column at the specified position, updates the grid,
     */
    public removeColumn(position: number): void {
        const command = new RemoveColumnCommand(this.grid, position);
        this.commandManager.executeCommand(command);
        this.renderer.recalculatePositions();
        this.renderer.refreshScrollbars();
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
     * Creates the cell editor element
     */
    private createCellEditor(): void {
        this.cellEditor = document.createElement("input");
        this.cellEditor.type = "text";
        this.cellEditor.style.position = "absolute";
        this.cellEditor.style.display = "none";
        this.cellEditor.style.padding = "2px";
        this.cellEditor.style.fontFamily = "Calibri";
        this.cellEditor.style.outline = "none";
        this.cellEditor.style.boxSizing = "border-box";
        this.cellEditor.style.margin = "0";
        this.cellEditor.style.border = "none";
        this.cellEditor.style.zIndex = "10";

        this.cellEditor.addEventListener(
            "blur",
            this.finishCellEdit.bind(this)
        );
        this.cellEditor.addEventListener(
            "keydown",
            this.handleEditorKeyDown.bind(this)
        );
        this.cellEditor.addEventListener("touchend", (e) =>
            e.stopPropagation()
        );

        document.body.appendChild(this.cellEditor);
    }

    /**
     * Parses a value from the cell editor input
     * @param value - The input value
     * @returns The parsed value
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
     * Handles the window resize event
     */
    private handleResize(): void {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        this.resizeTimeout = setTimeout(() => {
            this.renderer.handleWindowResize();
        }, 100);
    }

    /**
     * Handles the scroll event
     */
    public handleScroll(): void {
        if (this.editingCell) {
            // Ensure this runs after the renderer has updated
            requestAnimationFrame(() => {
                this.updateCellEditorPosition();
            });
        }
    }

    /**
     * Updates the position of the cell editor element
     */
    private updateCellEditorPosition(): void {
        if (!this.editingCell || !this.cellEditor) return;

        const cellRect = this.getCellRect(
            this.editingCell.row,
            this.editingCell.col
        );

        if (cellRect) {
            const canvasRect = this.canvas.getBoundingClientRect();
            const zoomFactor = this.renderer.getZoom();
            const borderOffset = 2;

            const left = Math.round(
                canvasRect.left + cellRect.x + borderOffset
            );
            const top = Math.round(canvasRect.top + cellRect.y + borderOffset);
            const width = Math.round(cellRect.width - borderOffset * 2);
            const height = Math.round(cellRect.height - borderOffset * 2);

            const rowHeaderWidth = this.grid.getDimensions().headerWidth;
            const columnHeaderHeight = this.grid.getDimensions().headerHeight;

            const visibleLeft = canvasRect.left + rowHeaderWidth + 70;
            const visibleTop = canvasRect.top + columnHeaderHeight + 70;
            const visibleRight = canvasRect.right;
            const visibleBottom = canvasRect.bottom;

            const isVisible =
                left + width > visibleLeft &&
                left < visibleRight &&
                top + height > visibleTop &&
                top < visibleBottom;

            this.cellEditor.style.display = "block";
            this.cellEditor.style.width = width + "px";
            this.cellEditor.style.height = height + "px";
            this.cellEditor.style.fontSize =
                this.BASE_EDITOR_FONT_SIZE * zoomFactor + "px";

            if (isVisible) {
                this.cellEditor.style.left = left + "px";
                this.cellEditor.style.top = top + "px";
            } else {
                this.cellEditor.style.left = "-9999px";
                this.cellEditor.style.top = "-9999px";
            }
        }
    }

    /**
     * Updates the resize handles on zoom
     */
    public updateResizeHandlesOnZoom(): void {
        this.handlerManager.resetToDefault();
        this.renderer.render();
    }

    /**
     * Toggles the specified style for the selected cells
     * @param style - The style to be toggled
     */
    public toggleStyle(
        style:
            | "bold"
            | "italic"
            | "underline"
            | "strikethrough"
            | "alignLeft"
            | "alignCenter"
            | "alignRight"
    ): void {
        const selection = this.grid.getSelection();
        if (!selection.isActive) return;

        const positions = selection.getRange();
        const compositeCommand = new CompositeCommand();

        positions.forEach((pos) => {
            const cell = this.grid.getCell(pos.row, pos.col);
            const currentStyle = cell.getStyle();

            // Handle text alignment separately
            let textAlign = currentStyle.textAlign || "left";
            if (style === "alignLeft") {
                textAlign = "left";
            } else if (style === "alignCenter") {
                textAlign = "center";
            } else if (style === "alignRight") {
                textAlign = "right";
            }

            const newStyle = {
                ...currentStyle,
                textAlign: textAlign,
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
            // updateSelectionStats will also update alignment button states
            this.updateSelectionStats();
        }
    }

    /**
     * Updates the text alignment button states based on the selected cell's alignment
     * Should be called when selection changes
     */
    public updateAlignmentButtons(): void {
        const alignLeftBtn = document.getElementById("alignLeft");
        const alignCenterBtn = document.getElementById("alignCenter");
        const alignRightBtn = document.getElementById("alignRight");

        // Reset all buttons first
        alignLeftBtn?.classList.remove("active");
        alignCenterBtn?.classList.remove("active");
        alignRightBtn?.classList.remove("active");

        // If no valid selection, exit early
        const selection = this.grid.getSelection();
        if (!selection.isActive) return;

        // Get the reference cell (first cell in selection)
        const cell = this.grid.getCell(selection.startRow, selection.startCol);
        if (!cell) return;

        // Activate the corresponding button based on cell's text alignment
        const textAlign = cell.style.textAlign || "left"; // Default to left if not set

        switch (textAlign) {
            case "left":
                alignLeftBtn?.classList.add("active");
                break;
            case "center":
                alignCenterBtn?.classList.add("active");
                break;
            case "right":
                alignRightBtn?.classList.add("active");
                break;
        }
    }

    /**
     * Handles formula calculations based on the input value
     * @param value - The input value
     */
    public handleCalculation(value: string): number | null {
        if (!value.startsWith("=")) {
            return null;
        }

        const formulaMatch = value.match(/^=(\w+)\(([A-Z]+\d+:[A-Z]+\d+)\)$/);
        if (!formulaMatch) return null;

        const functionName = formulaMatch[1].toUpperCase();
        const range = formulaMatch[2];

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
        }

        this.grid.getSelection().start(startRowIndex, startColIndex);
        this.grid.getSelection().extend(endRowIndex, endColIndex);
        this.renderer.setFormulaRangeSelection(true); // Use blue for formula calculation
        this.updateSelectionStats();
        this.highlightHeadersForSelection();
        this.renderer.render();

        return result;
    }

    /**
     * @param value - The input value to parse
     * @description Parses the input value to determine its type (number, boolean, or string)
     * @returns The parsed value
     */
    // private parseValue(value: string): any {
    //     if (value === "") return "";

    //     const num = parseFloat(value);
    //     if (!isNaN(num) && isFinite(num)) {
    //         return num;
    //     }
    //     if (value.toLowerCase() === "true") return true;
    //     if (value.toLowerCase() === "false") return false;

    //     return value;
    // }

    /**
     * Deletes the selected cells
     * @description Deletes the content of the selected cells, leaving the cells empty
     */
    public deleteSelectedCells(): void {
        const selection = this.grid.getSelection();
        if (!selection.isActive) return;

        const positions = selection.getRange();
        const compositeCommand = new CompositeCommand();

        positions.forEach((pos) => {
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
     * Calculates the sum of numeric values in the specified cells
     * @param cells - The array of cell objects
     * @returns The sum of numeric values
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
     * Calculates the average of numeric values in the specified cells
     * @param cells - The array of cell objects
     * @returns The average of numeric values
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
     * Calculates the minimum value in the specified cells
     * @param cells - The array of cell objects
     * @returns The minimum numeric value
     */
    private calculateMin(cells: any[]): number {
        const numericValues = cells
            .map((cell) => cell.getNumericValue())
            .filter((value) => value !== null);

        if (numericValues.length === 0) return 0;
        return Math.min(...numericValues);
    }

    /**
     * Calculates the maximum value in the specified cells
     * @param cells - The array of cell objects
     * @returns The maximum numeric value
     */
    private calculateMax(cells: any[]): number {
        const numericValues = cells
            .map((cell) => cell.getNumericValue())
            .filter((value) => value !== null);

        if (numericValues.length === 0) return 0;
        return Math.max(...numericValues);
    }

    /**
     * Calculates the count of numeric values in the specified cells
     * @param cells - The array of cell objects
     * @returns The count of numeric values
     */
    private calculateCount(cells: any[]): number {
        return cells
            .map((cell) => cell.getNumericValue())
            .filter((value) => value !== null).length;
    }

    /**
     * Finds the next data edge in the specified direction (Excel-like Ctrl+Arrow behavior)
     * @param row - Current row
     * @param col - Current column
     * @param direction - Direction to search
     * @returns The target row or column index
     */
    public findNextDataEdge(
        row: number,
        col: number,
        direction: "up" | "down" | "left" | "right"
    ): number {
        const maxRows = this.grid.getMaxRows();
        const maxCols = this.grid.getMaxCols();

        switch (direction) {
            case "right":
                // If current cell is empty, find first non-empty cell
                if (this.isCellEmpty(row, col)) {
                    for (let c = col + 1; c < maxCols; c++) {
                        if (!this.isCellEmpty(row, c)) {
                            return c;
                        }
                    }
                    return maxCols - 1; // Go to last column if no data found
                } else {
                    // If current cell has data, find the end of this data region
                    let c = col;
                    while (c + 1 < maxCols && !this.isCellEmpty(row, c + 1)) {
                        c++;
                    }
                    // If we're at the end of data, look for next data region
                    if (c < maxCols - 1) {
                        for (let nextC = c + 1; nextC < maxCols; nextC++) {
                            if (!this.isCellEmpty(row, nextC)) {
                                return nextC;
                            }
                        }
                    }
                    return c;
                }

            case "left":
                // If current cell is empty, find first non-empty cell to the left
                if (this.isCellEmpty(row, col)) {
                    for (let c = col - 1; c >= 0; c--) {
                        if (!this.isCellEmpty(row, c)) {
                            return c;
                        }
                    }
                    return 0; // Go to first column if no data found
                } else {
                    // If current cell has data, find the start of this data region
                    let c = col;
                    while (c - 1 >= 0 && !this.isCellEmpty(row, c - 1)) {
                        c--;
                    }
                    // If we're at the start of data, look for previous data region
                    if (c > 0) {
                        for (let prevC = c - 1; prevC >= 0; prevC--) {
                            if (!this.isCellEmpty(row, prevC)) {
                                return prevC;
                            }
                        }
                    }
                    return c;
                }

            case "down":
                // If current cell is empty, find first non-empty cell below
                if (this.isCellEmpty(row, col)) {
                    for (let r = row + 1; r < maxRows; r++) {
                        if (!this.isCellEmpty(r, col)) {
                            return r;
                        }
                    }
                    return maxRows - 1; // Go to last row if no data found
                } else {
                    // If current cell has data, find the end of this data region
                    let r = row;
                    while (r + 1 < maxRows && !this.isCellEmpty(r + 1, col)) {
                        r++;
                    }
                    // If we're at the end of data, look for next data region
                    if (r < maxRows - 1) {
                        for (let nextR = r + 1; nextR < maxRows; nextR++) {
                            if (!this.isCellEmpty(nextR, col)) {
                                return nextR;
                            }
                        }
                    }
                    return r;
                }

            case "up":
                // If current cell is empty, find first non-empty cell above
                if (this.isCellEmpty(row, col)) {
                    for (let r = row - 1; r >= 0; r--) {
                        if (!this.isCellEmpty(r, col)) {
                            return r;
                        }
                    }
                    return 0; // Go to first row if no data found
                } else {
                    // If current cell has data, find the start of this data region
                    let r = row;
                    while (r - 1 >= 0 && !this.isCellEmpty(r - 1, col)) {
                        r--;
                    }
                    // If we're at the start of data, look for previous data region
                    if (r > 0) {
                        for (let prevR = r - 1; prevR >= 0; prevR--) {
                            if (!this.isCellEmpty(prevR, col)) {
                                return prevR;
                            }
                        }
                    }
                    return r;
                }

            default:
                return direction === "up" || direction === "down" ? row : col;
        }
    }

    /**
     * Checks if a cell is empty (Excel considers empty string, null, undefined as empty)
     * @param row - Row index
     * @param col - Column index
     * @returns True if cell is empty
     */
    private isCellEmpty(row: number, col: number): boolean {
        const cell = this.grid.getCell(row, col);
        const value = cell.getDisplayValue();
        return value === "" || value === null || value === undefined;
    }

    /**
     * Finds the last used column in a row (for Ctrl+End behavior)
     * @param row - Row to search
     * @returns Last column with data, or 0 if no data
     */
    public findLastUsedColumn(row: number): number {
        const maxCols = this.grid.getMaxCols();
        for (let col = maxCols - 1; col >= 0; col--) {
            if (!this.isCellEmpty(row, col)) {
                return col;
            }
        }
        return 0;
    }

    /**
     * Shows the range selection for a given formula without calculating the result
     * @param formula - The formula string (e.g., "=SUM(A1:B5)")
     * @param originCell - The cell containing the formula (optional)
     * @returns True if range was successfully selected, false otherwise
     */
    public showFormulaRangeSelection(
        formula: string,
        originCell?: { row: number; col: number }
    ): boolean {
        if (!formula.startsWith("=")) {
            return false;
        }

        const formulaMatch = formula.match(/^=(\w+)\(([A-Z]+\d+:[A-Z]+\d+)\)$/);
        if (!formulaMatch) return false;

        const range = formulaMatch[2];
        const rangeMatch = range.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
        if (!rangeMatch) return false;

        const startRow = rangeMatch[2];
        const startCol = rangeMatch[1];
        const endRow = rangeMatch[4];
        const endCol = rangeMatch[3];

        const startRowIndex = parseInt(startRow) - 1;
        const startColIndex = startCol.charCodeAt(0) - 65;
        const endRowIndex = parseInt(endRow) - 1;
        const endColIndex = endCol.charCodeAt(0) - 65; // Clear current selections and set new range selection
        this.grid.clearAllSelections();
        this.grid.getSelection().start(startRowIndex, startColIndex);
        this.grid.getSelection().extend(endRowIndex, endColIndex);

        // Set this as a formula range selection to use blue color
        this.renderer.setFormulaRangeSelection(true);

        // If origin cell is provided and it's not within the range, select it as well
        if (originCell) {
            const selection = this.grid.getSelection();
            const minRow = Math.min(selection.startRow, selection.endRow);
            const maxRow = Math.max(selection.startRow, selection.endRow);
            const minCol = Math.min(selection.startCol, selection.endCol);
            const maxCol = Math.max(selection.startCol, selection.endCol);

            // Check if origin cell is outside the range
            if (
                originCell.row < minRow ||
                originCell.row > maxRow ||
                originCell.col < minCol ||
                originCell.col > maxCol
            ) {
                // Create a separate selection for the origin cell
                // We'll use a visual indicator to show both selections
                this.highlightOriginCell(originCell.row, originCell.col);
            }
        }

        // Update visuals
        this.highlightHeadersForSelection();
        this.updateSelectionStats();
        this.renderer.render();

        return true;
    }

    /**
     * Highlights the origin cell (the cell containing the formula) with a special style
     * @param row - The row of the origin cell
     * @param col - The column of the origin cell
     */
    private highlightOriginCell(row: number, col: number): void {
        // Store the origin cell position for the renderer to highlight it differently
        this.renderer.setOriginCell(row, col);

        // Also highlight its headers
        this.highlightHeadersForCell(row, col);
    }

    /**
     * Clears the origin cell when starting a new selection
     */
    private clearOriginCell(): void {
        this.renderer.clearOriginCell();
        this.renderer.clearFormulaRangeSelection(); // Return to normal green selection
    }

    /**
     * Updates the stats display with calculated statistics
     * @param statsElement The HTML element to update
     * @param stats The calculated statistics
     * @param cellCount The total number of cells in the selection
     */
    private updateStatsDisplay(
        statsElement: HTMLElement,
        stats: {
            count: number;
            sum: number;
            min: number;
            max: number;
            average: number;
        },
        cellCount: number
    ): void {
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
                <div class="stat-item" id="selected">Selected: <span class="stat-value">${cellCount} cells</span></div>
            `;
        } else {
            statsElement.innerHTML = `<div class="stat-item" id="selected">Selected: <span class="stat-value">${cellCount} cells</span></div>`;
        }
    }

    /**
     * Performs smooth inertial scrolling after a touch ends
     * This creates a natural deceleration effect for better user experience
     */
    private performInertialScroll(): void {
        if (
            !this.inertialScrollActive ||
            (Math.abs(this.scrollVelocityX) < 0.5 &&
                Math.abs(this.scrollVelocityY) < 0.5)
        ) {
            this.inertialScrollActive = false;
            if (this.animationFrameId !== null) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
            return;
        }

        // Apply deceleration factor
        const decelerationFactor = 0.95;
        this.scrollVelocityX *= decelerationFactor;
        this.scrollVelocityY *= decelerationFactor;

        // Apply the scroll
        const scrollPos = this.renderer.getScrollPosition();
        const newScrollX = Math.max(0, scrollPos.x + this.scrollVelocityX);
        const newScrollY = Math.max(0, scrollPos.y + this.scrollVelocityY);

        this.renderer.setScroll(newScrollX, newScrollY);
        this.renderer.render();

        // Continue the animation
        this.animationFrameId = requestAnimationFrame(() =>
            this.performInertialScroll()
        );
    }
}
