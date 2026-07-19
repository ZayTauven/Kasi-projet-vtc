import { ValueTransformer } from "typeorm";
import { Point } from "../interfaces/point";

interface GeoJSONMultiPoint {
    type: 'MultiPoint';
    coordinates: number[][];
}

export class MultipointTransformer implements ValueTransformer {
    /**
     * Appelé avant écriture. Le driver Postgres de TypeORM (0.3.x) fait
     * JSON.stringify(valeur) puis enveloppe le paramètre avec
     * ST_SetSRID(ST_GeomFromGeoJSON($n), 4326)::geometry : il faut donc
     * produire un objet GeoJSON, PAS du EWKT (sinon « unknown GeoJSON type »).
     * Ordre GeoJSON : coordinates = [[lng, lat], ...].
     */
    to(value?: Point[]): GeoJSONMultiPoint | null {
        if (value == null || value.length < 1) return null;
        return {
            type: 'MultiPoint',
            coordinates: value.map((p: Point) => [p.lng, p.lat]),
        };
    }

    /**
     * Appelé après lecture. TypeORM sélectionne ST_AsGeoJSON(col)::json : le
     * driver pg livre donc un objet GeoJSON déjà parsé (cas nominal).
     * Replis conservés pour les requêtes brutes type SELECT * (EWKB hex) et
     * les tests (WKT / EWKT / chaîne GeoJSON).
     */
    from(value: unknown): Point[] {
        if (value == null) return [];
        if (typeof value === 'object') {
            const coords = (value as GeoJSONMultiPoint).coordinates;
            if (coords == null) return [];
            return coords.map((pair) => ({ lng: pair[0], lat: pair[1] }));
        }
        if (typeof value !== 'string') return [];
        if (value[0] === '{') {
            return this.from(JSON.parse(value));
        }
        if (value[0] === '0') {
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