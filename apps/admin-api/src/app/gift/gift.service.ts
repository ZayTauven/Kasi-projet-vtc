import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'crypto';
import { In, Repository } from 'typeorm';
import { GiftBatchEntity } from '@kasi/database/gift-batch.entity';
import { GiftCardEntity } from '@kasi/database/gift-card.entity';
import { CreateGiftBatchInput } from './dto/create-gift-batch.input';

// Alphabet Crockford base32 (sans I, L, O, U pour éviter les confusions à la
// saisie manuelle par le rider). 10 caractères => 32^10 ≈ 2^50 combinaisons.
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_LENGTH = 10;
const MAX_QUANTITY = 10000;

@Injectable()
export class GiftService {
  constructor(
    @InjectRepository(GiftBatchEntity)
    private batchRepo: Repository<GiftBatchEntity>,
    @InjectRepository(GiftCardEntity)
    private cardRepo: Repository<GiftCardEntity>,
  ) {}

  private randomCode(): string {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i += 1) {
      code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    }
    return code;
  }

  // Génère `quantity` codes uniques : unicité garantie (1) localement via un
  // Set, (2) globalement en excluant tout code déjà présent en base. En cas
  // de collision improbable, on régénère jusqu'à obtenir un code neuf.
  private async generateUniqueCodes(quantity: number): Promise<string[]> {
    const codes = new Set<string>();
    while (codes.size < quantity) {
      const need = quantity - codes.size;
      const candidates = new Set<string>();
      while (candidates.size < need) {
        const candidate = this.randomCode();
        if (!codes.has(candidate)) {
          candidates.add(candidate);
        }
      }
      const existing = await this.cardRepo.find({
        where: { code: In([...candidates]) },
        select: { code: true },
      });
      const taken = new Set(existing.map((row) => row.code));
      for (const candidate of candidates) {
        if (!taken.has(candidate)) {
          codes.add(candidate);
        }
      }
    }
    return [...codes];
  }

  // Crée le lot puis génère ses cartes cadeaux dans une transaction : soit le
  // lot ET tous ses codes sont persistés, soit rien. Chaque code hérite
  // currency/amount/available/expiration du lot et pointe vers batchId.
  async createBatch(input: CreateGiftBatchInput): Promise<GiftBatchEntity> {
    const quantity = Math.floor(Number(input.quantity));
    if (!Number.isFinite(quantity) || quantity < 1) {
      throw new Error('INVALID_QUANTITY');
    }
    if (quantity > MAX_QUANTITY) {
      throw new Error('QUANTITY_TOO_LARGE');
    }
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('INVALID_AMOUNT');
    }

    return this.batchRepo.manager.transaction(async (manager) => {
      const batch = await manager.save(GiftBatchEntity, {
        name: input.name,
        currency: input.currency,
        amount,
        quantity,
        availableTimestamp: input.availableTimestamp,
        expirationTimestamp: input.expirationTimestamp,
      });
      const codes = await this.generateUniqueCodes(quantity);
      await manager.save(
        GiftCardEntity,
        codes.map((code) => ({
          code,
          currency: input.currency,
          amount,
          isUsed: false,
          availableTimestamp: input.availableTimestamp,
          expirationTimestamp: input.expirationTimestamp,
          batchId: batch.id,
        })),
      );
      return manager.findOneOrFail(GiftBatchEntity, { where: { id: batch.id } });
    });
  }
}
