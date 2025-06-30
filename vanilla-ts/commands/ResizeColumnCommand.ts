// src/commands/ResizeColumnCommand.ts
import { Command } from "./Command.js";
import { Grid } from "../core/Grid.js";

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
     * @param oldWidth - The old width to revert to when undoing (optional, defaults to current width)
     */
    constructor(
        grid: Grid,
        colIndex: number,
        newWidth: number,
        oldWidth?: number
    ) {
        super();
        this.grid = grid;
        this.colIndex = colIndex;
        this.newWidth = newWidth;
        this.oldWidth =
            oldWidth !== undefined ? oldWidth : grid.getColumnWidth(colIndex);
        this.defaultWidth = this.oldWidth;
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
        // When undoing, revert to the old width
        this.grid.setColumnWidth(this.colIndex, this.oldWidth);
    }
}
