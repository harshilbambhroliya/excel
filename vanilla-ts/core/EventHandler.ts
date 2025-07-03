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
import { HandlerManager } from "./handlers/HandlerManager.js";
import { IHandlerContext } from "./handlers/BaseHandler.js";
import { KeyboardManager } from "./keyboard/KeyboardManager.js";
import { IKeyboardContext } from "./keyboard/IKeyboardHandler.js";

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
        this.canvas.addEventListener("mousedown", (event: MouseEvent) =>
            this.handlerManager.handleMouseDown(event)
        );
        this.canvas.addEventListener("mousemove", (event: MouseEvent) =>
            this.handlerManager.handleMouseMove(event)
        );
        this.canvas.addEventListener("mouseup", (event: MouseEvent) =>
            this.handlerManager.handleMouseUp(event)
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

    public highlightHeadersForSelection(): void {
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

    public startCellEdit(row: number, col: number, x: number, y: number): void {
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

        // Clear any origin cell highlighting when finishing edit
        this.clearOriginCell();
    }
    private handleDoubleClick(event: MouseEvent): void {
        const cellPos = this.renderer.getCellAtPosition(
            event.offsetX,
            event.offsetY
        );
        if (cellPos) {
            // Check if the cell contains a formula
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

    public handleCopy(selection: Selection): void {
        this.renderer.renderDottedLineAcrossSelection(selection);
        if (selection.isActive) {
            const range = selection.getRange();
            let prevRow = -1;
            let values: string[] = [];
            let text = "";
            range.forEach((pos) => {
                const cell = this.grid.getCell(pos.row, pos.col);
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

    public handleCut(selection: Selection): void {
        this.handleCopy(selection);
        this.deleteSelectedCells();
        this.renderer.render();
        this.updateSelectionStats();
    }

    public handlePaste(
        selection: Selection,
        newRow: number,
        newCol: number
    ): void {
        event?.preventDefault();
        this.grid.clearAllSelections();
        selection.start(newRow, newCol);
        this.renderer.clearCopiedSelection();
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
                    this.commandManager.executeCommand(compositeCommand);

                    // Select the pasted range
                    const lastRow = Math.min(
                        newRow + rows.length - 1,
                        this.grid.getMaxRows() - 1
                    );
                    const lastCol = Math.min(
                        newCol +
                            Math.max(...rows.map((r) => r.split("\t").length)) -
                            1,
                        this.grid.getMaxCols() - 1
                    );

                    selection.start(newRow, newCol);
                    selection.extend(lastRow, lastCol);

                    this.grid.clearHeaderSelections();
                    this.highlightHeadersForSelection();
                }

                this.renderer.render();
                this.updateSelectionStats();
            })
            .catch((err) => {
                console.error("Failed to read clipboard contents: ", err);
            });

        this.renderer.render();
        this.updateSelectionStats();
    }

    /**
     * Handles the selection after a key down event
     */ public handleSelectionAfterKeyDown(
        selection: Selection,
        newRow: number,
        newCol: number
    ): void {
        this.grid.clearAllSelections();
        this.renderer.clearFormulaRangeSelection(); // Return to normal green selection
        selection.start(newRow, newCol);
        this.highlightHeadersForCell(newRow, newCol);
        this.renderer.render();
        this.updateSelectionStats();
    }

    // Touch event handlers
    private handleTouchStart(event: TouchEvent): void {
        event.preventDefault();

        if (event.touches.length === 1) {
            const touch = event.touches[0];
            const rect = this.canvas.getBoundingClientRect();

            const offsetX = touch.clientX - rect.left;
            const offsetY = touch.clientY - rect.top;

            const mouseEvent = {
                offsetX,
                offsetY,
                preventDefault: () => {},
                stopPropagation: () => {},
                button: 0,
            } as unknown as MouseEvent;

            this.handlerManager.handleMouseDown(mouseEvent);

            this.lastTouchPosition = { x: offsetX, y: offsetY };
            this.lastTouchTime = Date.now();
        }
    }

    private handleTouchMove(event: TouchEvent): void {
        event.preventDefault();

        if (event.touches.length === 1) {
            const touch = event.touches[0];
            const rect = this.canvas.getBoundingClientRect();

            const offsetX = touch.clientX - rect.left;
            const offsetY = touch.clientY - rect.top;

            const mouseEvent = {
                offsetX,
                offsetY,
                preventDefault: () => {},
                stopPropagation: () => {},
            } as unknown as MouseEvent;

            this.handlerManager.handleMouseMove(mouseEvent);
        }
    }

    private handleTouchEnd(event: TouchEvent): void {
        const mouseEvent = {
            preventDefault: () => {},
            stopPropagation: () => {},
        } as unknown as MouseEvent;

        this.handlerManager.handleMouseUp(mouseEvent);

        // Check for double-tap
        if (this.lastTouchPosition && this.lastTouchTime) {
            const now = Date.now();
            const timeDiff = now - this.lastTouchTime;

            if (timeDiff < 300) {
                const touch = event.changedTouches[0];
                const rect = this.canvas.getBoundingClientRect();

                const offsetX = touch.clientX - rect.left;
                const offsetY = touch.clientY - rect.top;

                const dblClickEvent = {
                    offsetX,
                    offsetY,
                    preventDefault: () => {},
                    stopPropagation: () => {},
                } as unknown as MouseEvent;

                this.handleDoubleClick(dblClickEvent);
            }

            this.lastTouchPosition = null;
            this.lastTouchTime = 0;
        }
    }

    // Context menu and utility methods
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

    private hideContextMenu(): void {
        if (this.contextMenu) {
            this.contextMenu.style.display = "none";
            this.contextMenuPosition = null;
        }
    }

    // Row/Column insertion methods
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

    // Utility methods
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

    private handleEditorKeyDown(event: KeyboardEvent): void {
        if (event.key === "Enter") {
            this.finishCellEdit();
        } else if (event.key === "Escape") {
            this.cellEditor!.style.display = "none";
            this.editingCell = null;
            this.canvas.focus();
        }
    }

    private handleResize(): void {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        this.resizeTimeout = setTimeout(() => {
            this.renderer.handleWindowResize();
        }, 100);
    }

    public handleScroll(): void {
        if (this.editingCell) {
            this.updateCellEditorPosition();
        }
    }

    private updateCellEditorPosition(): void {
        if (!this.editingCell || !this.cellEditor) return;

        const cellRect = this.getCellRect(
            this.editingCell.row,
            this.editingCell.col
        );

        if (cellRect) {
            const canvasRect = this.canvas.getBoundingClientRect();
            const zoomFactor = this.renderer.getZoom();

            const left = Math.round(canvasRect.left + cellRect.x);
            const top = Math.round(canvasRect.top + cellRect.y);
            const width = Math.round(cellRect.width);
            const height = Math.round(cellRect.height);

            this.cellEditor.style.left = left + "px";
            this.cellEditor.style.top = top + "px";
            this.cellEditor.style.width = width + "px";
            this.cellEditor.style.height = height + "px";
            this.cellEditor.style.fontSize =
                this.BASE_EDITOR_FONT_SIZE * zoomFactor + "px";
        }
    }

    public updateResizeHandlesOnZoom(): void {
        this.handlerManager.resetToDefault();
        this.renderer.render();
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

    private parseValue(value: string): any {
        if (value === "") return "";

        const num = parseFloat(value);
        if (!isNaN(num) && isFinite(num)) {
            return num;
        }

        if (value.toLowerCase() === "true") return true;
        if (value.toLowerCase() === "false") return false;

        return value;
    }

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

    // Math calculation methods
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

    private calculateAverage(cells: any[]): number {
        const numericValues = cells
            .map((cell) => cell.getNumericValue())
            .filter((value) => value !== null);

        if (numericValues.length === 0) return 0;

        const sum = numericValues.reduce((acc, val) => acc + val, 0);
        return sum / numericValues.length;
    }

    private calculateMin(cells: any[]): number {
        const numericValues = cells
            .map((cell) => cell.getNumericValue())
            .filter((value) => value !== null);

        if (numericValues.length === 0) return 0;
        return Math.min(...numericValues);
    }

    private calculateMax(cells: any[]): number {
        const numericValues = cells
            .map((cell) => cell.getNumericValue())
            .filter((value) => value !== null);

        if (numericValues.length === 0) return 0;
        return Math.max(...numericValues);
    }
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
}
