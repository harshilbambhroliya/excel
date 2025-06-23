// src/utils/DataGenerator.ts
import { IDataRecord } from '../types/interfaces.js';

/**
 * Utility class for generating sample data records
 */
export class DataGenerator {
    /** @type {string[]} List of sample first names to use in generated data */
    private static readonly FIRST_NAMES = [
        'John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Edward', 'Fiona',
        'George', 'Helen', 'Ian', 'Julia', 'Kevin', 'Laura', 'Michael', 'Nancy',
        'Oliver', 'Penny', 'Quinn', 'Rachel', 'Steve', 'Tina', 'Ulrich', 'Vera',
        'William', 'Xandra', 'Yves', 'Zoe', 'Adam', 'Beth', 'Carl', 'Donna',
        'Eric', 'Faith', 'Gary', 'Hope', 'Ivan', 'Jade', 'Kyle', 'Luna'
    ];

    /** @type {string[]} List of sample last names to use in generated data */
    private static readonly LAST_NAMES = [
        'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
        'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
        'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
        'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'
    ];

    /**
     * Generates a specified number of random data records
     * @param {number} count The number of records to generate
     * @returns {IDataRecord[]} Array of generated data records
     */
    public static generateRecords(count: number): IDataRecord[] {
        const records: IDataRecord[] = [];
        for (let i = 0; i < Math.min(count, 1048576); i++) {
            records.push({
                id: i.toString(),
                firstName: this.getRandomFirstName(),
                lastName: this.getRandomLastName(),
                age: this.getRandomAge().toString(),
                salary: `${this.getRandomSalary().toString()}`
            });
        }
        return records;
    }

    /**
     * Gets a random first name from the predefined list
     * @returns {string} A random first name
     */
    private static getRandomFirstName(): string {
        return this.FIRST_NAMES[Math.floor(Math.random() * this.FIRST_NAMES.length)];
    }

    /**
     * Gets a random last name from the predefined list
     * @returns {string} A random last name
     */
    private static getRandomLastName(): string {
        return this.LAST_NAMES[Math.floor(Math.random() * this.LAST_NAMES.length)];
    }

    /**
     * Generates a random age between 20 and 70
     * @returns {number} A random age value
     */
    private static getRandomAge(): number {
        return Math.floor(Math.random() * 50) + 20; // Age between 20-70
    }

    /**
     * Generates a random salary between $30,000 and $180,000
     * @returns {number} A random salary value
     */
    private static getRandomSalary(): number {
        return Math.floor(Math.random() * 150000) + 30000; // Salary between 30k-180k
    }
}