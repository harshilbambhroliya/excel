// src/models/Row.ts
/**
 * Represents a row in the spreadsheet grid
 */
export class Row {
    /** @type {number} The height of the row in pixels */
    public height: number;
    
    /** @type {number} The index of the row in the grid */
    public index: number;
    
    /** @type {boolean} Whether the row is currently selected */
    public isSelected: boolean = false;

    /**
     * Initializes a new Row instance
     * @param {number} index The index of the row
     * @param {number} height The height of the row in pixels
     */
    constructor(index: number, height: number = 25) {
        this.index = index;
        this.height = height;
    }

    /**
     * Sets the height of the row
     * @param {number} height The new height in pixels
     */
    public setHeight(height: number): void {
        this.height = Math.max(15, height); // Minimum height
    }

    /**
     * Marks the row as selected
     */
    public select(): void {
        this.isSelected = true;
    }

    /**
     * Marks the row as not selected
     */
    public deselect(): void {
        this.isSelected = false;
    }
}