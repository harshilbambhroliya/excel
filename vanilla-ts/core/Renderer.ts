// src/core/Renderer.ts
import { Grid } from './Grid.js';
import { IRect } from '../types/interfaces.js';
import { ScrollbarManager } from './ScrollbarManager.js';
import { EventHandler } from './EventHandler.js';

/**
 * The Renderer class is responsible for rendering the grid and handling events
 */
export class Renderer {
    /**
     * The canvas element to render the grid on
     */
    private canvas: HTMLCanvasElement;
    /**
     * The 2D context of the canvas
     */
    private ctx: CanvasRenderingContext2D;
    /**
     * The grid to render
     */
    private grid: Grid;
    /**
     * The scroll position in the X direction
     */
    private scrollX: number = 0;
    /**
     * The scroll position in the Y direction
     */
    private scrollY: number = 0;
    /**
     * The viewport of the grid
     */
    private viewport: IRect = { x: 0, y: 0, width: 0, height: 0 };
    /**
     * The device pixel ratio
     */
    private devicePixelRatio: number;
    /**
     * The scrollbar manager
     */
    private scrollbarManager: ScrollbarManager | null = null;
    /**
     * The column positions
     */
    private columnPositions: number[] = []; // Array to cache column positions
    /**
     * The row positions
     */
    private rowPositions: number[] = []; // Array to cache row positions
    /**
     * The event handler
     */
    private eventHandler: EventHandler | null = null;
    /**
     * The zoom factor
     */
    private zoomFactor: number = 1.0;
    /**
     * The minimum zoom factor
     */
    private minZoom: number = 0.25;
    /**
     * The maximum zoom factor
     */
    private maxZoom: number = 3.0;

    /**
     * Constructor for the Renderer class
     * @param {HTMLCanvasElement} canvas The canvas element to render the grid on
     * @param {Grid} grid The grid to render
     */
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

    /**
     * Calculates and caches the positions of all rows and columns
     */
    private calculatePositions(): void {
        const dimensions = this.grid.getDimensions();
        
        // Calculate column positions (without zoom - we'll apply zoom in rendering)
        this.columnPositions = [dimensions.headerWidth];
        let currentX = dimensions.headerWidth;
        
        for (let col = 0; col < this.grid.getMaxCols(); col++) {            
            currentX += this.grid.getColumnWidth(col);
            this.columnPositions.push(currentX);
        }
        
        // Calculate row positions (without zoom - we'll apply zoom in rendering)
        this.rowPositions = [dimensions.headerHeight];
        let currentY = dimensions.headerHeight;
        for (let row = 0; row < this.grid.getMaxRows(); row++) {
            currentY += this.grid.getRowHeight(row);
            this.rowPositions.push(currentY);
        }
    }
    
    /**
     * Gets the X position of a column
     * @param {number} col The column index
     * @returns {number} The X position of the column
     */
    private getColumnPosition(col: number): number {
        if (col < 0 || col >= this.columnPositions.length - 1) {
            // If column is out of range, recalculate positions
            this.calculatePositions();
        }
        return this.columnPositions[col] || 0;
    }
    
    /**
     * Gets the Y position of a row
     * @param {number} row The row index
     * @returns {number} The Y position of the row
     */
    private getRowPosition(row: number): number {
        if (row < 0 || row >= this.rowPositions.length - 1) {
            // If row is out of range, recalculate positions
            this.calculatePositions();
        }
        return this.rowPositions[row] || 0;
    }

    /**
     * Sets the scrollbar manager
     * @param {ScrollbarManager} scrollbarManager The scrollbar manager to set
     */
    public setScrollbarManager(scrollbarManager: ScrollbarManager): void {
        this.scrollbarManager = scrollbarManager;
        this.updateScrollbars();
    }

    /**
     * Updates the scrollbars
     */
    private updateScrollbars(): void {
        if (!this.scrollbarManager) return;
        
        const contentWidth = this.calculateTotalContentWidth();
        const contentHeight = this.calculateTotalContentHeight();
        
        // Ensure scroll position is valid for the new zoom level
        if (this.scrollX > contentWidth - this.viewport.width) {
            this.scrollX = Math.max(0, contentWidth - this.viewport.width);
        }
        
        if (this.scrollY > contentHeight - this.viewport.height) {
            this.scrollY = Math.max(0, contentHeight - this.viewport.height);
        }
        
        this.scrollbarManager.updateScrollbars(
            this.viewport.width,
            this.viewport.height,
            contentWidth,
            contentHeight
        );
    }

    /**
     * Sets the event handler
     * @param {EventHandler} eventHandler The event handler to set
     */
    public setEventHandler(eventHandler: EventHandler): void {
        this.eventHandler = eventHandler;
    }

    /**
     * Sets the scroll position
     * @param {number} scrollX The scroll position in the X direction
     * @param {number} scrollY The scroll position in the Y direction
     */
    public setScroll(scrollX: number, scrollY: number): void {
        this.scrollX = scrollX;
        this.scrollY = scrollY;
        
        // Notify event handler about scroll
        if (this.eventHandler) {
            this.eventHandler.handleScroll();
        }
    }

    /**
     * Handles the scroll event
     * @param {number} scrollX The scroll position in the X direction
     * @param {number} scrollY The scroll position in the Y direction
     */
    public handleScroll(scrollX: number, scrollY: number): void {
        this.scrollX = scrollX;
        this.scrollY = scrollY;
        this.render();
        
        // Notify event handler about scroll
        if (this.eventHandler) {
            this.eventHandler.handleScroll();
        }
    }

    /**
     * Sets up the canvas
     */
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

    /**
     * Calculates the viewport
     */
    private calculateViewport(): void {
        const rect = this.canvas.getBoundingClientRect();
        this.viewport = {
            x: 0,
            y: 0,
            width: rect.width,
            height: rect.height
        };
    }

    /**
     * Renders the grid
     */
    public render(): void {
        this.clearCanvas();
        // Recalculate positions whenever rendering
        this.calculatePositions();
        
        // Apply the zoom transform and render the content
        this.renderContent();
        
        // Render headers on top of content (without zoom)
        this.renderHeaders();
    }

    /**
     * Renders the main content area (cells, grid lines, selection) with zoom applied
     */
    private renderContent(): void {
        const dimensions = this.grid.getDimensions();
        
        // Save the original context state
        this.ctx.save();
        
        // Clear the content area (not the headers)
        this.ctx.clearRect(
            dimensions.headerWidth, 
            dimensions.headerHeight, 
            this.viewport.width - dimensions.headerWidth, 
            this.viewport.height - dimensions.headerHeight
        );
        
        // Fill the content area with white background to ensure it takes full space
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(
            dimensions.headerWidth, 
            dimensions.headerHeight, 
            this.viewport.width - dimensions.headerWidth, 
            this.viewport.height - dimensions.headerHeight
        );
        
        // Clip to content area
        this.ctx.beginPath();
        this.ctx.rect(
            dimensions.headerWidth,
            dimensions.headerHeight,
            this.viewport.width - dimensions.headerWidth,
            this.viewport.height - dimensions.headerHeight
        );
        this.ctx.clip();
        
        // Apply zoom transform to content area only
        this.ctx.translate(dimensions.headerWidth, dimensions.headerHeight);
        this.ctx.scale(this.zoomFactor, this.zoomFactor);
        this.ctx.translate(-dimensions.headerWidth, -dimensions.headerHeight);
        
        // Now render all content
        this.renderRowColumnHighlight();
        this.renderCells(this.getVisibleRowRange().startRow, this.getVisibleRowRange().endRow, 
                      this.getVisibleColumnRange().startCol, this.getVisibleColumnRange().endCol);
        this.renderGridLines();
        this.renderSelection();
        
        // Restore the original context state
        this.ctx.restore();
    }
    
    /**
     * Renders all headers (column headers, row headers, corner)
     */
    private renderHeaders(): void {
        const visibleRows = this.getVisibleRowRange();
        const visibleCols = this.getVisibleColumnRange();
        
        // Render header components
        this.renderColumnHeaders(visibleCols.startCol, visibleCols.endCol);
        this.renderRowHeaders(visibleRows.startRow, visibleRows.endRow);
        this.renderHeaderCorner();
    }

    /**
     * Renders the row headers
     * @param {number} startRow The starting row index
     * @param {number} endRow The ending row index
     */
    private renderRowHeaders(startRow: number, endRow: number): void {
        const dimensions = this.grid.getDimensions();
        
        // Create a clip region for row headers to prevent overflow
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(0, dimensions.headerHeight, dimensions.headerWidth, this.viewport.height - dimensions.headerHeight);
        this.ctx.clip();
        
        // Fill row headers background with Excel-like color
        this.ctx.fillStyle = '#f0f2f5';
        this.ctx.fillRect(0, dimensions.headerHeight, dimensions.headerWidth, this.viewport.height);
        
        // Draw headers
        this.ctx.fillStyle = '#666666'; // Excel uses dark gray text for headers
        this.ctx.font = '14px Calibri'; // Excel uses Calibri font
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Draw horizontal grid lines in row headers
        this.ctx.strokeStyle = '#d4d4d4';
        this.ctx.lineWidth = 0.5;
        
        for (let row = startRow; row < endRow; row++) {
            const rowHeight = this.grid.getRowHeight(row) * this.zoomFactor;
            // Calculate position with zoom factor applied to match cell positioning
            const yPos = this.getRowPositionForHeader(row);
            
            if (yPos > this.viewport.height) break;
            if (yPos + rowHeight < dimensions.headerHeight) continue;
            
            const rowObj = this.grid.getRow(row);
            if (rowObj?.isSelected) {
                // Excel uses a specific blue for selected headers
                this.ctx.fillStyle = '#e3e9ff';
                this.ctx.fillRect(0, yPos, dimensions.headerWidth, rowHeight);
                this.ctx.fillStyle = '#217346'; // Excel uses green for selection text
            } else {
                this.ctx.fillStyle = '#666666';
            }
            
            this.ctx.fillText(String(row + 1), dimensions.headerWidth / 2, yPos + rowHeight / 2);
            
            // Draw horizontal line at the bottom of each row header
            this.ctx.strokeStyle = '#d4d4d4';
            this.ctx.lineWidth = 0.5;
            this.ctx.beginPath();
            this.ctx.moveTo(0, yPos + rowHeight);
            this.ctx.lineTo(dimensions.headerWidth, yPos + rowHeight);
            this.ctx.stroke();
        }
        
        // Draw right border for row headers
        this.ctx.strokeStyle = '#d4d4d4';
        this.ctx.lineWidth = 0.5;
        this.ctx.beginPath();
        this.ctx.moveTo(dimensions.headerWidth, dimensions.headerHeight);
        this.ctx.lineTo(dimensions.headerWidth, this.viewport.height);
        this.ctx.stroke();
        
        this.ctx.restore();
    }

    /**
     * Renders the column headers
     * @param {number} startCol The starting column index
     * @param {number} endCol The ending column index
     */
    private renderColumnHeaders(startCol: number, endCol: number): void {
        const dimensions = this.grid.getDimensions();
        
        // Create a clip region for column headers to prevent overflow
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(dimensions.headerWidth, 0, this.viewport.width - dimensions.headerWidth, dimensions.headerHeight);
        this.ctx.clip();
        
        // Fill column headers background with Excel-like color
        this.ctx.fillStyle = '#f0f2f5';
        this.ctx.fillRect(dimensions.headerWidth, 0, this.viewport.width, dimensions.headerHeight);
        
        // Draw headers
        this.ctx.fillStyle = '#666666'; // Excel uses dark gray text for headers
        this.ctx.font = '14px Calibri'; // Excel uses Calibri font
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Draw vertical grid lines in column headers
        this.ctx.strokeStyle = '#d4d4d4';
        this.ctx.lineWidth = 0.5;
        
        for (let col = startCol; col < endCol; col++) {
            const colWidth = this.grid.getColumnWidth(col) * this.zoomFactor;
            // Calculate position with zoom factor applied to match cell positioning
            const xPos = this.getColumnPositionForHeader(col);
            
            if (xPos > this.viewport.width) break;
            if (xPos + colWidth < dimensions.headerWidth) continue;
            
            const colObj = this.grid.getColumn(col);
            if (colObj?.isSelected) {
                // Excel uses a specific blue for selected headers
                this.ctx.fillStyle = '#e3e9ff';
                this.ctx.fillRect(xPos, 0, colWidth, dimensions.headerHeight);
                this.ctx.fillStyle = '#217346'; // Excel uses green for selection text
            } else {
                this.ctx.fillStyle = '#666666';
            }
            
            this.ctx.fillText(colObj.header, xPos + colWidth / 2, dimensions.headerHeight / 2);
            
            // Draw vertical line at the right edge of each column header
            this.ctx.strokeStyle = '#d4d4d4';
            this.ctx.lineWidth = 0.5;
            this.ctx.beginPath();
            this.ctx.moveTo(xPos + colWidth, 0);
            this.ctx.lineTo(xPos + colWidth, dimensions.headerHeight);
            this.ctx.stroke();
        }
        
        // Draw bottom border for column headers
        this.ctx.strokeStyle = '#d4d4d4';
        this.ctx.lineWidth = 0.5;
        this.ctx.beginPath();
        this.ctx.moveTo(dimensions.headerWidth, dimensions.headerHeight);
        this.ctx.lineTo(this.viewport.width, dimensions.headerHeight);
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    /**
     * Gets the column position for header rendering, accounting for zoom factor
     * @param {number} col The column index
     * @returns {number} The x position adjusted for zoom and scroll
     */
    private getColumnPositionForHeader(col: number): number {
        const dimensions = this.grid.getDimensions();
        let xPos = dimensions.headerWidth;
        
        // Add widths of all columns before the target column, applying zoom
        for (let i = 0; i < col; i++) {
            xPos += this.grid.getColumnWidth(i) * this.zoomFactor;
        }
        
        // Adjust for scroll position
        return xPos - (this.scrollX * this.zoomFactor);
    }
    
    /**
     * Gets the row position for header rendering, accounting for zoom factor
     * @param {number} row The row index
     * @returns {number} The y position adjusted for zoom and scroll
     */
    private getRowPositionForHeader(row: number): number {
        const dimensions = this.grid.getDimensions();
        let yPos = dimensions.headerHeight;
        
        // Add heights of all rows before the target row, applying zoom
        for (let i = 0; i < row; i++) {
            yPos += this.grid.getRowHeight(i) * this.zoomFactor;
        }
        
        // Adjust for scroll position
        return yPos - (this.scrollY * this.zoomFactor);
    }

    /**
     * Clears the canvas
     */
    private clearCanvas(): void {
        this.ctx.clearRect(0, 0, this.viewport.width, this.viewport.height);
    }

    /**
     * Gets the visible row range
     * @returns {Object} The start and end row indices
     */
    private getVisibleRowRange(): { startRow: number, endRow: number } {
        const dimensions = this.grid.getDimensions();
        let startRow = 0;
        let endRow = this.grid.getMaxRows();
        
        // Adjust for zoom factor when determining visible range
        const effectiveViewportHeight = dimensions.headerHeight + 
            (this.viewport.height - dimensions.headerHeight) / this.zoomFactor;
        
        for (let row = 0; row < this.rowPositions.length - 1; row++) {
            if (this.rowPositions[row] - this.scrollY > dimensions.headerHeight + 20) {
                startRow = Math.max(0, row - 1);
                break;
            }
        }
        
        for (let row = startRow; row < this.rowPositions.length - 1; row++) {
            if (this.rowPositions[row] - this.scrollY > effectiveViewportHeight) {
                endRow = row + 1;
                break;
            }
        }
        
        return { startRow, endRow };
    }

    /**
     * Gets the visible column range
     * @returns {Object} The start and end column indices
     */
    private getVisibleColumnRange(): { startCol: number, endCol: number } {
        const dimensions = this.grid.getDimensions();
        let startCol = 0;
        let endCol = this.grid.getMaxCols();
        
        // Adjust for zoom factor when determining visible range
        const effectiveViewportWidth = dimensions.headerWidth + 
            (this.viewport.width - dimensions.headerWidth) / this.zoomFactor;
        
        for (let col = 0; col < this.columnPositions.length - 1; col++) {
            if (this.columnPositions[col] - this.scrollX > dimensions.headerWidth + 20) {
                startCol = Math.max(0, col - 1);
                break;
            }
        }
        
        for (let col = startCol; col < this.columnPositions.length - 1; col++) {
            if (this.columnPositions[col] - this.scrollX > effectiveViewportWidth) {
                endCol = col + 1;
                break;
            }
        }
        
        return { startCol, endCol };
    }

    /**
     * Renders the top-left corner of the grid that contains the header intersection
     */
    private renderHeaderCorner(): void {
        const dimensions = this.grid.getDimensions();
        
        // Fill with Excel-like header background color
        this.ctx.fillStyle = '#f0f2f5';
        this.ctx.fillRect(0, 0, dimensions.headerWidth, dimensions.headerHeight);
        
        // Draw border lines - Excel uses very subtle borders
        this.ctx.strokeStyle = '#d4d4d4';
        this.ctx.lineWidth = 0.5;
        
        // Bottom border
        this.ctx.beginPath();
        this.ctx.moveTo(0, dimensions.headerHeight);
        this.ctx.lineTo(dimensions.headerWidth, dimensions.headerHeight);
        this.ctx.stroke();
        
        // Right border
        this.ctx.beginPath();
        this.ctx.moveTo(dimensions.headerWidth, 0);
        this.ctx.lineTo(dimensions.headerWidth, dimensions.headerHeight);
        this.ctx.stroke();
        
        // Add a diagonal line as seen in Excel's corner cell
        this.ctx.strokeStyle = '#d4d4d4';
        this.ctx.lineWidth = 0.5;
        
        // Diagonal line from bottom-left to top-right
        this.ctx.beginPath();
        this.ctx.moveTo(dimensions.headerWidth - 10, dimensions.headerHeight);
        this.ctx.lineTo(dimensions.headerWidth, dimensions.headerHeight - 10);
        this.ctx.stroke();
    }

    /**
     * Renders the cells
     * @param {number} startRow The starting row index
     * @param {number} endRow The ending row index
     * @param {number} startCol The starting column index
     * @param {number} endCol The ending column index
     */
    private renderCells(startRow: number, endRow: number, startCol: number, endCol: number): void {
        const dimensions = this.grid.getDimensions();
        const selection = this.grid.getSelection();
        
        // Create a clip region to prevent cells from drawing over headers
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(
            dimensions.headerWidth, 
            dimensions.headerHeight, 
            this.viewport.width - dimensions.headerWidth, 
            this.viewport.height - dimensions.headerHeight
        );
        this.ctx.clip();
        
        // Set text rendering defaults (Excel uses Calibri 11pt)
        this.ctx.font = '14px Calibri';
        this.ctx.textAlign = 'left'; // Excel aligns text to the left by default
        this.ctx.textBaseline = 'middle';
        
        // Now render all cells
        for (let row = startRow; row < endRow; row++) {
            if(row == 0){
                this.ctx.font = '14px Calibri'; // Excel doesn't bold the first row
            }
            else{
                this.ctx.font = '14px Calibri';
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
                
                // Render cell background (Excel uses white for regular cells)
                this.ctx.fillStyle = cell.style.backgroundColor || '#ffffff';
                this.ctx.fillRect(xPos, yPos, colWidth, rowHeight);
                
                // Render cell text
                if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
                    // Check if cell is part of the selection
                    const isSelected = selection.isActive && 
                        selection.contains(row, col);
                    
                    // Use normal color for text even in selected cells - maintains readability
                    this.ctx.fillStyle = cell.style.textColor || '#000000';
                    
                    const displayValue = cell.getDisplayValue();
                    
                    // Clip text to cell boundaries
                    this.ctx.save();
                    this.ctx.beginPath();
                    this.ctx.rect(xPos + 2, yPos, colWidth - 4, rowHeight);
                    this.ctx.clip();
                    
                    // Excel has padding on the left side of cells (about 6px)
                    this.ctx.fillText(displayValue, xPos + 6, yPos + rowHeight / 2);
                    this.ctx.restore();
                }
            }
        }
        
        // Restore the context
        this.ctx.restore();
    }

    /**
     * Renders the grid lines
     */
    private renderGridLines(): void {
        const dimensions = this.grid.getDimensions();
        
        // Create a clip region to prevent grid lines from drawing over headers
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(
            dimensions.headerWidth, 
            dimensions.headerHeight, 
            this.viewport.width - dimensions.headerWidth, 
            this.viewport.height - dimensions.headerHeight
        );
        this.ctx.clip();
        
        // Excel has very light grid lines
        this.ctx.strokeStyle = '#e6e6e6';
        this.ctx.lineWidth = 1;
        
        // Vertical grid lines
        for (let col = 0; col < this.grid.getMaxCols(); col++) {
            const xPos = this.getColumnPosition(col) - this.scrollX;
            
            if (xPos < dimensions.headerWidth) continue;
            if (xPos > this.viewport.width) break;
            
            this.ctx.beginPath();
            this.ctx.moveTo(xPos, dimensions.headerHeight);
            this.ctx.lineTo(xPos, this.viewport.height);
            this.ctx.stroke();
        }
        
        // Horizontal grid lines
        for (let row = 0; row < this.grid.getMaxRows(); row++) {
            const yPos = this.getRowPosition(row) - this.scrollY;
            
            if (yPos < dimensions.headerHeight) continue;
            if (yPos > this.viewport.height) break;
            
            this.ctx.beginPath();
            this.ctx.moveTo(dimensions.headerWidth, yPos);
            this.ctx.lineTo(this.viewport.width, yPos);
            this.ctx.stroke();
        }
        
        // Restore the context
        this.ctx.restore();
    }

    /**
     * Renders the selection
     */
    private renderSelection(): void {
        const selection = this.grid.getSelection();
        if (!selection.isActive) return;
        
        const dimensions = this.grid.getDimensions();
        
        // Create a clip region to prevent selection from drawing over headers
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(
            dimensions.headerWidth, 
            dimensions.headerHeight, 
            this.viewport.width - dimensions.headerWidth, 
            this.viewport.height - dimensions.headerHeight
        );
        this.ctx.clip();
        
        const minRow = Math.min(selection.startRow, selection.endRow);
        const maxRow = Math.max(selection.startRow, selection.endRow);
        const minCol = Math.min(selection.startCol, selection.endCol);
        const maxCol = Math.max(selection.startCol, selection.endCol);
        
        // Calculate positions
        const startX = this.getColumnPosition(minCol) - this.scrollX;
        const startY = this.getRowPosition(minRow) - this.scrollY;
        
        let endX = this.getColumnPosition(maxCol + 1) - this.scrollX;
        let endY = this.getRowPosition(maxRow + 1) - this.scrollY;
        
        // Make sure we don't try to render outside the viewport
        if (startX > this.viewport.width || startY > this.viewport.height) {
            this.ctx.restore();
            return;
        }
        
        // Calculate width and height
        const width = endX - startX;
        const height = endY - startY;
        
        // Draw selection highlight (Excel uses a very light blue)
        // Using a more transparent blue so text remains readable
        this.ctx.fillStyle = 'rgba(232, 242, 236, 0.2)';
        this.ctx.fillRect(startX, startY, width, height);
        
        // Draw selection border (Excel uses a specific green for the border)
        this.ctx.strokeStyle = '#217346';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(startX, startY, width, height);
        
        // Restore the context
        this.ctx.restore();
    }

    /**
     * Gets the scroll position
     * @returns {number} The scroll position in the X direction
     * @returns {number} The scroll position in the Y direction
     */
    public getScrollPosition(): { x: number; y: number } {
        return { x: this.scrollX, y: this.scrollY };
    }

    /**
     * Gets the cell at a given position, accounting for zoom
     * @param {number} x The X position
     * @param {number} y The Y position
     * @returns {Object} An object containing the row and column index of the cell
     */
    public getCellAtPosition(x: number, y: number): { row: number; col: number } | null {
        const dimensions = this.grid.getDimensions();
        
        // Check if click is in headers area
        if (x < dimensions.headerWidth || y < dimensions.headerHeight) {
            return null;
        }
        
        // Adjust coordinates for zoom factor - only in content area
        const contentX = dimensions.headerWidth + (x - dimensions.headerWidth) / this.zoomFactor;
        const contentY = dimensions.headerHeight + (y - dimensions.headerHeight) / this.zoomFactor;
        
        // Find column using adjusted coordinates
        let col = -1;
        for (let i = 0; i < this.columnPositions.length - 1; i++) {
            const colStart = this.columnPositions[i] - this.scrollX;
            const colEnd = this.columnPositions[i + 1] - this.scrollX;
            
            if (contentX >= colStart && contentX < colEnd) {
                col = i;
                break;
            }
        }
        
        // Find row using adjusted coordinates
        let row = -1;
        for (let i = 0; i < this.rowPositions.length - 1; i++) {
            const rowStart = this.rowPositions[i] - this.scrollY;
            const rowEnd = this.rowPositions[i + 1] - this.scrollY;
            
            if (contentY >= rowStart && contentY < rowEnd) {
                row = i;
                break;
            }
        }
        
        if (col >= 0 && row >= 0) {
            return { row, col };
        }
        
        return null;
    }

    /**
     * Resizes the canvas
     */
    public resize(): void {
        this.setupCanvas();
        this.calculatePositions();
        this.updateScrollbars();
        this.render();
    }

    /**
     * Handles the window resize event
     */
    public handleWindowResize(): void {
        this.setupCanvas();
        this.calculatePositions();
        this.updateScrollbars();
        this.render();
    }

    /**
     * Calculates the total content width accounting for zoom
     * @returns {number} The total content width
     */
    private calculateTotalContentWidth(): number {
        // Use the last column position as the total width, adjusted for zoom
        if (this.columnPositions.length > 0) {
            const totalGridWidth = this.columnPositions[this.columnPositions.length - 1];
            const zoomedWidth = totalGridWidth * this.zoomFactor;
            
            // Ensure content is at least as wide as the viewport
            return Math.max(zoomedWidth, this.viewport.width);
        }
        
        // Fallback calculation
        const dimensions = this.grid.getDimensions();
        let totalWidth = dimensions.headerWidth;
        
        for (let col = 0; col < this.grid.getMaxCols(); col++) {
            totalWidth += this.grid.getColumnWidth(col) * this.zoomFactor;
        }
        
        // Ensure content is at least as wide as the viewport
        return Math.max(totalWidth, this.viewport.width);
    }

    /**
     * Calculates the total content height accounting for zoom
     * @returns {number} The total content height
     */
    private calculateTotalContentHeight(): number {
        // Use the last row position as the total height, adjusted for zoom
        if (this.rowPositions.length > 0) {
            const totalGridHeight = this.rowPositions[this.rowPositions.length - 1];
            const zoomedHeight = totalGridHeight * this.zoomFactor;
            
            // Ensure content is at least as high as the viewport
            return Math.max(zoomedHeight, this.viewport.height);
        }
        
        // Fallback calculation
        const dimensions = this.grid.getDimensions();
        let totalHeight = dimensions.headerHeight;
        
        for (let row = 0; row < this.grid.getMaxRows(); row++) {
            totalHeight += this.grid.getRowHeight(row) * this.zoomFactor;
        }
        
        // Ensure content is at least as high as the viewport
        return Math.max(totalHeight, this.viewport.height);
    }

    /**
     * Renders highlighting for the row and column of the active cell
     */
    private renderRowColumnHighlight(): void {
        const selection = this.grid.getSelection();
        if (!selection.isActive) return;
        
        const dimensions = this.grid.getDimensions();
        
        // Save context
        this.ctx.save();
        
        // Create a clip region for the content area
        this.ctx.beginPath();
        this.ctx.rect(
            dimensions.headerWidth,
            dimensions.headerHeight,
            this.viewport.width - dimensions.headerWidth,
            this.viewport.height - dimensions.headerHeight
        );
        this.ctx.clip();
        
        // Get the active cell's position
        const activeRow = selection.startRow;
        const activeCol = selection.startCol;
        
        // Highlight active row
        const rowYPos = this.getRowPosition(activeRow) - this.scrollY;
        const rowHeight = this.grid.getRowHeight(activeRow);
        
        // Check if the row is visible
        if (rowYPos + rowHeight >= dimensions.headerHeight && rowYPos <= this.viewport.height) {
            this.ctx.fillStyle = 'rgba(217, 226, 243, 0.7)'; // Excel's row highlight color
            this.ctx.fillRect(
                dimensions.headerWidth,
                rowYPos,
                this.viewport.width - dimensions.headerWidth,
                rowHeight
            );
        }
        
        // Highlight active column
        const colXPos = this.getColumnPosition(activeCol) - this.scrollX;
        const colWidth = this.grid.getColumnWidth(activeCol);
        
        // Check if the column is visible
        if (colXPos + colWidth >= dimensions.headerWidth && colXPos <= this.viewport.width) {
            this.ctx.fillStyle = 'rgba(217, 226, 243, 0.7)'; // Excel's column highlight color
            this.ctx.fillRect(
                colXPos,
                dimensions.headerHeight,
                colWidth,
                this.viewport.height - dimensions.headerHeight
            );
        }
        
        // Restore context
        this.ctx.restore();
        
        // Also highlight the corresponding headers
        this.highlightActiveHeaders(activeRow, activeCol);
    }
    
    /**
     * Highlights the headers for the active row and column
     * @param {number} activeRow The active row index
     * @param {number} activeCol The active column index
     */
    private highlightActiveHeaders(activeRow: number, activeCol: number): void {
        const dimensions = this.grid.getDimensions();
        
        // Highlight row header
        const rowYPos = this.getRowPosition(activeRow) - this.scrollY;
        const rowHeight = this.grid.getRowHeight(activeRow);
        
        if (rowYPos + rowHeight >= dimensions.headerHeight && rowYPos <= this.viewport.height) {
            this.ctx.fillStyle = 'rgba(217, 226, 243, 0.9)'; // Slightly darker for headers
            this.ctx.fillRect(0, rowYPos, dimensions.headerWidth, rowHeight);
        }
        
        // Highlight column header
        const colXPos = this.getColumnPosition(activeCol) - this.scrollX;
        const colWidth = this.grid.getColumnWidth(activeCol);
        
        if (colXPos + colWidth >= dimensions.headerWidth && colXPos <= this.viewport.width) {
            this.ctx.fillStyle = 'rgba(217, 226, 243, 0.9)'; // Slightly darker for headers
            this.ctx.fillRect(colXPos, 0, colWidth, dimensions.headerHeight);
        }
    }

    /**
     * Sets the zoom factor
     * @param {number} zoom The zoom factor to set
     */
    public setZoom(zoom: number): void {
        // Clamp zoom value between min and max
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
        
        // If zoom hasn't changed, do nothing
        if (newZoom === this.zoomFactor) return;
        
        // Calculate current center position in grid coordinates
        const centerX = this.scrollX + this.viewport.width / 2 / this.zoomFactor;
        const centerY = this.scrollY + this.viewport.height / 2 / this.zoomFactor;
        
        // Set new zoom factor
        this.zoomFactor = newZoom;
        
        // Recalculate scroll position to maintain the same center point
        this.scrollX = centerX - this.viewport.width / 2 / this.zoomFactor;
        this.scrollY = centerY - this.viewport.height / 2 / this.zoomFactor;
        
        // Ensure scroll positions don't go negative
        this.scrollX = Math.max(0, this.scrollX);
        this.scrollY = Math.max(0, this.scrollY);
        
        // Recalculate positions with new zoom factor
        this.calculatePositions();
        
        // Update scrollbars and render
        this.updateScrollbars();
        this.render();
        
        // Notify event handler about zoom change
        if (this.eventHandler) {
            this.eventHandler.handleScroll();
        }
    }
    
    /**
     * Increases the zoom factor
     */
    public zoomIn(): void {
        this.setZoom(this.zoomFactor * 1.2); // Increase by 20%
    }
    
    /**
     * Decreases the zoom factor
     */
    public zoomOut(): void {
        this.setZoom(this.zoomFactor / 1.2); // Decrease by 20%
    }
    
    /**
     * Gets the current zoom factor
     * @returns {number} The current zoom factor
     */
    public getZoom(): number {
        return this.zoomFactor;
    }

    /**
     * Handles mouse wheel events for zooming
     * @param {WheelEvent} event The wheel event
     * @param {boolean} isCtrlPressed Whether the Ctrl key is pressed
     * @returns {boolean} Whether the event was handled
     */
    public handleWheel(event: WheelEvent, isCtrlPressed: boolean): boolean {
        // Only handle zoom with Ctrl key pressed
        if (isCtrlPressed) {
            // Prevent default to avoid page scrolling
            event.preventDefault();
            
            // Determine zoom direction based on wheel delta
            const delta = -Math.sign(event.deltaY);
            
            if (delta > 0) {
                this.zoomIn();
            } else if (delta < 0) {
                this.zoomOut();
            }
            
            return true;
        }
        
        return false;
    }
}