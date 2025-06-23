// src/commands/ResizeColumnCommand.ts
import { Command } from './Command.js';
import { Grid } from '../core/Grid.js';

/**
 * Resizes a column in the grid
 */
export class ResizeColumnCommand extends Command {
    /**
     * The grid
     */
    private grid: Grid;

    /**
     * The column index
     */
    private colIndex: number;
    
    /**
     * The new width
     */
    private newWidth: number;
    
    /**
     * The old width
     */
    private oldWidth: number;

    /**
     * The constructor
     */
    constructor(grid: Grid, colIndex: number, newWidth: number) {
        super();
        this.grid = grid;
        this.colIndex = colIndex;
        this.newWidth = newWidth;
        this.oldWidth = grid.getColumnWidth(colIndex);
    }

    /**
     * Executes the command
     */
    public execute(): void {
        this.grid.setColumnWidth(this.colIndex, this.newWidth);
    }

    /**
     * Undoes the command
     */
    public undo(): void {
        this.grid.setColumnWidth(this.colIndex, this.oldWidth);
    }
}