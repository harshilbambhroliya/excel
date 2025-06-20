// src/utils/DataGenerator.ts
import { IDataRecord } from '../types/interfaces.js';

export class DataGenerator {
    private static readonly FIRST_NAMES = [
        'John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Edward', 'Fiona',
        'George', 'Helen', 'Ian', 'Julia', 'Kevin', 'Laura', 'Michael', 'Nancy',
        'Oliver', 'Penny', 'Quinn', 'Rachel', 'Steve', 'Tina', 'Ulrich', 'Vera',
        'William', 'Xandra', 'Yves', 'Zoe', 'Adam', 'Beth', 'Carl', 'Donna',
        'Eric', 'Faith', 'Gary', 'Hope', 'Ivan', 'Jade', 'Kyle', 'Luna'
    ];

    private static readonly LAST_NAMES = [
        'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
        'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
        'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
        'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'
    ];

    public static generateRecords(count: number): IDataRecord[] {
        const records: IDataRecord[] = [];
        for (let i = 0; i < Math.min(count, 100000); i++) {
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

    private static getRandomFirstName(): string {
        return this.FIRST_NAMES[Math.floor(Math.random() * this.FIRST_NAMES.length)];
    }

    private static getRandomLastName(): string {
        return this.LAST_NAMES[Math.floor(Math.random() * this.LAST_NAMES.length)];
    }

    private static getRandomAge(): number {
        return Math.floor(Math.random() * 50) + 20; // Age between 20-70
    }

    private static getRandomSalary(): number {
        return Math.floor(Math.random() * 150000) + 30000; // Salary between 30k-180k
    }
}