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
    private maxRows: number = 100000;

    /**
     * The maximum number of columns
     */
    private maxCols: number = 16384;

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
        this.maxRows = records.length + 1;
        
        // Set headers
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
}