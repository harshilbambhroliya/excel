// src/models/Column.ts
/**
 * Represents a column in the spreadsheet grid
 */
export class Column {
    /** @type {number} The width of the column in pixels */
    public width: number;
    
    /** @type {number} The index of the column in the grid */
    public index: number;
    
    /** @type {boolean} Whether the column is currently selected */
    public isSelected: boolean = false;
    
    /** @type {string} The header label for the column (e.g., 'A', 'B', 'AA') */
    public header: string;

    /**
     * Initializes a new Column instance
     * @param {number} index The index of the column
     * @param {number} width The width of the column in pixels
     */
    constructor(index: number, width: number = 100) {
        this.index = index;
        this.width = width;
        this.header = this.generateColumnHeader(index);
    }

    /**
     * Generates a column header label from a column index (0 = 'A', 1 = 'B', etc.)
     * @param {number} index The column index
     * @returns {string} The generated column header label
     */
    private generateColumnHeader(index: number): string {
        let result = '';
        let temp = index;
        
        do {
            result = String.fromCharCode(65 + (temp % 26)) + result;
            temp = Math.floor(temp / 26) - 1;
        } while (temp >= 0);
        
        return result;
    }

    /**
     * Sets the width of the column
     * @param {number} width The new width in pixels
     */
    public setWidth(width: number): void {
        this.width = Math.max(50, width); // Minimum width
    }

    /**
     * Marks the column as selected
     */
    public select(): void {
        this.isSelected = true;
    }

    /**
     * Marks the column as not selected
     */
    public deselect(): void {
        this.isSelected = false;
    }
}