// src/models/Selection.ts
import { ISelection, IPosition } from '../types/interfaces.js';

/**
 * Manages the current selection in the grid
 */

export class Selection implements ISelection {
    /** @type {number} The starting row index of the selection */
    public startRow: number;

    /** @type {number} The starting column index of the selection */
    public startCol: number;
    
    /** @type {number} The ending row index of the selection */
    public endRow: number;
    
    /** @type {number} The ending column index of the selection */
    public endCol: number;
    
    /** @type {boolean} Whether the selection is active */
    public isActive: boolean = false;

    /**
     * Initializes a new Selection instance
     */
    constructor() {
        this.startRow = 0;
        this.startCol = 0;
        this.endRow = 0;
        this.endCol = 0;
    }

    /**
     * Starts a new selection
     * @param {number} row The starting row index
     * @param {number} col The starting column index
     */
    public start(row: number, col: number): void {
        this.startRow = row;
        this.startCol = col;
        this.endRow = row;
        this.endCol = col;
        this.isActive = true;
    }

    /**
     * Extends the selection to include a new cell
     * @param {number} row The row index of the new cell
     * @param {number} col The column index of the new cell
     */
    public extend(row: number, col: number): void {
        this.endRow = row;
        this.endCol = col;
        console.log(this.endRow, this.endCol);
        
    }

    /**
     * Clears the selection
     */
    public clear(): void {
        this.isActive = false;
    }

    /**
     * Gets the range of cells in the selection
     * @returns {IPosition[]} Array of positions in the selection
     */
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

    /**
     * Checks if a given position is within the selection
     * @param {number} row The row index to check
     * @param {number} col The column index to check
     * @returns {boolean} True if the position is within the selection, false otherwise
     */
    public contains(row: number, col: number): boolean {
        if (!this.isActive) return false;
        
        const minRow = Math.min(this.startRow, this.endRow);
        const maxRow = Math.max(this.startRow, this.endRow);
        const minCol = Math.min(this.startCol, this.endCol);
        const maxCol = Math.max(this.startCol, this.endCol);

        return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
    }
}