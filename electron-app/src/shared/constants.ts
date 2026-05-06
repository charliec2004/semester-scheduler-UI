/**
 * Shared Constants
 * Values shared between main and renderer processes
 */

// Days of the week
export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
export type DayName = typeof DAY_NAMES[number];
export const DAY_LABELS: Record<DayName, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
};

export function formatDayLabel(day: DayName): string {
  return DAY_LABELS[day];
}

export const SLOT_MINUTES = 10;
export const LEGACY_SLOT_MINUTES = 30;
export const MINUTES_PER_HOUR = 60;
const MINUTE_ALIGNMENT_TOLERANCE = 0.01;
export const SLOTS_PER_HOUR = MINUTES_PER_HOUR / SLOT_MINUTES;
export const DAY_START_MINUTES = 8 * MINUTES_PER_HOUR;
export const DAY_END_MINUTES = 17 * MINUTES_PER_HOUR;
export const TRAVEL_BUFFER_MINUTES = 10;
/** Exclusive end-of-day time for time blocks (not a slot start). */
export const DAY_EXCLUSIVE_END_TIME = '17:00';

function format24Hour(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function minutesToSlots(minutes: number): number {
  if (minutes % SLOT_MINUTES !== 0) {
    throw new Error(`${minutes} is not divisible by the slot duration (${SLOT_MINUTES})`);
  }
  return minutes / SLOT_MINUTES;
}

export function hoursToSlots(hours: number): number {
  const minutes = hours * MINUTES_PER_HOUR;
  const roundedMinutes = Math.round(minutes);
  if (Math.abs(minutes - roundedMinutes) > MINUTE_ALIGNMENT_TOLERANCE || roundedMinutes % SLOT_MINUTES !== 0) {
    throw new Error(`${hours} hours is not aligned to the ${SLOT_MINUTES}-minute slot grid`);
  }
  return roundedMinutes / SLOT_MINUTES;
}

export function slotsToHours(slots: number): number {
  return slots / SLOTS_PER_HOUR;
}

export function travelBufferMinutesToSlots(minutes: number): number {
  const roundedMinutes = Math.max(0, Math.round(minutes));
  if (roundedMinutes === 0) {
    return 0;
  }
  return minutesToSlots(roundedMinutes);
}

export function isSlotAlignedHours(hours: number): boolean {
  const minutes = hours * MINUTES_PER_HOUR;
  const roundedMinutes = Math.round(minutes);
  return (
    Math.abs(minutes - roundedMinutes) <= MINUTE_ALIGNMENT_TOLERANCE &&
    roundedMinutes % SLOT_MINUTES === 0
  );
}

/** @deprecated Legacy day-level travel flags from flat CSV import. */
export interface DayTravelBuffer {
  beforeNextCommitment: boolean;
  afterPreviousCommitment: boolean;
}

/**
 * Periods when the student CANNOT work (classes, etc.), on the 10-minute grid.
 * endTime is exclusive. Buffer flags extend unavailability by one slot before/after the block.
 */
export interface UnavailabilityBlock {
  startTime: string;
  endTime: string;
  /** Block the slot immediately before this (e.g. travel to a commitment). */
  bufferBeforeStart: boolean;
  /** Block the slot immediately after this ends (e.g. done at 2:00 PM but cannot start work until 2:10). */
  bufferAfterEnd: boolean;
}

/** Legacy persisted shape: periods when the student CAN work (inverted on migration). */
export interface LegacyAvailabilityBlock {
  startTime: string;
  endTime: string;
  travelBefore: boolean;
  travelAfter: boolean;
}

/** @deprecated Use UnavailabilityBlock; kept for reading old JSON/CSV. */
export type AvailabilityBlock = LegacyAvailabilityBlock;

function buildTimeSlotStarts(slotMinutes: number): string[] {
  const slotCount = (DAY_END_MINUTES - DAY_START_MINUTES) / slotMinutes;
  return Array.from(
    { length: slotCount },
    (_, index) => format24Hour(DAY_START_MINUTES + index * slotMinutes),
  );
}

// Time slots (10-minute increments, 8am-5pm)
export const TIME_SLOT_STARTS = buildTimeSlotStarts(SLOT_MINUTES);
export const LEGACY_TIME_SLOT_STARTS = buildTimeSlotStarts(LEGACY_SLOT_MINUTES);

export type TimeSlot = string;

/** Valid block start times (slot starts). */
export const BLOCK_START_TIME_OPTIONS = TIME_SLOT_STARTS;

/**
 * Valid exclusive end times for blocks: each slot start after the first hour,
 * plus 17:00 meaning "through the last slot (16:50)".
 */
export const BLOCK_END_EXCLUSIVE_OPTIONS: readonly string[] = [
  ...TIME_SLOT_STARTS.slice(1),
  DAY_EXCLUSIVE_END_TIME,
];

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    throw new Error(`Invalid time: ${time}`);
  }
  return h * MINUTES_PER_HOUR + m;
}

/** First slot index strictly before exclusive end (minutes). */
export function exclusiveEndMinutesToSlotCount(endExclusive: string): number {
  const endMin = parseTimeToMinutes(endExclusive);
  let count = 0;
  for (const t of TIME_SLOT_STARTS) {
    if (parseTimeToMinutes(t) < endMin) {
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

export function startTimeToSlotIndex(start: string): number {
  const idx = TIME_SLOT_STARTS.indexOf(start);
  if (idx === -1) {
    throw new Error(`startTime must be a slot start on the grid, got: ${start}`);
  }
  return idx;
}

export function createEmptyUnavailabilityBlocks(): Record<DayName, UnavailabilityBlock[]> {
  return DAY_NAMES.reduce(
    (acc, day) => {
      acc[day] = [];
      return acc;
    },
    {} as Record<DayName, UnavailabilityBlock[]>,
  );
}

/** @deprecated Old default was “available all day” as one legacy availability block. */
export function createDefaultAvailabilityBlocks(): Record<DayName, LegacyAvailabilityBlock[]> {
  return Object.fromEntries(
    DAY_NAMES.map(day => [
      day,
      [
        {
          startTime: TIME_SLOT_STARTS[0],
          endTime: DAY_EXCLUSIVE_END_TIME,
          travelBefore: false,
          travelAfter: false,
        },
      ],
    ]),
  ) as Record<DayName, LegacyAvailabilityBlock[]>;
}

function sortAndDedupeUnavailabilityBlocks(blocks: UnavailabilityBlock[]): UnavailabilityBlock[] {
  return [...blocks].sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
}

export function normalizeUnavailabilityBlock(block: UnavailabilityBlock): UnavailabilityBlock | null {
  const start = block.startTime;
  const end = block.endTime;
  if (!TIME_SLOT_STARTS.includes(start)) {
    return null;
  }
  const endOk =
    end === DAY_EXCLUSIVE_END_TIME ||
    (BLOCK_END_EXCLUSIVE_OPTIONS as readonly string[]).includes(end);
  if (!endOk) {
    return null;
  }
  if (parseTimeToMinutes(end) <= parseTimeToMinutes(start)) {
    return null;
  }
  return {
    startTime: start,
    endTime: end,
    bufferBeforeStart: Boolean(block.bufferBeforeStart),
    bufferAfterEnd: Boolean(block.bufferAfterEnd),
  };
}

export function normalizeUnavailabilityBlocksRecord(
  blocks?: Record<DayName, UnavailabilityBlock[]> | null,
): Record<DayName, UnavailabilityBlock[]> {
  if (!blocks) {
    return createEmptyUnavailabilityBlocks();
  }
  return Object.fromEntries(
    DAY_NAMES.map(day => {
      const raw = blocks[day];
      if (!Array.isArray(raw) || raw.length === 0) {
        return [day, []];
      }
      const normalized = sortAndDedupeUnavailabilityBlocks(raw)
        .map(b => normalizeUnavailabilityBlock(b))
        .filter((b): b is UnavailabilityBlock => b !== null);
      return [day, normalized.length > 0 ? normalized : []];
    }),
  ) as Record<DayName, UnavailabilityBlock[]>;
}

/** All Mon_08:00… keys true = can work every slot in the grid window. */
export function createFullWorkDayAvailability(): Record<string, boolean> {
  return Object.fromEntries(AVAILABILITY_COLUMNS.map(column => [column, true])) as Record<string, boolean>;
}

/**
 * Derive work-availability (true = can work) from unavailability blocks + edge buffers.
 */
export function unavailabilityBlocksToFlatWorkAvailability(
  blocks: Record<DayName, UnavailabilityBlock[]>,
  travelBufferSlots: number = travelBufferMinutesToSlots(TRAVEL_BUFFER_MINUTES),
): Record<string, boolean> {
  const out = createFullWorkDayAvailability();
  const n = TIME_SLOT_STARTS.length;
  const normalizedBufferSlots = Math.max(0, travelBufferSlots);
  for (const day of DAY_NAMES) {
    const dayBlocks = blocks[day] ?? [];
    for (const block of dayBlocks) {
      const nb = normalizeUnavailabilityBlock(block);
      if (!nb) {
        continue;
      }
      const startIdx = startTimeToSlotIndex(nb.startTime);
      const endIdx = exclusiveEndMinutesToSlotCount(nb.endTime);
      for (let i = startIdx; i < endIdx; i += 1) {
        out[`${day}_${TIME_SLOT_STARTS[i]}`] = false;
      }
      if (nb.bufferBeforeStart && normalizedBufferSlots > 0 && startIdx > 0) {
        const bufferStart = Math.max(0, startIdx - normalizedBufferSlots);
        for (let i = bufferStart; i < startIdx; i += 1) {
          out[`${day}_${TIME_SLOT_STARTS[i]}`] = false;
        }
      }
      if (nb.bufferAfterEnd && normalizedBufferSlots > 0 && endIdx < n) {
        const bufferEnd = Math.min(n, endIdx + normalizedBufferSlots);
        for (let i = endIdx; i < bufferEnd; i += 1) {
          out[`${day}_${TIME_SLOT_STARTS[i]}`] = false;
        }
      }
    }
  }
  return out;
}

function sortAndDedupeLegacyAvailabilityBlocks(blocks: LegacyAvailabilityBlock[]): LegacyAvailabilityBlock[] {
  return [...blocks].sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
}

function normalizeLegacyAvailabilityBlock(block: LegacyAvailabilityBlock): LegacyAvailabilityBlock | null {
  const start = block.startTime;
  const end = block.endTime;
  if (!TIME_SLOT_STARTS.includes(start)) {
    return null;
  }
  const endOk =
    end === DAY_EXCLUSIVE_END_TIME ||
    (BLOCK_END_EXCLUSIVE_OPTIONS as readonly string[]).includes(end);
  if (!endOk) {
    return null;
  }
  if (parseTimeToMinutes(end) <= parseTimeToMinutes(start)) {
    return null;
  }
  return {
    startTime: start,
    endTime: end,
    travelBefore: Boolean(block.travelBefore),
    travelAfter: Boolean(block.travelAfter),
  };
}

/** Legacy “can work” blocks → flat work map (used when migrating old JSON). */
export function legacyAvailabilityBlocksToFlatWork(
  blocks: Record<DayName, LegacyAvailabilityBlock[]>,
): Record<string, boolean> {
  const out = createDefaultAvailability();
  for (const day of DAY_NAMES) {
    const dayBlocks = blocks[day] ?? [];
    for (const block of dayBlocks) {
      const nb = normalizeLegacyAvailabilityBlock(block);
      if (!nb) {
        continue;
      }
      const startIdx = startTimeToSlotIndex(nb.startTime);
      const endIdx = exclusiveEndMinutesToSlotCount(nb.endTime);
      for (let i = startIdx; i < endIdx; i += 1) {
        const time = TIME_SLOT_STARTS[i];
        out[`${day}_${time}`] = true;
      }
      if (nb.travelBefore && startIdx < endIdx) {
        out[`${day}_${TIME_SLOT_STARTS[startIdx]}`] = false;
      }
      if (nb.travelAfter && startIdx < endIdx) {
        const lastIdx = endIdx - 1;
        out[`${day}_${TIME_SLOT_STARTS[lastIdx]}`] = false;
      }
    }
  }
  return out;
}

function normalizeLegacyAvailabilityBlocksRecord(
  blocks?: Record<DayName, LegacyAvailabilityBlock[]> | null,
): Record<DayName, LegacyAvailabilityBlock[]> {
  const defaults = createDefaultAvailabilityBlocks();
  if (!blocks) {
    return defaults;
  }
  return Object.fromEntries(
    DAY_NAMES.map(day => {
      const raw = blocks[day];
      if (!Array.isArray(raw) || raw.length === 0) {
        return [day, []];
      }
      const normalized = sortAndDedupeLegacyAvailabilityBlocks(raw)
        .map(b => normalizeLegacyAvailabilityBlock(b))
        .filter((b): b is LegacyAvailabilityBlock => b !== null);
      return [day, normalized.length > 0 ? normalized : []];
    }),
  ) as Record<DayName, LegacyAvailabilityBlock[]>;
}

/**
 * Infer legacy “can work” blocks from a flat work map (contiguous true).
 * Used when migrating flat CSV / travel flags before complementing to unavailability.
 */
export function flatWorkAvailabilityToLegacyAvailabilityBlocks(
  availability: Record<string, boolean>,
  day: DayName,
): LegacyAvailabilityBlock[] {
  const normalized = normalizeAvailabilityMap(availability);
  const blocks: LegacyAvailabilityBlock[] = [];
  let runStart: number | null = null;
  for (let i = 0; i < TIME_SLOT_STARTS.length; i += 1) {
    const col = `${day}_${TIME_SLOT_STARTS[i]}`;
    const on = Boolean(normalized[col]);
    if (on && runStart === null) {
      runStart = i;
    }
    if (!on && runStart !== null) {
      const endExclusive =
        i < TIME_SLOT_STARTS.length ? TIME_SLOT_STARTS[i] : DAY_EXCLUSIVE_END_TIME;
      blocks.push({
        startTime: TIME_SLOT_STARTS[runStart],
        endTime: endExclusive,
        travelBefore: false,
        travelAfter: false,
      });
      runStart = null;
    }
  }
  if (runStart !== null) {
    blocks.push({
      startTime: TIME_SLOT_STARTS[runStart],
      endTime: DAY_EXCLUSIVE_END_TIME,
      travelBefore: false,
      travelAfter: false,
    });
  }
  return blocks;
}

/** @deprecated Renamed; use flatWorkAvailabilityToLegacyAvailabilityBlocks */
export const flatAvailabilityToBlocks = flatWorkAvailabilityToLegacyAvailabilityBlocks;

/** Apply legacy day-level travel buffer semantics to inferred legacy availability blocks. */
export function applyLegacyTravelBuffersToBlocks(
  blocks: LegacyAvailabilityBlock[],
  day: DayName,
  availability: Record<string, boolean>,
  legacy?: DayTravelBuffer | null,
): LegacyAvailabilityBlock[] {
  if (!legacy || (!legacy.beforeNextCommitment && !legacy.afterPreviousCommitment)) {
    return blocks;
  }
  const normalized = normalizeAvailabilityMap(availability);
  return blocks.map(block => {
    const startIdx = startTimeToSlotIndex(block.startTime);
    const endIdx = exclusiveEndMinutesToSlotCount(block.endTime);
    let travelBefore = block.travelBefore;
    let travelAfter = block.travelAfter;
    if (legacy.afterPreviousCommitment) {
      const prevIdx = startIdx - 1;
      if (prevIdx >= 0) {
        const prevCol = `${day}_${TIME_SLOT_STARTS[prevIdx]}`;
        if (!normalized[prevCol]) {
          travelBefore = true;
        }
      }
    }
    if (legacy.beforeNextCommitment) {
      const nextIdx = endIdx;
      if (nextIdx < TIME_SLOT_STARTS.length) {
        const nextCol = `${day}_${TIME_SLOT_STARTS[nextIdx]}`;
        if (!normalized[nextCol]) {
          travelAfter = true;
        }
      }
    }
    return { ...block, travelBefore, travelAfter };
  });
}

export function inferUnavailabilityBlocksFromWorkFlat(
  workFlat: Record<string, boolean>,
  day: DayName,
): UnavailabilityBlock[] {
  const normalized = normalizeAvailabilityMap(workFlat);
  const blocks: UnavailabilityBlock[] = [];
  let runStart: number | null = null;
  for (let i = 0; i < TIME_SLOT_STARTS.length; i += 1) {
    const col = `${day}_${TIME_SLOT_STARTS[i]}`;
    const cantWork = !normalized[col];
    if (cantWork && runStart === null) {
      runStart = i;
    }
    if (!cantWork && runStart !== null) {
      const endExclusive =
        i < TIME_SLOT_STARTS.length ? TIME_SLOT_STARTS[i] : DAY_EXCLUSIVE_END_TIME;
      blocks.push({
        startTime: TIME_SLOT_STARTS[runStart],
        endTime: endExclusive,
        bufferBeforeStart: false,
        bufferAfterEnd: false,
      });
      runStart = null;
    }
  }
  if (runStart !== null) {
    blocks.push({
      startTime: TIME_SLOT_STARTS[runStart],
      endTime: DAY_EXCLUSIVE_END_TIME,
      bufferBeforeStart: false,
      bufferAfterEnd: false,
    });
  }
  return blocks;
}

function inferUnavailabilityBlocksRecordFromWorkFlat(
  workFlat: Record<string, boolean>,
): Record<DayName, UnavailabilityBlock[]> {
  return Object.fromEntries(
    DAY_NAMES.map(day => [day, inferUnavailabilityBlocksFromWorkFlat(workFlat, day)]),
  ) as Record<DayName, UnavailabilityBlock[]>;
}

function hasProvidedUnavailabilityBlocks(
  blocks: Record<DayName, UnavailabilityBlock[]> | null | undefined,
): blocks is Record<DayName, UnavailabilityBlock[]> {
  return blocks != null && typeof blocks === 'object';
}

function hasNonEmptyLegacyAvailabilityBlocks(
  blocks: Record<DayName, LegacyAvailabilityBlock[]> | null | undefined,
): boolean {
  return (
    blocks != null &&
    typeof blocks === 'object' &&
    DAY_NAMES.some(
      day =>
        Array.isArray((blocks as Record<string, unknown>)[day]) &&
        (((blocks as Record<string, LegacyAvailabilityBlock[]>)[day]?.length ?? 0) > 0),
    )
  );
}

/**
 * Normalize persisted staff availability: unavailability blocks are canonical;
 * `availability` is always the derived work map for the solver/CSV grid.
 */
export function migrateStaffAvailabilityShape(member: {
  availability?: Record<string, boolean> | null;
  unavailabilityBlocks?: Record<DayName, UnavailabilityBlock[]> | null;
  /** Legacy: “can work” windows */
  availabilityBlocks?: Record<DayName, LegacyAvailabilityBlock[]> | null;
  travelBuffers?: Record<DayName, DayTravelBuffer> | null;
}): { unavailabilityBlocks: Record<DayName, UnavailabilityBlock[]>; availability: Record<string, boolean> } {
  if (hasProvidedUnavailabilityBlocks(member.unavailabilityBlocks ?? undefined)) {
    const unavailabilityBlocks = normalizeUnavailabilityBlocksRecord(member.unavailabilityBlocks);
    return {
      unavailabilityBlocks,
      availability: unavailabilityBlocksToFlatWorkAvailability(unavailabilityBlocks),
    };
  }

  if (hasNonEmptyLegacyAvailabilityBlocks(member.availabilityBlocks ?? undefined)) {
    const legacyNorm = normalizeLegacyAvailabilityBlocksRecord(member.availabilityBlocks);
    const workFlat = legacyAvailabilityBlocksToFlatWork(legacyNorm);
    const unavailabilityBlocks = inferUnavailabilityBlocksRecordFromWorkFlat(workFlat);
    return { unavailabilityBlocks, availability: workFlat };
  }

  const flat = normalizeAvailabilityMap(member.availability);
  const legacyAvailByDay = Object.fromEntries(
    DAY_NAMES.map(day => {
      const inferred = flatWorkAvailabilityToLegacyAvailabilityBlocks(flat, day);
      const withLegacy = applyLegacyTravelBuffersToBlocks(
        inferred,
        day,
        flat,
        member.travelBuffers?.[day] ?? null,
      );
      return [day, withLegacy];
    }),
  ) as Record<DayName, LegacyAvailabilityBlock[]>;
  const workFlat = legacyAvailabilityBlocksToFlatWork(legacyAvailByDay);
  const unavailabilityBlocks = inferUnavailabilityBlocksRecordFromWorkFlat(workFlat);
  return { unavailabilityBlocks, availability: workFlat };
}

/** Timeline for unavailability UI: can work | cannot work | travel buffer slot. */
export function dayUnavailabilityToTimelineSlotStates(
  blocks: UnavailabilityBlock[],
  travelBufferSlots: number = travelBufferMinutesToSlots(TRAVEL_BUFFER_MINUTES),
): Array<'work' | 'busy' | 'buffer'> {
  const n = TIME_SLOT_STARTS.length;
  const result: Array<'work' | 'busy' | 'buffer'> = Array.from({ length: n }, () => 'work');
  const normalizedBufferSlots = Math.max(0, travelBufferSlots);
  for (const block of blocks) {
    const nb = normalizeUnavailabilityBlock(block);
    if (!nb) {
      continue;
    }
    const startIdx = startTimeToSlotIndex(nb.startTime);
    const endIdx = exclusiveEndMinutesToSlotCount(nb.endTime);
    for (let i = startIdx; i < endIdx; i += 1) {
      result[i] = 'busy';
    }
    if (nb.bufferBeforeStart && normalizedBufferSlots > 0 && startIdx > 0) {
      const bufferStart = Math.max(0, startIdx - normalizedBufferSlots);
      for (let i = bufferStart; i < startIdx; i += 1) {
        if (result[i] === 'work') {
          result[i] = 'buffer';
        }
      }
    }
    if (nb.bufferAfterEnd && normalizedBufferSlots > 0 && endIdx < n) {
      const bufferEnd = Math.min(n, endIdx + normalizedBufferSlots);
      for (let i = endIdx; i < bufferEnd; i += 1) {
        if (result[i] === 'work') {
          result[i] = 'buffer';
        }
      }
    }
  }
  return result;
}

/** Primary JSON column for staff CSV export. */
export const UNAVAILABILITY_BLOCKS_JSON_COLUMN = 'unavailability_blocks';
/** Legacy JSON column meaning “can work” blocks (still read on import). */
export const AVAILABILITY_BLOCKS_JSON_COLUMN = 'availability_blocks';

/** @deprecated Use unavailabilityBlocksToFlatWorkAvailability */
export const blocksRecordToFlatAvailability = legacyAvailabilityBlocksToFlatWork;

// Generate all availability column names
export const AVAILABILITY_COLUMNS = DAY_NAMES.flatMap(day =>
  TIME_SLOT_STARTS.map(time => `${day}_${time}`)
);
export const LEGACY_AVAILABILITY_COLUMNS = DAY_NAMES.flatMap(day =>
  LEGACY_TIME_SLOT_STARTS.map(time => `${day}_${time}`)
);
export const TRAVEL_BUFFER_BEFORE_COLUMNS = Object.fromEntries(
  DAY_NAMES.map(day => [day, `${day}_before_next_commitment`]),
) as Record<DayName, string>;
export const TRAVEL_BUFFER_AFTER_COLUMNS = Object.fromEntries(
  DAY_NAMES.map(day => [day, `${day}_after_previous_commitment`]),
) as Record<DayName, string>;
export const TRAVEL_BUFFER_COLUMNS = DAY_NAMES.flatMap(day => [
  TRAVEL_BUFFER_BEFORE_COLUMNS[day],
  TRAVEL_BUFFER_AFTER_COLUMNS[day],
]);

export function createDefaultTravelBuffers(): Record<DayName, DayTravelBuffer> {
  return Object.fromEntries(
    DAY_NAMES.map(day => [day, { beforeNextCommitment: false, afterPreviousCommitment: false }]),
  ) as Record<DayName, DayTravelBuffer>;
}

export function createDefaultAvailability(): Record<string, boolean> {
  return Object.fromEntries(AVAILABILITY_COLUMNS.map(column => [column, false]));
}

function hasOwnAvailabilityKey(
  availability: Record<string, boolean>,
  key: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(availability, key);
}

export function normalizeAvailabilityMap(
  availability?: Record<string, boolean> | null,
): Record<string, boolean> {
  const normalized = createDefaultAvailability();
  if (!availability) {
    return normalized;
  }

  const currentKeyCount = AVAILABILITY_COLUMNS.filter(column => hasOwnAvailabilityKey(availability, column)).length;
  const legacyKeyCount = LEGACY_AVAILABILITY_COLUMNS.filter(column => hasOwnAvailabilityKey(availability, column)).length;

  const hasCompleteCurrentGrid = currentKeyCount === AVAILABILITY_COLUMNS.length;
  const hasCompleteLegacyGrid = legacyKeyCount === LEGACY_AVAILABILITY_COLUMNS.length;

  if (hasCompleteCurrentGrid || (currentKeyCount > 0 && !hasCompleteLegacyGrid)) {
    for (const column of AVAILABILITY_COLUMNS) {
      if (hasOwnAvailabilityKey(availability, column)) {
        normalized[column] = Boolean(availability[column]);
      }
    }
    return normalized;
  }

  if (legacyKeyCount === 0) {
    return normalized;
  }

  const legacyStride = LEGACY_SLOT_MINUTES / SLOT_MINUTES;
  for (const day of DAY_NAMES) {
    for (const [legacyIndex, time] of LEGACY_TIME_SLOT_STARTS.entries()) {
      const legacyColumn = `${day}_${time}`;
      if (!availability[legacyColumn]) {
        continue;
      }
      for (let offset = 0; offset < legacyStride; offset += 1) {
        const currentTime = TIME_SLOT_STARTS[legacyIndex * legacyStride + offset];
        normalized[`${day}_${currentTime}`] = true;
      }
    }
  }

  return normalized;
}

// Common roles - only front_desk is hard-coded; other roles come from departments
export const COMMON_ROLES: readonly string[] = ['front_desk'];

export type Role = typeof COMMON_ROLES[number] | string;

// Solver defaults
export const DEFAULT_SOLVER_MAX_TIME = 180; // seconds
export const DEFAULT_MIN_SLOTS = hoursToSlots(2); // 2 hours
export const DEFAULT_MAX_SLOTS = hoursToSlots(4); // 4 hours

// Validation limits
export const MAX_HOURS_PER_WEEK = 40;
export const MIN_HOURS_PER_WEEK = 0;
export const MAX_YEAR = 6;
export const MIN_YEAR = 1;
