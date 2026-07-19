import { ValueTransformer } from 'typeorm';
import { Point } from '../interfaces/point';

interface GeoJSONPoint {
    type: 'Point';
    coordinates: [number, number];
}

export class PointTransformer implements ValueTransformer {
    /**
     * Appelé avant écriture. Le driver Postgres de TypeORM (0.3.x) fait
     * JSON.stringify(valeur) puis enveloppe le paramètre avec
     * ST_SetSRID(ST_GeomFromGeoJSON($n), 4326)::geometry : il faut donc
     * produire un objet GeoJSON, PAS du EWKT (sinon « unknown GeoJSON type »).
     * Ordre GeoJSON : coordinates = [lng, lat].
     */
    to(value: Point): GeoJSONPoint | null {
        if (value == null) return null;
        return { type: 'Point', coordinates: [value.lng, value.lat] };
    }

    /**
     * Appelé après lecture. TypeORM sélectionne ST_AsGeoJSON(col)::json : le
     * driver pg livre donc un objet GeoJSON déjà parsé (cas nominal).
     * Replis conservés pour les requêtes brutes type SELECT * (EWKB hex) et
     * les tests (WKT / EWKT / chaîne GeoJSON).
     */
    from(value: unknown): Point | null {
        if (value == null || value === '') return null;
        if (typeof value === 'object') {
            const coords = (value as GeoJSONPoint).coordinates;
            if (coords == null) return null;
            return { lng: coords[0], lat: coords[1] };
        }
        if (typeof value !== 'string') return null;
        if (value[0] === '{') {
            return this.from(JSON.parse(value));
        }
        if (value[0] === '0') {
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
