// src/core/DataManager.ts
import { Cell } from "../models/Cell.js";
import { IDataRecord } from "../types/interfaces.js";

/**
 * Manages the data in the grid
 */
export class DataManager {
    /**
     * The data
     */
    private data: Map<string, Cell> = new Map();

    /**
     * The maximum number of rows
     */
    private maxRows: number = 1000000;

    /**
     * The maximum number of columns
     */
    private maxCols: number = 16384;

    /**
     * The initial number of rows to display
     */
    private initialRows: number = 100;

    /**
     * The initial number of columns to display
     */
    private initialCols: number = 500;

    /**
     * The actual number of rows currently displayable
     */
    private currentRows: number = 0;

    /**
     * The actual number of columns currently displayable
     */
    private currentCols: number = 0;

    /**
     * The constructor
     */
    constructor() {
        this.initializeEmptyGrid();
    }

    /**
     * Initializes an empty grid
     */
    private initializeEmptyGrid(): void {
        this.currentRows = this.initialRows;
        this.currentCols = this.initialCols;
    }

    /**
     * Gets the cell key
     * @param row - The row index
     * @param col - The column index
     * @returns The cell key
     */
    private getCellKey(row: number, col: number): string {
        return `${row}-${col}`;
    }

    /**
     * Clears the data
     */
    public clear(): void {
        this.data.clear();
    }

    /**
     * Gets the cell
     * @param row - The row index
     * @param col - The column index
     * @returns The cell
     */
    public getCell(row: number, col: number): Cell {
        if (row < 0 || row >= this.maxRows || col < 0 || col >= this.maxCols) {
            throw new Error("Cell position out of bounds");
        }

        const key = this.getCellKey(row, col);
        let cell = this.data.get(key);

        if (!cell) {
            cell = new Cell();
            this.data.set(key, cell);
        }

        return cell;
    }

    /**
     * Sets the cell value
     * @param row - The row index
     * @param col - The column index
     * @param value - The value
     */
    public setCell(row: number, col: number, value: any): void {
        const cell = this.getCell(row, col);
        if (row == 0) {
            console.log("cell", cell);
        }
        cell.setValue(value);
    }

    /**
     * Loads the data
     * @param records - The records
     */
    public loadData(records: IDataRecord[]): void {
        // Clear existing data
        this.data.clear();

        let columnsInData = 50;

        // If we have sample data, inspect the first record to count properties
        if (records.length > 0) {
            const firstRecord = records[0];
            const propertyCount = Object.keys(firstRecord).length;

            // Only update if we detected more columns than our default
            if (propertyCount > columnsInData) {
                columnsInData = propertyCount;
                console.log(`Detected ${columnsInData} columns in data`);
            }
        }

        // Set max columns with a minimum of initialCols
        this.maxCols = Math.max(columnsInData, this.initialCols);

        // Set standard headers
        this.setCell(0, 0, "ID");
        this.setCell(0, 1, "First Name");
        this.setCell(0, 2, "Last Name");
        this.setCell(0, 3, "Age");
        this.setCell(0, 4, "Salary");

        // Load records starting from row 1
        records.forEach((record, index) => {
            const row = index + 1;
            this.setCell(row, 0, record.id);
            this.setCell(row, 1, record.firstName);
            this.setCell(row, 2, record.lastName);
            this.setCell(row, 3, record.age);
            this.setCell(row, 4, record.salary);
        });

        // Add buffer rows and columns
        // We add a buffer to ensure we have some extra space for user interaction
        const rowBuffer = 20;
        const colBuffer = 5;

        // Set current rows to the data length plus header and buffer, but not exceeding maxRows
        this.currentRows = Math.min(
            records.length + 1 + rowBuffer,
            this.maxRows
        );

        // Set current columns to the number of columns in the data plus buffer, but not exceeding maxCols
        this.currentCols = Math.min(columnsInData + colBuffer, this.maxCols);

        console.log(
            `Data loaded: Rows set to ${this.currentRows}, Columns set to ${this.currentCols}`
        );
    }

    /**
     * Loads Excel data with dynamic column structure
     * @param records - The Excel records
     */
    public loadExcelData(records: any[]): void {
        // Clear existing data
        this.data.clear();

        if (records.length === 0) {
            this.initializeEmptyGrid();
            return;
        }

        // Find maximum number of columns across all records
        let maxColumns = 0;
        records.forEach((record) => {
            const colCount = Object.keys(record).filter((key) =>
                key.startsWith("col_")
            ).length;
            maxColumns = Math.max(maxColumns, colCount);
        });

        // Ensure we have at least a minimum number of columns
        maxColumns = Math.max(maxColumns, 10);

        // Set max columns with buffer
        const colBuffer = 10;
        this.maxCols = Math.max(maxColumns + colBuffer, this.initialCols);

        // Load all records directly (Excel data includes headers if present)
        records.forEach((record, index) => {
            const row = index;

            // Load data for each column
            for (let col = 0; col < maxColumns; col++) {
                const colKey = `col_${col}`;
                const value = record[colKey] || "";
                this.setCell(row, col, value);
            }
        });

        // Add buffer rows
        const rowBuffer = 50;

        // Set current rows to the data length plus buffer, but not exceeding maxRows
        this.currentRows = Math.min(records.length + rowBuffer, this.maxRows);

        // Set current columns
        this.currentCols = Math.min(maxColumns + colBuffer, this.maxCols);

        console.log(
            `Excel data loaded: ${records.length} rows, ${maxColumns} columns. ` +
                `Grid set to ${this.currentRows} rows, ${this.currentCols} columns`
        );
    }

    /**
     * Gets the cells in range
     * @param startRow - The starting row index
     * @param startCol - The starting column index
     * @param endRow - The ending row index
     * @param endCol - The ending column index
     * @returns The cells in range
     */
    public getCellsInRange(
        startRow: number,
        startCol: number,
        endRow: number,
        endCol: number
    ): Cell[] {
        const cells: Cell[] = [];

        for (
            let row = Math.min(startRow, endRow);
            row <= Math.max(startRow, endRow);
            row++
        ) {
            for (
                let col = Math.min(startCol, endCol);
                col <= Math.max(startCol, endCol);
                col++
            ) {
                if (
                    row >= 0 &&
                    row < this.maxRows &&
                    col >= 0 &&
                    col < this.maxCols
                ) {
                    cells.push(this.getCell(row, col));
                }
            }
        }

        return cells;
    }

    /**
     * Gets the maximum number of rows
     * @returns The maximum number of rows
     */
    public getMaxRows(): number {
        return this.maxRows;
    }

    /**
     * Gets the maximum number of columns
     * @returns The maximum number of columns
     */
    public getMaxCols(): number {
        return this.maxCols;
    }

    /**
     * Gets the current number of rows being displayed
     * @returns The current number of rows
     */
    public getCurrentRows(): number {
        return this.currentRows;
    }

    /**
     * Gets the current number of columns being displayed
     * @returns The current number of columns
     */
    public getCurrentCols(): number {
        return this.currentCols;
    }

    /**
     * Expands the number of rows by the specified amount
     * @param amount - The number of rows to add
     * @returns boolean - Whether rows were actually added
     */
    public expandRows(amount: number): boolean {
        const newRowCount = Math.min(this.currentRows + amount, this.maxRows);

        if (newRowCount > this.currentRows) {
            this.currentRows = newRowCount;
            console.log(`Expanded to ${this.currentRows} rows`);
            return true;
        }

        return false;
    }

    /**
     * Expands the number of columns by the specified amount
     * @param amount - The number of columns to add
     * @returns boolean - Whether columns were actually added
     */
    public expandColumns(amount: number): boolean {
        const newColCount = Math.min(this.currentCols + amount, this.maxCols);

        if (newColCount > this.currentCols) {
            this.currentCols = newColCount;
            console.log(`Expanded to ${this.currentCols} columns`);
            return true;
        }

        return false;
    }

    /**
     * Inserts a row at the specified position
     * @param rowIndex - The position where the row will be inserted
     * @returns boolean - Whether the row was successfully inserted
     */
    public insertRow(rowIndex: number): boolean {
        if (rowIndex < 0 || rowIndex > this.currentRows) {
            return false;
        }

        // If we're already at the maximum row capacity, we can't add more
        if (this.currentRows >= this.maxRows) {
            console.error("Cannot insert row: Maximum row limit reached");
            return false;
        }

        // Shift all data from the insertion point and below
        const oldData = new Map<string, Cell>(this.data);
        this.data.clear();

        // Copy data, shifting rows as needed
        for (const [key, cell] of oldData.entries()) {
            const [row, col] = key.split("-").map(Number);

            if (row >= rowIndex) {
                // This is a row that needs to be shifted down
                this.data.set(this.getCellKey(row + 1, col), cell);
            } else {
                // This row stays in place
                this.data.set(key, cell);
            }
        }

        // Increment current row count
        this.currentRows++;
        return true;
    }

    /**
     * Removes a row at the specified position
     * @param rowIndex - The position of the row to remove
     * @returns boolean - Whether the row was successfully removed
     */
    public removeRow(rowIndex: number): boolean {
        if (rowIndex < 0 || rowIndex >= this.currentRows) {
            return false;
        }

        // Don't allow removing all rows
        if (this.currentRows <= 1) {
            console.error("Cannot remove row: At least one row must remain");
            return false;
        }

        // Shift all data from the removal point and below
        const oldData = new Map<string, Cell>(this.data);
        this.data.clear();

        // Copy data, shifting rows as needed
        for (const [key, cell] of oldData.entries()) {
            const [row, col] = key.split("-").map(Number);

            if (row === rowIndex) {
                // Skip this row as it's being removed
                continue;
            } else if (row > rowIndex) {
                // This is a row that needs to be shifted up
                this.data.set(this.getCellKey(row - 1, col), cell);
            } else {
                // This row stays in place
                this.data.set(key, cell);
            }
        }

        // Decrement current row count
        this.currentRows--;
        return true;
    }

    /**
     * Inserts a column at the specified position
     * @param colIndex - The position where the column will be inserted
     * @returns boolean - Whether the column was successfully inserted
     */
    public insertColumn(colIndex: number): boolean {
        if (colIndex < 0 || colIndex > this.currentCols) {
            return false;
        }

        // If we're already at the maximum column capacity, we can't add more
        if (this.currentCols >= this.maxCols) {
            console.error("Cannot insert column: Maximum column limit reached");
            return false;
        }

        // Shift all data from the insertion point and to the right
        const oldData = new Map<string, Cell>(this.data);
        this.data.clear();

        // Copy data, shifting columns as needed
        for (const [key, cell] of oldData.entries()) {
            const [row, col] = key.split("-").map(Number);

            if (col >= colIndex) {
                // This is a column that needs to be shifted right
                this.data.set(this.getCellKey(row, col + 1), cell);
            } else {
                // This column stays in place
                this.data.set(key, cell);
            }
        }

        // Increment current column count
        this.currentCols++;
        return true;
    }

    /**
     * Removes a column at the specified position
     * @param colIndex - The position of the column to remove
     * @returns boolean - Whether the column was successfully removed
     */
    public removeColumn(colIndex: number): boolean {
        if (colIndex < 0 || colIndex >= this.currentCols) {
            return false;
        }

        // Don't allow removing all columns
        if (this.currentCols <= 1) {
            console.error(
                "Cannot remove column: At least one column must remain"
            );
            return false;
        }

        // Shift all data from the removal point and to the right
        const oldData = new Map<string, Cell>(this.data);
        this.data.clear();

        // Copy data, shifting columns as needed
        for (const [key, cell] of oldData.entries()) {
            const [row, col] = key.split("-").map(Number);

            if (col === colIndex) {
                // Skip this column as it's being removed
                continue;
            } else if (col > colIndex) {
                // This is a column that needs to be shifted left
                this.data.set(this.getCellKey(row, col - 1), cell);
            } else {
                // This column stays in place
                this.data.set(key, cell);
            }
        }

        // Decrement current column count
        this.currentCols--;
        return true;
    }
}
