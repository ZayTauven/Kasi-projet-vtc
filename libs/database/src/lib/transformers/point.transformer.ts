import { ValueTransformer } from 'typeorm';
import { Point } from '../interfaces/point';

export class PointTransformer implements ValueTransformer {
    /**
     * Called before writing to the database.
     * Outputs EWKT with SRID=4326 so PostGIS stores the geometry correctly.
     */
    to(value: Point): string | null {
        if (value == null) return null;
        return `SRID=4326;POINT(${value.lng} ${value.lat})`;
    }

    /**
     * Called after reading from the database.
     * PostGIS returns EWKB as a hex string (starts with '0' for the byte-order byte).
     * Falls back to WKT / EWKT parsing for tests or legacy contexts.
     */
    from(value: string): Point | null {
        if (value == null || value === '') return null;
        if (typeof value === 'string' && value[0] === '0') {
            return this.parsePointEWKB(value);
        }
        // WKT / EWKT fallback
        const wkt = value.includes(';') ? value.split(';')[1] : value;
        const inner = wkt.substring('POINT('.length, wkt.length - 1);
        const parts = inner.split(' ');
        return { lng: parseFloat(parts[0]), lat: parseFloat(parts[1]) };
    }

    private parsePointEWKB(hex: string): Point {
        const buf = Buffer.from(hex, 'hex');
        let offset = 0;
        const isLE = buf[offset] === 1; offset += 1;
        const readU32 = (pos: number) => isLE ? buf.readUInt32LE(pos) : buf.readUInt32BE(pos);
        const readF64 = (pos: number) => isLE ? buf.readDoubleLE(pos) : buf.readDoubleBE(pos);
        const wkbType = readU32(offset); offset += 4;
        if (wkbType & 0x20000000) offset += 4; // EWKB SRID flag — skip 4-byte SRID
        const x = readF64(offset); offset += 8;
        const y = readF64(offset);
        return { lng: x, lat: y };
    }
}
