import { ValueTransformer } from 'typeorm';
import { Point } from '../interfaces/point';

interface GeoJSONPolygon {
    type: 'Polygon';
    coordinates: number[][][];
}

export class PolygonTransformer implements ValueTransformer {
    /**
     * Appelé avant écriture. Le driver Postgres de TypeORM (0.3.x) fait
     * JSON.stringify(valeur) puis enveloppe le paramètre avec
     * ST_SetSRID(ST_GeomFromGeoJSON($n), 4326)::geometry : il faut donc
     * produire un objet GeoJSON, PAS du EWKT (sinon « unknown GeoJSON type »).
     * Ordre GeoJSON : [lng, lat]. Les anneaux sont fermés si besoin
     * (premier point répété en dernier), exigence des polygones PostGIS.
     */
    to(value: Point[][]): GeoJSONPolygon | null {
        if (value == null) return null;
        const coordinates = value.map((ring: Point[]) => {
            const coords = ring.map((p: Point) => [p.lng, p.lat]);
            const first = coords[0];
            const last = coords[coords.length - 1];
            if (first != null && (first[0] !== last[0] || first[1] !== last[1])) {
                coords.push([first[0], first[1]]);
            }
            return coords;
        });
        return { type: 'Polygon', coordinates };
    }

    /**
     * Appelé après lecture. TypeORM sélectionne ST_AsGeoJSON(col)::json : le
     * driver pg livre donc un objet GeoJSON déjà parsé (cas nominal).
     * Replis conservés pour les requêtes brutes type SELECT * (EWKB hex) et
     * les tests (WKT / EWKT / chaîne GeoJSON).
     */
    from(value: unknown): Point[][] {
        if (value == null || value === undefined) return [];
        if (typeof value === 'object') {
            const coords = (value as GeoJSONPolygon).coordinates;
            if (coords == null) return [];
            return coords.map((ring) =>
                ring.map((pair) => ({ lng: pair[0], lat: pair[1] })),
            );
        }
        if (typeof value !== 'string') return [];
        if (value[0] === '{') {
            return this.from(JSON.parse(value));
        }
        if (value[0] === '0') {
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

