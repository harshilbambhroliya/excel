// src/core/Grid.ts
import { Row } from '../models/Row.js';
import { Column } from '../models/Column.js';
import { Selection } from '../models/Selection.js';
import { DataManager } from './DataManager.js';
import { IGridDimensions } from '../types/interfaces.js';

/**
 * Manages the grid structure and data for the spreadsheet
 */
export class Grid {
    /** @type {Row[]} Collection of row objects in the grid */
    private rows: Row[] = [];
    
    /** @type {Column[]} Collection of column objects in the grid */
    private columns: Column[] = [];
    
    /** @type {DataManager} Manages the cell data in the grid */
    private dataManager: DataManager;
    
    /** @type {Selection} Manages the current selection in the grid */
    private selection: Selection;
    
    /** @type {IGridDimensions} Stores the dimensions of grid components */
    private dimensions: IGridDimensions;

    /**
     * Initializes a new Grid instance
     */
    constructor() {
        this.dataManager = new DataManager();
        this.selection = new Selection();
        this.dimensions = {
            rowHeight: 25,
            columnWidth: 80,
            headerHeight: 30,
            headerWidth: 60
        };

        this.initializeRowsAndColumns();
    }

    /**
     * Initializes the rows and columns of the grid
     */
    private initializeRowsAndColumns(): void {
        // Initialize rows
        for (let i = 0; i < this.dataManager.getCurrentRows(); i++) {
            this.rows.push(new Row(i, this.dimensions.rowHeight));
        }

        // Initialize columns
        for (let i = 0; i < this.dataManager.getCurrentCols(); i++) {
            this.columns.push(new Column(i, this.dimensions.columnWidth));
        }
    }

    /**
     * Gets a cell at the specified row and column
     * @param {number} row The row index
     * @param {number} col The column index
     * @returns The cell at the specified position
     */
    public getCell(row: number, col: number) {
        return this.dataManager.getCell(row, col);
    }

    /**
     * Gets the value of a cell at the specified row and column
     * @param {number} row The row index
     * @param {number} col The column index
     * @returns {any} The value of the cell
     */
    public getCellValue(row: number, col: number): any {
        return this.getCell(row, col).value;
    }

    /**
     * Sets the value of a cell at the specified row and column
     * @param {number} row The row index
     * @param {number} col The column index
     * @param {any} value The value to set
     */
    public setCellValue(row: number, col: number, value: any): void {
        this.dataManager.setCell(row, col, value);
    }

    /**
     * Gets a row by its index
     * @param {number} index The row index
     * @returns {Row} The row object
     */
    public getRow(index: number): Row | undefined {
        if (index < 0 || index >= this.rows.length) {
            return undefined;
        }
        return this.rows[index];
    }

    /**
     * Gets a column by its index
     * @param {number} index The column index
     * @returns {Column} The column object
     */
    public getColumn(index: number): Column | undefined {
        if (index < 0 || index >= this.columns.length) {
            return undefined;
        }
        return this.columns[index];
    }

    /**
     * Gets the current selection
     * @returns {Selection} The current selection object
     */
    public getSelection(): Selection {
        return this.selection;
    }

    /**
     * Clears all data in the grid
     */
    public clear(): void {
        this.dataManager.clear();
    }

    /**
     * Sets the height of a row
     * @param {number} rowIndex The row index
     * @param {number} height The new height
     */
    public setRowHeight(rowIndex: number, height: number): void {
        if (rowIndex >= 0 && rowIndex < this.rows.length) {
            const oldHeight = this.rows[rowIndex].height;
            const newHeight = Math.max(15, height); // Ensure minimum height
            this.rows[rowIndex].setHeight(newHeight);
            
            // Log for debugging
            console.log(`Row ${rowIndex} height changed from ${oldHeight} to ${newHeight}`);
        }
    }

    /**
     * Sets the width of a column
     * @param {number} colIndex The column index
     * @param {number} width The new width
     */
    public setColumnWidth(colIndex: number, width: number): void {
        if (colIndex >= 0 && colIndex < this.columns.length) {
            const oldWidth = this.columns[colIndex].width;
            const newWidth = Math.max(50, width); // Ensure minimum width
            this.columns[colIndex].setWidth(newWidth);
        }
    }

    /**
     * Gets the height of a row
     * @param {number} rowIndex The row index
     * @returns {number} The row height
     */
    public getRowHeight(rowIndex: number): number {
        if (rowIndex < 0 || rowIndex >= this.rows.length) {
            return this.dimensions.rowHeight;
        }
        return this.rows[rowIndex].height;
    }

    /**
     * Gets the width of a column
     * @param {number} colIndex The column index
     * @returns {number} The column width
     */
    public getColumnWidth(colIndex: number): number {
        if (colIndex < 0 || colIndex >= this.columns.length) {
            return this.dimensions.columnWidth;
        }
        return this.columns[colIndex].width;
    }

    /**
     * Selects an entire row
     * @param {number} rowIndex The row index to select
     */
    public selectRow(rowIndex: number): void {
        this.clearAllSelections();
        if (rowIndex >= 0 && rowIndex < this.rows.length) {
            this.rows[rowIndex].select();
            this.selection.start(rowIndex, 0);
            this.selection.extend(rowIndex, this.dataManager.getCurrentCols() - 1);
        }
    }

    /**
     * Selects an entire column
     * @param {number} colIndex The column index to select
     */
    public selectColumn(colIndex: number): void {
        this.clearAllSelections();
        if (colIndex >= 0 && colIndex < this.columns.length) {
            this.columns[colIndex].select();
            this.selection.start(0, colIndex);
            this.selection.extend(this.dataManager.getCurrentRows() - 1, colIndex);
        }
    }

    /**
     * Clears all selections in the grid
     */
    public clearAllSelections(): void {
        this.rows.forEach(row => row.deselect());
        this.columns.forEach(col => col.deselect());
        this.selection.clear();
    }

    /**
     * Loads data into the grid
     * @param {any[]} data The data to load
     */
    public loadData(data: any[]): void {
        this.dataManager.loadData(data);
        
        // After loading data, we need to update the grid dimensions to match the data size
        this.updateGridDimensions();
        
        console.log(`Grid updated with ${this.rows.length} rows and ${this.columns.length} columns`);
    }

    /**
     * Reinitializes rows and columns based on current DataManager dimensions.
     * This should be called after data is loaded.
     */
    private updateGridDimensions(): void {
        // Clear existing rows and columns
        this.rows = [];
        this.columns = [];
        
        // Initialize rows to match the current rows in the DataManager
        const currentRows = this.dataManager.getCurrentRows();
        for (let i = 0; i < currentRows; i++) {
            this.rows.push(new Row(i, this.dimensions.rowHeight));
        }

        // Initialize columns to match the current columns in the DataManager
        const currentCols = this.dataManager.getCurrentCols();
        for (let i = 0; i < currentCols; i++) {
            this.columns.push(new Column(i, this.dimensions.columnWidth));
        }
    }

    /**
     * Gets the dimensions of the grid
     * @returns {IGridDimensions} The grid dimensions
     */
    public getDimensions(): IGridDimensions {
        return this.dimensions;
    }

    /**
     * Gets the maximum number of rows in the grid
     * @returns {number} The maximum number of rows
     */
    public getMaxRows(): number {
        return this.dataManager.getMaxRows();
    }

    /**
     * Gets the maximum number of columns in the grid
     * @returns {number} The maximum number of columns
     */
    public getMaxCols(): number {
        return this.dataManager.getMaxCols();
    }

    /**
     * Gets the current number of rows in the grid
     * @returns {number} The current number of rows
     */
    public getCurrentRows(): number {
        return this.dataManager.getCurrentRows();
    }

    /**
     * Gets the current number of columns in the grid
     * @returns {number} The current number of columns
     */
    public getCurrentCols(): number {
        return this.dataManager.getCurrentCols();
    }

    /**
     * Expands the grid with more rows
     * @param {number} amount The number of rows to add
     * @returns {boolean} Whether rows were actually added
     */
    public expandRows(amount: number): boolean {
        const currentRowCount = this.rows.length;
        
        // Expand the data manager first
        const expanded = this.dataManager.expandRows(amount);
        
        if (expanded) {
            // Add new row objects
            for (let i = currentRowCount; i < this.dataManager.getCurrentRows(); i++) {
                this.rows.push(new Row(i, this.dimensions.rowHeight));
            }
            return true;
        }
        
        return false;
    }

    /**
     * Expands the grid with more columns
     * @param {number} amount The number of columns to add
     * @returns {boolean} Whether columns were actually added
     */
    public expandColumns(amount: number): boolean {
        const currentColCount = this.columns.length;
        
        // Expand the data manager first
        const expanded = this.dataManager.expandColumns(amount);
        
        if (expanded) {
            // Add new column objects
            for (let i = currentColCount; i < this.dataManager.getCurrentCols(); i++) {
                this.columns.push(new Column(i, this.dimensions.columnWidth));
            }
            return true;
        }
        
        return false;
    }

    /**
     * Sets the width of the header column.
     * @param {number} width The new width for the header column.
     */
    public setHeaderWidth(width: number): void {
        this.dimensions.headerWidth = width;
    }

    /**
     * Sets the height of the header row.
     * @param {number} height The new height for the header row.
     */
    public setHeaderHeight(height: number): void {
        this.dimensions.headerHeight = height;
    }

    /**
     * Gets all cells in the current selection
     * @returns {any[]} Array of cells in the selection
     */
    public getCellsInSelection(): any[] {
        if (!this.selection.isActive) return [];
        
        return this.dataManager.getCellsInRange(
            this.selection.startRow,
            this.selection.startCol,
            this.selection.endRow,
            this.selection.endCol
        );
    }

    /**
     * Gets all cells in a range
     * @param startRow - The starting row index
     * @param startCol - The starting column index
     * @param endRow - The ending row index
     * @param endCol - The ending column index
     * @returns {any[]} Array of cells in the range
     */
    public getCellsInRange(startRow: number, startCol: number, endRow: number, endCol: number): any[] {
        const cells: any[] = [];
        
        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                cells.push(this.getCell(row, col));
            }
        }
        
        return cells;
    }

    /**
     * Clears only row and column header selections without affecting the cell selection
     */
    public clearHeaderSelections(): void {
        // Deselect all row headers
        this.rows.forEach(row => row.deselect());
        
        // Deselect all column headers
        this.columns.forEach(col => col.deselect());
    }

    public selectAll(): void {
        this.rows.forEach(row => row.select());
        this.columns.forEach(col => col.select());
    }
}