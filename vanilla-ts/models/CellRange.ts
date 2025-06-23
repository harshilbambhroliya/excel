// src/models/CellRange.ts
import { IPosition } from '../types/interfaces.js';

/**
 * Represents a range of cells in the grid
 */

export class CellRange {
    /** @type {number} The starting row index of the range */
    public startRow: number;

    /** @type {number} The starting column index of the range */
    public startCol: number;
    
    /** @type {number} The ending row index of the range */
    public endRow: number;
    
    /** @type {number} The ending column index of the range */
    public endCol: number;

    /**
     * Initializes a new CellRange instance
     * @param {number} startRow The starting row index of the range
     * @param {number} startCol The starting column index of the range
     * @param {number} endRow The ending row index of the range
     * @param {number} endCol The ending column index of the range
     */
    constructor(startRow: number, startCol: number, endRow: number, endCol: number) {
        this.startRow = Math.min(startRow, endRow);
        this.startCol = Math.min(startCol, endCol);
        this.endRow = Math.max(startRow, endRow);
        this.endCol = Math.max(startCol, endCol);
    }

    /**
     * Gets all positions in the range
     * @returns {IPosition[]} Array of positions in the range
     */
    public getPositions(): IPosition[] {
        const positions: IPosition[] = [];
        for (let row = this.startRow; row <= this.endRow; row++) {
            for (let col = this.startCol; col <= this.endCol; col++) {
                positions.push({ row, col });
            }
        }
        return positions;
    }

    /**
     * Checks if a given position is within the range
     * @param {number} row The row index to check
     * @param {number} col The column index to check
     * @returns {boolean} True if the position is within the range, false otherwise
     */
    public contains(row: number, col: number): boolean {
        return row >= this.startRow && row <= this.endRow &&
               col >= this.startCol && col <= this.endCol;
    }

    /**
     * Gets the total number of cells in the range
     * @returns {number} The number of cells in the range
     */
    public getSize(): number {
        return (this.endRow - this.startRow + 1) * (this.endCol - this.startCol + 1);
    }
}