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

    /** @type {boolean} Whether the row was directly clicked by the user */
    public isDirectlySelected: boolean = false;

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
     * Sets the index of the row
     * @param {number} index The new index
     */
    public setIndex(index: number): void {
        this.index = index;
    }

    /**
     * Marks the row as selected
     * @param {boolean} direct Whether the selection was made directly by clicking the header
     */
    public select(direct: boolean = false): void {
        this.isSelected = true;
        if (direct) {
            this.isDirectlySelected = true;
        }
    }

    /**
     * Marks the row as not selected
     */
    public deselect(): void {
        this.isSelected = false;
        this.isDirectlySelected = false;
    }
}
