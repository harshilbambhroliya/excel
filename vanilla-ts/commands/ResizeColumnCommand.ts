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
     * The default column width to revert to when undoing
     */
    private defaultWidth: number;

    /**
     * The constructor
     * @param grid - The grid
     * @param colIndex - The column index
     * @param newWidth - The new width
     * @param defaultWidth - The default width to use when undoing (optional)
     */
    constructor(grid: Grid, colIndex: number, newWidth: number, defaultWidth?: number) {
        super();
        this.grid = grid;
        this.colIndex = colIndex;
        this.newWidth = newWidth;
        this.oldWidth = grid.getColumnWidth(colIndex);
        this.defaultWidth = defaultWidth || this.oldWidth;
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
        // When undoing, revert to default width instead of previous width
        this.grid.setColumnWidth(this.colIndex, this.defaultWidth);
    }
}