// src/commands/ResizeRowCommand.ts
import { Command } from './Command.js';
import { Grid } from '../core/Grid.js';

/**
 * Resizes a row in the grid
 */
export class ResizeRowCommand extends Command {
    /**
     * The grid
     */
    private grid: Grid;

    /**
     * The row index
     */
    private rowIndex: number;
    
    /**
     * The new height
     */
    private newHeight: number;
    
    /**
     * The old height
     */
    private oldHeight: number;

    /**
     * The default row height to revert to when undoing
     */
    private defaultHeight: number;

    /**
     * The constructor
     * @param grid - The grid
     * @param rowIndex - The row index
     * @param newHeight - The new height
     * @param defaultHeight - The default height to use when undoing (optional)
     */
    constructor(grid: Grid, rowIndex: number, newHeight: number, defaultHeight?: number) {
        super();
        this.grid = grid;
        this.rowIndex = rowIndex;
        this.newHeight = newHeight;
        this.oldHeight = grid.getRowHeight(rowIndex);
        this.defaultHeight = defaultHeight || this.oldHeight;
    }

    /**
     * Executes the command
     */
    public execute(): void {
        this.grid.setRowHeight(this.rowIndex, this.newHeight);
    }

    /**
     * Undoes the command
     */
    public undo(): void {
        // When undoing, revert to default height instead of previous height
        this.grid.setRowHeight(this.rowIndex, this.defaultHeight);
    }
}