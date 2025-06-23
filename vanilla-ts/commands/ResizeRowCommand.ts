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
     * The constructor
     */
    constructor(grid: Grid, rowIndex: number, newHeight: number) {
        super();
        this.grid = grid;
        this.rowIndex = rowIndex;
        this.newHeight = newHeight;
        this.oldHeight = grid.getRowHeight(rowIndex);
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
        this.grid.setRowHeight(this.rowIndex, this.oldHeight);
    }
}