import { ValueTransformer } from "typeorm";
import { Point } from "../interfaces/point";

export class MultipointTransformer implements ValueTransformer {
    /**
     * Called before writing to the database.
     * Outputs EWKT with SRID=4326 so PostGIS stores the geometry correctly.
     * Points are wrapped in parentheses: MULTIPOINT((lng lat),(lng lat),...).
     */
    to(value?: Point[]): string | null {
        if (value == null || value.length < 1) return null;
        const pts = value.map((p: Point) => `(${p.lng} ${p.lat})`).join(',');
        return `SRID=4326;MULTIPOINT(${pts})`;
    }

    /**
     * Called after reading from the database.
     * PostGIS returns EWKB as a hex string (starts with '0' for the byte-order byte).
     * Falls back to WKT / EWKT parsing for tests or legacy contexts.
     */
    from(value: string): Point[] {
        if (value == null) return [];
        if (typeof value === 'string' && value[0] === '0') {
            return this.parseMultipointEWKB(value);
        }
        // WKT / EWKT fallback
        const wkt = value.includes(';') ? value.split(';')[1] : value;
        const inner = wkt.substring('MULTIPOINT('.length, wkt.length - 1);
        return inner.split(',').map((token) => {
            const clean = token.trim().replace(/[()]/g, '');
            const parts = clean.split(' ');
            return { lng: parseFloat(parts[0]), lat: parseFloat(parts[1]) };
        });
    }

    private parseMultipointEWKB(hex: string): Point[] {
        const buf = Buffer.from(hex, 'hex');
        let offset = 0;
        const isLE = buf[offset] === 1; offset += 1;
        const readU32 = (pos: number) => isLE ? buf.readUInt32LE(pos) : buf.readUInt32BE(pos);
        const wkbType = readU32(offset); offset += 4;
        if (wkbType & 0x20000000) offset += 4; // EWKB SRID flag — skip 4-byte SRID
        const numGeoms = readU32(offset); offset += 4;
        const points: Point[] = [];
        for (let i = 0; i < numGeoms; i++) {
            const ptIsLE = buf[offset] === 1; offset += 1;
            const readPtF64 = (pos: number) => ptIsLE ? buf.readDoubleLE(pos) : buf.readDoubleBE(pos);
            offset += 4; // skip sub-geometry type (Point = 0x00000001)
            const x = readPtF64(offset); offset += 8;
            const y = readPtF64(offset); offset += 8;
            points.push({ lng: x, lat: y });
        }
        return points;
    }
}