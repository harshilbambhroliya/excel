// src/core/EventHandler.ts
import { Grid } from './Grid.js';
import { Renderer } from './Renderer.js';
import { CommandManager } from '../commands/Command.js';
import { EditCellCommand } from '../commands/EditCellCommand.js';
import { ResizeColumnCommand } from '../commands/ResizeColumnCommand.js';
import { ResizeRowCommand } from '../commands/ResizeRowCommand.js';
import { MathUtils } from '../utils/MathUtils.js';
import { ScrollbarManager } from './ScrollbarManager.js';

export class EventHandler {
    private canvas: HTMLCanvasElement;
    private grid: Grid;
    private renderer: Renderer;
    private commandManager: CommandManager;
    private isMouseDown: boolean = false;
    private isDragging: boolean = false;
    private isResizing: boolean = false;
    private resizeTarget: { type: 'row' | 'column'; index: number } | null = null;
    private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };
    private editingCell: { row: number; col: number } | null = null;
    private cellEditor: HTMLInputElement | null = null;
    private resizeTimeout: number | null = null;
    private scrollbarManager: ScrollbarManager | null = null;

    constructor(canvas: HTMLCanvasElement, grid: Grid, renderer: Renderer, commandManager: CommandManager) {
        this.canvas = canvas;
        this.grid = grid;
        this.renderer = renderer;
        this.commandManager = commandManager;
        
        this.setupEventListeners();
        this.createCellEditor();
    }

    public setScrollbarManager(scrollbarManager: ScrollbarManager): void {
        this.scrollbarManager = scrollbarManager;
    }

    public handleScroll(): void {
        // Update cell editor position during any scroll event
        if (this.editingCell) {
            this.updateCellEditorPosition();
        }
    }

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

    private createCellEditor(): void {
        this.cellEditor = document.createElement('input');
        this.cellEditor.type = 'text';
        this.cellEditor.style.position = 'absolute';
        this.cellEditor.style.display = 'none';
        this.cellEditor.style.border = '2px solid #316AC5';
        this.cellEditor.style.padding = '2px';
        this.cellEditor.style.fontSize = '12px';
        this.cellEditor.style.fontFamily = 'Arial';
        this.cellEditor.style.zIndex = '1000';
        
        this.cellEditor.addEventListener('blur', this.finishCellEdit.bind(this));
        this.cellEditor.addEventListener('keydown', this.handleEditorKeyDown.bind(this));
        
        document.body.appendChild(this.cellEditor);
    }

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

    private handleMouseUp(event: MouseEvent): void {
        this.isMouseDown = false;
        this.isDragging = false;
        
        if (this.isResizing) {
            this.isResizing = false;
            this.resizeTarget = null;
            this.canvas.style.cursor = 'cell';
        }
    }

    private handleDoubleClick(event: MouseEvent): void {
        const cellPos = this.renderer.getCellAtPosition(event.offsetX, event.offsetY);
        if (cellPos) {
            this.startCellEdit(cellPos.row, cellPos.col, event.offsetX, event.offsetY);
        }
    }

     private handleWheel(event: WheelEvent): void {
        event.preventDefault();
        
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
                    this.commandManager.undo();
                    this.renderer.render();
                    this.updateSelectionStats();
                    break;
                case 'y':
                    this.commandManager.redo();
                    this.renderer.render();
                    this.updateSelectionStats();
                    break;
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

    private handleEditorKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            this.finishCellEdit();
        } else if (event.key === 'Escape') {
            this.cellEditor!.style.display = 'none';
            this.editingCell = null;
            this.canvas.focus();
        }
    }

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

    private getCellRect(row: number, col: number): { x: number; y: number; width: number; height: number } | null {
        const dimensions = this.grid.getDimensions();
        const scrollPos = this.renderer.getScrollPosition();
        
        // Calculate x position by summing the widths of all columns before the target column
        let x = dimensions.headerWidth - scrollPos.x;
        for (let i = 0; i < col; i++) {
            x += this.grid.getColumnWidth(i);
        }
        
        // Calculate y position by summing the heights of all rows before the target row
        let y = dimensions.headerHeight - scrollPos.y;
        for (let i = 0; i < row; i++) {
            y += this.grid.getRowHeight(i);
        }
        
        const width = this.grid.getColumnWidth(col);
        const height = this.grid.getRowHeight(row);
        
        return { x, y, width, height };
    }

    private ensureCellVisible(row: number, col: number): void {
        const dimensions = this.grid.getDimensions();
        const scrollPos = this.renderer.getScrollPosition();
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
            newScrollX = newScrollX - (this.canvas.width - dimensions.headerWidth);
        }
        
        // Check vertical scrolling
        if (cellRect.y < dimensions.headerHeight) {
            // Need to scroll up
            newScrollY = 0;
            for (let i = 0; i < row; i++) {
                newScrollY += this.grid.getRowHeight(i);
            }
        } else if (cellRect.y + cellRect.height > this.canvas.height) {
            // Need to scroll down
            newScrollY = 0;
            
            // Sum heights up to and including the current row
            for (let i = 0; i <= row; i++) {
                newScrollY += this.grid.getRowHeight(i);
            }
            
            // Adjust to align with bottom edge of viewport
            newScrollY = newScrollY - (this.canvas.height - dimensions.headerHeight);
        }
        
        if (newScrollX !== scrollPos.x || newScrollY !== scrollPos.y) {
            this.renderer.setScroll(Math.max(0, newScrollX), Math.max(0, newScrollY));
        }
    }

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
                <div class="stat-item">Count: <span class="stat-value">${stats.count}</span></div>
                <div class="stat-item">Sum: <span class="stat-value">${stats.sum.toLocaleString()}</span></div>
                <div class="stat-item">Avg: <span class="stat-value">${stats.average.toFixed(2)}</span></div>
                <div class="stat-item">Min: <span class="stat-value">${stats.min}</span></div>
                <div class="stat-item">Max: <span class="stat-value">${stats.max}</span></div>
                <div class="stat-item">Selected: <span class="stat-value">${selectedCells.length} cells</span></div>
            `
        } else {
            statsElement.innerHTML = `<div class="stat-item">Selected: <span class="stat-value">${selectedCells.length} cells</span></div>`;
        }
    }

    private handleResize(): void {
        // Use a timeout to debounce resize events
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        this.resizeTimeout = setTimeout(() => {
            this.renderer.handleWindowResize();
        }, 100);
    }

    // Add new method to update cell editor position
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
}