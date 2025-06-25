// src/core/DataManager.ts
import { Cell } from '../models/Cell.js';
import { IDataRecord } from '../types/interfaces.js';

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
    private maxCols: number = 1000;

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
            throw new Error('Cell position out of bounds');
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
        if(row == 0){
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
        
        // Get the actual number of rows from the data, with a minimum of initialRows
        this.maxRows = Math.max(records.length + 1, this.initialRows); // +1 for header row
        
        // Determine the number of columns based on the record structure
        // For our standard IDataRecord, we have 5 columns: ID, First Name, Last Name, Age, Salary
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
        this.setCell(0, 0, 'ID');
        this.setCell(0, 1, 'First Name');
        this.setCell(0, 2, 'Last Name');
        this.setCell(0, 3, 'Age');
        this.setCell(0, 4, 'Salary');

        // Load records starting from row 1
        records.forEach((record, index) => {
            const row = index + 1;
            this.setCell(row, 0, record.id);
            this.setCell(row, 1, record.firstName);
            this.setCell(row, 2, record.lastName);
            this.setCell(row, 3, record.age);
            this.setCell(row, 4, record.salary);
        });

        const rowBuffer = 20; 
        const colBuffer = 5; 
        
        // Set current rows to the data length plus header and buffer, but not exceeding maxRows
        this.currentRows = Math.min(records.length + 1 + rowBuffer, this.maxRows);
        
        // Set current columns to the number of columns in the data plus buffer, but not exceeding maxCols
        this.currentCols = Math.min(columnsInData + colBuffer, this.maxCols);
        
        console.log(`Data loaded: Rows set to ${this.currentRows}, Columns set to ${this.currentCols}`);
    }

    /**
     * Gets the cells in range
     * @param startRow - The starting row index
     * @param startCol - The starting column index
     * @param endRow - The ending row index
     * @param endCol - The ending column index
     * @returns The cells in range
     */
    public getCellsInRange(startRow: number, startCol: number, endRow: number, endCol: number): Cell[] {
        const cells: Cell[] = [];
        
        for (let row = Math.min(startRow, endRow); row <= Math.max(startRow, endRow); row++) {
            for (let col = Math.min(startCol, endCol); col <= Math.max(startCol, endCol); col++) {
                if (row >= 0 && row < this.maxRows && col >= 0 && col < this.maxCols) {
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
}