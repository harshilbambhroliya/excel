// src/commands/EditCellCommand.ts
import { Command } from "./Command.js";
import { Grid } from "../core/Grid.js";
import { ICellStyle } from "../types/interfaces.js";

/**
 * Command for editing a cell's value with undo/redo support
 */
export class EditCellCommand extends Command {
    /** @type {Grid} Reference to the grid */
    private grid: Grid;

    /** @type {number} Row index of the cell being edited */
    private row: number;

    /** @type {number} Column index of the cell being edited */
    private col: number;

    /** @type {any} New value to set in the cell */
    private newValue: any;

    /** @type {any} Original value of the cell before editing */
    private oldValue: any;

    /** @type {string} Optional style to apply to the cell */
    private style?: ICellStyle;

    /**
     * Initializes a new EditCellCommand
     * @param {Grid} grid The grid containing the cell
     * @param {number} row The row index of the cell
     * @param {number} col The column index of the cell
     * @param {any} newValue The new value to set in the cell
     */
    constructor(
        grid: Grid,
        row: number,
        col: number,
        newValue: any,
        style?: ICellStyle
    ) {
        super();
        this.grid = grid;
        this.row = row;
        this.col = col;
        this.newValue = newValue;
        this.oldValue = grid.getCellValue(row, col);
        this.style = style;
    }

    /**
     * Executes the command by setting the new value in the cell
     */
    public execute(): void {
        this.grid.setCellValue(this.row, this.col, this.newValue);
        if (this.style) {
            this.grid.setCellStyle(this.row, this.col, this.style);
        }
    }

    /**
     * Undoes the command by restoring the original value of the cell
     */
    public undo(): void {
        this.grid.setCellValue(this.row, this.col, this.oldValue);
        if (this.style) {
            this.grid.setCellStyle(this.row, this.col, this.style);
        }
    }
}
