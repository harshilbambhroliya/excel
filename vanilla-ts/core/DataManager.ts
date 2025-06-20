// src/core/DataManager.ts
import { Cell } from '../models/Cell.js';
import { IDataRecord } from '../types/interfaces.js';

export class DataManager {
    private data: Map<string, Cell> = new Map();
    private maxRows: number = 100000;
    private maxCols: number = 500;

    constructor() {
        this.initializeEmptyGrid();
    }

    private initializeEmptyGrid(): void {
    }

    private getCellKey(row: number, col: number): string {
        return `${row}-${col}`;
    }

    public clear(): void {
        this.data.clear();
    }

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

    public setCell(row: number, col: number, value: any): void {
        const cell = this.getCell(row, col);
        if(row == 0){
            console.log("cell", cell);
        }
        cell.setValue(value);
    }

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

    public getMaxRows(): number {
        return this.maxRows;
    }

    public getMaxCols(): number {
        return this.maxCols;
    }
}