// src/core/Renderer.ts
import { Grid } from "./Grid.js";
import { IRect } from "../types/interfaces.js";
import { ScrollbarManager } from "./ScrollbarManager.js";
import { EventHandler } from "./EventHandler.js";

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
    public viewport: IRect = { x: 0, y: 0, width: 0, height: 0 };
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

    public dottedLineAcrossSelection: boolean = false;

    /**
     * Bounds of the copied selection for animation
     */
    private copiedSelectionBounds: {
        minCol: number;
        maxCol: number;
        minRow: number;
        maxRow: number;
    } | null = null;

    /**
     * Animation frame ID for marching ants
     */
    private marchingAntsAnimationId: number | null = null;

    /**
     * Animation offset for marching ants effect
     */
    private marchingAntsOffset: number = 0;

    /**
     * Origin cell for dual selection (formula cell + range)
     */
    private originCell: { row: number; col: number } | null = null;

    /**
     * Flag to indicate if current selection is a formula range selection
     */
    private isFormulaRangeSelection: boolean = false;

    public hoverRowHeader: number | null = null;
    public hoverColumnHeader: number | null = null;

    /**
     * Constructor for the Renderer class
     * @param {HTMLCanvasElement} canvas The canvas element to render the grid on
     * @param {Grid} grid The grid to render
     */
    constructor(canvas: HTMLCanvasElement, grid: Grid) {
        this.canvas = canvas;
        this.grid = grid;
        this.devicePixelRatio = window.devicePixelRatio || 1;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw new Error("Could not get 2d context from canvas");
        }
        this.ctx = ctx;

        this.calculateAndSetRowHeaderWidth();
        this.setupCanvas();
        this.calculateViewport();
        this.calculatePositions();
    }

    /**
     * Calculates and caches the positions of all rows and columns
     */
    private calculatePositions(): void {
        const dimensions = this.grid.getDimensions();

        this.columnPositions = [dimensions.headerWidth];
        let currentX = dimensions.headerWidth;

        for (let col = 0; col < this.grid.getCurrentCols(); col++) {
            currentX += this.grid.getColumnWidth(col);
            this.columnPositions.push(currentX);
        }

        this.rowPositions = [dimensions.headerHeight];
        let currentY = dimensions.headerHeight;
        for (let row = 0; row < this.grid.getCurrentRows(); row++) {
            currentY += this.grid.getRowHeight(row);
            this.rowPositions.push(currentY);
        }
    }

    /**
     * Updates the device pixel ratio
     */
    public updateDevicePixelRatio(): void {
        // Store the current zoom factor
        const currentZoom = this.zoomFactor;

        // Update device pixel ratio from the window
        this.devicePixelRatio = window.devicePixelRatio || 1;

        // This will trigger setupCanvas and re-render with the new DPR
        this.handleWindowResize();

        // Ensure zoom factor is preserved after resize
        if (currentZoom !== 1.0) {
            this.setZoom(currentZoom);
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

        // Adjust viewport size to account for scrollbar width (typically 16px)
        const scrollbarWidth = 16;
        this.scrollbarManager.updateScrollbars(
            this.viewport.width - scrollbarWidth,
            this.viewport.height - scrollbarWidth,
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

        // Check if we need to dynamically add more rows or columns
        this.checkAndExpandGrid();

        this.render();

        // Notify event handler about scroll
        if (this.eventHandler) {
            this.eventHandler.handleScroll();
        }
    }

    /**
     * Checks if the user is scrolling near the end of the grid and adds more rows/columns if needed
     */
    private checkAndExpandGrid(): void {
        const { endRow } = this.getVisibleRowRange();
        const { endCol } = this.getVisibleColumnRange();

        // Get total rows and columns
        const currentRows = this.grid.getCurrentRows();
        const currentCols = this.grid.getCurrentCols();

        const maxRows = this.grid.getMaxRows();
        const maxCols = this.grid.getMaxCols();

        // Define a threshold - how close to the end before we add more
        // For example, if the user is within 20% of the end
        const rowThreshold = Math.floor(currentRows * 0.8);
        const colThreshold = Math.floor(currentCols * 0.8);

        // Check if we're approaching the end of rows
        if (endRow >= rowThreshold && currentRows < maxRows) {
            // Add more rows - typically in chunks, e.g., 50 at a time
            const rowsToAdd = Math.min(50, maxRows - currentRows);

            if (this.grid.expandRows(rowsToAdd)) {
                // Recalculate positions since we've added rows
                this.calculatePositions();
                // Update scrollbars
                this.updateScrollbars();
                console.log(
                    `Added ${rowsToAdd} more rows. Now at ${this.grid.getCurrentRows()} rows.`
                );
            }
        }

        // Check if we're approaching the end of columns
        if (endCol >= colThreshold && currentCols < maxCols) {
            // Add more columns - typically in chunks, e.g., 10 at a time
            const colsToAdd = Math.min(10, maxCols - currentCols);

            if (this.grid.expandColumns(colsToAdd)) {
                // Recalculate positions since we've added columns
                this.calculatePositions();
                // Update scrollbars
                this.updateScrollbars();
                console.log(
                    `Added ${colsToAdd} more columns. Now at ${this.grid.getCurrentCols()} columns.`
                );
            }
        }
    }

    /**
     * Sets up the canvas
     */
    private setupCanvas(): void {
        const container = this.canvas.parentElement;
        if (!container) return;

        // Get the full container size without subtracting scrollbar space
        const containerRect = container.getBoundingClientRect();
        const width = containerRect.width;
        const height = containerRect.height;

        // Get the actual device pixel ratio
        this.devicePixelRatio = window.devicePixelRatio || 1;

        this.canvas.width = width * this.devicePixelRatio;
        this.canvas.height = height * this.devicePixelRatio;

        // Reset the transform matrix before scaling to prevent cumulative scaling
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio);

        // Set display size (css pixels) to fill container completely
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";

        // Ensure the canvas position is fixed to take full viewport
        this.canvas.style.position = "absolute";
        this.canvas.style.top = "0";
        this.canvas.style.left = "0";
        this.canvas.style.right = "0";
        this.canvas.style.bottom = "0";

        // Update viewport
        this.viewport = {
            x: 0,
            y: 0,
            width: width,
            height: height,
        };

        console.log(
            `Canvas setup: width=${width}, height=${height}, DPR=${this.devicePixelRatio}, Zoom=${this.zoomFactor}`
        );
        this.calculateAndSetRowHeaderWidth();
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
            height: rect.height,
        };
    }

    /**
     * Renders the grid
     */
    public render(): void {
        this.clearCanvas();

        // Recalculate positions whenever rendering
        this.calculatePositions();
        this.checkForGridExpansionNeeds();

        this.renderHeaders();
        this.renderContent();
        this.calculateAndSetRowHeaderWidth();
    }

    /**
     * Checks if we need to expand the grid based on the current view
     * This combines the logic from checkAndExpandGrid and checkAndExpandGridOnZoom
     */
    private checkForGridExpansionNeeds(): void {
        // Get the visible range at the current zoom level
        const { endRow } = this.getVisibleRowRange();
        const { endCol } = this.getVisibleColumnRange();

        // Get total rows and columns
        const currentRows = this.grid.getCurrentRows();
        const currentCols = this.grid.getCurrentCols();

        const maxRows = this.grid.getMaxRows();
        const maxCols = this.grid.getMaxCols();

        // Calculate thresholds based on zoom factor
        const zoomFactor = Math.max(0.1, this.zoomFactor); // Prevent division by zero

        // For very low zoom levels (0.5 or below), we need more aggressive expansion
        let thresholdMultiplier;
        if (zoomFactor <= 0.25) {
            // At very low zoom, expand when we're just 20-30% through the content
            thresholdMultiplier = 0.3;
        } else if (zoomFactor <= 0.5) {
            // At moderately low zoom, expand when we're about 30-50% through the content
            thresholdMultiplier = 0.5;
        } else {
            // At normal zoom, use the standard 80% threshold
            thresholdMultiplier = 0.8;
        }

        // Calculate actual thresholds
        const rowThreshold = Math.floor(currentRows * thresholdMultiplier);
        const colThreshold = Math.floor(currentCols * thresholdMultiplier);

        // The lower the zoom, the more rows/columns to add at once
        // This helps prevent constant small expansions at low zoom levels
        const rowMultiplier = Math.max(1, Math.ceil(1.5 / zoomFactor)); // More aggressive multiplier
        const colMultiplier = Math.max(1, Math.ceil(1.5 / zoomFactor));

        let needsUpdate = false;

        // Check if we're approaching the end of rows
        if (endRow >= rowThreshold && currentRows < maxRows) {
            // Add more rows based on zoom level
            const rowsToAdd = Math.min(
                100 * rowMultiplier,
                maxRows - currentRows
            );

            if (this.grid.expandRows(rowsToAdd)) {
                console.log(
                    `Added ${rowsToAdd} more rows. Now at ${this.grid.getCurrentRows()} rows. (Zoom: ${zoomFactor.toFixed(
                        2
                    )}, Threshold: ${rowThreshold})`
                );
                needsUpdate = true;
            }
        }

        // Check if we're approaching the end of columns
        if (endCol >= colThreshold && currentCols < maxCols) {
            // Add more columns based on zoom level
            const colsToAdd = Math.min(
                20 * colMultiplier,
                maxCols - currentCols
            );

            if (this.grid.expandColumns(colsToAdd)) {
                needsUpdate = true;
            }
        }

        // If we expanded the grid, recalculate positions
        if (needsUpdate) {
            this.calculatePositions();
            this.updateScrollbars();
        }
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
        this.ctx.fillStyle = "#ffffff";
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
        // First we translate to the corner of the content area
        this.ctx.translate(dimensions.headerWidth, dimensions.headerHeight);

        // Then apply zoom scaling - this needs to be sharp and clear
        // Use a technique to ensure pixel-perfect scaling
        const zoomX = Math.round(this.zoomFactor * 1000) / 1000; // Round to 3 decimal places for consistency
        const zoomY = Math.round(this.zoomFactor * 1000) / 1000;

        this.ctx.scale(zoomX, zoomY);

        // Translate back
        this.ctx.translate(-dimensions.headerWidth, -dimensions.headerHeight);

        // Enable image smoothing for text (for better readability when zoomed)
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = "high";

        // Restore context before rendering cells to ensure text isn't hidden
        this.ctx.restore();

        // Render cells after context restore, but passing the zoom factor for proper scaling
        this.renderCells(
            this.getVisibleRowRange().startRow,
            this.getVisibleRowRange().endRow,
            this.getVisibleColumnRange().startCol,
            this.getVisibleColumnRange().endCol
        );

        // Now render grid lines with a separate context that's not affected by zoom scaling
        this.renderGridLines();

        // Finally, render the selection
        this.renderSelection();

        // Render marching ants animation for copied cells
        this.renderMarchingAntsBorder();
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
        this.ctx.rect(
            0,
            dimensions.headerHeight,
            dimensions.headerWidth,
            this.viewport.height - dimensions.headerHeight
        );
        this.ctx.clip();

        // Fill row headers background with Excel-like color
        this.ctx.fillStyle = "#f0f2f5";
        this.ctx.fillRect(
            0,
            dimensions.headerHeight,
            dimensions.headerWidth,
            this.viewport.height
        );

        // Draw headers with font size based on zoom factor
        this.ctx.fillStyle = "#666666"; // Excel uses dark gray text for headers
        const headerFontSize = Math.max(14 * this.zoomFactor, 8); // Min size of 8px
        this.ctx.font = `${headerFontSize}px Calibri`; // Scale font with zoom
        this.ctx.textAlign = "right"; // Align text to the right
        this.ctx.textBaseline = "middle";

        // Enable text anti-aliasing for better readability
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = "high";

        // Draw horizontal grid lines in row headers
        this.ctx.strokeStyle = "#d4d4d4";
        this.ctx.lineWidth = 0.5 / this.devicePixelRatio; // Thin crisp lines

        for (let row = startRow; row < endRow; row++) {
            const rowHeight = this.grid.getRowHeight(row) * this.zoomFactor;
            // Calculate position with zoom factor applied to match cell positioning
            const yPos = this.getRowPositionForHeader(row);

            if (yPos > this.viewport.height) break;
            if (yPos + rowHeight < dimensions.headerHeight) continue;

            const rowObj = this.grid.getRow(row);
            // Skip rendering if row object is undefined
            if (!rowObj) continue;

            if (this.hoverRowHeader === row) {
                this.ctx.fillStyle = "#e0e3e7"; // Highlight hovered row header
                this.ctx.fillRect(0, yPos, dimensions.headerWidth, rowHeight);
                this.ctx.fillStyle = "#FFFFFF"; // White text for better contrast
            }

            if (rowObj.isSelected) {
                // Different styles for direct vs. indirect selection
                if (rowObj.isDirectlySelected) {
                    // Dark green for directly selected headers (when clicked)
                    this.ctx.fillStyle = "#0F703B";
                    this.ctx.fillRect(
                        0,
                        yPos,
                        dimensions.headerWidth,
                        rowHeight
                    );
                    this.ctx.fillStyle = "#FFFFFF"; // White text for better contrast
                } else {
                    // Light green for indirectly selected headers (via cell selection)
                    this.ctx.fillStyle = "#CAEAD8";
                    this.ctx.fillRect(
                        0,
                        yPos,
                        dimensions.headerWidth,
                        rowHeight
                    );
                    this.ctx.fillStyle = "#0F703B"; // Dark green text
                }
                const selectedHeaderFontSize = Math.max(
                    16 * this.zoomFactor,
                    9
                ); // Min size of 9px
                this.ctx.font = `${selectedHeaderFontSize}px Calibri`;
                // draw line at right of the selected row
                this.ctx.strokeStyle = "#0F703B";
                this.ctx.lineWidth = 5 / this.devicePixelRatio;
                this.ctx.beginPath();
                this.ctx.moveTo(dimensions.headerWidth, yPos);
                this.ctx.lineTo(dimensions.headerWidth, yPos + rowHeight);
                this.ctx.stroke();
            } else {
                this.ctx.fillStyle = "#666666";
                // Reapply the header font size for consistency
                this.ctx.font = `${headerFontSize}px Calibri`;
            }

            // Align text position to pixel boundaries for sharpness
            const textPixelRatio = this.devicePixelRatio;
            const textX =
                Math.round((dimensions.headerWidth - 8) * textPixelRatio) /
                textPixelRatio;
            const textY =
                Math.round((yPos + rowHeight / 2) * textPixelRatio) /
                textPixelRatio;

            // Adjust text position for right alignment with padding
            this.ctx.fillText(String(row + 1), textX, textY); // 8px padding from right

            // Draw horizontal line at the bottom of each row header
            this.ctx.strokeStyle = "#E0E0E0";
            this.ctx.lineWidth = 1 / this.devicePixelRatio;

            const lineY = Math.round(yPos + rowHeight) + 0.5;

            this.ctx.beginPath();
            this.ctx.moveTo(0, lineY);
            this.ctx.lineTo(dimensions.headerWidth, lineY);
            this.ctx.stroke();
        }

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
        this.ctx.rect(
            dimensions.headerWidth,
            0,
            this.viewport.width - dimensions.headerWidth,
            dimensions.headerHeight
        );
        this.ctx.clip();

        // Fill column headers background with Excel-like color
        this.ctx.fillStyle = "#f0f2f5";
        this.ctx.fillRect(
            dimensions.headerWidth,
            0,
            this.viewport.width,
            dimensions.headerHeight
        );

        // Draw headers with font size based on zoom factor
        this.ctx.fillStyle = "#666666"; // Excel uses dark gray text for headers
        const colHeaderFontSize = Math.max(14 * this.zoomFactor, 8); // Min size of 8px
        this.ctx.font = `${colHeaderFontSize}px Calibri`; // Scale font with zoom
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";

        // Enable text anti-aliasing for better readability
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = "high";

        // Draw vertical grid lines in column headers
        this.ctx.strokeStyle = "#d4d4d4";
        this.ctx.lineWidth = 1 / this.devicePixelRatio; // Thin crisp lines

        for (let col = startCol; col < endCol; col++) {
            const colWidth = this.grid.getColumnWidth(col) * this.zoomFactor;
            // Calculate position with zoom factor applied to match cell positioning
            const xPos = this.getColumnPositionForHeader(col);

            if (xPos > this.viewport.width) break;
            if (xPos + colWidth < dimensions.headerWidth) continue;

            const colObj = this.grid.getColumn(col);
            // Skip rendering if column object is undefined
            if (!colObj) continue;

            // Highlight hovered column header
            if (this.hoverColumnHeader === col) {
                this.ctx.fillStyle = "#e0e3e7"; // Highlight hovered column header
                this.ctx.fillRect(xPos, 0, colWidth, dimensions.headerHeight);
                this.ctx.fillStyle = "#FFFFFF"; // White text for better contrast
            }

            if (colObj.isSelected) {
                // Different styles for direct vs. indirect selection
                if (colObj.isDirectlySelected) {
                    // Dark green for directly selected headers (when clicked)
                    this.ctx.fillStyle = "#0F703B";
                    this.ctx.fillRect(
                        xPos,
                        0,
                        colWidth,
                        dimensions.headerHeight
                    );
                    this.ctx.fillStyle = "#FFFFFF"; // White text for better contrast
                } else {
                    // Light green for indirectly selected headers (via cell selection)
                    this.ctx.fillStyle = "#CAEAD8";
                    this.ctx.fillRect(
                        xPos,
                        0,
                        colWidth,
                        dimensions.headerHeight
                    );
                    this.ctx.fillStyle = "#0F703B"; // Dark green text
                }

                const selectedColHeaderFontSize = Math.max(
                    16 * this.zoomFactor,
                    9
                ); // Min size of 9px
                this.ctx.font = `${selectedColHeaderFontSize}px Calibri`;
                // draw line at bottom of the selected column
                this.ctx.strokeStyle = "#0F703B";
                this.ctx.lineWidth = 4 / this.devicePixelRatio;
                this.ctx.beginPath();
                this.ctx.moveTo(xPos - 2, dimensions.headerHeight);
                this.ctx.lineTo(xPos + colWidth + 2, dimensions.headerHeight);
                this.ctx.stroke();
            } else {
                this.ctx.fillStyle = "#666666";
                // Reapply the column header font size for consistency
                this.ctx.font = `${colHeaderFontSize}px Calibri`;
            }

            // Align text position to pixel boundaries for sharpness
            const pixelRatio = this.devicePixelRatio;
            const textX =
                Math.round((xPos + colWidth / 2) * pixelRatio) / pixelRatio;
            const textY =
                Math.round((dimensions.headerHeight / 2) * pixelRatio) /
                pixelRatio;

            // Use a default header text if header is undefined
            const headerText = colObj.header || this.generateColumnHeader(col);
            this.ctx.fillText(headerText, textX, textY);

            // Draw vertical line at the right edge of each column header
            this.ctx.strokeStyle = "#E0E0E0";
            this.ctx.lineWidth = 1 / this.devicePixelRatio;

            const lineX = Math.round(xPos + colWidth) + 0.5;

            this.ctx.beginPath();
            this.ctx.moveTo(lineX, 0);
            this.ctx.lineTo(lineX, dimensions.headerHeight);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    /**
     * Generates a column header label from a column index (0 = 'A', 1 = 'B', etc.)
     * @param {number} index The column index
     * @returns {string} The generated column header label
     */
    private generateColumnHeader(index: number): string {
        let result = "";
        let temp = index;

        do {
            result = String.fromCharCode(65 + (temp % 26)) + result;
            temp = Math.floor(temp / 26) - 1;
        } while (temp >= 0);

        return result;
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
        return xPos - this.scrollX * this.zoomFactor;
    }

    public getColumnHeaderPosition(col: number): number {
        return this.getColumnPositionForHeader(col);
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
        return yPos - this.scrollY * this.zoomFactor;
    }

    public getRowHeaderPosition(row: number): number {
        return this.getRowPositionForHeader(row);
    }

    /**
     * Clears the canvas
     */
    private clearCanvas(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Gets the visible row range
     * @returns {Object} The start and end row indices
     */
    private getVisibleRowRange(): { startRow: number; endRow: number } {
        const dimensions = this.grid.getDimensions();
        let startRow = 0;
        let endRow = this.grid.getCurrentRows();

        // Adjust for zoom factor when determining visible range
        const effectiveViewportHeight =
            dimensions.headerHeight +
            (this.viewport.height - dimensions.headerHeight) / this.zoomFactor;

        for (let row = 0; row < this.rowPositions.length - 1; row++) {
            if (
                this.rowPositions[row] - this.scrollY >
                dimensions.headerHeight + 20
            ) {
                startRow = Math.max(0, row - 1);

                break;
            }
        }

        for (let row = startRow; row < this.rowPositions.length - 1; row++) {
            if (
                this.rowPositions[row] - this.scrollY >
                effectiveViewportHeight
            ) {
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
    private getVisibleColumnRange(): { startCol: number; endCol: number } {
        const dimensions = this.grid.getDimensions();
        let startCol = 0;
        let endCol = this.grid.getCurrentCols();

        // Adjust for zoom factor when determining visible range
        const effectiveViewportWidth =
            dimensions.headerWidth +
            (this.viewport.width - dimensions.headerWidth) / this.zoomFactor;

        for (let col = 0; col < this.columnPositions.length - 1; col++) {
            if (
                this.columnPositions[col] - this.scrollX >
                dimensions.headerWidth + 20
            ) {
                startCol = Math.max(0, col - 1);
                break;
            }
        }

        for (let col = startCol; col < this.columnPositions.length - 1; col++) {
            if (
                this.columnPositions[col] - this.scrollX >
                effectiveViewportWidth
            ) {
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
        this.ctx.fillStyle = "#f0f2f5";
        this.ctx.fillRect(
            0,
            0,
            dimensions.headerWidth,
            dimensions.headerHeight
        );

        // Draw border lines - Excel uses very subtle borders
        this.ctx.strokeStyle = "#B7B7B7";
        this.ctx.lineWidth = 0.5;

        // Bottom border
        this.ctx.beginPath();
        this.ctx.lineWidth = 3 / this.devicePixelRatio;
        this.ctx.moveTo(0, dimensions.headerHeight + 0.5);
        this.ctx.lineTo(dimensions.headerWidth, dimensions.headerHeight + 0.5);
        this.ctx.stroke();

        // Right border
        this.ctx.beginPath();
        this.ctx.lineWidth = 3 / this.devicePixelRatio;
        this.ctx.moveTo(dimensions.headerWidth + 0.5, 0);
        this.ctx.lineTo(dimensions.headerWidth + 0.5, dimensions.headerHeight);
        this.ctx.stroke();

        // Add a filled triangle as seen in Excel's corner cell
        const triSize = 13 * this.zoomFactor;
        const padding = 3 * this.zoomFactor;
        const x0 = dimensions.headerWidth - padding;
        const y0 = dimensions.headerHeight - padding;
        this.ctx.beginPath();
        this.ctx.moveTo(x0, y0);
        this.ctx.lineTo(x0 - triSize, y0);
        this.ctx.lineTo(x0, y0 - triSize);
        this.ctx.closePath();
        this.ctx.fillStyle = "#B7B7B7";
        this.ctx.fill();
    }

    /**
     * Renders the cells
     * @param {number} startRow The starting row index
     * @param {number} endRow The ending row index
     * @param {number} startCol The starting column index
     * @param {number} endCol The ending column index
     */
    private renderCells(
        startRow: number,
        endRow: number,
        startCol: number,
        endCol: number
    ): void {
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

        // Set text rendering defaults
        const baseFontSize = 14;
        // We'll adjust font size individually for each cell based on zoom factor
        this.ctx.font = `${baseFontSize}px Calibri`;
        this.ctx.textAlign = "left"; // Excel aligns text to the left by default
        this.ctx.textBaseline = "middle";

        // Enable text anti-aliasing for better readability
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = "high";

        // Now render all cells
        for (let row = startRow; row < endRow; row++) {
            // Font size will be set dynamically for each cell based on zoom factor
            const rowHeight = this.grid.getRowHeight(row);

            // Calculate position with zoom factor applied
            const rawYPos = this.getRowPosition(row) - this.scrollY;
            const yPos =
                dimensions.headerHeight +
                (rawYPos - dimensions.headerHeight) * this.zoomFactor;

            if (yPos > this.viewport.height) continue;
            if (yPos + rowHeight * this.zoomFactor < dimensions.headerHeight)
                continue;

            for (let col = startCol; col < endCol; col++) {
                const colWidth = this.grid.getColumnWidth(col);

                // Calculate position with zoom factor applied
                const rawXPos = this.getColumnPosition(col) - this.scrollX;
                const xPos =
                    dimensions.headerWidth +
                    (rawXPos - dimensions.headerWidth) * this.zoomFactor;

                if (xPos > this.viewport.width) continue;
                if (xPos + colWidth * this.zoomFactor < dimensions.headerWidth)
                    continue;

                const cell = this.grid.getCell(row, col);

                // Render cell text
                if (
                    cell.value !== null &&
                    cell.value !== undefined &&
                    cell.value !== ""
                ) {
                    // Calculate cell dimensions with zoom factor applied
                    const scaledWidth = colWidth * this.zoomFactor;
                    const scaledHeight = rowHeight * this.zoomFactor;

                    // Render cell background (Excel uses white for regular cells)
                    this.ctx.fillStyle =
                        cell.style.backgroundColor || "#ffffff";
                    this.ctx.fillRect(xPos, yPos, scaledWidth, scaledHeight);

                    // Use normal color for text even in selected cells - maintains readability
                    this.ctx.fillStyle = cell.style.textColor || "#000000";

                    const displayValue = cell.getDisplayValue();

                    // Clip text to cell boundaries with scaled dimensions
                    this.ctx.save();
                    this.ctx.beginPath();
                    this.ctx.rect(
                        xPos + 2,
                        yPos,
                        scaledWidth - 4,
                        scaledHeight
                    );
                    this.ctx.clip();

                    // Adjust font size based on zoom factor for better visibility
                    const scaledFontSize = Math.max(
                        baseFontSize * this.zoomFactor,
                        8
                    ); // Min size of 8px

                    const fontWeight = cell.style.fontWeight || "normal";
                    const fontStyle = cell.style.fontStyle || "normal";
                    const textDecoration = cell.style.textDecoration || "none";
                    const textDecorationLine =
                        cell.style.textDecorationLine || "none";

                    // this.ctx.font = `${fontWeight} ${scaledFontSize}px Calibri`;
                    this.ctx.font = `${fontStyle} ${fontWeight} ${scaledFontSize}px Calibri`;

                    // Set text alignment based on cell style or fall back to cell type
                    let textX: number;
                    const textY = yPos + scaledHeight / 2; // Vertically center in scaled cell

                    // Check for numeric content and ensure right alignment
                    if (cell.type === "number") {
                        // Always right-align numbers
                        this.ctx.textAlign = "right";
                        const paddingRight = 6 * this.zoomFactor;
                        textX = xPos + scaledWidth - paddingRight;
                    } else if (
                        cell.style.textAlign === "right" ||
                        // Check for numeric strings that should be right-aligned
                        (typeof cell.value === "string" &&
                            (/^-?[\d,]+\.?\d*$/.test(cell.value) ||
                                /^[$€£¥]\d+\.?\d*$/.test(cell.value) ||
                                /^\d+\.?\d*%$/.test(cell.value)))
                    ) {
                        this.ctx.textAlign = "right";
                        const paddingRight = 6 * this.zoomFactor;
                        textX = xPos + scaledWidth - paddingRight;
                    } else if (cell.style.textAlign === "center") {
                        this.ctx.textAlign = "center";
                        // For center-aligned text, position at the center of the cell
                        textX = xPos + scaledWidth / 2;
                    } else {
                        this.ctx.textAlign = "left";
                        // Apply proper padding based on zoom factor for left-aligned text
                        const paddingLeft = 6 * this.zoomFactor;
                        textX = xPos + paddingLeft;
                    }

                    const metrics = this.ctx.measureText(displayValue);
                    // console.log(typeof textDecoration, textDecorationLine);

                    // Render text with adjusted size and position
                    this.ctx.fillText(displayValue, textX, textY);

                    if (textDecoration === "line-through") {
                        const strikeY = Math.floor(textY) + 0.5;
                        this.ctx.beginPath();

                        // Adjust line positions based on text alignment
                        if (this.ctx.textAlign === "right") {
                            // For right-aligned text, draw from (textX - width) to textX
                            this.ctx.moveTo(textX - metrics.width, strikeY);
                            this.ctx.lineTo(textX, strikeY);
                        } else if (this.ctx.textAlign === "center") {
                            // For center-aligned text, draw from (textX - width/2) to (textX + width/2)
                            this.ctx.moveTo(textX - metrics.width / 2, strikeY);
                            this.ctx.lineTo(textX + metrics.width / 2, strikeY);
                        } else {
                            // For left-aligned text, draw from textX to (textX + width)
                            this.ctx.moveTo(textX, strikeY);
                            this.ctx.lineTo(textX + metrics.width, strikeY);
                        }

                        this.ctx.strokeStyle =
                            cell.style.textColor || "#000000";
                        this.ctx.lineWidth = Math.max(1, scaledFontSize / 15);
                        this.ctx.stroke();
                    }
                    if (textDecorationLine.includes("underline")) {
                        const underlineY =
                            Math.floor(textY + scaledFontSize * 0.2) + 0.5; // Adjust for line-through position
                        this.ctx.beginPath();

                        // Adjust line positions based on text alignment
                        if (this.ctx.textAlign === "right") {
                            // For right-aligned text, draw from (textX - width) to textX
                            this.ctx.moveTo(
                                textX - metrics.width,
                                underlineY + 3
                            );
                            this.ctx.lineTo(textX, underlineY + 3);
                        } else if (this.ctx.textAlign === "center") {
                            // For center-aligned text, draw from (textX - width/2) to (textX + width/2)
                            this.ctx.moveTo(
                                textX - metrics.width / 2,
                                underlineY + 3
                            );
                            this.ctx.lineTo(
                                textX + metrics.width / 2,
                                underlineY + 3
                            );
                        } else {
                            // For left-aligned text, draw from textX to (textX + width)
                            this.ctx.moveTo(textX, underlineY + 3);
                            this.ctx.lineTo(
                                textX + metrics.width,
                                underlineY + 3
                            );
                        }

                        this.ctx.strokeStyle =
                            cell.style.textColor || "#000000";
                        this.ctx.lineWidth = Math.max(1, scaledFontSize / 15);
                        this.ctx.stroke();
                    }

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

        // Save the current context state
        this.ctx.save();

        // Create clip region for grid lines
        this.ctx.beginPath();
        this.ctx.rect(
            dimensions.headerWidth,
            dimensions.headerHeight,
            this.viewport.width - dimensions.headerWidth,
            this.viewport.height - dimensions.headerHeight
        );
        this.ctx.clip();

        // Use a clearly visible color for grid lines
        this.ctx.strokeStyle = "#e0e0e0";

        // Fixed line width that ensures visibility but remains crisp
        this.ctx.lineWidth = 1 / this.devicePixelRatio;

        // Get visible column and row ranges
        const visibleRows = this.getVisibleRowRange();
        const visibleCols = this.getVisibleColumnRange();

        // Draw vertical grid lines (column boundaries)
        for (
            let col = visibleCols.startCol;
            col <= visibleCols.endCol + 1;
            col++
        ) {
            // Get the actual screen position for this column
            let xPos =
                dimensions.headerWidth +
                (this.getColumnPosition(col) -
                    dimensions.headerWidth -
                    this.scrollX) *
                    this.zoomFactor;

            // Align to pixel boundary for crisp lines
            xPos = Math.round(xPos) + 0.5;

            if (xPos < dimensions.headerWidth) continue;
            if (xPos > this.viewport.width) break;

            this.ctx.beginPath();
            this.ctx.moveTo(xPos, dimensions.headerHeight);
            this.ctx.lineTo(xPos, this.viewport.height);
            this.ctx.stroke();
        }

        // Draw horizontal grid lines (row boundaries)
        for (
            let row = visibleRows.startRow;
            row <= visibleRows.endRow + 1;
            row++
        ) {
            // Get the actual screen position for this row
            let yPos =
                dimensions.headerHeight +
                (this.getRowPosition(row) -
                    dimensions.headerHeight -
                    this.scrollY) *
                    this.zoomFactor;

            // Align to pixel boundary for crisp lines
            yPos = Math.round(yPos) + 0.5;

            if (yPos < dimensions.headerHeight) continue;
            if (yPos > this.viewport.height) break;

            this.ctx.beginPath();
            this.ctx.moveTo(dimensions.headerWidth, yPos);
            this.ctx.lineTo(this.viewport.width, yPos);
            this.ctx.stroke();
        }

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

        // Get the position of the selection cells accounting for zoom
        const startX =
            dimensions.headerWidth +
            (this.getColumnPosition(minCol) -
                dimensions.headerWidth -
                this.scrollX) *
                this.zoomFactor;
        const startY =
            dimensions.headerHeight +
            (this.getRowPosition(minRow) -
                dimensions.headerHeight -
                this.scrollY) *
                this.zoomFactor;

        // Calculate the end position by getting the next column/row position
        let endX =
            dimensions.headerWidth +
            (this.getColumnPosition(maxCol + 1) -
                dimensions.headerWidth -
                this.scrollX) *
                this.zoomFactor;
        let endY =
            dimensions.headerHeight +
            (this.getRowPosition(maxRow + 1) -
                dimensions.headerHeight -
                this.scrollY) *
                this.zoomFactor;

        // Make sure we don't try to render outside the viewport
        if (startX > this.viewport.width || startY > this.viewport.height) {
            this.ctx.restore();
            return;
        }

        // Calculate width and height
        const width = endX - startX;
        const height = endY - startY;

        // Ensure the line is drawn on pixel boundaries for sharpness
        const pixelAlignedX = Math.round(startX) + 0.5;
        const pixelAlignedY = Math.round(startY) + 0.5;
        const pixelAlignedWidth = Math.round(width) + 0.5;
        const pixelAlignedHeight = Math.round(height) + 0.5;

        // Draw selection highlight with a more noticeable color
        this.ctx.fillStyle = this.isFormulaRangeSelection
            ? "rgba(108, 189, 239, 0.15)"
            : "rgba(28, 98, 57, 0.15)"; // Light green with transparency

        // First, determine if this is a multi-cell selection
        const isMultiCellSelection = !(minRow === maxRow && minCol === maxCol);

        if (isMultiCellSelection) {
            // For multi-cell selections, we need to make the first cell white
            // First draw the highlight for the entire selection
            // this.ctx.fillRect(
            //     pixelAlignedX - 0.5,
            //     pixelAlignedY - 0.5,
            //     pixelAlignedWidth,
            //     pixelAlignedHeight
            // );

            // Now overwrite the first cell with white background
            const firstCellColIndex = selection.startCol;
            const firstCellRowIndex = selection.startRow;
            const firstCellWidth =
                this.grid.getColumnWidth(firstCellColIndex) * this.zoomFactor;
            const firstCellHeight =
                this.grid.getRowHeight(firstCellRowIndex) * this.zoomFactor;

            // Calculate position of the first cell (could be different from minRow/minCol)
            const firstCellX =
                dimensions.headerWidth +
                (this.getColumnPosition(firstCellColIndex) -
                    dimensions.headerWidth -
                    this.scrollX) *
                    this.zoomFactor;

            const firstCellY =
                dimensions.headerHeight +
                (this.getRowPosition(firstCellRowIndex) -
                    dimensions.headerHeight -
                    this.scrollY) *
                    this.zoomFactor;

            const pixelAlignedFirstCellY = Math.round(firstCellY) + 0.5;

            if (firstCellRowIndex > minRow) {
                const topHeight = firstCellY - startY;
                this.ctx.fillRect(
                    pixelAlignedX - 0.5,
                    pixelAlignedY - 0.5,
                    pixelAlignedWidth,
                    topHeight
                );
            }

            // 2. Draw selection for the left strip (if it exists)
            if (firstCellColIndex > minCol) {
                const leftWidth = firstCellX - startX;
                this.ctx.fillRect(
                    pixelAlignedX - 0.5,
                    pixelAlignedFirstCellY - 0.5,
                    leftWidth,
                    firstCellHeight
                );
            }

            // 3. Draw selection for the right strip
            const rightX = firstCellX + firstCellWidth;
            if (rightX < endX) {
                const rightWidth = endX - rightX;
                this.ctx.fillRect(
                    rightX,
                    pixelAlignedFirstCellY - 0.5,
                    rightWidth,
                    firstCellHeight
                );
            }

            // 4. Draw selection for the bottom strip
            const bottomY = firstCellY + firstCellHeight;
            if (bottomY < endY) {
                const bottomHeight = endY - bottomY;
                this.ctx.fillRect(
                    pixelAlignedX - 0.5,
                    bottomY,
                    pixelAlignedWidth,
                    bottomHeight
                );
            }
        }

        // Draw selection border with a thicker and more visible style
        // Use blue for formula ranges, dark green for normal selections
        this.ctx.strokeStyle = this.isFormulaRangeSelection
            ? "#0078d4"
            : "#1c6239";
        this.ctx.lineWidth = 2.5 / this.devicePixelRatio;
        this.ctx.strokeRect(
            pixelAlignedX - 0.5,
            pixelAlignedY - 0.5,
            pixelAlignedWidth,
            pixelAlignedHeight
        );

        // Add corner handles for better selection visibility
        const handleSize = 6;
        this.ctx.fillStyle = this.isFormulaRangeSelection
            ? "#0078d4"
            : "#1c6239";
        if (this.isFormulaRangeSelection) {
            // Top-left corner
            this.ctx.fillRect(
                pixelAlignedX - 3,
                pixelAlignedY - 3,
                handleSize,
                handleSize
            );

            // Top-right corner
            this.ctx.fillRect(
                pixelAlignedX - 1 + pixelAlignedWidth - handleSize / 2,
                pixelAlignedY - 3,
                handleSize,
                handleSize
            );

            // Bottom-left corner
            this.ctx.fillRect(
                pixelAlignedX - 3,
                pixelAlignedY - 1 + pixelAlignedHeight - handleSize / 2,
                handleSize,
                handleSize
            );
            // Bottom-right corner
            this.ctx.fillRect(
                pixelAlignedX - 0.5 + pixelAlignedWidth - handleSize / 2,
                pixelAlignedY - 0.5 + pixelAlignedHeight - handleSize / 2,
                handleSize,
                handleSize
            );
        } else {
            // Bottom-right corner
            this.ctx.fillRect(
                pixelAlignedX - 0.5 + pixelAlignedWidth - handleSize / 2,
                pixelAlignedY - 0.5 + pixelAlignedHeight - handleSize / 2,
                handleSize,
                handleSize
            );
        }

        // Render origin cell if it exists and is outside the current selection
        if (this.originCell) {
            const { row: originRow, col: originCol } = this.originCell;

            // Check if origin cell is outside the main selection
            if (
                originRow < minRow ||
                originRow > maxRow ||
                originCol < minCol ||
                originCol > maxCol
            ) {
                this.renderOriginCell(originRow, originCol, dimensions);
            }
        }

        // Restore the context
        this.ctx.restore();
    }

    /**
     * Renders the origin cell (formula cell) with a distinct visual style
     * @param row - Row of the origin cell
     * @param col - Column of the origin cell
     * @param dimensions - Grid dimensions
     */
    private renderOriginCell(row: number, col: number, dimensions: any): void {
        // Calculate origin cell position
        const originX =
            dimensions.headerWidth +
            (this.getColumnPosition(col) -
                dimensions.headerWidth -
                this.scrollX) *
                this.zoomFactor;
        const originY =
            dimensions.headerHeight +
            (this.getRowPosition(row) -
                dimensions.headerHeight -
                this.scrollY) *
                this.zoomFactor;

        const cellWidth = this.grid.getColumnWidth(col) * this.zoomFactor;
        const cellHeight = this.grid.getRowHeight(row) * this.zoomFactor;

        // Check if origin cell is visible
        if (
            originX + cellWidth < dimensions.headerWidth ||
            originY + cellHeight < dimensions.headerHeight ||
            originX > this.viewport.width ||
            originY > this.viewport.height
        ) {
            return;
        }

        // Save context for origin cell rendering
        this.ctx.save();

        // Draw origin cell with a different style (black border for formula cell)
        this.ctx.strokeStyle = "#1c6239";
        this.ctx.lineWidth = 2.5 / this.devicePixelRatio;

        // Ensure pixel alignment
        const pixelAlignedX = Math.round(originX) + 0.5;
        const pixelAlignedY = Math.round(originY) + 0.5;
        const pixelAlignedWidth = Math.round(cellWidth);
        const pixelAlignedHeight = Math.round(cellHeight);

        this.ctx.strokeRect(
            pixelAlignedX - 0.5,
            pixelAlignedY - 0.5,
            pixelAlignedWidth,
            pixelAlignedHeight
        );

        this.ctx.restore();
    }

    public renderDottedLineAcrossSelection(selection: {
        getRange: () => { row: number; col: number }[];
    }): void {
        this.dottedLineAcrossSelection = true;
        const dimensions = this.grid.getDimensions();

        const range = selection.getRange();
        let minCol = range[0].col;
        let maxCol = range[0].col;
        let minRow = range[0].row;
        let maxRow = range[0].row;

        range.forEach((pos: { col: number; row: number }) => {
            if (pos.col < minCol) minCol = pos.col;
            if (pos.col > maxCol) maxCol = pos.col;
            if (pos.row < minRow) minRow = pos.row;
            if (pos.row > maxRow) maxRow = pos.row;
        });

        // Store selection bounds for animation
        this.copiedSelectionBounds = {
            minCol,
            maxCol,
            minRow,
            maxRow,
        };

        // Start the marching ants animation
        this.startMarchingAntsAnimation();
    }

    /**
     * Clears the copied selection and stops the marching ants animation
     */
    public clearCopiedSelection(): void {
        this.dottedLineAcrossSelection = false;
        this.stopMarchingAntsAnimation();
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
    public getCellAtPosition(
        x: number,
        y: number
    ): { row: number; col: number } | null {
        const dimensions = this.grid.getDimensions();

        // Check if click is in headers area
        if (x < dimensions.headerWidth || y < dimensions.headerHeight) {
            return null;
        }

        // Adjust coordinates for zoom factor - only in content area
        const contentX =
            dimensions.headerWidth +
            (x - dimensions.headerWidth) / this.zoomFactor;
        const contentY =
            dimensions.headerHeight +
            (y - dimensions.headerHeight) / this.zoomFactor;

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
     * Handles the window resize event
     */
    public handleWindowResize(): void {
        // Save current scroll position and zoom
        const currentScrollX = this.scrollX;
        const currentScrollY = this.scrollY;
        const currentZoom = this.zoomFactor;

        // Setup canvas to match new container size
        this.setupCanvas();
        this.calculatePositions();

        // Restore scroll position and zoom
        this.scrollX = currentScrollX;
        this.scrollY = currentScrollY;
        this.zoomFactor = currentZoom;

        // Update header dimensions
        this.calculateAndSetRowHeaderWidth();
        this.calculateAndSetHeaderHeight();

        // Update scrollbars and render
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
            const totalGridWidth =
                this.columnPositions[this.columnPositions.length - 1];
            const zoomedWidth = totalGridWidth * this.zoomFactor;

            // Ensure content is at least as wide as the viewport
            return Math.max(zoomedWidth, this.viewport.width);
        }

        // Fallback calculation
        const dimensions = this.grid.getDimensions();
        let totalWidth = dimensions.headerWidth;

        for (let col = 0; col < this.grid.getCurrentCols(); col++) {
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
            const totalGridHeight =
                this.rowPositions[this.rowPositions.length - 1];
            const zoomedHeight = totalGridHeight * this.zoomFactor;

            // Ensure content is at least as high as the viewport
            return Math.max(zoomedHeight, this.viewport.height);
        }

        // Fallback calculation
        const dimensions = this.grid.getDimensions();
        let totalHeight = dimensions.headerHeight;

        for (let row = 0; row < this.grid.getCurrentRows(); row++) {
            totalHeight += this.grid.getRowHeight(row) * this.zoomFactor;
        }

        // Ensure content is at least as high as the viewport
        return Math.max(totalHeight, this.viewport.height);
    }

    /**
     * Sets the zoom factor
     * @param {number} zoom The zoom factor to set
     * @param {number} cursorX Optional X position of the cursor for zoom centering
     * @param {number} cursorY Optional Y position of the cursor for zoom centering
     */
    public setZoom(zoom: number, cursorX?: number, cursorY?: number): void {
        // Clamp zoom value between min and max
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));

        // If zoom hasn't changed, do nothing
        if (newZoom === this.zoomFactor) return;

        // Store the old zoom factor to determine if we're zooming in or out
        const oldZoom = this.zoomFactor;

        // Get grid dimensions
        const dimensions = this.grid.getDimensions();

        // Calculate focal point in grid coordinates based on cursor position or screen center
        let focalX: number, focalY: number;

        if (cursorX !== undefined && cursorY !== undefined) {
            // If cursor position is provided, use it as the focal point
            // First determine if cursor is in content area (not headers)
            const isInContent =
                cursorX > dimensions.headerWidth &&
                cursorY > dimensions.headerHeight;

            if (isInContent) {
                // Convert cursor position to grid coordinates with current zoom
                focalX =
                    this.scrollX +
                    (cursorX - dimensions.headerWidth) / this.zoomFactor;
                focalY =
                    this.scrollY +
                    (cursorY - dimensions.headerHeight) / this.zoomFactor;
            } else {
                // If cursor is in headers, use screen center for zooming
                focalX =
                    this.scrollX + this.viewport.width / 2 / this.zoomFactor;
                focalY =
                    this.scrollY + this.viewport.height / 2 / this.zoomFactor;
            }
        } else {
            // Default to screen center if no cursor position is provided
            focalX = this.scrollX + this.viewport.width / 2 / this.zoomFactor;
            focalY = this.scrollY + this.viewport.height / 2 / this.zoomFactor;
        }

        // Set new zoom factor
        this.zoomFactor = newZoom;

        // Recalculate scroll position to maintain the same focal point
        this.scrollX =
            focalX -
            (cursorX !== undefined
                ? cursorX - dimensions.headerWidth
                : this.viewport.width / 2) /
                this.zoomFactor;
        this.scrollY =
            focalY -
            (cursorY !== undefined
                ? cursorY - dimensions.headerHeight
                : this.viewport.height / 2) /
                this.zoomFactor;

        // Ensure scroll positions don't go negative
        this.scrollX = Math.max(0, this.scrollX);
        this.scrollY = Math.max(0, this.scrollY);

        // Update header dimensions for zoom level
        this.calculateAndSetRowHeaderWidth();
        this.calculateAndSetHeaderHeight();

        // If zooming out, we need to check if we should expand the grid
        // since more content becomes visible
        if (newZoom < oldZoom) {
            this.calculatePositions();
            this.checkAndExpandGridOnZoom();
        }

        // Update scrollbars and render
        this.updateScrollbars();
        this.render();

        // Notify event handler about zoom change
        if (this.eventHandler) {
            this.eventHandler.handleScroll();
            // Update resize handles to account for zoom
            this.eventHandler.updateResizeHandlesOnZoom();
        }
    }

    /**
     * Checks if the grid needs to be expanded after zooming out
     * This is similar to checkAndExpandGrid but considers the zoom factor
     */
    private checkAndExpandGridOnZoom(): void {
        // Get the visible range at the current zoom level
        const { endRow } = this.getVisibleRowRange();
        const { endCol } = this.getVisibleColumnRange();

        // Get total rows and columns
        const currentRows = this.grid.getCurrentRows();
        const currentCols = this.grid.getCurrentCols();

        const maxRows = this.grid.getMaxRows();
        const maxCols = this.grid.getMaxCols();

        // Calculate thresholds based on zoom factor
        // When zoomed out, we want to expand earlier to ensure smooth scrolling
        const zoomFactor = Math.max(0.1, this.zoomFactor); // Prevent division by zero

        const rowThreshold = Math.floor(currentRows * 0.8 * zoomFactor);
        const colThreshold = Math.floor(currentCols * 0.8 * zoomFactor);

        // The lower the zoom, the more rows/columns to add at once
        const rowMultiplier = Math.max(1, Math.ceil(1.5 / zoomFactor)); // More aggressive multiplier
        const colMultiplier = Math.max(1, Math.ceil(1.5 / zoomFactor));

        let needsUpdate = false;

        // Check if we're approaching the end of rows
        if (endRow >= rowThreshold && currentRows < maxRows) {
            // Add more rows based on zoom level
            const rowsToAdd = Math.min(
                100 * rowMultiplier,
                maxRows - currentRows
            );

            if (this.grid.expandRows(rowsToAdd)) {
                console.log(
                    `Added ${rowsToAdd} more rows. Now at ${this.grid.getCurrentRows()} rows. (Zoom: ${zoomFactor.toFixed(
                        2
                    )}, Threshold: ${rowThreshold})`
                );
                needsUpdate = true;
            }
        }

        // Check if we're approaching the end of columns
        if (endCol >= colThreshold && currentCols < maxCols) {
            // Add more columns based on zoom level
            const colsToAdd = Math.min(
                20 * colMultiplier,
                maxCols - currentCols
            );

            if (this.grid.expandColumns(colsToAdd)) {
                console.log(
                    `Added ${colsToAdd} more columns. Now at ${this.grid.getCurrentCols()} columns. (Zoom: ${zoomFactor.toFixed(
                        2
                    )}, Threshold: ${colThreshold})`
                );
                needsUpdate = true;
            }
        }

        // If we expanded the grid, recalculate positions
        if (needsUpdate) {
            this.calculatePositions();
            this.updateScrollbars();
        }
    }

    /**
     * Increases the zoom factor
     * @param {number} cursorX Optional X position of the cursor for zoom centering
     * @param {number} cursorY Optional Y position of the cursor for zoom centering
     */
    public zoomIn(cursorX?: number, cursorY?: number): void {
        this.setZoom(this.zoomFactor * 1.2, cursorX, cursorY); // Increase by 20%
    }

    /**
     * Decreases the zoom factor
     * @param {number} cursorX Optional X position of the cursor for zoom centering
     * @param {number} cursorY Optional Y position of the cursor for zoom centering
     */
    public zoomOut(cursorX?: number, cursorY?: number): void {
        this.setZoom(this.zoomFactor / 1.2, cursorX, cursorY); // Decrease by 20%
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

            const rect = this.canvas.getBoundingClientRect();
            const cursorX = event.clientX - rect.left;
            const cursorY = event.clientY - rect.top;

            // Calculate new zoom factor
            const currentZoom = this.zoomFactor;
            let newZoom: number;

            if (delta > 0) {
                newZoom = currentZoom * 1.2; // Zoom in by 20%
            } else {
                newZoom = currentZoom / 1.2; // Zoom out by 20%
            }
            // No need to call render here as it's already called in zoomIn/zoomOut via setZoom
            this.setZoom(newZoom, cursorX, cursorY);
            return true;
        }

        return false;
    }

    /**
     * Calculates and sets the optimal width for row headers based on the longest row number.
     * This ensures row numbers are not truncated.
     * Also accounts for the current zoom level.
     */
    private calculateAndSetRowHeaderWidth(): void {
        const visibleRows = this.getVisibleRowRange();
        let maxWidth = 0;

        // Set font for measurement with the zoom factor applied
        const headerFontSize = Math.max(14 * this.zoomFactor, 8); // Min size of 8px
        this.ctx.font = `${headerFontSize}px Calibri`;

        // Measure the width of all visible row numbers to find the maximum
        for (let row = visibleRows.startRow; row < visibleRows.endRow; row++) {
            const rowNumber = String(row + 1);
            const textMetrics = this.ctx.measureText(rowNumber);
            if (textMetrics.width > maxWidth) {
                maxWidth = textMetrics.width;
            }
        }

        // Scale padding based on zoom factor
        const PADDING = 35 * this.zoomFactor; // Scale padding with zoom
        const MIN_WIDTH = 30 * this.zoomFactor; // Scale minimum width with zoom
        const newHeaderWidth = Math.max(MIN_WIDTH, maxWidth + PADDING);

        if (
            Math.abs(newHeaderWidth - this.grid.getDimensions().headerWidth) > 1
        ) {
            this.grid.setHeaderWidth(newHeaderWidth);
        }

        // Also adjust the header height based on zoom
        this.calculateAndSetHeaderHeight();
    }

    /**
     * Calculates and sets the header height based on the current zoom factor
     * to ensure column headers are properly sized.
     */
    private calculateAndSetHeaderHeight(): void {
        const dimensions = this.grid.getDimensions();

        // Base header height scaled with zoom factor
        const BASE_HEIGHT = 30;
        const MIN_HEIGHT = 20;

        // Calculate new height based on zoom
        const newHeaderHeight = Math.max(
            BASE_HEIGHT * this.zoomFactor,
            MIN_HEIGHT
        );

        // Update only if there's a significant change
        if (Math.abs(newHeaderHeight - dimensions.headerHeight) > 1) {
            this.grid.setHeaderHeight(newHeaderHeight);
        }
    }

    /**
     * Public method to recalculate positions after data is loaded
     * This should be called after loading new data
     */
    public recalculatePositions(): void {
        this.calculatePositions();
    }

    /**
     * Public method to update scrollbars after data is loaded
     * This should be called after loading new data
     */
    public refreshScrollbars(): void {
        this.updateScrollbars();
    }

    /**
     * Sets the origin cell for dual selection (formula cell + range)
     * @param row - The row of the origin cell
     * @param col - The column of the origin cell
     */
    public setOriginCell(row: number, col: number): void {
        this.originCell = { row, col };
    }

    /**
     * Clears the origin cell
     */
    public clearOriginCell(): void {
        this.originCell = null;
    }

    /**
     * Sets the selection as a formula range selection (blue color)
     */
    public setFormulaRangeSelection(isFormulaRange: boolean): void {
        this.isFormulaRangeSelection = isFormulaRange;
    }

    /**
     * Clears the formula range selection flag (returns to normal green selection)
     */
    public clearFormulaRangeSelection(): void {
        this.isFormulaRangeSelection = false;
    }

    /**
     * Starts the marching ants animation for copied selection
     */
    private startMarchingAntsAnimation(): void {
        if (this.marchingAntsAnimationId) {
            cancelAnimationFrame(this.marchingAntsAnimationId);
        }

        const animate = () => {
            this.marchingAntsOffset = (this.marchingAntsOffset + 0.5) % 12; // Move by 0.5 pixels each frame
            this.render(); // Re-render with new offset
            this.marchingAntsAnimationId = requestAnimationFrame(animate);
        };

        this.marchingAntsAnimationId = requestAnimationFrame(animate);
    }

    /**
     * Stops the marching ants animation
     */
    public stopMarchingAntsAnimation(): void {
        if (this.marchingAntsAnimationId) {
            cancelAnimationFrame(this.marchingAntsAnimationId);
            this.marchingAntsAnimationId = null;
        }
        this.copiedSelectionBounds = null;
        this.dottedLineAcrossSelection = false;
        this.marchingAntsOffset = 0;
    }

    /**
     * Renders the marching ants border for copied selection
     */
    private renderMarchingAntsBorder(): void {
        if (!this.copiedSelectionBounds || !this.dottedLineAcrossSelection) {
            return;
        }

        const dimensions = this.grid.getDimensions();
        const bounds = this.copiedSelectionBounds;

        const startX =
            dimensions.headerWidth +
            (this.getColumnPosition(bounds.minCol) -
                dimensions.headerWidth -
                this.scrollX) *
                this.zoomFactor;
        const startY =
            dimensions.headerHeight +
            (this.getRowPosition(bounds.minRow) -
                dimensions.headerHeight -
                this.scrollY) *
                this.zoomFactor;
        const endX =
            dimensions.headerWidth +
            (this.getColumnPosition(bounds.maxCol + 1) -
                dimensions.headerWidth -
                this.scrollX) *
                this.zoomFactor;
        const endY =
            dimensions.headerHeight +
            (this.getRowPosition(bounds.maxRow + 1) -
                dimensions.headerHeight -
                this.scrollY) *
                this.zoomFactor;

        if (isNaN(startX) || isNaN(startY) || isNaN(endX) || isNaN(endY)) {
            return;
        }

        const width = endX - startX;
        const height = endY - startY;
        if (width <= 0 || height <= 0) {
            return;
        }

        const pixelAlignedX = Math.round(startX) + 0.5;
        const pixelAlignedY = Math.round(startY) + 0.5;
        const pixelAlignedWidth = Math.round(width);
        const pixelAlignedHeight = Math.round(height);

        // White border (for the "gap")
        this.ctx.save();
        this.ctx.strokeStyle = "#ffffff";
        this.ctx.lineWidth = 2 / this.devicePixelRatio;
        this.ctx.setLineDash([6, 6]);
        this.ctx.lineDashOffset = -this.marchingAntsOffset;
        this.ctx.beginPath();
        this.ctx.rect(
            pixelAlignedX,
            pixelAlignedY,
            pixelAlignedWidth,
            pixelAlignedHeight
        );
        this.ctx.stroke();
        this.ctx.restore();

        // Green animated border
        this.ctx.save();
        this.ctx.strokeStyle = "#1c6239"; // Excel-style green
        this.ctx.lineWidth = 2 / this.devicePixelRatio;
        this.ctx.setLineDash([6, 6]);
        this.ctx.lineDashOffset = -this.marchingAntsOffset + 6; // shift to offset over the white
        this.ctx.beginPath();
        this.ctx.rect(
            pixelAlignedX,
            pixelAlignedY,
            pixelAlignedWidth,
            pixelAlignedHeight
        );
        this.ctx.stroke();
        this.ctx.restore();
    }
}
