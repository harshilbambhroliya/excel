// src/utils/ExcelFileHandler.ts
import * as XLSX from "xlsx";

/**
 * Utility class for handling Excel file operations
 */
export class ExcelFileHandler {
    /**
     * Reads an Excel file and converts it to a structured data format
     * @param file - The Excel file to read
     * @returns Promise<any[]> - Array of records from the Excel file
     */
    static async readExcelFile(file: File): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(
                        e.target?.result as ArrayBuffer
                    );
                    const workbook = XLSX.read(data, { type: "array" });

                    // Get the first worksheet
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];

                    // Convert worksheet to JSON
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                        header: 1, // Use array of arrays format
                        defval: "", // Default value for empty cells
                        raw: false, // Don't use raw values, convert to strings
                    });

                    // Process the data to ensure consistent structure
                    const processedData = this.processExcelData(
                        jsonData as any[][]
                    );

                    resolve(processedData);
                } catch (error) {
                    const errorMessage =
                        error instanceof Error
                            ? error.message
                            : "Unknown error";
                    reject(
                        new Error(`Error reading Excel file: ${errorMessage}`)
                    );
                }
            };

            reader.onerror = () => {
                reject(new Error("Error reading file"));
            };

            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Processes raw Excel data into a structured format
     * @param rawData - Raw data from Excel file (array of arrays)
     * @returns Processed data suitable for the grid
     */
    private static processExcelData(rawData: any[][]): any[] {
        if (!rawData || rawData.length === 0) {
            return [];
        }

        // Find the maximum number of columns across all rows
        const maxColumns = Math.max(
            ...rawData.map((row) => (row ? row.length : 0))
        );

        // Process each row to ensure consistent column count
        const processedData: any[] = [];

        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i] || [];
            const processedRow: any = {};

            // Ensure each row has values for all columns (pad with empty strings if needed)
            for (let j = 0; j < maxColumns; j++) {
                const cellValue = row[j] !== undefined ? row[j] : "";
                processedRow[`col_${j}`] = this.sanitizeCellValue(cellValue);
            }

            // Add row index for reference
            processedRow.rowIndex = i;
            processedData.push(processedRow);
        }

        return processedData;
    }

    /**
     * Sanitizes cell values to ensure they're safe for display
     * @param value - Raw cell value
     * @returns Sanitized value
     */
    private static sanitizeCellValue(value: any): string {
        if (value === null || value === undefined) {
            return "";
        }

        // Convert to string and trim whitespace
        let sanitized = String(value).trim();

        // Handle very long values (truncate if necessary)
        if (sanitized.length > 1000) {
            sanitized = sanitized.substring(0, 997) + "...";
        }

        return sanitized;
    }

    /**
     * Validates if a file is a valid Excel file
     * @param file - File to validate
     * @returns boolean - True if valid Excel file
     */
    static isValidExcelFile(file: File): boolean {
        const validExtensions = [".xlsx", ".xls", ".xlsm", ".xlsb"];
        const fileName = file.name.toLowerCase();

        return validExtensions.some((ext) => fileName.endsWith(ext));
    }

    /**
     * Gets file information for display
     * @param file - Excel file
     * @returns Object with file information
     */
    static getFileInfo(file: File): {
        name: string;
        size: string;
        type: string;
    } {
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);

        return {
            name: file.name,
            size: `${sizeInMB} MB`,
            type:
                file.type ||
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        };
    }
}
