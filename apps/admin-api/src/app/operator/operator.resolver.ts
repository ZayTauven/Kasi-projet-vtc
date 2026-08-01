import { Inject, UseGuards } from '@nestjs/common';
import { Args, CONTEXT, Mutation, Resolver } from '@nestjs/graphql';
import { ForbiddenError } from '@nestjs/apollo';
import { hashPassword, verifyPassword } from '@kasi/database';
import { UserContext } from '../auth/authenticated-admin';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OperatorDTO } from './dto/operator.dto';
import { UpdatePasswordInput } from './dto/update-password.input';
import { OperatorService } from './operator.service';

@Resolver()
@UseGuards(JwtAuthGuard)
export class OperatorResolver {
  constructor(
    private service: OperatorService,
    @Inject(CONTEXT)
    private context: UserContext,
  ) {}

  @Mutation(() => OperatorDTO)
  async updatePassword(
    @Args('input', { type: () => UpdatePasswordInput })
    input: UpdatePasswordInput,
  ) {
    if (process.env.DEMO_MODE != null) {
      throw new ForbiddenError('Action not allowed in demo mode.');
    }
    const operator = await this.service.getById(this.context.req.user.id);
    // Comparaison a temps constant, et compatible avec les comptes dont le mot
    // de passe est encore stocke en clair (cf. verifyPassword).
    if (!(await verifyPassword(input.oldPassword, operator.password))) {
      throw new ForbiddenError("Old password don't match");
    }
    // `repo.update()` ne declenche PAS le hook @BeforeInsert de l'entite :
    // le hachage doit etre fait ici, explicitement.
    const hashed = await hashPassword(input.newPasswod);
    await this.service.repo.update(operator.id, { password: hashed });
    operator.password = hashed;
    return operator;
  }
}
