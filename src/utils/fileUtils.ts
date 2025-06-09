import {read, utils} from 'xlsx';
import dayjs from 'dayjs';

export interface TimelineEvent {
    title: string;
    from: dayjs.Dayjs;
    to: dayjs.Dayjs;
    location: string;
    description: string;
    special?: string;
    completed: boolean;
}

export interface XlsxRow {
    Title?: string;
    From?: string;
    To?: string;
    Location?: string;
    Description?: string;
    Special?: string;
}

function isValidRow(row: XlsxRow): row is Required<XlsxRow> {
    return (
        typeof row.From === 'string' && row.From.trim() !== '' &&
        typeof row.To === 'string' && row.To.trim() !== '' &&
        typeof row.Location === 'string' &&
        typeof row.Description === 'string'
    );
}

export async function parseXlsxFile(
    file: File,
    withErrors: boolean = false
): Promise<{ items: TimelineEvent[]; errors: string[] }> {
    const data = await file.arrayBuffer();
    const workbook = read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = utils.sheet_to_json(sheet) as XlsxRow[];

    const items: TimelineEvent[] = [];
    const errors: string[] = [];

    rawRows.forEach((row, index) => {
        if (!isValidRow(row)) {
            errors.push(`Row ${index + 2} is missing required fields or has invalid time.`);
            return;
        }
        const parsedFrom = dayjs(row.From, 'HH:mm:ss', true);
        if (!parsedFrom.isValid()) {
            errors.push(`Row ${index + 2}: From - Invalid time format "${row.From}".`);
            return;
        }
        const parsedTo = dayjs(row.To, 'HH:mm:ss', true);
        if (!parsedTo.isValid()) {
            errors.push(`Row ${index + 2}: To - Invalid time format "${row.To}".`);
            return;
        }
        items.push({
            title: row.Title?.trim() || 'Untitled',
            from: parsedFrom,
            to: parsedTo,
            location: row.Location.trim(),
            description: row.Description.trim(),
            special: row.Special?.trim(),
            completed: false
        });
    });

    return {items, errors};
}
