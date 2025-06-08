import {read, utils} from 'xlsx';
import dayjs from 'dayjs';

export interface TimelineEvent {
    title: string;
    time: dayjs.Dayjs;
    completed: boolean;
}

export interface XlsxRow {
    Title?: string;
    Time?: string;
}

function isValidRow(row: XlsxRow): row is Required<XlsxRow> {
    return typeof row.Time === 'string' && row.Time.trim() !== '';
}

export async function parseXlsxFile(file: File): Promise<TimelineEvent[]> {
    const data = await file.arrayBuffer();
    const workbook = read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = utils.sheet_to_json(sheet) as XlsxRow[];

    const timelineItems: TimelineEvent[] = [];

    for (const row of rawRows) {
        if (!isValidRow(row)) {
            console.warn('Skipping invalid row:', row);
            continue;
        }

        const parsedTime = dayjs(row.Time, 'HH:mm:ss', true);
        if (!parsedTime.isValid()) {
            console.warn('Skipping row with invalid time format:', row);
            continue;
        }

        timelineItems.push({
            title: row.Title?.trim() || 'Untitled',
            time: parsedTime,
            completed: false,
        });
    }

    return timelineItems;
}
