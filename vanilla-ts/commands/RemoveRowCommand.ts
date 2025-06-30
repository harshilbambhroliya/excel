import { Command } from "./Command.js";
import { Grid } from "../core/Grid.js";

export class RemoveRowCommand extends Command {
    /** @type {Grid} The grid where the row will be removed */
    private grid: Grid;

    /** @type {number} The index of the row to remove */
    private rowIndex: number;

    /** @type {boolean} Whether the command has been executed */
    private executed: boolean = false;

    /**
     * Creates a new RemoveRowCommand
     * @param {Grid} grid The grid where the row will be removed
     * @param {number} rowIndex The index of the row to remove
     */
    constructor(grid: Grid, rowIndex: number) {
        super();
        this.grid = grid;
        this.rowIndex = rowIndex;
    }

    /**
     * Executes the command
     */
    public execute(): void {
        this.grid.removeRow(this.rowIndex);
        this.executed = true;
    }

    /**
     * Undoes the command
     */
    public undo(): void {
        if (this.executed) {
            this.grid.insertRow(this.rowIndex);
        }
    }
}
