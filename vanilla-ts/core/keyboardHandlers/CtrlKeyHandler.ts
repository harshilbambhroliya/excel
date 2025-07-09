// src/core/keyboard/CtrlKeyHandler.ts

import { BaseKeyboardHandler } from "./BaseKeyboardHandler.js";
import { Selection } from "../../models/Selection.js";
import { CompositeCommand } from "../../commands/Command.js";
import { EditCellCommand } from "../../commands/EditCellCommand.js";
import { Cell } from "../../models/Cell.js";

/**
 * Handles Ctrl key combinations (Ctrl+Arrow, Ctrl+Home/End, Ctrl+C/X/V/A/Z/Y)
 */
export class CtrlKeyHandler extends BaseKeyboardHandler {
    /**
     * @param event - The keyboard event to check
     * This method checks if the event has Ctrl key pressed and no Shift key pressed.
     * @returns true if this handler can handle the event, false otherwise
     */
    canHandle(event: KeyboardEvent): boolean {
        const modifiers = this.hasModifierKeys(event);
        return modifiers.ctrl && !modifiers.shift;
    }

    /**
     * Handle the keyboard event
     * @param event - The keyboard event to handle
     * @param selection - The current selection in the grid
     * This method handles various Ctrl key combinations for undo, redo, copy, cut, paste, select all,
     * and navigation within the grid.
     */
    handle(event: KeyboardEvent, selection: Selection): boolean {
        if (!this.canHandle(event)) {
            return false;
        }

        switch (event.key) {
            case "z":
            case "Z":
                return this.handleUndo(event);
            case "y":
            case "Y":
                return this.handleRedo(event);
            case "c":
            case "C":
                return this.handleCopy(event, selection);
            case "x":
            case "X":
                return this.handleCut(event, selection);
            case "v":
            case "V":
                return this.handlePaste(event, selection);
            case "a":
            case "A":
                return this.handleSelectAll(event, selection);
            case "b":
            case "B":
                return this.handleBold(event, selection);
            case "i":
            case "I":
                return this.handleItalic(event, selection);
            case "u":
            case "U":
                return this.handleUnderline(event, selection);
            case "ArrowUp":
            case "ArrowDown":
            case "ArrowLeft":
            case "ArrowRight":
                return this.handleCtrlNavigation(event, selection);
            case "Home":
            case "End":
                return this.handleCtrlHomeEnd(event, selection);
            case "Enter":
                return this.handleCtrlEnter(event, selection);
        }

        return false;
    }

    /**
     * Handle the undo action
     * @param event - The keyboard event to handle
     * This method triggers the undo command and updates the UI.
     */
    private handleUndo(event: KeyboardEvent): boolean {
        this.preventDefault(event);
        const undoSuccessful = this.context.commandManager.undo();

        // Make sure to update the UI properly after undoing
        if (undoSuccessful) {
            this.context.grid.clearHeaderSelections();
            this.context.highlightHeadersForSelection();
            this.context.renderer.render();
            this.context.updateSelectionStats();
        }
        return true;
    }

    /**
     * Handle the redo action
     * @param event - The keyboard event to handle
     * This method triggers the redo command and updates the UI.
     */
    private handleRedo(event: KeyboardEvent): boolean {
        this.preventDefault(event);
        const redoSuccessful = this.context.commandManager.redo();

        // Make sure to update the UI properly after redoing
        if (redoSuccessful) {
            this.context.grid.clearHeaderSelections();
            this.context.highlightHeadersForSelection();
            this.context.renderer.render();
            this.context.updateSelectionStats();
        }
        return true;
    }

    /**
     * Handle the copy action
     * @param event - The keyboard event to handle
     * @param selection - The current selection in the grid
     * This method copies the selected cells to the clipboard and updates the UI.
     */
    private handleCopy(event: KeyboardEvent, selection: Selection): boolean {
        this.preventDefault(event);
        this.copySelection(selection);
        return true;
    }

    /**
     * Handle the cut action
     * @param event - The keyboard event to handle
     * @param selection - The current selection in the grid
     * This method copies the selected cells to the clipboard, deletes them from the grid,
     * and updates the UI.
     */
    private handleCut(event: KeyboardEvent, selection: Selection): boolean {
        this.preventDefault(event);
        this.copySelection(selection);
        this.context.deleteSelectedCells();
        this.updateUI(selection);
        return true;
    }

    /**
     * Handle the paste action
     * @param event - The keyboard event to handle
     * @param selection - The current selection in the grid
     * This method pastes the clipboard content into the selected cells and updates the UI.
     */
    private handlePaste(event: KeyboardEvent, selection: Selection): boolean {
        this.preventDefault(event);
        this.pasteToSelection(selection);
        return true;
    }

    /**
     * Handle the select all action
     * @param event - The keyboard event to handle
     * @param selection - The current selection in the grid
     * This method selects all cells in the grid and updates the UI.
     */
    private handleSelectAll(
        event: KeyboardEvent,
        selection: Selection
    ): boolean {
        this.preventDefault(event);
        this.context.grid.clearAllSelections();
        this.context.renderer.clearFormulaRangeSelection();
        selection.start(0, 0);
        selection.extend(
            this.context.grid.getMaxRows() - 1,
            this.context.grid.getMaxCols() - 1
        );
        this.updateUI(selection);
        return true;
    }

    /**
     * Handle Ctrl+Arrow key navigation
     * @param event - The keyboard event to handle
     * @param selection - The current selection in the grid
     * This method navigates to the next data edge in the specified direction and updates the selection.
     */
    private handleCtrlNavigation(
        event: KeyboardEvent,
        selection: Selection
    ): boolean {
        if (!selection.isActive) return false;

        this.preventDefault(event);

        const newRow = selection.startRow;
        const newCol = selection.startCol;
        let targetRow = newRow;
        let targetCol = newCol;

        switch (event.key) {
            case "ArrowRight":
                targetCol = this.context.findNextDataEdge(
                    newRow,
                    newCol,
                    "right"
                );
                break;
            case "ArrowLeft":
                targetCol = this.context.findNextDataEdge(
                    newRow,
                    newCol,
                    "left"
                );
                break;
            case "ArrowUp":
                targetRow = this.context.findNextDataEdge(newRow, newCol, "up");
                break;
            case "ArrowDown":
                targetRow = this.context.findNextDataEdge(
                    newRow,
                    newCol,
                    "down"
                );
                break;
        }

        this.context.grid.clearAllSelections();
        selection.start(targetRow, targetCol);
        this.context.handleSelectionAfterKeyDown(
            selection,
            targetRow,
            targetCol
        );
        return true;
    }

    /**
     * Handle Ctrl+Home and Ctrl+End key navigation
     * @param event - The keyboard event to handle
     * @param selection - The current selection in the grid
     * This method navigates to the start or end of the data range and updates the selection.
     */
    private handleCtrlHomeEnd(
        event: KeyboardEvent,
        selection: Selection
    ): boolean {
        if (!selection.isActive) return false;

        this.preventDefault(event);

        const newRow = selection.startRow;
        let newCol = selection.startCol;

        if (event.key === "Home") {
            newCol = 0;
        } else if (event.key === "End") {
            newCol = this.context.findLastUsedColumn(newRow);
        }

        this.context.grid.clearAllSelections();
        selection.start(newRow, newCol);
        this.context.handleSelectionAfterKeyDown(selection, newRow, newCol);
        return true;
    }

    /**
     * Handle Ctrl+Enter key action
     * @param event - The keyboard event to handle
     * @param selection - The current selection in the grid
     * This method clears all selections and sets the current selection to the start position.
     */
    private handleCtrlEnter(
        event: KeyboardEvent,
        selection: Selection
    ): boolean {
        this.preventDefault(event);
        this.context.grid.clearAllSelections();
        selection.start(selection.startRow, selection.startCol);
        this.context.renderer.render();
        this.context.updateSelectionStats();
        return true;
    }

    /**
     * Copy the current selection to the clipboard
     * @param selection - The current selection in the grid
     * This method renders a dotted line across the selection and copies the cell values to the clipboard.
     */
    private copySelection(selection: Selection): void {
        this.context.renderer.renderDottedLineAcrossSelection(selection);
        if (selection.isActive) {
            const range = selection.getRange();
            let prevRow = -1;
            let values: string[] = [];
            let text = "";

            // Store cell metadata for internal use
            const cellMetadata: Array<{
                value: string;
                type: "string" | "number" | "boolean" | "date";
                isNumeric: boolean;
                row: number;
                col: number;
                style: any;
            }> = [];

            range.forEach((pos) => {
                const cell = this.context.grid.getCell(pos.row, pos.col);
                const value = cell.getDisplayValue();

                // Store metadata about this cell
                cellMetadata.push({
                    value: value,
                    type: cell.type,
                    isNumeric:
                        cell.type === "number" ||
                        (typeof cell.value === "string" &&
                            (/^-?[\d,]+\.?\d*$/.test(cell.value) ||
                                /^[$€£¥]\d+\.?\d*$/.test(cell.value) ||
                                /^\d+\.?\d*%$/.test(cell.value))),
                    row: pos.row,
                    col: pos.col,
                    style: { ...cell.style },
                });

                if (pos.row !== prevRow) {
                    text += values.join("\t") + "\n";
                    values = [];
                    prevRow = pos.row;
                }
                values.push(value);
            });

            text += values.join("\t") + "\n";
            navigator.clipboard.writeText(text);

            // Store metadata in window for internal use
            (window as any).__excelClipboardData = {
                cells: cellMetadata,
                timestamp: Date.now(),
            };
        }
        this.updateUI(selection);
    }

    /**
     * Paste the clipboard content into the selected cells
     * @param selection - The current selection in the grid
     * This method reads the clipboard content, splits it into rows and cells,
     * and applies the values to the grid starting from the selection's start position.
     */
    private pasteToSelection(selection: Selection): void {
        const newRow = selection.startRow;
        const newCol = selection.startCol;

        this.context.grid.clearAllSelections();
        selection.start(newRow, newCol);
        this.context.renderer.clearCopiedSelection();

        // Get clipboard metadata if available (from our internal clipboard)
        const clipboardData = (window as any).__excelClipboardData;
        const hasInternalData =
            clipboardData &&
            clipboardData.timestamp &&
            Date.now() - clipboardData.timestamp < 60000; // Use if less than 1 minute old

        navigator.clipboard
            .readText()
            .then((text) => {
                const rows = text.trim().split("\n");
                const compositeCommand = new CompositeCommand();

                rows.forEach((row, rowIndex) => {
                    const cells = row.split("\t");
                    cells.forEach((cellValue, colIndex) => {
                        const targetRow = newRow + rowIndex;
                        const targetCol = newCol + colIndex;

                        if (
                            targetRow < this.context.grid.getMaxRows() &&
                            targetCol < this.context.grid.getMaxCols()
                        ) {
                            const cell = this.context.grid.getCell(
                                targetRow,
                                targetCol
                            );

                            // Helper function to check if a string is numeric
                            const isNumericString = (str: string): boolean => {
                                const trimmedStr = str.trim();
                                // Enhanced numeric pattern detection
                                return (
                                    /^-?\d+(\.\d+)?$/.test(trimmedStr) || // Simple number like 123 or -123.45
                                    /^[$€£¥]\d+(\.\d+)?$/.test(trimmedStr) || // Currency format like $123.45
                                    /^\d+(\.\d+)?%$/.test(trimmedStr) || // Percentage format like 50.5%
                                    /^-?[\d,]+(\.\d+)?$/.test(trimmedStr) // Number with commas like 1,234.56
                                );
                            };

                            // Detect if this is a numeric value and parse appropriately
                            let parsedValue: any;
                            let isNumeric = false;
                            let cellMetadata = null;
                            let numericType = false;

                            // First check if this is a simple number that can be parsed directly
                            const trimmedCellValue = cellValue.trim();
                            if (/^-?\d+(\.\d+)?$/.test(trimmedCellValue)) {
                                // Definitely a number, convert it
                                parsedValue = parseFloat(trimmedCellValue);
                                isNumeric = true;
                                numericType = true;
                                console.log(
                                    `Direct parsing ${trimmedCellValue} as number: ${parsedValue}`
                                );
                            } else {
                                // Start with the string value
                                parsedValue = cellValue;

                                // Try to find metadata for this cell if we have internal clipboard data
                                if (hasInternalData) {
                                    // Calculate the relative position in the clipboard data
                                    const relativeRow = rowIndex;
                                    const relativeCol = colIndex;

                                    // Find the matching cell metadata
                                    cellMetadata = clipboardData.cells.find(
                                        (c: any) => {
                                            return (
                                                c.row -
                                                    clipboardData.cells[0]
                                                        .row ===
                                                    relativeRow &&
                                                c.col -
                                                    clipboardData.cells[0]
                                                        .col ===
                                                    relativeCol
                                            );
                                        }
                                    );

                                    if (cellMetadata) {
                                        isNumeric =
                                            cellMetadata.isNumeric ||
                                            cellMetadata.type === "number";
                                        if (cellMetadata.type === "number") {
                                            numericType = true;
                                        }
                                    }
                                }

                                // If still not identified as numeric, check with regex
                                if (!isNumeric) {
                                    isNumeric = isNumericString(cellValue);
                                }

                                // If it's identified as numeric but not converted yet, try to convert it
                                if (
                                    isNumeric &&
                                    !numericType &&
                                    /^-?\d+(\.\d+)?$/.test(trimmedCellValue)
                                ) {
                                    parsedValue = parseFloat(trimmedCellValue);
                                    numericType = true;
                                    console.log(
                                        `Converting identified numeric ${trimmedCellValue} to number: ${parsedValue}`
                                    );
                                }
                            }

                            // Create style object with proper alignment for numbers
                            let cellStyle: any = { ...cell.style };

                            if (isNumeric) {
                                // For numeric values, ensure we have right alignment
                                cellStyle.textAlign = "right"; // Always right-align numeric values
                                console.log(
                                    `Cell value "${cellValue}" identified as numeric. Setting alignment: right`
                                );
                            } else {
                                // For non-numeric values, use default or metadata styling
                                if (
                                    cellMetadata &&
                                    cellMetadata.style &&
                                    cellMetadata.style.textAlign
                                ) {
                                    cellStyle.textAlign =
                                        cellMetadata.style.textAlign;
                                } else {
                                    cellStyle.textAlign = "left"; // Default for non-numeric values
                                }

                                console.log(
                                    `Cell value "${cellValue}" identified as non-numeric. Setting alignment: ${cellStyle.textAlign}`
                                );
                            }

                            // Create the edit command
                            let editCommand;

                            if (isNumeric && numericType) {
                                // For numeric values that can be converted to numbers
                                // Create a Cell that will correctly set the type
                                const numericValue =
                                    typeof parsedValue === "number"
                                        ? parsedValue
                                        : parseFloat(
                                              String(parsedValue).replace(
                                                  /[^\d.-]/g,
                                                  ""
                                              )
                                          );

                                editCommand = new EditCellCommand(
                                    this.context.grid,
                                    targetRow,
                                    targetCol,
                                    numericValue,
                                    cellStyle,
                                    cell.formula
                                );

                                console.log(
                                    `Creating EditCellCommand for numeric cell: row=${targetRow}, col=${targetCol}, value=${numericValue}, type=${typeof numericValue}`
                                );

                                // Force cell to be right-aligned and numeric
                                const targetCell = this.context.grid.getCell(
                                    targetRow,
                                    targetCol
                                );
                                targetCell.type = "number";
                            } else {
                                // For other values or numeric strings that can't be converted
                                editCommand = new EditCellCommand(
                                    this.context.grid,
                                    targetRow,
                                    targetCol,
                                    parsedValue,
                                    cellStyle,
                                    cell.formula
                                );

                                // If it's numeric but can't be converted, still ensure right alignment
                                if (isNumeric) {
                                    const targetCell =
                                        this.context.grid.getCell(
                                            targetRow,
                                            targetCol
                                        );
                                    targetCell.style.textAlign = "right";
                                }
                            }

                            // Add the command only once
                            compositeCommand.addCommand(editCommand);
                        }
                    });
                });

                if (compositeCommand.count() > 0) {
                    this.context.commandManager.executeCommand(
                        compositeCommand
                    );

                    // Verify all numeric cells are properly right-aligned after paste
                    rows.forEach((row, rowIndex) => {
                        const cells = row.split("\t");
                        cells.forEach((cellValue, colIndex) => {
                            const targetRow = newRow + rowIndex;
                            const targetCol = newCol + colIndex;

                            if (
                                targetRow < this.context.grid.getMaxRows() &&
                                targetCol < this.context.grid.getMaxCols() &&
                                /^-?\d+(\.\d+)?$/.test(cellValue.trim())
                            ) {
                                const cell = this.context.grid.getCell(
                                    targetRow,
                                    targetCol
                                );
                                if (cell.style.textAlign !== "right") {
                                    console.warn(
                                        `Fixing alignment for numeric cell at [${targetRow},${targetCol}]: value=${cell.value}`
                                    );
                                    cell.style.textAlign = "right";
                                    if (
                                        typeof cell.value === "string" &&
                                        /^-?\d+(\.\d+)?$/.test(cell.value)
                                    ) {
                                        cell.value = parseFloat(cell.value);
                                        cell.type = "number";
                                    }
                                }
                            }
                        });
                    });
                }

                this.updateUI(selection);
            })
            .catch((err) => {
                console.error("Failed to read clipboard contents: ", err);
            });
    }

    private handleBold(event: KeyboardEvent, selection: Selection): boolean {
        this.preventDefault(event);

        // Get reference cell to determine whether to toggle on or off
        const referenceCell = this.context.grid.getCell(
            selection.startRow,
            selection.startCol
        );

        // Toggle bold: If already bold, set to normal, otherwise set to bold
        const newFontWeight =
            referenceCell.style.fontWeight === "bold" ? "normal" : "bold";

        // Create a composite command for multiple cells
        const compositeCommand = new CompositeCommand();

        // Get all selected cells and apply the formatting to each one
        const selectedCells = selection.getRange();
        selectedCells.forEach((pos) => {
            const cell = this.context.grid.getCell(pos.row, pos.col);
            const editCommand = new EditCellCommand(
                this.context.grid,
                pos.row,
                pos.col,
                cell.value,
                { fontWeight: newFontWeight },
                cell.formula
            );
            compositeCommand.addCommand(editCommand);
        });

        // Execute the composite command
        this.context.commandManager.executeCommand(compositeCommand);

        // Make sure to update the UI properly
        this.updateUI(selection);
        return true;
    }

    private handleItalic(event: KeyboardEvent, selection: Selection): boolean {
        this.preventDefault(event);

        // Get reference cell to determine whether to toggle on or off
        const referenceCell = this.context.grid.getCell(
            selection.startRow,
            selection.startCol
        );

        // Toggle italic: If already italic, set to normal, otherwise set to italic
        const newFontStyle =
            referenceCell.style.fontStyle === "italic" ? "normal" : "italic";

        // Create a composite command for multiple cells
        const compositeCommand = new CompositeCommand();

        // Get all selected cells and apply the formatting to each one
        const selectedCells = selection.getRange();
        selectedCells.forEach((pos) => {
            const cell = this.context.grid.getCell(pos.row, pos.col);
            const editCommand = new EditCellCommand(
                this.context.grid,
                pos.row,
                pos.col,
                cell.value,
                { fontStyle: newFontStyle },
                cell.formula
            );
            compositeCommand.addCommand(editCommand);
        });

        // Execute the composite command
        this.context.commandManager.executeCommand(compositeCommand);

        // Make sure to update the UI properly
        this.updateUI(selection);
        return true;
    }

    private handleUnderline(
        event: KeyboardEvent,
        selection: Selection
    ): boolean {
        this.preventDefault(event);

        // Get reference cell to determine whether to toggle on or off
        const referenceCell = this.context.grid.getCell(
            selection.startRow,
            selection.startCol
        );

        // Toggle underline: If already underlined, set to none, otherwise set to underline
        const newTextDecoration =
            referenceCell.style.textDecoration === "underline"
                ? "none"
                : "underline";

        // Create a composite command for multiple cells
        const compositeCommand = new CompositeCommand();

        // Get all selected cells and apply the formatting to each one
        const selectedCells = selection.getRange();
        selectedCells.forEach((pos) => {
            const cell = this.context.grid.getCell(pos.row, pos.col);
            const editCommand = new EditCellCommand(
                this.context.grid,
                pos.row,
                pos.col,
                cell.value,
                {
                    textDecoration: newTextDecoration,
                    textDecorationLine: newTextDecoration,
                },
                cell.formula
            );
            compositeCommand.addCommand(editCommand);
        });

        // Execute the composite command
        this.context.commandManager.executeCommand(compositeCommand);

        // Make sure to update the UI properly
        this.updateUI(selection);
        return true;
    }
}
