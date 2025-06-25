// src/commands/Command.ts
import { ICommand } from '../types/interfaces.js';

/**
 * Abstract base class for all commands in the application
 * Implements the command pattern for undo/redo functionality
 */
export abstract class Command implements ICommand {
    /**
     * Executes the command
     */
    abstract execute(): void;
    
    /**
     * Undoes the command
     */
    abstract undo(): void;
}

/**
 * Manages command execution, undo, and redo functionality
 */
export class CommandManager {
    /** @type {Command[]} Stack of commands that can be undone */
    private undoStack: Command[] = [];
    
    /** @type {Command[]} Stack of commands that can be redone */
    private redoStack: Command[] = [];
    
    /** @type {number} Maximum number of commands to keep in history */
    private maxHistory: number = 100;

    /**
     * Executes a command and adds it to the undo stack
     * @param {Command} command The command to execute
     */
    public executeCommand(command: Command): void {
        command.execute();
        this.undoStack.push(command);
        this.redoStack = []; // Clear redo stack when new command is executed
        
        // Limit history size
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
    }

    /**
     * Undoes the most recent command
     * @returns {boolean} True if a command was undone, false otherwise
     */
    public undo(): boolean {
        const command = this.undoStack.pop();
        if (command) {
            command.undo();
            this.redoStack.push(command);
            return true;
        }
        return false;
    }

    /**
     * Redoes the most recently undone command
     * @returns {boolean} True if a command was redone, false otherwise
     */
    public redo(): boolean {
        const command = this.redoStack.pop();
        if (command) {
            command.execute();
            this.undoStack.push(command);
            return true;
        }
        return false;
    }

    /**
     * Checks if there are commands that can be undone
     * @returns {boolean} True if there are commands in the undo stack
     */
    public canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    /**
     * Checks if there are commands that can be redone
     * @returns {boolean} True if there are commands in the redo stack
     */
    public canRedo(): boolean {
        return this.redoStack.length > 0;
    }
}

/**
 * A command that groups multiple commands together and executes them as a single unit
 * This is useful for operations that modify multiple cells at once
 */
export class CompositeCommand implements ICommand {
    /** @type {Command[]} List of commands to execute as a group */
    private commands: Command[] = [];

    /**
     * Creates a new composite command
     * @param {Command[]} commands Optional initial list of commands
     */
    constructor(commands: Command[] = []) {
        this.commands = commands;
    }

    /**
     * Adds a command to the composite
     * @param {Command} command The command to add
     */
    public addCommand(command: Command): void {
        this.commands.push(command);
    }

    /**
     * Executes all commands in the composite
     */
    public execute(): void {
        this.commands.forEach(command => command.execute());
    }

    /**
     * Undoes all commands in the composite in reverse order
     */
    public undo(): void {
        // Undo commands in reverse order
        for (let i = this.commands.length - 1; i >= 0; i--) {
            this.commands[i].undo();
        }
    }

    /**
     * Gets the number of commands in this composite
     * @returns {number} The number of commands
     */
    public count(): number {
        return this.commands.length;
    }
}