import { Command } from "./Command.js";
import { Grid } from "../core/Grid.js";

/**
 * Command for removing a column from the grid
 */
export class RemoveColumnCommand extends Command {
    /** @type {Grid} The grid where the column will be removed */
    private grid: Grid;

    /** @type {number} The index of the column to remove */
    private colIndex: number;

    /** @type {boolean} Whether the command has been executed */
    private executed: boolean = false;

    /**
     * Creates a new RemoveColumnCommand
     * @param {Grid} grid The grid where the column will be removed
     * @param {number} colIndex The index of the column to remove
     */
    constructor(grid: Grid, colIndex: number) {
        super();
        this.grid = grid;
        this.colIndex = colIndex;
    }

    /**
     * Executes the command
     */
    public execute(): void {
        this.grid.removeColumn(this.colIndex);
        this.executed = true;
    }

    /**
     * Undoes the command
     */
    public undo(): void {
        if (this.executed) {
            this.grid.insertColumn(this.colIndex);
        }
    }
}
