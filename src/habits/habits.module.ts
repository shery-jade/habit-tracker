import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HabitsService } from './habits.service';
import { HabitsController } from './habits.controller';
import { Habit } from '../habit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Habit])],
  providers: [HabitsService],
  controllers: [HabitsController],
})
export class HabitsModule {}