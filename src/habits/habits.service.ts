import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Habit } from '../habit.entity';
import { User } from '../user.entity';

@Injectable()
export class HabitsService {
  constructor(
    @InjectRepository(Habit)
    private habitsRepository: Repository<Habit>,
  ) {}

  async findAll(user: User): Promise<any[]> {
    const habits = await this.habitsRepository.find({ where: { user } });
    return habits.map((habit) => this.serializeHabit(this.calculateStreaks(habit)));
  }

  async create(
    user: User,
    name: string,
    description?: string,
    icon = 'leaf',
    timerMinutes = 0,
  ): Promise<any> {
    const habit = this.habitsRepository.create({
      name,
      description,
      icon,
      timerMinutes,
      completedDates: [],
      currentStreak: 0,
      longestStreak: 0,
      user,
    });
    const saved = await this.habitsRepository.save(habit);
    return this.serializeHabit(this.calculateStreaks(saved));
  }

  async update(
    id: number,
    user: User,
    name?: string,
    description?: string,
    icon?: string,
    timerMinutes?: number,
  ): Promise<any> {
    const habit = await this.habitsRepository.findOne({ where: { id, user } });
    if (!habit) throw new Error('Habit not found');
    if (name) habit.name = name;
    if (description !== undefined) habit.description = description;
    if (icon !== undefined) habit.icon = icon;
    if (timerMinutes !== undefined) habit.timerMinutes = timerMinutes;
    const saved = await this.habitsRepository.save(habit);
    return this.serializeHabit(this.calculateStreaks(saved));
  }

  async delete(id: number, user: User): Promise<void> {
    const habit = await this.habitsRepository.findOne({ where: { id, user } });
    if (!habit) throw new Error('Habit not found');
    await this.habitsRepository.remove(habit);
  }

  async complete(id: number, user: User): Promise<any> {
    const habit = await this.habitsRepository.findOne({ where: { id, user } });
    if (!habit) throw new Error('Habit not found');
    const today = new Date().toISOString().split('T')[0];
    if (!habit.completedDates.includes(today)) {
      habit.completedDates.push(today);
      habit.completedDates.sort();
    }
    const saved = await this.habitsRepository.save(habit);
    return this.serializeHabit(this.calculateStreaks(saved));
  }

  private serializeHabit(habit: Habit) {
    return {
      id: habit.id,
      name: habit.name,
      description: habit.description,
      icon: habit.icon,
      timerMinutes: habit.timerMinutes,
      completedDates: habit.completedDates || [],
      currentStreak: habit.currentStreak,
      longestStreak: habit.longestStreak,
      completedToday: habit.completedToday,
    };
  }

  private calculateStreaks(habit: Habit): Habit {
    // Normalize dates and sort descending (newest first)
    const normalizedDates = Array.from(new Set(habit.completedDates || []))
      .map(d => d.trim())
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));

    const todayStr = new Date().toISOString().split('T')[0];
    let currentStreak = 0;
    let longestStreak = habit.longestStreak;

    if (normalizedDates.length > 0 && normalizedDates[0] === todayStr) {
      currentStreak = 1;
      let checkDate = new Date(todayStr + 'T00:00:00Z');

      for (let i = 1; i < normalizedDates.length; i++) {
        checkDate.setDate(checkDate.getDate() - 1);
        const expectedDay = checkDate.toISOString().split('T')[0];
        if (normalizedDates[i] === expectedDay) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    habit.currentStreak = currentStreak;
    habit.longestStreak = longestStreak;
    habit.completedToday = normalizedDates.length > 0 && normalizedDates[0] === todayStr;

    return habit;
  }
}
