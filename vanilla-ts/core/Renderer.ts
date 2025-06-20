// src/core/Renderer.ts
import { Grid } from './Grid.js';
import { IRect } from '../types/interfaces.js';
import { ScrollbarManager } from './ScrollbarManager.js';
import { EventHandler } from './EventHandler.js';

export class Renderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private grid: Grid;
    private scrollX: number = 0;
    private scrollY: number = 0;
    private viewport: IRect = { x: 0, y: 0, width: 0, height: 0 };
    private devicePixelRatio: number;
    private scrollbarManager: ScrollbarManager | null = null;
    private columnPositions: number[] = []; // Array to cache column positions
    private rowPositions: number[] = []; // Array to cache row positions
    private eventHandler: EventHandler | null = null;

    constructor(canvas: HTMLCanvasElement, grid: Grid) {
        this.canvas = canvas;
        this.grid = grid;
        this.devicePixelRatio = window.devicePixelRatio || 1;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get 2d context from canvas');
        }
        this.ctx = ctx;

        this.setupCanvas();
        this.calculateViewport();
        this.calculatePositions();
    }

    // Calculate and cache the positions of all rows and columns
    private calculatePositions(): void {
        const dimensions = this.grid.getDimensions();
        
        // Calculate column positions
        this.columnPositions = [dimensions.headerWidth];
        let currentX = dimensions.headerWidth;
        
        for (let col = 0; col < this.grid.getMaxCols(); col++) {            
            currentX += this.grid.getColumnWidth(col);
            this.columnPositions.push(currentX);
        }
        
        // Calculate row positions
        this.rowPositions = [dimensions.headerHeight];
        let currentY = dimensions.headerHeight;
        for (let row = 0; row < this.grid.getMaxRows(); row++) {
            currentY += this.grid.getRowHeight(row);
            this.rowPositions.push(currentY);
        }
    }
    
    // Get the X position of a column
    private getColumnPosition(col: number): number {
        if (col < 0 || col >= this.columnPositions.length - 1) {
            // If column is out of range, recalculate positions
            this.calculatePositions();
        }
        return this.columnPositions[col] || 0;
    }
    
    // Get the Y position of a row
    private getRowPosition(row: number): number {
        if (row < 0 || row >= this.rowPositions.length - 1) {
            // If row is out of range, recalculate positions
            this.calculatePositions();
        }
        return this.rowPositions[row] || 0;
    }

    public setScrollbarManager(scrollbarManager: ScrollbarManager): void {
        this.scrollbarManager = scrollbarManager;
        this.updateScrollbars();
    }

    private updateScrollbars(): void {
        if (!this.scrollbarManager) return;
        
        const contentWidth = this.calculateTotalContentWidth();
        const contentHeight = this.calculateTotalContentHeight();
        
        this.scrollbarManager.updateScrollbars(
            this.viewport.width,
            this.viewport.height,
            contentWidth,
            contentHeight
        );
    }

    public setEventHandler(eventHandler: EventHandler): void {
        this.eventHandler = eventHandler;
    }

    public setScroll(scrollX: number, scrollY: number): void {
        this.scrollX = scrollX;
        this.scrollY = scrollY;
        
        // Notify event handler about scroll
        if (this.eventHandler) {
            this.eventHandler.handleScroll();
        }
    }

    public handleScroll(scrollX: number, scrollY: number): void {
        this.scrollX = scrollX;
        this.scrollY = scrollY;
        this.render();
        
        // Notify event handler about scroll
        if (this.eventHandler) {
            this.eventHandler.handleScroll();
        }
    }

    private setupCanvas(): void {
        const container = this.canvas.parentElement;
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        // Account for scrollbar space (16px each)
        const width = containerRect.width - 16;
        const height = containerRect.height - 16;
        
        // Set actual size in memory (scaled for high DPI)
        this.canvas.width = width * this.devicePixelRatio;
        this.canvas.height = height * this.devicePixelRatio;
        
        // Scale the context to ensure correct drawing operations
        this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio);
        
        // Set display size (css pixels)
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        
        // Update viewport
        this.viewport = {
            x: 0,
            y: 0,
            width: width,
            height: height
        };
        
        console.log(`Canvas setup: width=${width}, height=${height}`);
    }

    private calculateViewport(): void {
        const rect = this.canvas.getBoundingClientRect();
        this.viewport = {
            x: 0,
            y: 0,
            width: rect.width,
            height: rect.height
        };
    }

    public render(): void {
        this.clearCanvas();
        // Recalculate positions whenever rendering
        this.calculatePositions();
        this.renderGrid();
        this.renderSelection();
    }

    private clearCanvas(): void {
        this.ctx.clearRect(0, 0, this.viewport.width, this.viewport.height);
    }

    private renderGrid(): void {
        const dimensions = this.grid.getDimensions();
        
        // Find visible row range
        let startRow = 0;
        let endRow = this.grid.getMaxRows();
        console.log("endRow", endRow);
        
        for (let row = 0; row < this.rowPositions.length - 1; row++) {
            if (this.rowPositions[row] - this.scrollY  > dimensions.headerHeight + 20) {
                startRow = Math.max(0, row - 1);
                break;
            }
        }
        
        for (let row = startRow; row < this.rowPositions.length - 1; row++) {
            if (this.rowPositions[row] - this.scrollY > this.viewport.height) {
                endRow = row + 1;
                break;
            }
        }
        
        // Find visible column range
        let startCol = 0;
        let endCol = this.grid.getMaxCols();
        for (let col = 0; col < this.columnPositions.length - 1; col++) {
            if (this.columnPositions[col] - this.scrollX > dimensions.headerWidth + 20) {
                startCol = Math.max(0, col - 1);
                break;
            }
        }
        for (let col = startCol; col < this.columnPositions.length - 1; col++) {
            if (this.columnPositions[col] - this.scrollX > this.viewport.width) {
                endCol = col + 1;
                break;
            }
        }

        // Render headers
        this.renderRowHeaders(startRow, endRow);
        this.renderColumnHeaders(startCol, endCol);
        
        // Render cells
        this.renderCells(startRow, endRow, startCol, endCol);
        
        // Render grid lines
        this.renderGridLines();
    }

    private renderRowHeaders(startRow: number, endRow: number): void {
        const dimensions = this.grid.getDimensions();
        
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, dimensions.headerHeight, dimensions.headerWidth, this.viewport.height);
        
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        for (let row = startRow; row < endRow; row++) {
            const rowHeight = this.grid.getRowHeight(row);
            const yPos = this.getRowPosition(row) - this.scrollY;
            
            if (yPos > this.viewport.height) break;
            if (yPos + rowHeight < dimensions.headerHeight) continue;
            
            const rowObj = this.grid.getRow(row);
            if (rowObj?.isSelected) {
                this.ctx.fillStyle = '#316AC5';
                this.ctx.fillRect(0, yPos, dimensions.headerWidth, rowHeight);
                this.ctx.fillStyle = '#fff';
            } else {
                this.ctx.fillStyle = '#000';
            }
            
            this.ctx.fillText(String(row + 1), dimensions.headerWidth / 2, yPos + rowHeight / 2);
        }
    }

    private renderColumnHeaders(startCol: number, endCol: number): void {
        const dimensions = this.grid.getDimensions();
        
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(dimensions.headerWidth, 0, this.viewport.width, dimensions.headerHeight);
        
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        for (let col = startCol; col < endCol; col++) {
            const colWidth = this.grid.getColumnWidth(col);
            const xPos = this.getColumnPosition(col) - this.scrollX;
            
            if (xPos > this.viewport.width) break;
            if (xPos + colWidth < dimensions.headerWidth) continue;
            
            const colObj = this.grid.getColumn(col);
            if (colObj?.isSelected) {
                this.ctx.fillStyle = '#316AC5';
                this.ctx.fillRect(xPos, 0, colWidth, dimensions.headerHeight);
                this.ctx.fillStyle = '#fff';
            } else {
                this.ctx.fillStyle = '#000';
            }
            
            this.ctx.fillText(colObj.header, xPos + colWidth / 2, dimensions.headerHeight / 2);
        }
    }

    private renderCells(startRow: number, endRow: number, startCol: number, endCol: number): void {
        const dimensions = this.grid.getDimensions();
        
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'start';
        this.ctx.textBaseline = 'middle';
        
        for (let row = startRow; row < endRow; row++) {
            if(row == 0){
                this.ctx.font = 'bold 16px Arial';
            }
            else{
                this.ctx.font = '16px Arial';
            }
            const rowHeight = this.grid.getRowHeight(row);
            const yPos = this.getRowPosition(row) - this.scrollY;
            
            if (yPos > this.viewport.height) continue;
            if (yPos + rowHeight < dimensions.headerHeight) continue;
            
            for (let col = startCol; col < endCol; col++) {
                const colWidth = this.grid.getColumnWidth(col);
                const xPos = this.getColumnPosition(col) - this.scrollX;
                
                if (xPos > this.viewport.width) continue;
                if (xPos + colWidth < dimensions.headerWidth) continue;
                
                const cell = this.grid.getCell(row, col);
                
                // Render cell background
                this.ctx.fillStyle = cell.style.backgroundColor || '#ffffff';
                this.ctx.fillRect(xPos, yPos, colWidth, rowHeight);
                
                // Render cell text
                if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
                    this.ctx.fillStyle = cell.style.textColor || '#000000';
                    const displayValue = cell.getDisplayValue();
                    
                    // Clip text to cell boundaries
                    this.ctx.save();
                    this.ctx.beginPath();
                    this.ctx.rect(xPos + 2, yPos, colWidth - 4, rowHeight);
                    this.ctx.clip();
                    
                    this.ctx.fillText(displayValue, xPos + 4, yPos + rowHeight / 2);
                    this.ctx.restore();
                }
            }
        }
    }

    private renderGridLines(): void {
        const dimensions = this.grid.getDimensions();
        
        this.ctx.strokeStyle = '#bebebe';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();

        
        // Vertical lines (columns)
        for (let col = 0; col < this.columnPositions.length; col++) {
            const xPos = this.columnPositions[col] - this.scrollX;
            if (xPos >= dimensions.headerWidth && xPos <= this.viewport.width) {
                // Draw line in cell area
                this.ctx.moveTo(xPos, 0);
                this.ctx.lineTo(xPos, this.viewport.height);
            }
        }
        
        // Horizontal lines (rows)
        for (let row = 0; row < this.rowPositions.length; row++) {
            const yPos = this.rowPositions[row] - this.scrollY;
            if (yPos >= dimensions.headerHeight && yPos <= this.viewport.height) {
                // Draw line in cell area
                this.ctx.moveTo(0, yPos);
                this.ctx.lineTo(this.viewport.width, yPos);
            }
        }
        
        this.ctx.stroke();
        
        // Header borders
        this.ctx.strokeStyle = '#a0a0a0';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, dimensions.headerHeight);
        this.ctx.lineTo(this.viewport.width, dimensions.headerHeight);
        this.ctx.moveTo(dimensions.headerWidth, 0);
        this.ctx.lineTo(dimensions.headerWidth, this.viewport.height);
        this.ctx.stroke();
    }

    private renderSelection(): void {
        const selection = this.grid.getSelection();
        if (!selection.isActive) return;
        
        const dimensions = this.grid.getDimensions();
        const startRow = Math.min(selection.startRow, selection.endRow);
        const endRow = Math.max(selection.startRow, selection.endRow);
        const startCol = Math.min(selection.startCol, selection.endCol);
        const endCol = Math.max(selection.startCol, selection.endCol);
        
        // Get positions from our cached arrays
        const x = this.getColumnPosition(startCol) - this.scrollX;
        const y = this.getRowPosition(startRow) - this.scrollY;
        const width = this.getColumnPosition(endCol + 1) - this.getColumnPosition(startCol);
        const height = this.getRowPosition(endRow + 1) - this.getRowPosition(startRow);
        
        // Selection background
        this.ctx.fillStyle = 'rgba(49, 106, 197, 0.2)';
        this.ctx.fillRect(x, y, width, height);
        
        // Selection border
        this.ctx.strokeStyle = '#316AC5';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);
    }

    public getScrollPosition(): { x: number; y: number } {
        return { x: this.scrollX, y: this.scrollY };
    }

    public getCellAtPosition(x: number, y: number): { row: number; col: number } | null {
        const dimensions = this.grid.getDimensions();
        
        if (x < dimensions.headerWidth || y < dimensions.headerHeight) {
            return null;
        }
        
        // Find column based on cached positions
        let col = -1;
        for (let i = 0; i < this.columnPositions.length - 1; i++) {
            const colStart = this.columnPositions[i] - this.scrollX;
            const colEnd = this.columnPositions[i + 1] - this.scrollX;
            
            if (x >= colStart && x < colEnd) {
                col = i;
                break;
            }
        }
        
        // Find row based on cached positions
        let row = -1;
        for (let i = 0; i < this.rowPositions.length - 1; i++) {
            const rowStart = this.rowPositions[i] - this.scrollY;
            const rowEnd = this.rowPositions[i + 1] - this.scrollY;
            
            if (y >= rowStart && y < rowEnd) {
                row = i;
                break;
            }
        }
        
        if (col >= 0 && row >= 0) {
            return { row, col };
        }
        
        return null;
    }

    public resize(): void {
        this.setupCanvas();
        this.calculatePositions();
        this.render();
    }

    public handleWindowResize(): void {
        this.resize();
        this.updateScrollbars();
    }

    private calculateTotalContentWidth(): number {
        // Use the last column position as the total width
        if (this.columnPositions.length > 0) {
            return this.columnPositions[this.columnPositions.length - 1];
        }
        
        // Fallback calculation
        const dimensions = this.grid.getDimensions();
        let totalWidth = dimensions.headerWidth;
        
        for (let col = 0; col < this.grid.getMaxCols(); col++) {
            totalWidth += this.grid.getColumnWidth(col);
        }
        
        return totalWidth;
    }

    private calculateTotalContentHeight(): number {
        // Use the last row position as the total height
        if (this.rowPositions.length > 0) {
            return this.rowPositions[this.rowPositions.length - 1];
        }
        
        // Fallback calculation
        const dimensions = this.grid.getDimensions();
        let totalHeight = dimensions.headerHeight;
        
        for (let row = 0; row < this.grid.getMaxRows(); row++) {
            totalHeight += this.grid.getRowHeight(row);
        }
        
        return totalHeight;
    }
}