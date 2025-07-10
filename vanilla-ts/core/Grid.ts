// src/core/Grid.ts
import { Row } from "../models/Row.js";
import { Column } from "../models/Column.js";
import { Selection } from "../models/Selection.js";
import { DataManager } from "./DataManager.js";
import { ICellStyle, IGridDimensions } from "../types/interfaces.js";

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
            headerWidth: 60,
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
     * Inserts a row at the specified position
     * @param {number} rowIndex The position where the row will be inserted
     * @returns {boolean} Whether the row was successfully inserted
     */
    public insertRow(rowIndex: number): boolean {
        if (rowIndex < 0 || rowIndex > this.rows.length) {
            console.error(`Invalid row index for insertion: ${rowIndex}`);
            return false;
        }

        // Insert row in the data manager
        const success = this.dataManager.insertRow(rowIndex);
        if (!success) {
            return false;
        }

        // Update row objects
        const newRow = new Row(rowIndex, this.dimensions.rowHeight);
        this.rows.splice(rowIndex, 0, newRow);

        // Update indices of all rows after the inserted row
        for (let i = rowIndex + 1; i < this.rows.length; i++) {
            this.rows[i].setIndex(i);
        }

        console.log(`Row inserted at position ${rowIndex}`);
        return true;
    }

    /**
     * Removes a row at the specified position
     * @param {number} rowIndex The position of the row to remove
     * @returns {boolean} Whether the row was successfully removed
     */
    public removeRow(rowIndex: number): boolean {
        if (rowIndex < 0 || rowIndex >= this.rows.length) {
            console.error(`Invalid row index for removal: ${rowIndex}`);
            return false;
        }

        // Remove row from the data manager
        const success = this.dataManager.removeRow(rowIndex);
        if (!success) {
            return false;
        }

        // Remove row object
        this.rows.splice(rowIndex, 1);

        // Update indices of all rows after the removed row
        for (let i = rowIndex; i < this.rows.length; i++) {
            this.rows[i].setIndex(i);
        }

        console.log(`Row removed from position ${rowIndex}`);
        return true;
    }

    /**
     * Inserts a column at the specified position
     * @param {number} colIndex The position where the column will be inserted
     * @returns {boolean} Whether the column was successfully inserted
     */
    public insertColumn(colIndex: number): boolean {
        if (colIndex < 0 || colIndex > this.columns.length) {
            console.error(`Invalid column index for insertion: ${colIndex}`);
            return false;
        }

        // Insert column in the data manager
        const success = this.dataManager.insertColumn(colIndex);
        if (!success) {
            return false;
        }

        // Update column objects
        const newColumn = new Column(colIndex, this.dimensions.columnWidth);
        this.columns.splice(colIndex, 0, newColumn);

        // Update indices of all columns after the inserted column
        for (let i = colIndex + 1; i < this.columns.length; i++) {
            this.columns[i].setIndex(i);
        }

        console.log(`Column inserted at position ${colIndex}`);
        return true;
    }

    /**
     * Removes a column at the specified position
     * @param {number} colIndex The position of the column to remove
     * @returns {boolean} Whether the column was successfully removed
     */
    public removeColumn(colIndex: number): boolean {
        if (colIndex < 0 || colIndex >= this.columns.length) {
            console.error(`Invalid column index for removal: ${colIndex}`);
            return false;
        }

        // Remove column from the data manager
        const success = this.dataManager.removeColumn(colIndex);
        if (!success) {
            return false;
        }

        // Remove column object
        this.columns.splice(colIndex, 1);

        // Update indices of all columns after the removed column
        for (let i = colIndex; i < this.columns.length; i++) {
            this.columns[i].setIndex(i);
        }

        console.log(`Column removed from position ${colIndex}`);
        return true;
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
            console.log(
                `Row ${rowIndex} height changed from ${oldHeight} to ${newHeight}`
            );
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
    public selectRow(rowIndex: number, direct: boolean = false): void {
        this.clearAllSelections();
        if (rowIndex >= 0 && rowIndex < this.rows.length) {
            // Select the row header
            this.rows[rowIndex].select(direct);

            // Select all cells in the row by updating the selection
            this.selection.start(rowIndex, 0);
            this.selection.extend(
                rowIndex,
                this.dataManager.getCurrentCols() - 1
            );

            // Ensure the selection is active
            this.selection.isActive = true;
        }
    }

    /**
     * Selects an entire column
     * @param {number} colIndex The column index to select
     */
    public selectColumn(colIndex: number, direct: boolean = false): void {
        this.clearAllSelections();
        if (colIndex >= 0 && colIndex < this.columns.length) {
            // Select the column header
            this.columns[colIndex].select(direct);

            // Select all cells in the column by updating the selection
            this.selection.start(0, colIndex);
            this.selection.extend(
                this.dataManager.getCurrentRows() - 1,
                colIndex
            );

            // Ensure the selection is active
            this.selection.isActive = true;
        }
    }

    /**
     * Clears all selections in the grid
     */
    public clearAllSelections(): void {
        this.rows.forEach((row) => row.deselect());
        this.columns.forEach((col) => col.deselect());
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

        console.log(
            `Grid updated with ${this.rows.length} rows and ${this.columns.length} columns`
        );
    }

    /**
     * Loads Excel data into the grid
     * @param {any[]} data The Excel data to load
     */
    public loadExcelData(data: any[]): void {
        this.dataManager.loadExcelData(data);

        // After loading data, update the grid dimensions to match the data size
        this.updateGridDimensions();

        console.log(
            `Grid updated with Excel data: ${this.rows.length} rows and ${this.columns.length} columns`
        );
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
            for (
                let i = currentRowCount;
                i < this.dataManager.getCurrentRows();
                i++
            ) {
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
            for (
                let i = currentColCount;
                i < this.dataManager.getCurrentCols();
                i++
            ) {
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
    public getCellsInRange(
        startRow: number,
        startCol: number,
        endRow: number,
        endCol: number
    ): any[] {
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
        this.rows.forEach((row) => row.deselect());

        // Deselect all column headers
        this.columns.forEach((col) => col.deselect());
    }

    /**
     * Selects all rows and columns in the grid
     * This will also select all cells in the grid
     */
    public selectAll(): void {
        this.rows.forEach((row) => row.select());
        this.columns.forEach((col) => col.select());
    }

    /**
     * Selects multiple rows
     * @param {number} startRowIndex The starting row index to select
     * @param {number} endRowIndex The ending row index to select
     */
    public selectRowRange(
        startRowIndex: number,
        endRowIndex: number,
        direct: boolean = false
    ): void {
        this.clearAllSelections();

        // Ensure valid indices
        const minRow = Math.max(0, Math.min(startRowIndex, endRowIndex));
        const maxRow = Math.min(
            this.rows.length - 1,
            Math.max(startRowIndex, endRowIndex)
        );

        // Select all rows in the range
        for (let row = minRow; row <= maxRow; row++) {
            this.rows[row].select(direct);
        }

        // Set the selection to cover all cells in the row range
        this.selection.start(minRow, 0);
        this.selection.extend(maxRow, this.dataManager.getCurrentCols() - 1);

        // Ensure the selection is active
        this.selection.isActive = true;

        console.log(`Selected rows from ${minRow} to ${maxRow}`);
    }

    /**
     * Selects multiple columns
     * @param {number} startColIndex The starting column index to select
     * @param {number} endColIndex The ending column index to select
     */
    public selectColumnRange(
        startColIndex: number,
        endColIndex: number,
        direct: boolean = false
    ): void {
        this.clearAllSelections();

        // Ensure valid indices
        const minCol = Math.max(0, Math.min(startColIndex, endColIndex));
        const maxCol = Math.min(
            this.columns.length - 1,
            Math.max(startColIndex, endColIndex)
        );

        // Select all columns in the range
        for (let col = minCol; col <= maxCol; col++) {
            this.columns[col].select(direct);
        }

        // Set the selection to cover all cells in the column range
        this.selection.start(0, minCol);
        this.selection.extend(this.dataManager.getCurrentRows() - 1, maxCol);

        // Ensure the selection is active
        this.selection.isActive = true;

        console.log(`Selected columns from ${minCol} to ${maxCol}`);
    }

    /**
     * Sets the style of a cell at the specified row and column
     * @param {number} row The row index of the cell
     * @param {number} col The column index of the cell
     * @param {ICellStyle} style The style to apply to the cell
     */
    public setCellStyle(row: number, col: number, style: ICellStyle): void {
        const cell = this.getCell(row, col);
        if (cell) {
            cell.setStyle(style);
        }
    }

    public getExcelData(): any[] {
        const data: any[] = [];
        for (let row = 0; row < this.dataManager.getCurrentRows(); row++) {
            const rowData: any = {};
            for (let col = 0; col < this.dataManager.getCurrentCols(); col++) {
                const cell = this.getCell(row, col);
                rowData[`col_${col}`] = cell ? cell.value : "";
            }
            data.push(rowData);
        }
        return data;
    }
}
