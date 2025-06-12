import { useState, useEffect } from 'react';
import { read, utils, WorkBook } from 'xlsx';
import dayjs from 'dayjs';

export interface TimelineEvent {
    title: string;
    from: dayjs.Dayjs;
    to: dayjs.Dayjs;
    showTo: boolean;
    location: string;
    description: string;
    category?: string;
    special?: string;
    completed: boolean;
}

interface XlsxRow {
    title?: string;
    from?: string;
    to?: string;
    location?: string;
    category?: string;
    description?: string;
    special?: string;
}

function isValidRow(row: XlsxRow): row is Required<XlsxRow> {
    return (
        row.from?.trim() !== '' &&
        row.location?.trim() !== '' &&
        row.description?.trim() !== ''
    );
}

interface UseXlsxReturn {
    sheets: string[];
    items: TimelineEvent[];
    errors: string[];
    setSelectedSheet: (sheet: string) => void;
}

/**
 * Hook to parse an XLSX file and lazily process a selected sheet.
 * Reads file bytes only once and exposes sheet names for selection.
 */
export function useXlsx(file: File | null, withErrors: boolean = false): UseXlsxReturn {
    const [workbook, setWorkbook] = useState<WorkBook | null>(null);
    const [sheets, setSheets] = useState<string[]>([]);
    const [selectedSheet, setSelectedSheet] = useState<string>('');
    const [items, setItems] = useState<TimelineEvent[]>([]);
    const [errors, setErrors] = useState<string[]>([]);

    // Load workbook and sheet names once when file changes
    useEffect(() => {
        if (!file) {
            setWorkbook(null);
            setSheets([]);
            setSelectedSheet('');
            setItems([]);
            setErrors([]);
            return;
        }

        file.arrayBuffer()
            .then((data) => {
                const wb = read(data);
                setWorkbook(wb);
                setSheets(wb.SheetNames);
                if (wb.SheetNames.length === 1) {
                    setSelectedSheet(wb.SheetNames[0]);
                } else {
                setSelectedSheet('');
                }
                setItems([]);
                setErrors([]);
            })
            .catch((err) => {
                setErrors([`Failed to read file: ${err.message}`]);
            });
    }, [file]);

    // Parse the selected sheet whenever it changes
    useEffect(() => {
        if (!workbook || !selectedSheet) return;

        const sheet = workbook.Sheets[selectedSheet];
        const rawRows = utils.sheet_to_json<XlsxRow>(sheet);

        const parsedItems: TimelineEvent[] = [];
        const parseErrors: string[] = [];

        rawRows.forEach((row, index) => {
            const rowNumber = index + 2;
            if (!isValidRow(row)) {
                if (withErrors) parseErrors.push(`Row ${rowNumber} is missing required fields.`);
                return;
            }

            const from = dayjs(row.from, 'HH:mm:ss', true);
            if (!from.isValid()) {
                if (withErrors) parseErrors.push(`Row ${rowNumber}: Invalid 'from' time – "${row.from}".`);
                return;
            }

            let to;
            if (!row.to) {
                to = from.add(10, "minute")
            } else {
                to = dayjs(row.to, 'HH:mm:ss', true);
               if (!to.isValid()) {
                    if (withErrors) parseErrors.push(`Row ${rowNumber}: Invalid 'to' time – "${row.to}".`);
                    return;
                }
            }

            if (from.isAfter(to, 'minute')) {
                to = to.add(1, 'day');
            }

            parsedItems.push({
                title: row.title?.trim() || 'Untitled',
                from,
                to,
                showTo: !row.to,
                location: row.location?.trim(),
                description: row.description?.trim(),
                category: row.category?.trim().toLowerCase(),
                special: row.special?.trim(),
                completed: false,
            });
        });

        setItems(parsedItems);
        setErrors(parseErrors);
    }, [workbook, selectedSheet, withErrors]);

    return { sheets, items, errors, setSelectedSheet };
}
