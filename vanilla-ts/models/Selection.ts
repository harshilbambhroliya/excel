// src/models/Selection.ts
import { ISelection, IPosition } from '../types/interfaces.js';

export class Selection implements ISelection {
    public startRow: number;
    public startCol: number;
    public endRow: number;
    public endCol: number;
    public isActive: boolean = false;

    constructor() {
        this.startRow = 0;
        this.startCol = 0;
        this.endRow = 0;
        this.endCol = 0;
    }

    public start(row: number, col: number): void {
        this.startRow = row;
        this.startCol = col;
        this.endRow = row;
        this.endCol = col;
        this.isActive = true;
    }

    public extend(row: number, col: number): void {
        this.endRow = row;
        this.endCol = col;
    }

    public clear(): void {
        this.isActive = false;
    }

    public getRange(): IPosition[] {
        const positions: IPosition[] = [];
        const minRow = Math.min(this.startRow, this.endRow);
        const maxRow = Math.max(this.startRow, this.endRow);
        const minCol = Math.min(this.startCol, this.endCol);
        const maxCol = Math.max(this.startCol, this.endCol);

        for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
                positions.push({ row, col });
            }
        }

        return positions;
    }

    public contains(row: number, col: number): boolean {
        if (!this.isActive) return false;
        
        const minRow = Math.min(this.startRow, this.endRow);
        const maxRow = Math.max(this.startRow, this.endRow);
        const minCol = Math.min(this.startCol, this.endCol);
        const maxCol = Math.max(this.startCol, this.endCol);

        return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
    }
}