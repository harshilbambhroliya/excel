// src/core/EventHandler.ts
import { Grid } from './Grid.js';
import { Renderer } from './Renderer.js';
import { CommandManager } from '../commands/Command.js';
import { EditCellCommand } from '../commands/EditCellCommand.js';
import { ResizeColumnCommand } from '../commands/ResizeColumnCommand.js';
import { ResizeRowCommand } from '../commands/ResizeRowCommand.js';
import { MathUtils } from '../utils/MathUtils.js';
import { ScrollbarManager } from './ScrollbarManager.js';

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
    private resizeTarget: { type: 'row' | 'column'; index: number } | null = null;
    
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

    /**
     * The constructor
     * @param canvas - The canvas element
     * @param grid - The grid
     * @param renderer - The renderer
     * @param commandManager - The command manager
     */
    constructor(canvas: HTMLCanvasElement, grid: Grid, renderer: Renderer, commandManager: CommandManager) {
        this.canvas = canvas;
        this.grid = grid;
        this.renderer = renderer;
        this.commandManager = commandManager;
        
        this.setupEventListeners();
        this.createCellEditor();
    }

    /**
     * Sets the scrollbar manager
     * @param scrollbarManager - The scrollbar manager
     */
    public setScrollbarManager(scrollbarManager: ScrollbarManager): void {
        this.scrollbarManager = scrollbarManager;
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
     * Sets up the event listeners
     */
    private setupEventListeners(): void {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        this.canvas.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Make canvas focusable
        this.canvas.tabIndex = 0;
        
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    /**
     * Creates the cell editor
     */
    private createCellEditor(): void {
        this.cellEditor = document.createElement('input');
        this.cellEditor.type = 'text';
        this.cellEditor.style.position = 'absolute';
        this.cellEditor.style.display = 'none';
        this.cellEditor.style.border = '2px solid #316AC5';
        this.cellEditor.style.padding = '2px';
        this.cellEditor.style.fontSize = '16px';
        this.cellEditor.style.fontFamily = 'Arial';
        this.cellEditor.style.zIndex = '1000';
        
        this.cellEditor.addEventListener('blur', this.finishCellEdit.bind(this));
        this.cellEditor.addEventListener('keydown', this.handleEditorKeyDown.bind(this));
        
        document.body.appendChild(this.cellEditor);
    }

    /**
     * Handles the mouse down event
     * @param event - The mouse event
     */
    private handleMouseDown(event: MouseEvent): void {
        this.canvas.focus();
        this.isMouseDown = true;
        this.lastMousePos = { x: event.offsetX, y: event.offsetY };
        
        const dimensions = this.grid.getDimensions();
        
        // Check if clicking on resize handles
        const resizeTarget = this.getResizeTarget(event.offsetX, event.offsetY);
        if (resizeTarget) {
            this.isResizing = true;
            this.resizeTarget = resizeTarget;
            this.canvas.style.cursor = resizeTarget.type === 'column' ? 'col-resize' : 'row-resize';
            return;
        }
        
        // Check if clicking on row header
        if (event.offsetX < dimensions.headerWidth && event.offsetY >= dimensions.headerHeight) {
            const row = Math.floor((event.offsetY - dimensions.headerHeight + this.renderer.getScrollPosition().y) / dimensions.rowHeight);
            if (row >= 0 && row < this.grid.getMaxRows()) {
                this.grid.selectRow(row);
                this.renderer.render();
                this.updateSelectionStats();
                return;
            }
        }
        
        // Check if clicking on column header
        if (event.offsetY < dimensions.headerHeight && event.offsetX >= dimensions.headerWidth) {
            const col = Math.floor((event.offsetX - dimensions.headerWidth + this.renderer.getScrollPosition().x) / dimensions.columnWidth);
            if (col >= 0 && col < this.grid.getMaxCols()) {
                this.grid.selectColumn(col);
                this.renderer.render();
                this.updateSelectionStats();
                return;
            }
        }
        
        // Cell selection
        const cellPos = this.renderer.getCellAtPosition(event.offsetX, event.offsetY);
        if (cellPos) {
            this.finishCellEdit();
            this.grid.getSelection().start(cellPos.row, cellPos.col);
            this.renderer.render();
            this.updateSelectionStats();
        }
    }

    /**
     * Handles the mouse move event
     * @param event - The mouse event
     */
    private handleMouseMove(event: MouseEvent): void {
        const dimensions = this.grid.getDimensions();
        
        // Update cursor for resize handles
        if (!this.isMouseDown) {
            const resizeTarget = this.getResizeTarget(event.offsetX, event.offsetY);
            this.canvas.style.cursor = resizeTarget ? 
                (resizeTarget.type === 'column' ? 'col-resize' : 'row-resize') : 'cell';
        }
        
        if (!this.isMouseDown) return;
        
        if (this.isResizing && this.resizeTarget) {
            this.handleResizeDrag(event);
            return;
        }
        
        // Handle selection dragging
        const cellPos = this.renderer.getCellAtPosition(event.offsetX, event.offsetY);
        if (cellPos && this.grid.getSelection().isActive) {
            this.isDragging = true;
            this.grid.getSelection().extend(cellPos.row, cellPos.col);
            this.renderer.render();
            this.updateSelectionStats();
        }
    }

    /**
     * Handles the mouse up event
     * @param event - The mouse event
     */
    private handleMouseUp(event: MouseEvent): void {
        this.isMouseDown = false;
        this.isDragging = false;
        
        if (this.isResizing) {
            this.isResizing = false;
            this.resizeTarget = null;
            this.canvas.style.cursor = 'cell';
        }
    }

    /**
     * Handles the double click event
     * @param event - The mouse event
     */
    private handleDoubleClick(event: MouseEvent): void {
        const cellPos = this.renderer.getCellAtPosition(event.offsetX, event.offsetY);
        if (cellPos) {
            this.startCellEdit(cellPos.row, cellPos.col, event.offsetX, event.offsetY);
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
     * Handles the keyboard event
     * @param event - The keyboard event
     */
    private handleKeyDown(event: KeyboardEvent): void {
        const selection = this.grid.getSelection();
        if (!selection.isActive) return;
        
        const dimensions = this.grid.getDimensions();
        let newRow = selection.startRow;
        let newCol = selection.startCol;
        
        // Check for shift key and handle combinations properly
        if (event.shiftKey) {
            switch (event.key) {
                case 'Tab':
                    event.preventDefault(); // Prevent default tab behavior
                    newCol = Math.max(0, newCol - 1);
                    break;
                case 'ArrowUp':
                    newRow = 0; // First row
                    break;
                case 'ArrowDown':
                    newRow = this.grid.getMaxRows() - 1; // Last row
                    break;
                case 'ArrowLeft':
                    newCol = 0; // First column
                    break;
                case 'ArrowRight':
                    newCol = this.grid.getMaxCols() - 1; // Last column
                    break;
                default:
                    break;
            }
        }
        else if(event.ctrlKey){
            switch(event.key){
                case 'z':
                    {this.commandManager.undo();
                    this.renderer.render();
                    this.updateSelectionStats();
                    break;}
                case 'y':
                    {this.commandManager.redo();
                    this.renderer.render();
                    this.updateSelectionStats();}
                    break;
                case 'ArrowRight':
                    // Extend selection to the right until non-empty cell or edge
                   { event.preventDefault();
                    let rightCol = selection.endCol;
                    let foundNonEmpty = false;
                    
                    // Start from one column after the current selection end
                    for (let col = selection.endCol + 1; col < this.grid.getMaxCols(); col++) {
                        const cell = this.grid.getCell(selection.endRow, col);
                        
                        // // If we find a non-empty cell, select up to it (inclusive)
                        if (cell ) {
                            rightCol = col;
                            foundNonEmpty = true;
                            break;
                        }
                    }
                    
                    // Extend the selection
                    selection.extend(selection.endRow, rightCol);
                    this.ensureCellVisible(selection.endRow, rightCol);
                    this.renderer.render();
                    this.updateSelectionStats();
                    return;}
                    
                case 'ArrowLeft':
                    // Extend selection to the left until non-empty cell or edge
                    {event.preventDefault();
                    let leftCol = selection.endCol;
                    let foundNonEmpty = false;
                    
                    // Start from one column before the current selection end
                    for (let col = selection.endCol - 1; col >= 0; col--) {
                        const cell = this.grid.getCell(selection.endRow, col);
                        
                        // If we find a non-empty cell, select up to it (inclusive)
                        if (cell) {
                            leftCol = col;
                            foundNonEmpty = true;
                            break;
                        }
                    }
                    
                   
                    // Extend the selection
                    selection.extend(selection.endRow, leftCol);
                    this.ensureCellVisible(selection.endRow, leftCol);
                    this.renderer.render();
                    this.updateSelectionStats();
                    return;}
                    
                case 'ArrowDown':
                    // Extend selection downward until non-empty cell or edge
                   { event.preventDefault();
                    let downRow = selection.endRow;
                    let foundNonEmpty = false;
                    
                    // Start from one row after the current selection end
                    for (let row = selection.endRow + 1; row < this.grid.getMaxRows(); row++) {
                        const cell = this.grid.getCell(row, selection.endCol);
                        
                        // If we find a non-empty cell, select up to it (inclusive)
                        if (cell) {
                            downRow = row;
                            foundNonEmpty = true;
                            break;
                        }
                    }
                    
                    
                    // Extend the selection
                    selection.extend(downRow, selection.endCol);
                    this.ensureCellVisible(downRow, selection.endCol);
                    this.renderer.render();
                    this.updateSelectionStats();
                    return;
                    }
                case 'ArrowUp':
                    // Extend selection upward until non-empty cell or edge
                   { event.preventDefault();
                    let upRow = selection.endRow;
                    let foundNonEmpty = false;
                    
                    // Start from one row before the current selection end
                    for (let row = selection.endRow - 1; row >= 0; row--) {
                        const cell = this.grid.getCell(row, selection.endCol);
                        
                        // If we find a non-empty cell, select up to it (inclusive)
                        if (cell) {
                            upRow = row;
                            foundNonEmpty = true;
                            break;
                        }
                    }
                    // Extend the selection
                    selection.extend(upRow, selection.endCol);
                    this.ensureCellVisible(upRow, selection.endCol);
                    this.renderer.render();
                    this.updateSelectionStats();
                    return;}
                    
                default:
            }
        } 
        else {
            // Handle regular key presses (without shift)
            switch (event.key) {
                case 'ArrowUp':
                    newRow = Math.max(0, newRow - 1);
                    break;
                case 'ArrowDown':
                    newRow = Math.min(this.grid.getMaxRows() - 1, newRow + 1);
                    break;
                case 'ArrowLeft':
                    newCol = Math.max(0, newCol - 1);
                    break;
                case 'ArrowRight':
                    newCol = Math.min(this.grid.getMaxCols() - 1, newCol + 1);
                    break;
                case 'Enter':
                    const cellRect = this.getCellRect(newRow, newCol);
                    if (cellRect) {
                        this.startCellEdit(newRow, newCol, cellRect.x, cellRect.y);
                    }
                    return;
                case 'Delete':
                    this.deleteSelectedCells();
                    return;
                case 'Tab':
                    event.preventDefault(); // Prevent default tab behavior
                    newCol = Math.min(this.grid.getMaxCols() - 1, newCol + 1);
                    break;
                default:
                    return;
            }
        }
        
        event.preventDefault();
        selection.start(newRow, newCol);
        this.ensureCellVisible(newRow, newCol);
        this.renderer.render();
        this.updateSelectionStats();
    }

    /**
     * Gets the resize target
     * @param x - The x position
     * @param y - The y position
     * @returns The resize target
     */
    private getResizeTarget(x: number, y: number): { type: 'row' | 'column'; index: number } | null {
        const dimensions = this.grid.getDimensions();
        const tolerance = 3;
        
        // Check column resize handles
        if (y <= dimensions.headerHeight) {
            const scrollX = this.renderer.getScrollPosition().x;
            let currentX = dimensions.headerWidth - scrollX;
            
            for (let col = 0; col < this.grid.getMaxCols(); col++) {
                const colWidth = this.grid.getColumnWidth(col);
                currentX += colWidth;
                
                if (Math.abs(x - currentX) <= tolerance) {
                    return { type: 'column', index: col };
                }
                
                // Break early if we're past the viewport
                if (currentX > x + tolerance + dimensions.columnWidth) {
                    break;
                }
            }
        }
        
        // Check row resize handles
        if (x <= dimensions.headerWidth) {
            const scrollY = this.renderer.getScrollPosition().y;
            let currentY = dimensions.headerHeight - scrollY;
            
            for (let row = 0; row < this.grid.getMaxRows(); row++) {
                const rowHeight = this.grid.getRowHeight(row);
                currentY += rowHeight;
                
                if (Math.abs(y - currentY) <= tolerance) {
                    return { type: 'row', index: row };
                }
                
                // Break early if we're past the viewport
                if (currentY > y + tolerance + dimensions.rowHeight) {
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
        const delta = this.resizeTarget.type === 'column' ? 
            event.offsetX - this.lastMousePos.x : 
            event.offsetY - this.lastMousePos.y;
        
        if (this.resizeTarget.type === 'column') {
            const currentWidth = this.grid.getColumnWidth(this.resizeTarget.index);
            const newWidth = Math.max(50, currentWidth + delta);
            const command = new ResizeColumnCommand(this.grid, this.resizeTarget.index, newWidth);
            this.commandManager.executeCommand(command);
            
            // Force scrollbar manager to update if available
            if (this.scrollbarManager) {
                // Force renderer to recalculate positions
                this.renderer.render();
            }
        } else {
            const currentHeight = this.grid.getRowHeight(this.resizeTarget.index);
            const newHeight = Math.max(20, currentHeight + delta);
            const command = new ResizeRowCommand(this.grid, this.resizeTarget.index, newHeight);
            this.commandManager.executeCommand(command);
            
            // Force scrollbar manager to update if available
            if (this.scrollbarManager) {
                // Force renderer to recalculate positions
                this.renderer.render();
            }
        }
        
        this.lastMousePos = { x: event.offsetX, y: event.offsetY };
        this.renderer.render();
    }

    /**
     * Starts the cell edit
     * @param row - The row index
     * @param col - The column index
     * @param x - The x position
     * @param y - The y position
     */
    private startCellEdit(row: number, col: number, x: number, y: number): void {
        if (!this.cellEditor) return;
        
        this.editingCell = { row, col };
        const cell = this.grid.getCell(row, col);
        const cellRect = this.getCellRect(row, col);
        
        if (cellRect) {
            const canvasRect = this.canvas.getBoundingClientRect();
            
            this.cellEditor.style.left = (canvasRect.left + cellRect.x) + 'px';
            this.cellEditor.style.top = (canvasRect.top + cellRect.y) + 'px';
            this.cellEditor.style.width = cellRect.width + 'px';
            this.cellEditor.style.height = cellRect.height + 'px';
            this.cellEditor.style.display = 'block';
            this.cellEditor.value = cell.getDisplayValue();
            this.cellEditor.focus();
            this.cellEditor.select();
        }
    }

    /**
     * Finishes the cell edit
     */
    private finishCellEdit(): void {
        if (!this.editingCell || !this.cellEditor) return;
        
        const newValue = this.cellEditor.value;
        const oldValue = this.grid.getCellValue(this.editingCell.row, this.editingCell.col);
        
        if (newValue !== String(oldValue)) {
            const command = new EditCellCommand(
                this.grid, 
                this.editingCell.row, 
                this.editingCell.col, 
                this.parseValue(newValue)
            );
            this.commandManager.executeCommand(command);
            this.renderer.render();
        }
        
        this.cellEditor.style.display = 'none';
        this.editingCell = null;
        this.canvas.focus();
    }

    /**
     * Handles the key down event for the cell editor
     * @param event - The keyboard event
     */
    private handleEditorKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            this.finishCellEdit();
        } else if (event.key === 'Escape') {
            this.cellEditor!.style.display = 'none';
            this.editingCell = null;
            this.canvas.focus();
        }
    }

    /**
     * Parses the value
     * @param value - The value
     * @returns The parsed value
     */
    private parseValue(value: string): any {
        if (value === '') return '';
        
        // Try to parse as number
        const num = parseFloat(value);
        if (!isNaN(num) && isFinite(num)) {
            return num;
        }
        
        // Try to parse as boolean
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;
        
        // Return as string
        return value;
    }

    /**
     * Deletes the selected cells
     */
    private deleteSelectedCells(): void {
        const selection = this.grid.getSelection();
        if (!selection.isActive) return;
        
        const positions = selection.getRange();
        positions.forEach(pos => {
            const command = new EditCellCommand(this.grid, pos.row, pos.col, '');
            this.commandManager.executeCommand(command);
        });
        
        this.renderer.render();
        this.updateSelectionStats();
    }

    /**
     * Gets the cell rectangle
     * @param row - The row index
     * @param col - The column index
     * @returns The cell rectangle
     */
    private getCellRect(row: number, col: number): { x: number; y: number; width: number; height: number } | null {
        const dimensions = this.grid.getDimensions();
        const scrollPos = this.renderer.getScrollPosition();
        const zoomFactor = this.renderer.getZoom();
        
        // Calculate x position by summing the widths of all columns before the target column
        let x = dimensions.headerWidth - scrollPos.x * zoomFactor;
        for (let i = 0; i < col; i++) {
            x += this.grid.getColumnWidth(i) * zoomFactor;
        }
        
        // Calculate y position by summing the heights of all rows before the target row
        let y = dimensions.headerHeight - scrollPos.y * zoomFactor;
        for (let i = 0; i < row; i++) {
            y += this.grid.getRowHeight(i) * zoomFactor;
        }
        
        const width = this.grid.getColumnWidth(col) * zoomFactor;
        const height = this.grid.getRowHeight(row) * zoomFactor;
        
        return { x, y, width, height };
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
            newScrollX = newScrollX - (this.canvas.width - dimensions.headerWidth) / zoomFactor;
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
            
            newScrollY = newScrollY - (this.canvas.height - dimensions.headerHeight) / zoomFactor;
        }
        
        if (newScrollX !== scrollPos.x || newScrollY !== scrollPos.y) {
            this.renderer.setScroll(Math.max(0, newScrollX), Math.max(0, newScrollY));
        }
    }

    /**
     * Updates the selection stats
     */
    private updateSelectionStats(): void {
        const statsElement = document.getElementById('selectionStats');
        if (!statsElement) return;
        
        const selectedCells = this.grid.getCellsInSelection();
        if (selectedCells.length === 0) {
            statsElement.textContent = '';
            return;
        }
        
        const stats = MathUtils.calculateStats(selectedCells);
        
        if (stats.count > 0) {
            statsElement.innerHTML = `
                <div class="stat-item" id="count">Count: <span class="stat-value">${stats.count}</span></div>
                <div class="stat-item" id="sum">Sum: <span class="stat-value">${stats.sum.toLocaleString()}</span></div>
                <div class="stat-item" id="avg">Avg: <span class="stat-value">${stats.average.toFixed(2)}</span></div>
                <div class="stat-item" id="min">Min: <span class="stat-value">${stats.min}</span></div>
                <div class="stat-item" id="max">Max: <span class="stat-value">${stats.max}</span></div>
                <div class="stat-item" id="selected">Selected: <span class="stat-value">${selectedCells.length} cells</span></div>
            `
        } else {
            statsElement.innerHTML = `<div class="stat-item" id="selected">Selected: <span class="stat-value">${selectedCells.length} cells</span></div>`;
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
     * Updates the cell editor position
     */
    private updateCellEditorPosition(): void {
        if (!this.editingCell || !this.cellEditor) return;
        
        const cellRect = this.getCellRect(this.editingCell.row, this.editingCell.col);
        
        if (cellRect) {
            const canvasRect = this.canvas.getBoundingClientRect();
            
            this.cellEditor.style.left = (canvasRect.left + cellRect.x) + 'px';
            this.cellEditor.style.top = (canvasRect.top + cellRect.y) + 'px';
            this.cellEditor.style.width = cellRect.width + 'px';
            this.cellEditor.style.height = cellRect.height + 'px';
        }
    }

    /**
     * Handles the calculation
     * @param value - The value
     */
    public handleCalculation(value: string): void {
        // it is in the format of "=SUM(A1:A10)"
        const match = value.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
        if(!match) return;

        const startRow = match[2];
        const startCol = match[1];
        const endRow = match[4];
        const endCol = match[3];

        const startRowIndex = parseInt(startRow)-1;
        const startColIndex = (startCol).charCodeAt(0) - 65;
        const endRowIndex = parseInt(endRow)-1;
        const endColIndex = (endCol).charCodeAt(0) - 65;        

        const cellsInRange = this.grid.getCellsInRange(startRowIndex, startColIndex, endRowIndex, endColIndex);
        // select the cells in the range
        this.grid.getSelection().start(startRowIndex, startColIndex);
        this.grid.getSelection().extend(endRowIndex, endColIndex);
        this.renderer.render();
        this.updateSelectionStats();

        this.updateState(cellsInRange);
    }

    /**
     * Updates the state
     * @param sum - The sum
     */
    private updateState(cellsInRange: any[]): void {
        const statsElement = document.getElementById('selectionStats');
        if (!statsElement) return;

 
        const count = cellsInRange.length;
        let sum = 0;
        for(const cell of cellsInRange){
            sum += parseInt(cell.value);
        }
        const avg = count > 0 ? sum / count : 0;
        
        // Find min and max
        let min = Number.MAX_VALUE;
        let max = Number.MIN_VALUE;
        
        for (const cell of cellsInRange) {
            const value = cell.getNumericValue();
            if (value !== null) {
                min = Math.min(min, value);
                max = Math.max(max, value);
            }
        }
        
        // If no valid numbers were found
        if (min === Number.MAX_VALUE) min = 0;
        if (max === Number.MIN_VALUE) max = 0;
        
        // Update the stats display with all information
        if(count > 0){
            statsElement.innerHTML = `
                <div class="stat-item" id="count">Count: <span class="stat-value">${count}</span></div>
                <div class="stat-item" id="sum">Sum: <span class="stat-value">${sum.toLocaleString()}</span></div>
                <div class="stat-item" id="avg">Avg: <span class="stat-value">${avg.toFixed(2)}</span></div>
                <div class="stat-item" id="min">Min: <span class="stat-value">${min}</span></div>
                <div class="stat-item" id="max">Max: <span class="stat-value">${max}</span></div>
                <div class="stat-item" id="selected">Selected: <span class="stat-value">${count} cells</span></div>
            `;
            }
        else{
            statsElement.innerHTML = `<div class="stat-item" id="selected">Selected: <span class="stat-value">${count} cells</span></div>`;
        }
    }
}