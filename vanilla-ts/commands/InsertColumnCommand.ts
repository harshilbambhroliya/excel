import { Command } from './Command.js';
import { Grid } from '../core/Grid.js';

/**
 * Command for inserting a column at a specific position
 */
export class InsertColumnCommand extends Command {
    /** @type {Grid} The grid where the column will be inserted */
    private grid: Grid;
    
    /** @type {number} The position where the column will be inserted */
    private position: number;
    
    /** @type {boolean} Whether the command has been executed */
    private executed: boolean = false;

    /**
     * Creates a new InsertColumnCommand
     * @param {Grid} grid The grid where the column will be inserted
     * @param {number} position The position where the column will be inserted
     */
    constructor(grid: Grid, position: number) {
        super();
        this.grid = grid;
        this.position = position;
    }

    /**
     * Executes the command to insert a column
     */
    public execute(): void {
        if (!this.executed) {
            this.grid.insertColumn(this.position);
            this.executed = true;
        }
    }

    /**
     * Undoes the command by removing the inserted column
     */
    public undo(): void {
        if (this.executed) {
            this.grid.removeColumn(this.position);
            this.executed = false;
        }
    }
} 