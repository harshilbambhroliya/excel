// src/commands/ResizeRowCommand.ts
import { Command } from "./Command.js";
import { Grid } from "../core/Grid.js";

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
     * @param oldHeight - The old height to revert to when undoing (optional, defaults to current height)
     */
    constructor(
        grid: Grid,
        rowIndex: number,
        newHeight: number,
        oldHeight?: number
    ) {
        super();
        this.grid = grid;
        this.rowIndex = rowIndex;
        this.newHeight = newHeight;
        this.oldHeight =
            oldHeight !== undefined ? oldHeight : grid.getRowHeight(rowIndex);
        this.defaultHeight = this.oldHeight;
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
        // When undoing, revert to the old height
        this.grid.setRowHeight(this.rowIndex, this.oldHeight);
    }
}
