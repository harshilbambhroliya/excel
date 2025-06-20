// src/models/CellRange.ts
import { IPosition } from '../types/interfaces.js';
import { Cell } from './Cell.js';

export class CellRange {
    public startRow: number;
    public startCol: number;
    public endRow: number;
    public endCol: number;

    constructor(startRow: number, startCol: number, endRow: number, endCol: number) {
        this.startRow = Math.min(startRow, endRow);
        this.startCol = Math.min(startCol, endCol);
        this.endRow = Math.max(startRow, endRow);
        this.endCol = Math.max(startCol, endCol);
    }

    public getPositions(): IPosition[] {
        const positions: IPosition[] = [];
        for (let row = this.startRow; row <= this.endRow; row++) {
            for (let col = this.startCol; col <= this.endCol; col++) {
                positions.push({ row, col });
            }
        }
        return positions;
    }

    public contains(row: number, col: number): boolean {
        return row >= this.startRow && row <= this.endRow &&
               col >= this.startCol && col <= this.endCol;
    }

    public getSize(): number {
        return (this.endRow - this.startRow + 1) * (this.endCol - this.startCol + 1);
    }
}