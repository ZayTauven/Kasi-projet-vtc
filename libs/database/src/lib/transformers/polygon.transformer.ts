import { ValueTransformer } from 'typeorm';
import { Point } from '../interfaces/point';

export class PolygonTransformer implements ValueTransformer {
    /**
     * Called before writing to the database.
     * Outputs EWKT (Extended WKT with explicit SRID) so PostGIS stores the
     * geometry with the correct SRID 4326 and the column constraint is satisfied.
     */
    to(value: Point[][]): string | null {
        if (value == null) return null;
        const str = value.map((ring: Point[]) => {
            const pts = ring.map((p: Point) => `${p.lng} ${p.lat}`);
            return `(${pts.join(',')})`;
        }).join(',');
        return `SRID=4326;POLYGON(${str})`;
    }

    /**
     * Called after reading from the database.
     * PostGIS returns EWKB as a hex string (byte-order byte = 0x01 → starts with '0').
     * Falls back to WKT / EWKT parsing for tests or legacy contexts.
     */
    from(value: string): Point[][] {
        if (value == null || value === undefined) return [];
        if (typeof value === 'string' && value[0] === '0') {
            return this.parsePolygonEWKB(value);
        }
        // WKT / EWKT fallback
        const wkt = value.includes(';') ? value.split(';')[1] : value;
        const inner = wkt.substring('POLYGON('.length, wkt.length - 1);
        return inner.split('),(').map((segment) => {
            const clean = segment.replace(/^\(/, '').replace(/\)$/, '');
            return clean.split(',').map((pair) => {
                const parts = pair.trim().split(' ');
                return { lng: parseFloat(parts[0]), lat: parseFloat(parts[1]) };
            });
        });
    }

    private parsePolygonEWKB(hex: string): Point[][] {
        const buf = Buffer.from(hex, 'hex');
        let offset = 0;
        const isLE = buf[offset] === 1; offset += 1;
        const readU32 = (pos: number) => isLE ? buf.readUInt32LE(pos) : buf.readUInt32BE(pos);
        const readF64 = (pos: number) => isLE ? buf.readDoubleLE(pos) : buf.readDoubleBE(pos);
        const wkbType = readU32(offset); offset += 4;
        if (wkbType & 0x20000000) offset += 4; // EWKB SRID flag — skip 4-byte SRID
        const numRings = readU32(offset); offset += 4;
        const rings: Point[][] = [];
        for (let r = 0; r < numRings; r++) {
            const numPoints = readU32(offset); offset += 4;
            const ring: Point[] = [];
            for (let p = 0; p < numPoints; p++) {
                const x = readF64(offset); offset += 8;
                const y = readF64(offset); offset += 8;
                ring.push({ lng: x, lat: y });
            }
            rings.push(ring);
        }
        return rings;
    }
}

