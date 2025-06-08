import {read, utils} from 'xlsx';
import dayjs from 'dayjs';

export interface TimelineEvent {
    title: string;
    time: dayjs.Dayjs;
    location: string;
    description: string;
    special?: string;
    completed: boolean;
}

export interface XlsxRow {
    Title?: string;
    Time?: string;
    Location?: string;
    Description?: string;
    Special?: string;
}

function isValidRow(row: XlsxRow): row is Required<XlsxRow> {
    return (
        typeof row.Time === 'string' && row.Time.trim() !== '' &&
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
        const parsedTime = dayjs(row.Time, 'HH:mm:ss', true);
        if (!parsedTime.isValid()) {
            errors.push(`Row ${index + 2}: Invalid time format "${row.Time}".`);
            return;
        }
        items.push({
            title: row.Title?.trim() || 'Untitled',
            time: parsedTime,
            location: row.Location.trim(),
            description: row.Description.trim(),
            special: row.Special?.trim(),
            completed: false
        });
    });

    return {items, errors};
}
